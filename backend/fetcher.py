import datetime
import os
import sqlite3
import sys
import time
from pathlib import Path
from typing import Callable, Optional, Tuple

import numpy as np
import nsepython
import pandas as pd

# Add project root to sys.path if not present
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.config import INDICES

DB_DIR = PROJECT_ROOT / "data"
DB_PATH = DB_DIR / "indices.db"


def init_db(db_path: Path = DB_PATH) -> None:
    """Initialize the SQLite database and create the table if missing."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS daily_valuations (
            slug TEXT,
            date TEXT,
            close REAL,
            pe REAL,
            pb REAL,
            div_yield REAL,
            PRIMARY KEY (slug, date)
        )
        """
    )
    conn.commit()
    conn.close()


def get_date_bounds(slug: str, db_path: Path = DB_PATH) -> Tuple[Optional[str], Optional[str]]:
    """Return (min_date, max_date) in YYYY-MM-DD format for a given slug, or (None, None)."""
    init_db(db_path)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT MIN(date), MAX(date) FROM daily_valuations WHERE slug = ?", (slug,)
    )
    row = cursor.fetchone()
    conn.close()
    if row and row[0] and row[1]:
        return row[0], row[1]
    return None, None


def get_max_date(slug: str, db_path: Path = DB_PATH) -> Optional[str]:
    """Return the maximum date (YYYY-MM-DD) stored for the given slug, or None."""
    _, max_date = get_date_bounds(slug, db_path)
    return max_date


def fetch_pe_pb(nse_name: str, start_str: str, end_str: str, retries: int = 2) -> Optional[pd.DataFrame]:
    """Fetch valuation data using nsepython, handling NSE index aliases if needed."""
    candidates = [nse_name]
    if nse_name == "NIFTY SMALLCAP 250":
        # niftyindices valuation endpoint indexes smallcap 250 under 'NIFTY SMLCAP 250'
        candidates.append("NIFTY SMLCAP 250")

    for attempt in range(retries):
        for name in candidates:
            try:
                df = nsepython.index_pe_pb_div(name, start_str, end_str)
                if df is not None and not df.empty:
                    return df
            except Exception as e:
                if attempt == retries - 1:
                    print(f"    [Valuation attempt {attempt + 1}] Error for '{name}': {e}")
                time.sleep(1.0)
    return None


def fetch_history(nse_name: str, start_str: str, end_str: str, retries: int = 2) -> Optional[pd.DataFrame]:
    """Fetch price history data using nsepython."""
    for attempt in range(retries):
        try:
            df = nsepython.index_history(nse_name, start_str, end_str)
            if df is not None and not df.empty:
                return df
        except Exception as e:
            if attempt == retries - 1:
                print(f"    [History attempt {attempt + 1}] Error for '{nse_name}': {e}")
            time.sleep(1.0)
    return None


