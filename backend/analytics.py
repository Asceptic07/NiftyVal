import sqlite3
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import numpy as np
import pandas as pd

# Add project root to sys.path if not present
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.config import INDICES

DEFAULT_DB_PATH = PROJECT_ROOT / "data" / "indices.db"

WINDOW_ROWS = {
    "1Y": 252,
    "3Y": 756,
    "5Y": 1238,
    "7Y": 1738,
    "Max": None,
}

GROWTH_WINDOWS = {
    "1Y": (252, 1.0),
    "3Y": (756, 3.0),
    "5Y": (1238, 5.0),
    "7Y": (1738, 7.0),
}


def _resolve_db_path(db_path: Union[str, Path]) -> Path:
    p = Path(db_path)
    if not p.is_absolute():
        p = PROJECT_ROOT / p
    return p


def load_index_df(slug: str, db_path: Union[str, Path] = DEFAULT_DB_PATH) -> pd.DataFrame:
    """Load historical valuations for slug from SQLite sorted ascending by date, with eps computed."""
    resolved_path = _resolve_db_path(db_path)
    if not resolved_path.exists():
        raise FileNotFoundError(f"Database not found at {resolved_path}")

    conn = sqlite3.connect(resolved_path)
    df = pd.read_sql_query(
        "SELECT slug, date, close, pe, pb, div_yield FROM daily_valuations WHERE slug = ? ORDER BY date ASC",
        conn,
        params=(slug,),
    )
    conn.close()

    if df.empty:
        raise ValueError(f"No records found in database for slug '{slug}'")

    df["date"] = pd.to_datetime(df["date"])
    df["eps"] = np.where((df["pe"].notna()) & (df["pe"] > 0), df["close"] / df["pe"], np.nan)
    return df


