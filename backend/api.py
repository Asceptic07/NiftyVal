import asyncio
from contextlib import asynccontextmanager
import datetime
import logging
import math
import sqlite3
import sys
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.config import INDICES
from backend.analytics import (
    DEFAULT_DB_PATH,
    get_basket_summary,
    get_index_analysis,
    load_index_df,
)
from backend.fetcher import DB_PATH, sync_all

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("indexpe.api")

# IST Timezone (+05:30)
IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))

# Concurrency lock and state for synchronizations
sync_lock = threading.Lock()
is_syncing_flag = False


def get_latest_db_date(db_path: Path = DB_PATH) -> Optional[str]:
    """Query the maximum valuation date stored in SQLite."""
    if not db_path.exists():
        return None
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT MAX(date) FROM daily_valuations")
        row = cursor.fetchone()
        conn.close()
        return row[0] if row and row[0] else None
    except Exception as e:
        logger.error("Error querying MAX(date) from %s: %s", db_path, e)
        return None


def should_trigger_auto_sync() -> Tuple[bool, str]:
    """
    Check if auto-sync conditions are met:
    - Current IST time is past 19:15 (7:15 PM)
    - Today is a weekday (Monday=0 to Friday=4, i.e., weekday() < 5)
    - max(date) in indices.db is older than today's YYYY-MM-DD
    """
    now_ist = datetime.datetime.now(IST)
    today_str = now_ist.strftime("%Y-%m-%d")

    # Check weekday (Monday=0 ... Sunday=6)
    if now_ist.weekday() >= 5:
        return False, f"Weekend ({now_ist.strftime('%A')}); NSE is closed."

    # Check time past 19:15
    cutoff_time = datetime.time(19, 15)
    if now_ist.time() < cutoff_time:
        return False, f"Current IST time ({now_ist.strftime('%H:%M')}) is before 19:15."

    latest_date = get_latest_db_date(DB_PATH)
    if not latest_date:
        return True, "Database has no dates, sync needed."

    if latest_date < today_str:
        return True, f"Latest date {latest_date} is older than today ({today_str})."

    return False, f"Database is already up to date ({latest_date})."


def _run_sync_worker(years: int = 7) -> None:
    """Thread worker that executes sync_all under sync_lock."""
    global is_syncing_flag
    if not sync_lock.acquire(blocking=False):
        logger.info("Sync already in progress; skipping duplicate trigger.")
        return

    try:
        is_syncing_flag = True
        logger.info("Starting background sync_all(years=%d)...", years)
        sync_all(years=years, db_path=DB_PATH)
        logger.info("Background sync_all completed successfully.")
    except Exception as e:
        logger.error("Background sync_all failed: %s", e, exc_info=True)
    finally:
        is_syncing_flag = False
        sync_lock.release()


def trigger_background_sync(years: int = 7) -> bool:
    """Start sync in background thread if not already running. Return True if started."""
    if sync_lock.locked() or is_syncing_flag:
        return False
    t = threading.Thread(target=_run_sync_worker, args=(years,), daemon=True)
    t.start()
    return True


async def _periodic_sync_checker() -> None:
    """Background loop checking auto-sync condition on startup and every 60 minutes."""
    while True:
        try:
            needed, reason = should_trigger_auto_sync()
            logger.info("Periodic sync check: needed=%s (%s)", needed, reason)
            if needed:
                started = trigger_background_sync(years=7)
                if started:
                    logger.info("Auto-sync initiated in background thread.")
                else:
                    logger.info("Sync already running; not starting another.")
        except Exception as e:
            logger.error("Error in periodic sync checker: %s", e)

        # Wait 60 minutes before next check (3600 seconds)
        await asyncio.sleep(3600)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: launch background checker task
    checker_task = asyncio.create_task(_periodic_sync_checker())
    yield
    # Shutdown: cancel task
    checker_task.cancel()
    try:
        await checker_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="IndexPE API",
    description="Backend API exposing official NSE index valuations, forward return distributions, and ETF strategy signals for IndexPE frontend.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8501",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _sanitize_value(v: Any) -> Any:
    """Recursively convert float NaN/Inf to None and numpy scalars to native Python types."""
    if v is None:
        return None
    if isinstance(v, (float, np.floating)):
        if math.isnan(v) or math.isinf(v):
            return None
        return float(v)
    if isinstance(v, (int, np.integer)):
        return int(v)
    if isinstance(v, (np.bool_, bool)):
        return bool(v)
    return v


