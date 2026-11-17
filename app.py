import datetime
import os
import sqlite3
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import streamlit as st

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.config import INDICES
from backend.fetcher import DB_PATH, get_date_bounds, init_db, sync_all, sync_index
from backend.analytics import (
    get_basket_summary,
    get_index_analysis,
    load_index_df,
)

# -----------------------------------------------------------------------------
# Streamlit Page Config
# -----------------------------------------------------------------------------
st.set_page_config(
    page_title="IndexPE - Sectoral Valuation & ETF Strategy Engine",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom Styling for Dark Mode UI
st.markdown(
    """
    <style>
    /* Metric Card Styling */
    .metric-card {
        background-color: #161B22;
        border: 1px solid #30363D;
        border-radius: 8px;
        padding: 16px 20px;
        margin-bottom: 12px;
    }
    .metric-label {
        font-size: 0.85rem;
        color: #8B949E;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 4px;
    }
    .metric-value {
        font-size: 1.6rem;
        font-weight: 700;
        color: #F0F6FC;
    }
    .metric-sub {
        font-size: 0.82rem;
        margin-top: 4px;
    }

    /* Signal Badges */
    .badge-buy {
        background-color: rgba(16, 185, 129, 0.15);
        color: #10B981;
        border: 1px solid #10B981;
        padding: 3px 10px;
        border-radius: 6px;
        font-weight: 700;
        font-size: 0.85rem;
        display: inline-block;
    }
    .badge-half {
        background-color: rgba(245, 158, 11, 0.15);
        color: #F59E0B;
        border: 1px solid #F59E0B;
        padding: 3px 10px;
        border-radius: 6px;
        font-weight: 700;
        font-size: 0.85rem;
        display: inline-block;
    }
    .badge-skip {
        background-color: rgba(107, 114, 128, 0.15);
        color: #9CA3AF;
        border: 1px solid #4B5563;
        padding: 3px 10px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 0.85rem;
        display: inline-block;
    }

    /* Subtle dividers and table spacing */
    hr {
        border-color: #30363D;
        margin: 20px 0;
    }
    </style>
    """,
    unsafe_allow_html=True,
)


# -----------------------------------------------------------------------------
# Data Loading & Sync Utilities
# -----------------------------------------------------------------------------
@st.cache_data(ttl=300)
def load_basket_data():
    """Load cached basket summary strictly from SQLite."""
    return get_basket_summary(db_path=DB_PATH)


@st.cache_data(ttl=300)
def load_index_deepdive(slug: str):
    """Load detailed analysis for a specific index strictly from SQLite."""
    return get_index_analysis(slug, db_path=DB_PATH)


@st.cache_data(ttl=300)
def load_raw_timeseries(slug: str):
    """Load raw historical time-series dataframe."""
    return load_index_df(slug, db_path=DB_PATH)


def check_db_status():
    """Check database health, row count, and max date."""
    if not DB_PATH.exists():
        return False, 0, None
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*), MAX(date) FROM daily_valuations")
        row = cursor.fetchone()
        conn.close()
        if row and row[0] > 0:
            return True, row[0], row[1]
    except Exception:
        pass
    return False, 0, None