def get_index_analysis(slug: str, db_path: Union[str, Path] = DEFAULT_DB_PATH) -> Dict[str, Any]:
    """Compute all NiftyVal valuation, earnings, forward return, and strategy metrics for slug."""
    if slug not in INDICES:
        raise ValueError(f"Unknown index slug '{slug}'. Must be one of {list(INDICES.keys())}")

    index_meta = INDICES[slug]
    nse_name = index_meta["nse_name"]
    etf = index_meta["etf"]
    cyclical = index_meta["cyclical"]

    df = load_index_df(slug, db_path=db_path)
    n_rows = len(df)

    latest_row = df.iloc[-1]
    latest_date_str = latest_row["date"].strftime("%Y-%m-%d")
    current_close = float(latest_row["close"]) if pd.notna(latest_row["close"]) else None
    current_pe = float(latest_row["pe"]) if pd.notna(latest_row["pe"]) else None
    current_pb = float(latest_row["pb"]) if pd.notna(latest_row["pb"]) else None
    current_div = float(latest_row["div_yield"]) if pd.notna(latest_row["div_yield"]) else None
    current_eps = float(latest_row["eps"]) if pd.notna(latest_row["eps"]) else None

    # 1. Window Stats (1Y, 3Y, 5Y, 7Y, Max)
    metrics = ["pe", "pb", "div_yield"]
    current_vals = {"pe": current_pe, "pb": current_pb, "div_yield": current_div}

    window_stats: Dict[str, Dict[str, Dict[str, Optional[float]]]] = {}
    for win_name, win_len in WINDOW_ROWS.items():
        sub_df = df if win_len is None else df.tail(min(n_rows, win_len))
        win_stat: Dict[str, Dict[str, Optional[float]]] = {}

        for m in metrics:
            s = sub_df[m].dropna()
            c_val = current_vals[m]
            if len(s) > 0 and c_val is not None:
                med = float(s.median())
                pct_vs_med = float((c_val - med) / med * 100.0) if med != 0 else 0.0
                percentile = float((s < c_val).mean() * 100.0)
                win_stat[m] = {
                    "median": round(med, 2),
                    "pct_vs_median": round(pct_vs_med, 1),
                    "percentile": round(percentile, 1),
                }
            else:
                win_stat[m] = {"median": None, "pct_vs_median": None, "percentile": None}

        window_stats[win_name] = win_stat

    # 2. Earnings & Price Growth (1Y, 3Y, 5Y, 7Y)
    growth: Dict[str, Dict[str, Optional[float]]] = {}
    for win_name, (days_back, years_denom) in GROWTH_WINDOWS.items():
        idx_then = max(0, n_rows - 1 - days_back) if win_name != "7Y" else 0
        row_then = df.iloc[idx_then]

        eps_then = row_then["eps"]
        close_then = row_then["close"]
        pe_then = row_then["pe"]

        # Calculate actual elapsed years between trading days or use window years
        eps_cagr = None
        if pd.notna(eps_then) and pd.notna(current_eps) and eps_then > 0 and current_eps > 0:
            eps_cagr = round(float(((current_eps / eps_then) ** (1.0 / years_denom) - 1.0) * 100.0), 2)

        close_cagr = None
        if pd.notna(close_then) and pd.notna(current_close) and close_then > 0 and current_close > 0:
            close_cagr = round(float(((current_close / close_then) ** (1.0 / years_denom) - 1.0) * 100.0), 2)

        growth[win_name] = {
            "eps_cagr": eps_cagr,
            "close_cagr": close_cagr,
            "pe_then": round(float(pe_then), 2) if pd.notna(pe_then) else None,
            "pe_now": round(float(current_pe), 2) if current_pe is not None else None,
        }

    # 3. 5Y Forward Return Band Analysis (within ±1.5 of current P/E)
    df_fwd = df.copy()
    df_fwd["fwd_5y_cagr"] = ((df_fwd["close"].shift(-1238) / df_fwd["close"]) ** (1.0 / 5.0) - 1.0) * 100.0

    if current_pe is not None:
        band_min = current_pe - 1.5
        band_max = current_pe + 1.5
        band_mask = (df_fwd["pe"] >= band_min) & (df_fwd["pe"] <= band_max) & df_fwd["fwd_5y_cagr"].notna()
        band_df = df_fwd[band_mask]
        sample_count = len(band_df)

        if sample_count > 0:
            med_fwd_cagr = round(float(band_df["fwd_5y_cagr"].median()), 2)
            pos_win_pct = round(float((band_df["fwd_5y_cagr"] > 0).mean() * 100.0), 1)
        else:
            med_fwd_cagr = None
            pos_win_pct = None
    else:
        band_min = None
        band_max = None
        sample_count = 0
        med_fwd_cagr = None
        pos_win_pct = None

    fwd_5y_band = {
        "band_min_pe": round(band_min, 2) if band_min is not None else None,
        "band_max_pe": round(band_max, 2) if band_max is not None else None,
        "sample_count": sample_count,
        "median_fwd_cagr": med_fwd_cagr,
        "positive_window_pct": pos_win_pct,
    }

    # 4. Strategy Signal
    pe_5y_pct = window_stats["5Y"]["pe"]["percentile"]
    pb_5y_pct = window_stats["5Y"]["pb"]["percentile"]
    eps_1y_cagr = growth["1Y"]["eps_cagr"]
    eps_5y_cagr = growth["5Y"]["eps_cagr"]

    signal = "SKIP"
    reason = ""

    pe_pct_val = pe_5y_pct if pe_5y_pct is not None else 100.0
    pb_pct_val = pb_5y_pct if pb_5y_pct is not None else 100.0
    eps_1y_val = eps_1y_cagr if eps_1y_cagr is not None else -999.0
    eps_5y_val = eps_5y_cagr if eps_5y_cagr is not None else -999.0

    if (
        pe_pct_val <= 25.0
        and eps_1y_val > 0
        and eps_5y_val > 0
        and (not cyclical or pb_pct_val <= 35.0)
    ):
        signal = "BUY"
        reason = f"5Y P/E at {pe_pct_val:.1f}th pct (<=25%), EPS growing (1Y: {eps_1y_val:+.1f}%, 5Y: {eps_5y_val:+.1f}%)"
    elif (
        pe_pct_val <= 32.0
        and eps_1y_val > 0
        and cyclical
        and pb_pct_val > 35.0
    ):
        signal = "HALF-TRANCHE"
        reason = f"Cyclical 5Y P/E at {pe_pct_val:.1f}th pct (<=32%) & EPS growing, but 5Y P/B at {pb_pct_val:.1f}th pct (>35%)"
    else:
        signal = "SKIP"
        reasons: List[str] = []
        if pe_pct_val > 25.0:
            reasons.append(f"P/E {pe_pct_val:.1f}th pct > 25th pct")
        if eps_1y_val <= 0:
            reasons.append(f"1Y EPS growth negative ({eps_1y_val:+.1f}%)")
        if eps_5y_val <= 0:
            reasons.append(f"5Y EPS growth negative ({eps_5y_val:+.1f}%)")
        if cyclical and pb_pct_val > 35.0 and pe_pct_val <= 25.0:
            reasons.append(f"Cyclical P/B {pb_pct_val:.1f}th pct > 35th pct")
        reason = "; ".join(reasons) if reasons else "Valuation criteria not met"

    strategy = {
        "signal": signal,
        "reason": reason,
        "pe_5y_pct": pe_5y_pct,
        "pb_5y_pct": pb_5y_pct,
        "eps_1y_cagr": eps_1y_cagr,
        "eps_5y_cagr": eps_5y_cagr,
    }

    return {
        "slug": slug,
        "nse_name": nse_name,
        "etf": etf,
        "cyclical": cyclical,
        "latest_date": latest_date_str,
        "close": current_close,
        "pe": current_pe,
        "pb": current_pb,
        "div_yield": current_div,
        "eps": round(current_eps, 2) if current_eps is not None else None,
        "window_stats": window_stats,
        "growth": growth,
        "fwd_5y_band": fwd_5y_band,
        "strategy": strategy,
    }