def _sanitize_json(obj: Any) -> Any:
    """Deeply sanitize dicts and lists for clean JSON serialization."""
    if isinstance(obj, dict):
        return {k: _sanitize_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_sanitize_json(v) for v in obj]
    else:
        return _sanitize_value(obj)


def _get_valuation_tier(vs_5y_pct: Optional[float]) -> str:
    """Return the 5-tier valuation status label based on deviation vs 5Y median."""
    if vs_5y_pct is None:
        return "Fairly Valued"
    if vs_5y_pct < -20.0:
        return "Significantly Undervalued"
    elif vs_5y_pct < -10.0:
        return "Moderately Undervalued"
    elif vs_5y_pct <= 10.0:
        return "Fairly Valued"
    elif vs_5y_pct <= 20.0:
        return "Moderately Overvalued"
    else:
        return "Significantly Overvalued"


@app.get("/api/basket", summary="Get all 11 core indices with valuation metrics and signals")
def get_basket() -> List[Dict[str, Any]]:
    """Retrieve full basket summary enriched with category, change_pct, multi-year medians, and valuation tiers."""
    raw_basket = get_basket_summary(db_path=DEFAULT_DB_PATH)
    enriched_basket = []

    for item in raw_basket:
        slug = item["slug"]
        is_cyclical = bool(INDICES[slug]["cyclical"])
        category = "Cyclical" if is_cyclical else "Core / Defensive"

        # Load time-series for 1-day price change & 52-week statistics
        df = load_index_df(slug, db_path=DEFAULT_DB_PATH)
        c_now = float(df["close"].iloc[-1]) if not df.empty else 0.0
        change_pct = 0.0
        if len(df) >= 2:
            c_prev = float(df["close"].iloc[-2])
            if c_prev > 0:
                change_pct = round(((c_now - c_prev) / c_prev) * 100.0, 2)

        # 52-week High, Low, From High %, Position %
        df_252 = df.tail(252)
        high_52w = round(float(df_252["close"].max()), 2) if not df_252.empty else c_now
        low_52w = round(float(df_252["close"].min()), 2) if not df_252.empty else c_now
        from_52w_high_pct = (
            round(((c_now - high_52w) / high_52w) * 100.0, 2) if high_52w > 0 else 0.0
        )
        if high_52w > low_52w:
            pos_52w = ((c_now - low_52w) / (high_52w - low_52w)) * 100.0
            position_52w_pct = round(max(0.0, min(100.0, pos_52w)), 1)
        else:
            position_52w_pct = 50.0

        # Get detailed multi-window medians
        an = get_index_analysis(slug, db_path=DEFAULT_DB_PATH)
        w_stats = an["window_stats"]

        med_1y_pe = w_stats["1Y"]["pe"]["median"]
        med_3y_pe = w_stats["3Y"]["pe"]["median"]
        med_5y_pe = w_stats["5Y"]["pe"]["median"]
        med_7y_pe = w_stats["7Y"]["pe"]["median"]

        vs_5y_pct = w_stats["5Y"]["pe"]["pct_vs_median"]
        vs_7y_pct = w_stats["7Y"]["pe"]["pct_vs_median"]

        valuation_tier = _get_valuation_tier(vs_5y_pct)

        enriched_item = dict(item)
        enriched_item.update(
            {
                "category": category,
                "change_pct": change_pct,
                "median_1y_pe": med_1y_pe,
                "median_3y_pe": med_3y_pe,
                "median_5y_pe": med_5y_pe,
                "median_7y_pe": med_7y_pe,
                "vs_5y_median_pct": vs_5y_pct,
                "vs_7y_median_pct": vs_7y_pct,
                "valuation_tier": valuation_tier,
                "high_52w": high_52w,
                "low_52w": low_52w,
                "from_52w_high_pct": from_52w_high_pct,
                "position_52w_pct": position_52w_pct,
            }
        )
        enriched_basket.append(_sanitize_json(enriched_item))

    # Keep sorted ascending by 5Y P/E percentile
    enriched_basket.sort(key=lambda x: (x["pe_5y_pct"] is None, x["pe_5y_pct"]))
    return enriched_basket