# -----------------------------------------------------------------------------
# Sidebar
# -----------------------------------------------------------------------------
with st.sidebar:
    st.title("IndexPE")
    st.caption("Sectoral Valuation & ETF Allocation Engine")
    st.markdown("---")

    db_ready, total_rows, max_db_date = check_db_status()

    st.subheader("Database Status")
    if db_ready:
        st.success(f"Connected (`indices.db`)")
        st.markdown(f"**Records:** `{total_rows:,}` daily valuations")
        st.markdown(f"**Latest Date:** `{max_db_date}`")
    else:
        st.error("Database missing or uninitialized.")

    st.markdown("---")
    st.subheader("Data Synchronization")
    st.caption("Fetch latest official valuation and price records from NSE.")

    sync_years = st.slider("Historical Window (Years)", min_value=1, max_value=7, value=7)

    if st.button("Sync Data from NSE", use_container_width=True, type="primary"):
        progress_bar = st.progress(0.0)
        status_text = st.empty()

        def update_progress(current, total, slug):
            pct = current / total
            progress_bar.progress(pct)
            status_text.text(f"Syncing [{current}/{total}]: {slug}...")

        try:
            with st.spinner("Synchronizing indices from NSE..."):
                sync_all(years=sync_years, progress_callback=update_progress, db_path=DB_PATH)
            st.cache_data.clear()
            st.success("All indices synchronized successfully!")
            st.rerun()
        except Exception as e:
            st.error(f"Sync failed: {e}")

    st.markdown("---")
    st.subheader("Filter Basket")
    signal_filter = st.multiselect(
        "Filter by Signal",
        options=["BUY", "HALF-TRANCHE", "SKIP"],
        default=["BUY", "HALF-TRANCHE", "SKIP"],
    )

    type_filter = st.radio(
        "Index Nature",
        options=["All", "Cyclical Only", "Non-Cyclical Only"],
        index=0,
    )

    st.markdown("---")
    st.caption("Data source: NSE India & Nifty Indices Official Endpoints. Strict zero-placeholder rule enforced.")


# -----------------------------------------------------------------------------
# Main Dashboard
# -----------------------------------------------------------------------------
st.title("Sectoral Valuation & ETF Decision Engine")
st.markdown(
    "Live historical valuation percentiles, multi-year earnings CAGR, forward-return distributions, "
    "and rule-based allocation signals computed directly from **NSE official daily records**."
)

if not db_ready:
    st.warning("Database has not been populated yet. Please click **'Sync Data from NSE'** in the sidebar to fetch real data.")
    st.stop()

# Load Basket
try:
    basket_data = load_basket_data()
except Exception as e:
    st.error(f"Error loading basket analysis: {e}")
    st.stop()

# Apply Filters
filtered_basket = []
for item in basket_data:
    if item["signal"] not in signal_filter:
        continue
    if type_filter == "Cyclical Only" and not item["cyclical"]:
        continue
    if type_filter == "Non-Cyclical Only" and item["cyclical"]:
        continue
    filtered_basket.append(item)

# -----------------------------------------------------------------------------
# KPI Overview Metrics
# -----------------------------------------------------------------------------
buy_count = sum(1 for x in basket_data if x["signal"] == "BUY")
half_count = sum(1 for x in basket_data if x["signal"] == "HALF-TRANCHE")
skip_count = sum(1 for x in basket_data if x["signal"] == "SKIP")
most_undervalued = basket_data[0] if basket_data else None

kpi1, kpi2, kpi3, kpi4, kpi5 = st.columns(5)

