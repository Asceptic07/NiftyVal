# NiftyVal — NSE Sectoral Valuation & ETF Analytics Workstation

A production-grade quantitative valuation terminal and ETF portfolio analytics engine for the National Stock Exchange of India (NSE). Built with **FastAPI**, **SQLite**, **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Recharts**.

---

## 📌 Overview

**NiftyVal** tracks, analyzes, and screens valuation multiples across India's NSE sectoral and broad-market indices. It equips long-term investors and ETF allocators with historical rolling medians, percentile spectrums, 52-week price channels, pairwise return correlations, and forward return distributions—eliminating recency bias and emotional timing.

The workstation comes pre-packaged with a **7-year daily historical dataset** (~1.9 MB SQLite database in `data/indices.db`) covering official NSE closing levels, P/E, P/B, Dividend Yield, and implied earnings per share ($EPS = \frac{\text{Close}}{\text{P/E}}$).

---

## ✨ Core Features

### 1. Ingestion & Automated Synchronization (`backend/`)
* **11 Core Investable Indices & Liquid ETFs**:
  * `NIFTY IT` (`ITBEES`)
  * `NIFTY METAL` (`METALIETF`)
  * `NIFTY BANK` (`BANKBEES`)
  * `NIFTY PSU BANK` (`PSUBANKADD`)
  * `NIFTY AUTO` (`AUTOIETF`)
  * `NIFTY PHARMA` (`PHARMABEES`)
  * `NIFTY FMCG` (`FMCGIETF`)
  * `NIFTY ENERGY` (`ENERGY`)
  * `NIFTY NEXT 50` (`NEXT50IETF`)
  * `NIFTY MIDCAP 150` (`MIDCAPETF`)
  * `NIFTY SMALLCAP 250` (`HDFCSML250`)
* **Automated Daily Sync**:
  * Background lifecycle worker evaluates the latest date stored in SQLite every 60 minutes.
  * If current IST time is past **19:15** (7:15 PM) on a weekday (Mon–Fri) and the database is missing today's session, it automatically synchronizes official NSE Bhavcopy data under a non-blocking concurrency lock.
* **REST API**:
  * `GET /api/basket`: Enriched valuation matrix, 52-week highs/lows, 1-day changes, multi-window medians, and valuation tiers.
  * `GET /api/correlation`: 11×11 Pearson correlation matrix across 252 trading sessions.
  * `GET /api/index/{slug}`: Deep-dive metrics, historical timeseries, multi-window medians, CAGR dynamics, and forward return distributions.
  * `GET /api/sync/status` & `POST /api/sync`: Real-time status reporting and background manual synchronization triggers.

---

### 2. Valuations Screener & Interactive Accordion (`/dashboard`)
* **11-Column Sortable Screener**: Sort by Name, 1D Price Change, Category, Current P/E, 7Y/5Y/3Y/1Y Medians, % Deviation vs 5Y Median, and Valuation Status.
* **4-Card Valuation Summary Strip**: Instant count and ETF tickers across valuation regimes:
  * 🟢 **Significantly Undervalued** ($< -20\%$ vs 5Y Median P/E)
  * 🔵 **Moderately Undervalued** ($-20\%$ to $-10\%$)
  * 🟡 **Fairly Valued** ($-10\%$ to $+10\%$)
  * 🔴 **Overvalued** ($> +10\%$)
* **Inline Accordion Expansion Drawer**: Click any row to expand an instant context pane without navigating away:
  * **Detailed Analysis**: Side-by-side rolling medians.
  * **Valuation Interpretation Card**: Dynamic natural-language contextual callout.
  * **PE Ratio Comparison Bars**: 5 horizontal benchmarks color-coded with exact palette tokens (Cyan, Emerald, Amber, Coral, Purple).
  * **52-Week Range & Position Slider**: Visual progress channel from 52-week low to 52-week high with `% from 52W High`.
  * **Quick Navigation**: Click index name, chevron `>`, or `View Full Details →` to jump straight to the index deep-dive page.

---