@app.get("/api/correlation", summary="Get 11x11 Pearson correlation matrix for the 1-year window")
def get_correlation() -> Dict[str, Any]:
    """Compute Pearson correlation matrix of daily returns over the last 252 trading sessions across all 11 indices."""
    slugs = list(INDICES.keys())
    names = [INDICES[s]["nse_name"] for s in slugs]

    returns_dict: Dict[str, pd.Series] = {}
    for s in slugs:
        df = load_index_df(s, db_path=DEFAULT_DB_PATH).tail(252).set_index("date")
        returns_dict[s] = df["close"].pct_change().dropna()

    df_returns = pd.DataFrame(returns_dict).dropna()
    corr_df = df_returns.corr().round(2)
    matrix = corr_df.values.tolist()

    return _sanitize_json(
        {
            "slugs": slugs,
            "names": names,
            "matrix": matrix,
        }
    )


@app.get("/api/index/{slug}", summary="Get comprehensive analytics and historical timeseries for an index")
def get_index_detail(slug: str) -> Dict[str, Any]:
    """Retrieve full valuation analysis, window stats, growth, forward returns, strategy signal, and full daily history."""
    if slug not in INDICES:
        raise HTTPException(
            status_code=404,
            detail=f"Index slug '{slug}' not found. Available slugs: {list(INDICES.keys())}",
        )

    analysis = get_index_analysis(slug, db_path=DEFAULT_DB_PATH)
    df = load_index_df(slug, db_path=DEFAULT_DB_PATH)

    # 52-week statistics
    c_now = float(df["close"].iloc[-1]) if not df.empty else 0.0
    df_252 = df.tail(252)
    high_52w = round(float(df_252["close"].max()), 2) if not df_252.empty else c_now
    low_52w = round(float(df_252["close"].min()), 2) if not df_252.empty else c_now
    from_52w_high_pct = (
        round(((c_now - high_52w) / high_52w) * 100.0, 2) if high_52w > 0 else 0.0
    )
    if high_52w > low_52w:
        pos_52w = ((c_now - low_52w) / (high_52w - low_52w)) * 100.0
        position_52w_pct = round(max(0.0, min(100.0, pos_52w)), 1)
    else:
        position_52w_pct = 50.0

    vs_5y_pct = analysis["window_stats"]["5Y"]["pe"]["pct_vs_median"]
    valuation_tier = _get_valuation_tier(vs_5y_pct)

    analysis.update(
        {
            "high_52w": high_52w,
            "low_52w": low_52w,
            "from_52w_high_pct": from_52w_high_pct,
            "position_52w_pct": position_52w_pct,
            "valuation_tier": valuation_tier,
        }
    )

    history = []
    for _, row in df.iterrows():
        history.append(
            {
                "date": row["date"].strftime("%Y-%m-%d"),
                "close": _sanitize_value(row["close"]),
                "pe": _sanitize_value(row["pe"]),
                "pb": _sanitize_value(row["pb"]),
                "div_yield": _sanitize_value(row["div_yield"]),
                "eps": _sanitize_value(row["eps"]),
            }
        )

    analysis["history"] = history
    return _sanitize_json(analysis)


@app.get("/api/sync/status", summary="Get sync status and latest data date")
def get_sync_status() -> Dict[str, Any]:
    """Return the latest date in DB, current sync state, and auto-sync eligibility."""
    latest_date = get_latest_db_date(DB_PATH)
    now_ist = datetime.datetime.now(IST)
    needed, reason = should_trigger_auto_sync()
    return {
        "latest_date": latest_date,
        "is_syncing": is_syncing_flag or sync_lock.locked(),
        "current_ist_time": now_ist.strftime("%Y-%m-%d %H:%M:%S"),
        "auto_sync_needed": needed,
        "auto_sync_reason": reason,
    }


@app.post("/api/sync", summary="Synchronize all 11 indices with NSE official endpoints")
def post_sync(background: bool = True) -> Dict[str, Any]:
    """Trigger sync for all 11 indices from official NSE endpoints (background thread by default)."""
    if background:
        started = trigger_background_sync(years=7)
        if not started:
            return {
                "status": "already_syncing",
                "message": "A synchronization is already in progress.",
                "is_syncing": True,
            }
        return {
            "status": "started",
            "message": "Synchronization started in background thread.",
            "is_syncing": True,
        }
    else:
        # Synchronous execution with lock
        with sync_lock:
            global is_syncing_flag
            is_syncing_flag = True
            try:
                sync_all(years=7, db_path=DB_PATH)
            finally:
                is_syncing_flag = False
        return {"status": "ok", "indices_synced": len(INDICES)}