def _normalize_and_merge(
    df_pe: Optional[pd.DataFrame],
    df_hist: Optional[pd.DataFrame],
    is_first_chunk: bool = False,
) -> pd.DataFrame:
    """Normalize raw nsepython valuation and price DataFrames to canonical schema and merge on date."""
    if is_first_chunk:
        print(f"Raw Valuation DataFrame columns: {list(df_pe.columns) if df_pe is not None else None}")
        print(f"Raw Price History DataFrame columns: {list(df_hist.columns) if df_hist is not None else None}")

    # Valuation dataframe normalization
    val_df = pd.DataFrame(columns=["date", "pe", "pb", "div_yield"])
    if df_pe is not None and not df_pe.empty:
        cols_lower = {str(c).strip().lower(): c for c in df_pe.columns}
        date_col = (
            cols_lower.get("date")
            or cols_lower.get("historicaldate")
            or cols_lower.get("historical date")
        )
        pe_col = cols_lower.get("pe") or cols_lower.get("p/e")
        pb_col = cols_lower.get("pb") or cols_lower.get("p/b")
        div_col = (
            cols_lower.get("divyield")
            or cols_lower.get("div yield")
            or cols_lower.get("div_yield")
            or cols_lower.get("dividend yield")
        )

        if is_first_chunk:
            print(
                f"Normalized Valuation mapping: Date='{date_col}', P/E='{pe_col}', P/B='{pb_col}', Div Yield='{div_col}'"
            )

        temp_val = pd.DataFrame()
        if date_col:
            temp_val["date"] = pd.to_datetime(
                df_pe[date_col], format="mixed"
            ).dt.strftime("%Y-%m-%d")
        else:
            temp_val["date"] = pd.Series(dtype=str)

        temp_val["pe"] = pd.to_numeric(df_pe[pe_col], errors="coerce") if pe_col else None
        temp_val["pb"] = pd.to_numeric(df_pe[pb_col], errors="coerce") if pb_col else None
        temp_val["div_yield"] = pd.to_numeric(df_pe[div_col], errors="coerce") if div_col else None

        val_df = temp_val.dropna(subset=["date"]).drop_duplicates(subset=["date"])

    # Price history dataframe normalization
    hist_df = pd.DataFrame(columns=["date", "close"])
    if df_hist is not None and not df_hist.empty:
        cols_lower = {str(c).strip().lower(): c for c in df_hist.columns}
        hist_date_col = (
            cols_lower.get("historicaldate")
            or cols_lower.get("date")
            or cols_lower.get("historical date")
        )
        close_col = (
            cols_lower.get("close")
            or cols_lower.get("closing price")
            or cols_lower.get("closing")
        )

        if is_first_chunk:
            print(
                f"Normalized Price History mapping: Date='{hist_date_col}', Close='{close_col}'"
            )

        temp_hist = pd.DataFrame()
        if hist_date_col:
            temp_hist["date"] = pd.to_datetime(
                df_hist[hist_date_col], format="mixed"
            ).dt.strftime("%Y-%m-%d")
        else:
            temp_hist["date"] = pd.Series(dtype=str)

        temp_hist["close"] = (
            pd.to_numeric(df_hist[close_col], errors="coerce") if close_col else None
        )

        hist_df = temp_hist.dropna(subset=["date"]).drop_duplicates(subset=["date"])

    # Merge on date
    if not val_df.empty and not hist_df.empty:
        merged = pd.merge(hist_df, val_df, on="date", how="outer")
    elif not val_df.empty:
        merged = val_df
        merged["close"] = None
    elif not hist_df.empty:
        merged = hist_df
        merged["pe"] = None
        merged["pb"] = None
        merged["div_yield"] = None
    else:
        merged = pd.DataFrame(columns=["date", "close", "pe", "pb", "div_yield"])

    return merged.sort_values("date").reset_index(drop=True)