### 3. ETF Watchlist & Correlation Matrix (`/baskets`)
* **Constituent Cards Grid**: Restructured responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4`) with dedicated valuation status rows, preventing badge clipping and maintaining uniform card heights.
* **11×11 Pairwise Correlation Heatmap**:
  * Evaluates daily return correlations over the past 252 trading days.
  * Color-coded matrix highlighting diversification benefits ($r < 0.25$ teal/cyan, moderate $0.25 \le r < 0.70$ amber, high $r \ge 0.70$ coral/red).
  * Interactive hover inspection displaying exact pairwise correlation coefficients and constituent names.

---

### 4. Index Deep-Dive Analytics (`/[slug]` & `/indices`)
* **Metric Switching**: Seamlessly toggle between **P/E Ratio**, **P/B Ratio**, and **Dividend Yield**.
* **5-Segment Percentile Gauge**:
  * Visualizes whether an index is `Cheap (0–20%)`, `Fairly Cheap (20–40%)`, `Fair (40–60%)`, `Fairly Expensive (60–80%)`, or `Expensive (80–100%)`.
  * Toggle benchmark rolling windows (`1Y`, `3Y`, `5Y`, `7Y`).
* **Multi-Window Historical Medians Table**: Direct comparison of current valuation vs. 1Y, 3Y, 5Y, 7Y, and Max historical benchmarks.
* **Implied EPS Trajectory vs. Price CAGR Matrix**:
  * Historical chart of implied EPS points ($Close / PE$).
  * Annualized compound growth rate matrix comparing EPS growth against market price returns to verify earnings quality vs. multiple expansion.
* **5-Year Forward Return Distribution**:
  * Evaluates all historical sessions where the index traded within $\pm 1.5$ P/E points of its current ratio.
  * Outputs median 5-year annualized CAGR, positive return probability percentage, and historical sample day count.

---

## 🛠️ Tech Stack & Architecture

```
NiftyVal/
├── backend/
│   ├── api.py            # FastAPI REST application + Lifespan auto-sync + CORS
│   ├── analytics.py      # Statistical analytics, rolling medians, CAGR, forward returns
│   ├── fetcher.py        # Official NSE scraping via nsepython, DB initialization & sync
│   └── config.py         # 11 index definitions, ETF tickers, and cyclical tags
├── data/
│   └── indices.db        # SQLite database containing 7-year daily valuations (~1.9 MB)
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── [slug]/       # Deep-dive index valuation & earnings dynamic page
│   │   │   ├── baskets/      # Curated ETF basket & 11x11 correlation matrix
│   │   │   ├── dashboard/    # 11-column screener with inline accordion drawers
│   │   │   ├── indices/      # Sectoral & broad market index catalog
│   │   │   ├── layout.tsx    # Root layout with AppShell wrapper
│   │   │   └── globals.css   # Dark theme palette tokens & tabular fonts
│   │   └── components/
│   │       └── AppShell.tsx  # Collapsible sidebar, live NSE status, auto-sync polling
│   ├── package.json
│   ├── tsconfig.json
│   └── tailwind.config.ts
├── UI_BLUEPRINT.md       # Exact design tokens, hex codes, and interaction specifications
├── requirements.txt      # Python backend dependencies
└── README.md
```

---

## 🚀 Quickstart Setup

### Prerequisites
* **Python**: 3.10 or higher
* **Node.js**: 18.18 or higher (Node 20+ recommended)
* **npm**: 9+

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/Asceptic07/NiftyVal.git
cd NiftyVal
```

---

### Step 2: Backend Setup (FastAPI & SQLite)
```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

# Install backend dependencies
pip install -r requirements.txt

# Start the FastAPI server (runs on http://127.0.0.1:8000)
uvicorn backend.api:app --host 127.0.0.1 --port 8000 --reload
```

> **Note:** The SQLite database `data/indices.db` comes pre-populated with 7 years of daily historical data. To trigger an incremental sync with official NSE endpoints, you can click **Sync NSE** in the top navigation bar or POST to `http://127.0.0.1:8000/api/sync`.

---

### Step 3: Frontend Setup (Next.js & Tailwind CSS)
In a separate terminal window:
```bash
cd frontend

# Install frontend dependencies
npm install

# Start the Next.js development server (runs on http://localhost:3000)
npm run dev -- -p 3000
```

Open your browser and navigate to **[http://localhost:3000](http://localhost:3000)**.

---

## 🎨 Visual Tokens & Palette

| Token | Hex Value | Application |
| :--- | :--- | :--- |
| **Page Background** | `#1f2121` | Main application shell and table row alternate background |
| **Surface / Cards** | `#262828` | Dashboard cards, table containers, popovers |
| **Sidebar Surface** | `#1a1c1c` | Left collapsible sidebar navigation |
| **Card Borders** | `rgba(119, 124, 124, 0.2)` | Card, modal, and table grid borders |
| **Accent Primary** | `#32b8c6` | Brand teal, interactive active states, chart gradient fills |
| **Significantly Undervalued** | `#34d399` | Emerald badge text (`rgba(16, 185, 129, 0.15)` bg) |
| **Moderately Undervalued** | `#2dd4bf` | Teal badge text (`rgba(20, 184, 166, 0.15)` bg) |
| **Fairly Valued** | `#fbbf24` | Amber badge text (`rgba(245, 158, 11, 0.15)` bg) |
| **Moderately Overvalued** | `#fb923c` | Orange badge text (`rgba(249, 115, 22, 0.15)` bg) |
| **Significantly Overvalued** | `#f87171` | Red badge text (`rgba(239, 68, 68, 0.15)` bg) |

---

## 📜 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