def get_basket_summary(db_path: Union[str, Path] = DEFAULT_DB_PATH) -> List[Dict[str, Any]]:
    """Compute summary analysis for all 11 indices sorted ascending by 5Y P/E percentile."""
    summaries = []
    for slug in INDICES.keys():
        an = get_index_analysis(slug, db_path=db_path)
        summaries.append(
            {
                "slug": slug,
                "nse_name": an["nse_name"],
                "etf": an["etf"],
                "cyclical": an["cyclical"],
                "date": an["latest_date"],
                "close": an["close"],
                "pe": an["pe"],
                "pb": an["pb"],
                "div_yield": an["div_yield"],
                "5y_med_pe": an["window_stats"]["5Y"]["pe"]["median"],
                "vs_med%": an["window_stats"]["5Y"]["pe"]["pct_vs_median"],
                "pe_5y_pct": an["strategy"]["pe_5y_pct"],
                "pb_5y_pct": an["strategy"]["pb_5y_pct"],
                "eps_1y%": an["strategy"]["eps_1y_cagr"],
                "eps_5y%": an["strategy"]["eps_5y_cagr"],
                "signal": an["strategy"]["signal"],
                "reason": an["strategy"]["reason"],
            }
        )

    # Sort ascending by 5Y P/E percentile (None values placed last)
    summaries.sort(key=lambda x: (x["pe_5y_pct"] is None, x["pe_5y_pct"]))
    return summaries


if __name__ == "__main__":
    print("\n" + "=" * 115)
    print("NIFTYVAL BASKET SUMMARY (SORTED BY 5Y P/E PERCENTILE)")
    print("=" * 115)

    basket = get_basket_summary()
    df_summary = pd.DataFrame(basket)

    display_cols = [
        "slug",
        "etf",
        "pe",
        "5y_med_pe",
        "vs_med%",
        "pe_5y_pct",
        "pb_5y_pct",
        "eps_1y%",
        "eps_5y%",
        "signal",
    ]
    print(df_summary.to_string(index=False, columns=display_cols))
    print("=" * 115)

    # Print detailed breakdowns for nifty-metal and nifty-it
    for test_slug in ["nifty-metal", "nifty-it"]:
        an = get_index_analysis(test_slug)
        print(f"\n" + "-" * 70)
        print(f"DETAILED ANALYSIS: {an['slug'].upper()} ({an['nse_name']} / {an['etf']})")
        print(f"Cyclical: {an['cyclical']} | Latest Date: {an['latest_date']}")
        print(f"Current Metrics: Close={an['close']}, P/E={an['pe']}, P/B={an['pb']}, Div Yield={an['div_yield']}%, EPS={an['eps']}")
        print("-" * 70)

        print("\n[Window Statistics (5Y Window = 1238 Trading Days)]:")
        for metric in ["pe", "pb", "div_yield"]:
            stat = an["window_stats"]["5Y"][metric]
            print(f"  {metric.upper():10}: Median = {stat['median']}, vs Median = {stat['pct_vs_median']:+6.1f}%, Percentile = {stat['percentile']:5.1f}%")

        print("\n[Earnings & Price Annualized Growth]:")
        for win, g in an["growth"].items():
            print(f"  {win:4}: EPS CAGR = {g['eps_cagr']:+6.2f}%, Close CAGR = {g['close_cagr']:+6.2f}%, PE Then = {g['pe_then']}, PE Now = {g['pe_now']}")

        fwd = an["fwd_5y_band"]
        print(f"\n[5Y Forward Return Band (PE within ±1.5 of {an['pe']})]:")
        print(f"  PE Range: [{fwd['band_min_pe']} - {fwd['band_max_pe']}] | Samples: {fwd['sample_count']}")
        print(f"  Median 5Y Forward CAGR: {fwd['median_fwd_cagr']}% | Positive 5Y Windows: {fwd['positive_window_pct']}%")

        sig = an["strategy"]
        print(f"\n[Strategy Signal]:")
        print(f"  Signal: >>> {sig['signal']} <<<")
        print(f"  Reason: {sig['reason']}")
        print("-" * 70)