with kpi1:
    st.markdown(
        f"""
        <div class="metric-card">
            <div class="metric-label">Tracked Indices</div>
            <div class="metric-value">{len(basket_data)}</div>
            <div class="metric-sub" style="color: #38BDF8;">All 11 Core Slugs</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

with kpi2:
    st.markdown(
        f"""
        <div class="metric-card">
            <div class="metric-label">BUY Opportunities</div>
            <div class="metric-value" style="color: #10B981;">{buy_count}</div>
            <div class="metric-sub" style="color: #10B981;">5Y PE &le; 25% + EPS Growth</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

with kpi3:
    st.markdown(
        f"""
        <div class="metric-card">
            <div class="metric-label">Half-Tranche</div>
            <div class="metric-value" style="color: #F59E0B;">{half_count}</div>
            <div class="metric-sub" style="color: #F59E0B;">Cyclical PE &le; 32% (P/B &gt; 35%)</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

with kpi4:
    st.markdown(
        f"""
        <div class="metric-card">
            <div class="metric-label">Neutral / Skip</div>
            <div class="metric-value" style="color: #9CA3AF;">{skip_count}</div>
            <div class="metric-sub" style="color: #8B949E;">Overvalued or EPS Headwinds</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

with kpi5:
    undervalued_text = f"{most_undervalued['etf']} ({most_undervalued['pe_5y_pct']}%)" if most_undervalued else "N/A"
    st.markdown(
        f"""
        <div class="metric-card">
            <div class="metric-label">Deepest Value</div>
            <div class="metric-value" style="font-size: 1.3rem; color: #38BDF8;">{undervalued_text}</div>
            <div class="metric-sub" style="color: #8B949E;">Lowest 5Y P/E Percentile</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

st.markdown("<hr>", unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# Section 1: Basket Summary Table
# -----------------------------------------------------------------------------
st.subheader("NSE Index Valuation Basket")
st.caption("Sorted ascending by 5Y P/E percentile (Deepest Value first).")

if not filtered_basket:
    st.info("No indices match the selected filters.")
else:
    table_rows = []
    for item in filtered_basket:
        signal = item["signal"]
        if signal == "BUY":
            badge = f'<span class="badge-buy">BUY</span>'
        elif signal == "HALF-TRANCHE":
            badge = f'<span class="badge-half">HALF-TRANCHE</span>'
        else:
            badge = f'<span class="badge-skip">SKIP</span>'

        table_rows.append(
            {
                "Index": f"<b>{item['nse_name']}</b><br><small style='color:#8B949E;'>{item['slug']}</small>",
                "ETF": f"<code>{item['etf']}</code>",
                "Cyclical": "Yes" if item["cyclical"] else "No",
                "Current P/E": f"{item['pe']:.2f}" if item["pe"] else "N/A",
                "5Y Med P/E": f"{item['5y_med_pe']:.2f}" if item["5y_med_pe"] else "N/A",
                "vs Med (%)": f"{item['vs_med%']:+.1f}%" if item["vs_med%"] is not None else "N/A",
                "5Y P/E Pct": f"<b>{item['pe_5y_pct']:.1f}%</b>" if item["pe_5y_pct"] is not None else "N/A",
                "5Y P/B Pct": f"{item['pb_5y_pct']:.1f}%" if item["pb_5y_pct"] is not None else "N/A",
                "1Y EPS (%)": f"{item['eps_1y%']:+.1f}%" if item["eps_1y%"] is not None else "N/A",
                "5Y EPS (%)": f"{item['eps_5y%']:+.1f}%" if item["eps_5y%"] is not None else "N/A",
                "Signal": badge,
                "Strategy Reason": item["reason"],
            }
        )

    df_table = pd.DataFrame(table_rows)
    st.write(
        df_table.to_html(escape=False, index=False),
        unsafe_allow_html=True,
    )

st.markdown("<hr>", unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# Section 2: Valuation Percentile Visualization (Plotly)
# -----------------------------------------------------------------------------
st.subheader("Valuation Percentile Spectrum (5-Year Window)")
st.caption("Visualizing where each index stands relative to its 5-year valuation history.")

chart_df = pd.DataFrame(basket_data).sort_values("pe_5y_pct", ascending=True)

colors = []
for _, r in chart_df.iterrows():
    if r["signal"] == "BUY":
        colors.append("#10B981")
    elif r["signal"] == "HALF-TRANCHE":
        colors.append("#F59E0B")
    else:
        colors.append("#6B7280")

fig_bar = go.Figure()

fig_bar.add_trace(
    go.Bar(
        x=chart_df["pe_5y_pct"],
        y=[f"{name} ({etf})" for name, etf in zip(chart_df["nse_name"], chart_df["etf"])],
        orientation="h",
        marker=dict(color=colors, line=dict(color="#30363D", width=1)),
        text=[f"{pct:.1f}% [{sig}]" for pct, sig in zip(chart_df["pe_5y_pct"], chart_df["signal"])],
        textposition="outside",
        hovertemplate="<b>%{y}</b><br>5Y P/E Percentile: <b>%{x:.1f}%</b><br><extra></extra>",
    )
)

# Valuation Threshold Lines
fig_bar.add_vline(x=25, line_width=1.5, line_dash="dash", line_color="#10B981", annotation_text="Buy Threshold (25%)", annotation_position="top right")
fig_bar.add_vline(x=32, line_width=1.5, line_dash="dot", line_color="#F59E0B", annotation_text="Half-Tranche Threshold (32%)", annotation_position="top right")

fig_bar.update_layout(
    template="plotly_dark",
    paper_bgcolor="#161B22",
    plot_bgcolor="#161B22",
    height=480,
    margin=dict(l=40, r=40, t=30, b=40),
    xaxis=dict(title="5-Year P/E Percentile (%)", range=[0, 110], gridcolor="#21262D"),
    yaxis=dict(autorange="reversed", gridcolor="#21262D"),
)

st.plotly_chart(fig_bar, use_container_width=True)

st.markdown("<hr>", unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# Section 3: Index Deep-Dive & Historical Analysis
# -----------------------------------------------------------------------------
st.subheader("Index Deep-Dive & Historical Valuation Trajectory")
st.caption("Inspect granular valuation trends, multi-window percentiles, and forward return distributions.")

col_sel1, col_sel2 = st.columns([2, 3])
with col_sel1:
    selected_slug = st.selectbox(
        "Select Index to Inspect",
        options=list(INDICES.keys()),
        format_func=lambda s: f"{INDICES[s]['nse_name']} ({INDICES[s]['etf']})",
        index=0,
    )

analysis = load_index_deepdive(selected_slug)
df_ts = load_raw_timeseries(selected_slug)

# Header summary for selected index
meta = INDICES[selected_slug]
hcol1, hcol2, hcol3, hcol4, hcol5 = st.columns(5)
hcol1.metric("Close Price", f"{analysis['close']:,.2f}", f"As of {analysis['latest_date']}")
hcol2.metric("Current P/E", f"{analysis['pe']:.2f}", f"5Y Med: {analysis['window_stats']['5Y']['pe']['median']}")
hcol3.metric("Current P/B", f"{analysis['pb']:.2f}", f"5Y Med: {analysis['window_stats']['5Y']['pb']['median']}")
hcol4.metric("Div Yield", f"{analysis['div_yield']:.2f}%", f"5Y Med: {analysis['window_stats']['5Y']['div_yield']['median']}%")
hcol5.metric("Derived EPS", f"{analysis['eps']:,.2f}", f"1Y EPS: {analysis['growth']['1Y']['eps_cagr']:+.1f}%")

# Decision Logic Banner
sig = analysis["strategy"]
if sig["signal"] == "BUY":
    st.success(f"**Strategy Decision: BUY** — {sig['reason']}")
elif sig["signal"] == "HALF-TRANCHE":
    st.warning(f"**Strategy Decision: HALF-TRANCHE** — {sig['reason']}")
else:
    st.info(f"**Strategy Decision: SKIP** — {sig['reason']}")

tab1, tab2, tab3 = st.tabs(["Interactive Valuation Chart", "Multi-Window Percentiles & Growth", "5Y Forward Return Band"])

with tab1:
    # Dual-Axis Plotly Chart: Close Price & P/E with 5Y Median
    fig_ts = make_subplots(specs=[[{"secondary_y": True}]])

    fig_ts.add_trace(
        go.Scatter(
            x=df_ts["date"],
            y=df_ts["close"],
            name="Close Price",
            line=dict(color="#38BDF8", width=1.8),
        ),
        secondary_y=False,
    )

    fig_ts.add_trace(
        go.Scatter(
            x=df_ts["date"],
            y=df_ts["pe"],
            name="P/E Ratio",
            line=dict(color="#F59E0B", width=1.5),
        ),
        secondary_y=True,
    )

    # Add 5Y Median PE Horizontal Line
    med_5y = analysis["window_stats"]["5Y"]["pe"]["median"]
    if med_5y:
        fig_ts.add_hline(
            y=med_5y,
            line_dash="dash",
            line_color="#E5E7EB",
            secondary_y=True,
            annotation_text=f"5Y Median P/E ({med_5y})",
            annotation_position="bottom right",
        )

    fig_ts.update_layout(
        template="plotly_dark",
        paper_bgcolor="#161B22",
        plot_bgcolor="#161B22",
        height=480,
        margin=dict(l=40, r=40, t=30, b=40),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
    )
    fig_ts.update_xaxes(title_text="Date", gridcolor="#21262D")
    fig_ts.update_yaxes(title_text="Index Close Price", secondary_y=False, gridcolor="#21262D")
    fig_ts.update_yaxes(title_text="P/E Ratio", secondary_y=True, gridcolor="#21262D")

    st.plotly_chart(fig_ts, use_container_width=True)

with tab2:
    col_w1, col_w2 = st.columns(2)

    with col_w1:
        st.markdown("##### Multi-Window Valuation Percentiles")
        win_rows = []
        for win, metrics in analysis["window_stats"].items():
            win_rows.append(
                {
                    "Window": win,
                    "P/E Median": metrics["pe"]["median"],
                    "P/E Pct": f"{metrics['pe']['percentile']:.1f}%" if metrics['pe']['percentile'] is not None else "N/A",
                    "P/B Median": metrics["pb"]["median"],
                    "P/B Pct": f"{metrics['pb']['percentile']:.1f}%" if metrics['pb']['percentile'] is not None else "N/A",
                    "Div Yield Med": f"{metrics['div_yield']['median']}%" if metrics['div_yield']['median'] is not None else "N/A",
                    "Div Yield Pct": f"{metrics['div_yield']['percentile']:.1f}%" if metrics['div_yield']['percentile'] is not None else "N/A",
                }
            )
        st.dataframe(pd.DataFrame(win_rows), hide_index=True, use_container_width=True)

    with col_w2:
        st.markdown("##### Annualized Earnings & Price Growth")
        growth_rows = []
        for win, g in analysis["growth"].items():
            growth_rows.append(
                {
                    "Window": win,
                    "EPS CAGR (%)": f"{g['eps_cagr']:+.2f}%" if g["eps_cagr"] is not None else "N/A",
                    "Close CAGR (%)": f"{g['close_cagr']:+.2f}%" if g["close_cagr"] is not None else "N/A",
                    "P/E Then": g["pe_then"],
                    "P/E Now": g["pe_now"],
                }
            )
        st.dataframe(pd.DataFrame(growth_rows), hide_index=True, use_container_width=True)

with tab3:
    st.markdown("##### 5-Year Forward Return Distribution")
    st.caption(
        f"Historical 5-year CAGR outcomes for trading days when {analysis['nse_name']} traded within ±1.5 of its current P/E ({analysis['pe']:.2f})."
    )

    fwd = analysis["fwd_5y_band"]
    f1, f2, f3, f4 = st.columns(4)
    f1.metric("P/E Evaluation Band", f"{fwd['band_min_pe']} - {fwd['band_max_pe']}")
    f2.metric("Historical Trading Samples", f"{fwd['sample_count']}")
    f3.metric("Median 5Y Forward CAGR", f"{fwd['median_fwd_cagr']:+.2f}%" if fwd["median_fwd_cagr"] is not None else "N/A")
    f4.metric("Positive Window Probability", f"{fwd['positive_window_pct']:.1f}%" if fwd["positive_window_pct"] is not None else "N/A")

    if fwd["sample_count"] > 0:
        st.info(
            f"Historically, buying {analysis['nse_name']} around **P/E {analysis['pe']:.2f}** yielded a median 5-year return of **{fwd['median_fwd_cagr']:+.2f}% CAGR**, "
            f"with **{fwd['positive_window_pct']:.1f}%** of 5-year holding periods ending in positive territory."
        )
    else:
        st.warning("Insufficient historical forward samples available in this valuation band.")