def sync_index(slug: str, years: int = 5, db_path: Path = DB_PATH) -> int:
    """Sync historical daily valuations and close prices for an index slug into SQLite."""
    if slug not in INDICES:
        raise ValueError(f"Unknown index slug: '{slug}'. Must be one of {list(INDICES.keys())}")

    nse_name = INDICES[slug]["nse_name"]
    init_db(db_path)
    today = datetime.date.today()
    target_start = today - datetime.timedelta(days=years * 365)
    min_date, max_date = get_date_bounds(slug, db_path)

    chunks = []
    if min_date is None or max_date is None:
        # Full history fetch across the requested years
        curr_start = target_start
        while curr_start < today:
            curr_end = min(today, curr_start + datetime.timedelta(days=365))
            chunks.append((curr_start, curr_end))
            curr_start = curr_end + datetime.timedelta(days=1)
    else:
        min_dt = datetime.datetime.strptime(min_date, "%Y-%m-%d").date()
        max_dt = datetime.datetime.strptime(max_date, "%Y-%m-%d").date()

        # 1. Backfill older window if target_start is earlier than current min_dt
        if target_start < min_dt:
            curr_start = target_start
            while curr_start < min_dt:
                curr_end = min(min_dt, curr_start + datetime.timedelta(days=365))
                chunks.append((curr_start, curr_end))
                curr_start = curr_end + datetime.timedelta(days=1)

        # 2. Forward sync latest window up to today
        forward_start = max(target_start, max_dt - datetime.timedelta(days=5))
        if forward_start <= today:
            curr_start = forward_start
            while curr_start < today:
                curr_end = min(today, curr_start + datetime.timedelta(days=365))
                chunks.append((curr_start, curr_end))
                curr_start = curr_end + datetime.timedelta(days=1)
            if not chunks and forward_start <= today:
                chunks.append((forward_start, today))

    total_inserted = 0
    first_chunk = (min_date is None)

    print(f"Syncing '{slug}' ({nse_name}) across {len(chunks)} chunk(s)...")

    for idx, (chunk_start, chunk_end) in enumerate(chunks):
        start_str = chunk_start.strftime("%d-%b-%Y")
        end_str = chunk_end.strftime("%d-%b-%Y")
        print(f"  Fetching chunk {idx + 1}/{len(chunks)}: {start_str} to {end_str}")

        df_pe = fetch_pe_pb(nse_name, start_str, end_str)
        df_hist = fetch_history(nse_name, start_str, end_str)

        merged = _normalize_and_merge(df_pe, df_hist, is_first_chunk=first_chunk)
        first_chunk = False

        if not merged.empty:
            records = []
            for _, row in merged.iterrows():
                date_val = str(row["date"])
                close_val = float(row["close"]) if pd.notna(row["close"]) else None
                pe_val = float(row["pe"]) if pd.notna(row["pe"]) else None
                pb_val = float(row["pb"]) if pd.notna(row["pb"]) else None
                div_val = float(row["div_yield"]) if pd.notna(row["div_yield"]) else None
                records.append((slug, date_val, close_val, pe_val, pb_val, div_val))

            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.executemany(
                """
                INSERT OR REPLACE INTO daily_valuations (slug, date, close, pe, pb, div_yield)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                records,
            )
            conn.commit()
            conn.close()
            total_inserted += len(records)
            print(f"    Upserted {len(records)} records.")
        else:
            print("    No records found for chunk.")

        if idx < len(chunks) - 1:
            time.sleep(1.0)

    return total_inserted


def sync_all(
    years: int = 7,
    progress_callback: Optional[Callable[[int, int, str], None]] = None,
    db_path: Path = DB_PATH,
) -> None:
    """Sync all 11 indices defined in config.py into SQLite."""
    total = len(INDICES)
    print(f"=== Starting sync_all for {total} indices ({years} years) ===")

    for idx, slug in enumerate(INDICES.keys()):
        print(f"\n[{idx + 1}/{total}] Processing index: {slug}")
        sync_index(slug, years=years, db_path=db_path)
        if progress_callback:
            progress_callback(idx + 1, total, slug)
        time.sleep(1.0)

    print("\n=== sync_all completed successfully ===")


if __name__ == "__main__":
    sync_all(years=7)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    rows = []
    for slug, info in INDICES.items():
        etf = info["etf"]
        cursor.execute(
            """
            SELECT COUNT(*), MIN(date), MAX(date)
            FROM daily_valuations
            WHERE slug = ?
            """,
            (slug,),
        )
        count, min_date, max_date = cursor.fetchone()

        cursor.execute(
            """
            SELECT pe, pb
            FROM daily_valuations
            WHERE slug = ? AND pe IS NOT NULL AND pb IS NOT NULL
            ORDER BY date DESC
            LIMIT 1
            """,
            (slug,),
        )
        latest_row = cursor.fetchone()
        latest_pe = round(latest_row[0], 2) if latest_row and latest_row[0] is not None else None
        latest_pb = round(latest_row[1], 2) if latest_row and latest_row[1] is not None else None

        rows.append(
            {
                "slug": slug,
                "etf": etf,
                "row_count": count,
                "min_date": min_date,
                "max_date": max_date,
                "latest_pe": latest_pe,
                "latest_pb": latest_pb,
            }
        )

    conn.close()

    summary_df = pd.DataFrame(rows)
    print("\n" + "=" * 90)
    print("INDICES HISTORICAL VALUATIONS SUMMARY (7 YEARS)")
    print("=" * 90)
    print(
        summary_df.to_string(
            index=False,
            columns=["slug", "etf", "row_count", "min_date", "max_date", "latest_pe", "latest_pb"],
        )
    )
    print("=" * 90)
