# IndexPE UI/UX Architecture & Design Blueprint

> **Notice:** This document serves as the single source of truth for all visual tokens, layout structures, routes, component hierarchies, and interactive behaviors reverse-engineered from live production at `https://indexpe.in`. Do not deviate from these tokens or behaviors when implementing application components.

---

## 1. Routes & Navigation Architecture

### 1.1 Complete Route Map

| URL Path | Access | Page Purpose & Structure |
| :--- | :---: | :--- |
| `/` | Public | **Homepage & Market Overview**<br>• Header navigation (Logo, Alerts, Pricing, Blog, Feedback, Sign In)<br>• Hero headline + live market valuation sentiment summary badge<br>• Search bar with instant index autocomplete<br>• 4 Tab filter: `Undervalued`, `Fairly Valued`, `Overvalued`, `All Indices`<br>• Responsive market valuation table with sortable columns (P/E, P/B, Div Yield, 5Y Median comparison)<br>• Educational feature highlights, Pricing tiers (`Free`, `Pro`), and FAQ accordion<br>• Footer with Legal (`/terms`, `/privacy`, `/cancellation-and-refunds`), social links, and attribution |
| `/[slug]` (or `/indices/[slug]`)<br>*(e.g., `/nifty-metal`, `/nifty-it`, `/nifty-50`)* | Public | **Index Valuation Deep-Dive**<br>• Breadcrumb: `Home / [Index Name]`<br>• Title banner with sector tags, exchange tag (`NSE`), and Valuation Status Chip (e.g. `Fairly Cheap`, `Overvalued`)<br>• Metric Selector Tabs: `PE Ratio` \| `PB Ratio` \| `Div Yield`<br>• 3 Core Overview Cards: `Current Value`, `5Y Median`, and `% Difference vs Median`<br>• **Valuation Percentile Card**: 5-segment color spectrum with position pin, independent metric selector (`PE`, `PB`, `Div`), timeframe window (`1Y`, `3Y`, `5Y`, `7Y`), and `(i)` tooltip popover<br>• **Historical Medians Table**: Comparison matrix across `1Y`, `3Y`, `5Y`, `7Y`, `10Y`, `15Y`, `All-Time`<br>• **Interactive Historical Chart**: Dual/single line chart with `3M` to `Max` horizons and dashed median benchmark<br>• **Earnings (EPS) Chart**: Index EPS step-trendline plotted alongside price CAGR<br>• **Ways to Invest**: Benchmark ETF and Index Fund comparisons (Ticker, NAV, Expense Ratio, Premium/Discount, tracking error)<br>• **Performance & Risk Profile**: 1Y return, 5Y CAGR, volatility, Beta, and 5Y forward return distribution<br>• **Constituent Weights**: Top sector breakdown and stock weights table<br>• Methodology documentation & PE Alert callout |
| `/indices` | Authenticated<br>*(Redirects to `/signin` if guest)* | **Full Basket Analytics Table**<br>• Comprehensive multi-metric screener table for authenticated users covering all sectoral, thematic, and broad market indices |
| `/alerts` | Public / Action-Gated | **Valuation Alerts Management**<br>• Interface to configure target P/E or P/B triggers with email notifications |
| `/blog` & `/blog/[slug]` | Public | **Research & Valuation Insights**<br>• Articles explaining cyclical vs non-cyclical indexing, mean reversion, and ETF allocation rules |
| `/feedback` | Public | **User Feedback & Support Form** |
| `/signin` & `/signup` | Public | **Authentication Portal**<br>• Google OAuth single sign-on & Magic Link email login |

### 1.2 Navigation & Interaction Flows

- **Clicking an Index Row or Card (from Homepage or Screener):**
  - Smooth client-side route transition to `/[slug]` (e.g., `/nifty-metal`).
  - Scroll state resets to top of the page.
- **Top Metric Toggle on Index Page (`PE Ratio` | `PB Ratio` | `Div Yield`):**
  - Updates URL query parameter without page reload (e.g. `?metric=pb`).
  - Synchronously updates:
    - Primary page header and description.
    - Summary KPI cards (Current, Median, % Difference).
    - Historical medians table columns.
    - Historical chart active series and median benchmark line.
- **Mobile Responsive Navigation (`<= 768px`):**
  - Header links collapse into an animated hamburger drawer.
  - Valuation percentile button groups transform into accessible `<select>` dropdown menus.
  - Multi-column tables gain smooth horizontal scrollbars (`overflow-x: auto`) with sticky left index columns.

---

## 2. Layout & Visual Tokens (Design System)

### 2.1 Color Palette

#### Dark Theme (Default IndexPE Interface)
```css
:root {
  /* Surface & Background */
  --color-background: #1f2121;           /* Charcoal-700 (Main Canvas) */
  --color-surface: #262828;              /* Charcoal-800 (Card / Container Canvas) */
  --color-surface-hover: #2e3030;        /* Subtle hover state */
  --color-sidebar: #1a1c1c;              /* Deep background for sidebars/drawers */

  /* Typography */
  --color-text-primary: #f5f5f5;         /* Gray-200 (Headings, primary values) */
  --color-text-secondary: #a7a9a9;       /* Gray-300 (Subtitles, labels, captions) */
  --color-text-muted: #777c7c;           /* Charcoal-400 (Timestamps, placeholders) */

  /* Brand / Primary Accent */
  --color-primary: #32b8c6;              /* Teal-300 (Primary accent, brand cyan) */
  --color-primary-hover: #2da6b2;        /* Teal-400 */
  --color-primary-active: #2996a1;       /* Teal-800 */
  --color-primary-subtle: rgba(50, 184, 198, 0.12); /* Badge / chip background */
  --color-primary-btn-text: #13343b;     /* High-contrast text on teal buttons */

  /* Borders & Dividers */
  --color-border: rgba(119, 124, 124, 0.3);         /* Universal element border */
  --color-card-border: rgba(119, 124, 124, 0.2);    /* Container card border */
  --color-card-border-inner: rgba(119, 124, 124, 0.15); /* Nested element dividers */

  /* Signal & Alert Status Colors */
  --color-signal-green: #4ade80;         /* Success / Buy Signal */
  --color-signal-green-bg: rgba(74, 222, 128, 0.12);
  --color-signal-orange: #e68161;        /* Warning / Half-Tranche / Neutral */
  --color-signal-orange-bg: rgba(230, 129, 97, 0.12);
  --color-signal-red: #ff5459;           /* Danger / Overvalued / Skip */
  --color-signal-red-bg: rgba(255, 84, 89, 0.12);

  /* Chart Visual Tokens */
  --chart-line-price: #38bdf8;           /* Cyan blue line for Close Price */
  --chart-line-metric: #32b8c6;          /* Teal line for P/E or P/B */
  --chart-line-median: #e68161;          /* Dashed amber line for historical median */
  --chart-line-eps: #a78bfa;             /* Purple line for EPS step-chart */
  --chart-grid-color: rgba(119, 124, 124, 0.15);
  --chart-crosshair-color: rgba(245, 245, 245, 0.4);
}
```

#### The 5-Segment Valuation Percentile Spectrum (Exact Hex Tokens)
The valuation bar divides historical distributions into 5 equal 20-percentile zones:

| Segment Zone | Percentile Range | Dark Theme Hex | Light Theme Hex | Semantic Label |
| :---: | :---: | :---: | :---: | :--- |
| **Zone 1** | $0\% - 20\%$ | `#57996f` | `#2f6b4a` | **Cheap** *(Deep Value)* |
| **Zone 2** | $20\% - 40\%$ | `#a6cdb4` | `#7fb496` | **Fairly Cheap** *(Value Range)* |
| **Zone 3** | $40\% - 60\%$ | `#5f6565` | `#d2d6d5` | **Fair** *(Historical Normal)* |
| **Zone 4** | $60\% - 80\%$ | `#d6a17f` | `#c9865f` | **Fairly Expensive** *(Elevated)* |
| **Zone 5** | $80\% - 100\%$ | `#c75948` | `#a03328` | **Expensive** *(Extreme Overvaluation)* |

---

### 2.2 Typography Scale

- **Primary Font Stack:**
  `"FKGroteskNeue", "Geist", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Monospace Stack (Numbers, Tickers, Ratios, Percentiles):**
  `"Berkeley Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`

| Token Name | Font Size | Line Height | Typical Usage |
| :--- | :---: | :---: | :--- |
| `text-xs` | 11px (0.6875rem) | 16px | Badge labels, table subtext, chart axis tick labels |
| `text-sm` | 12px (0.75rem) | 18px | Metric card subtitles, metadata, table headers |
| `text-base` / `text-md` | 14px (0.875rem) | 20px | Table cell data, body prose, button labels |
| `text-lg` | 16px (1.0rem) | 24px | Section subheadings, card titles |
| `text-xl` | 18px (1.125rem) | 28px | Card prominent metrics, filter group titles |
| `text-2xl` | 20px (1.25rem) | 28px | Large KPI values, secondary page titles |
| `text-3xl` | 24px (1.5rem) | 32px | Primary Index Page H1 title |
| `text-4xl` | 30px (1.875rem) | 36px | Hero homepage headline |

---

### 2.3 Spacing, Radii & Layout Metrics

- **Container Widths:**
  - Max Content Width: `1240px` (centered with horizontal padding `24px` on desktop, `16px` on mobile).
- **Spacing Scale:**
  `2px`, `4px`, `6px`, `8px`, `10px`, `12px`, `16px`, `20px`, `24px`, `32px`, `48px`.
- **Border Radii:**
  - Buttons & Inputs: `8px` (`--radius-base`)
  - Content Cards & Tables: `12px` (`--radius-lg`)
  - Badges, Chips & Segment Pins: `9999px` (`--radius-full`)
- **Card Styling:**
  - Background: `#262828`
  - Border: `1px solid rgba(119, 124, 124, 0.2)`
  - Padding: `20px` to `24px` desktop; `16px` mobile.

---

## 3. Component Hierarchy & Interactive Behavior (`/indices/nifty-metal`)

### 3.1 Page Header & Breadcrumb
- Breadcrumb trail: `Home / Nifty Metal`
- H1 Header: `Nifty Metal PE Ratio` (dynamically adapts when switching metrics to `PB Ratio` or `Dividend Yield`).
- Meta tags:
  - Exchange: `NSE` (gray tag)
  - Sector: `Sectoral` (blue tag)
  - Valuation Status Badge: e.g. `Fairly Cheap` (using Zone 2 token `#a6cdb4` / `rgba(166, 205, 180, 0.15)`)
  - Last Updated Timestamp: `16 Nov 2026`

### 3.2 Top Metric Switcher
Three segment pill controls:
`[ PE Ratio ]` `[ PB Ratio ]` `[ Div Yield ]`
- **Active state:** Background `#32b8c6`, text `#13343b`, font weight bold (600).
- **Inactive state:** Background `transparent`, text `#a7a9a9`, hover background `rgba(119, 124, 124, 0.15)`.

### 3.3 Core Summary Metric Cards (3-Column Grid)
1. **Current Ratio:**
   - Label: `CURRENT PE`
   - Value: `14.74`
   - Subtitle: `As of 16 Nov 2026`
2. **Historical Benchmark:**
   - Label: `5-YEAR MEDIAN PE`
   - Value: `19.07`
   - Subtitle: `1,238 trading sessions`
3. **Difference vs Benchmark:**
   - Label: `VS 5-YEAR MEDIAN`
   - Value: `-22.70%` (rendered in green `#4ade80` if discounted/cheaper, or red `#ff5459` if elevated)
   - Status sentence: *"Currently trading 22.7% below its 5-year median valuation."*

### 3.4 Interactive 5-Segment Valuation Percentile Card
- **Control Bar:**
  - Sub-metric selector: `[ PE ]` `[ PB ]` `[ Div Yield ]`
  - Timeframe window selector: `[ 1Y ]` `[ 3Y ]` `[ 5Y ]` `[ 7Y ]`
  - Explanatory `(i)` popover button.
- **The Spectrum Visualizer:**
  - A horizontal bar with 5 colored zones (`#57996f`, `#a6cdb4`, `#5f6565`, `#d6a17f`, `#c75948`).
  - An absolute-positioned marker needle/pin pointing directly to the exact percentile (e.g. `29.8%` for Nifty Metal 5Y P/E).
  - Zone labels below: `Cheap (0-20%)`, `Fairly Cheap (20-40%)`, `Fair (40-60%)`, `Fairly Expensive (60-80%)`, `Expensive (80-100%)`.
- **Dynamic Text Summary:**
  *"Nifty Metal is currently cheaper than **70.2%** of trading days in the last 5 years (**29.8th percentile** across 1,238 observations)."*

### 3.5 Historical Medians Matrix Table
A structured horizontal or vertical comparison table:

| Window | Trading Days | Median P/E | % vs Median | P/E Percentile | Median P/B | P/B Percentile |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1 Year** | 252 | `18.25` | `-19.2%` | `14.2%` | `2.62` | `54.3%` |
| **3 Years** | 756 | `19.82` | `-25.6%` | `21.0%` | `2.51` | `61.8%` |
| **5 Years** | 1,238 | `19.07` | `-22.7%` | `29.8%` | `2.48` | `67.1%` |
| **7 Years** | 1,738 | `18.42` | `-20.0%` | `33.5%` | `2.39` | `71.2%` |
| **All-Time** | Max | `17.95` | `-17.9%` | `36.1%` | `2.31` | `74.5%` |

### 3.6 Interactive Time-Horizon Chart
- **Timeframe Selector:** `[ 3M ]` `[ 6M ]` `[ 1Y ]` `[ 3Y ]` `[ 5Y ]` `[ 7Y ]` `[ 10Y ]` `[ 15Y ]` `[ Max ]`
- **Plot Elements:**
  - Solid Teal Line (`#32b8c6`): Historical P/E ratio across chosen time range.
  - Dashed Amber Line (`#e68161`): Window Median benchmark with sticky right-side annotation pill.
  - Hover Crosshair: Displays exact Date, Close Price, and Valuation Metric in a floating dark card (`#262828`, border `rgba(119,124,124,0.3)`).

### 3.7 Annualized Growth & Earnings (EPS) Dynamics
- Annualized Compound Growth Comparison:
  - 1Y, 3Y, 5Y, and 7Y CAGR breakdown comparing **Price Return vs EPS Growth**.
  - Highlights whether price appreciation was driven by fundamental earnings growth or speculative P/E expansion/contraction.

### 3.8 Forward Return Distribution ($\pm 1.5$ Valuation Band)
- Historical outcomes for sessions where P/E was within $\pm 1.5$ of the current value:
  - Total historical occurrences found (e.g. `147 trading days`).
  - Median 5-year annualized return (e.g. `+25.27% CAGR`).
  - Percentage of 5-year holding windows ending in profit (e.g. `100.0%`).

### 3.9 Ways to Invest (Benchmark ETFs & Funds)
Table linking to tradable instruments:
- ETF Ticker: e.g. `METALIETF` (Nippon India ETF Nifty Metal)
- Latest Price / NAV
- Tracking Error & Expense Ratio
- Direct broker action links (e.g., Zerodha, Groww)

---

## 4. Implementation Guidelines for IndexPE Clone

When implementing components in upcoming steps:
1. **Strictly adhere to the dark surface palette:** `#1f2121` for page body, `#262828` for containers, `#32b8c6` for brand highlights.
2. **Implement the 5-segment percentile spectrum** with the exact 5 hex codes specified in Section 2.1.
3. **Use Monospace font** (`Berkeley Mono` / `ui-monospace`) for all numerical metrics, P/E ratios, and percentages to maintain column alignment.
4. **All data must continue to be computed strictly** from `daily_valuations` in `data/indices.db` via `backend/analytics.py`—preserving our verified zero-placeholder architecture.


---

## 5. Authenticated Session & /baskets Architecture (/indices & Signed-In Layout)

> **Context:** When a user is signed in to IndexPE, the application transitions from a public marketing website to an authenticated SaaS analytics workstation featuring an App Shell (persistent Left Sidebar + Sticky Top Bar + Scrollable Content Canvas).

### 5.1 Route Matrix & Authentication State Transitions

| Route Path | Unauthenticated / Guest State | Authenticated / Signed-In State |
| :--- | :--- | :--- |
| `/` | Marketing landing page with hero, search, pricing, FAQ | **Automatic 302 Redirect to `/dashboard`** |
| `/dashboard` | Redirects to `/signin?callbackUrl=%2Fdashboard` | **Primary Valuations Dashboard** (140+ indices screener table, category filters, custom basket dropdown, summary strip) |
| `/baskets` | Redirects to `/signin?callbackUrl=%2Fbaskets` | **Basket Management & Watchlists** (Create/edit multi-index baskets, correlation matrix, allocation sandbox) |
| `/indices` | Redirects to `/signin?callbackUrl=%2Findices` | **Indices Explorer** (`/indices?slug=<slug>`) with instant search combobox and full interactive valuation suite |
| `/[slug]` *(e.g. `/nifty-metal`)* | Public detail view (public header banner, no sidebar) | Full detail view + **`+ Add to basket`** header button + top-right user profile avatar menu |
| `/performance-and-risk` | Restricted preview | **Performance & Risk Dashboard** (Annualized CAGR, Sharpe Ratio, Maximum Drawdown, Rolling Returns) |
| `/scenarios` | Marketing preview | **Scenario Studio** (3-step portfolio backtesting wizard with custom weighting models) |
| `/my-alerts` | Informational landing page | **Alerts Manager** (Create/edit valuation trigger alerts, target P/E & P/B thresholds, active alert list) |
| `/settings` | Redirects to `/signin` | **Account Settings** (Profile, Billing & Pro subscription via Razorpay, Notification toggles, Data reset) |
| `/whats-new` | Public Changelog | Product Changelog with unread dot indicator in sidebar |

---

### 5.2 Authenticated App Shell Layout & Navigation

The signed-in application is enclosed within a responsive 3-pane layout:

```
+-----------------------------------------------------------------------------------------------+
| SIDEBAR (240px) | TOP BAR (h-14, sticky) [Trial Alert Strip] [Theme Toggle] [User Avatar Menu]  |
|                 +-----------------------------------------------------------------------------+
| [Logo] [Toggle] | MAIN CONTENT CANVAS (overflow-y: auto)                                      |
|                 |                                                                             |
| • Valuations    |                                                                             |
| • Indices       |                                                                             |
| • Performance   |                                                                             |
| • Scenarios     |                                                                             |
| • My Alerts     |                                                                             |
|                 |                                                                             |
| • Settings      |                                                                             |
| • What's New    |                                                                             |
| • Blog          |                                                                             |
| • Feedback      |                                                                             |
|                 |                                                                             |
| [Pro Trial Card]|                                                                             |
+-----------------+-----------------------------------------------------------------------------+
```

#### A. Left Sidebar (`240px` Expanded, `64px` Collapsed)
- **Background:** `#1a1c1c` (`--color-sidebar`)
- **Border-Right:** `1px solid rgba(119, 124, 124, 0.2)`
- **Header:** IndexPE Logo + collapse icon button (`ref=e2`).
- **Active Navigation Item Styling:**
  - Background: `rgba(13, 148, 136, 0.15)`
  - Text Color: `#2dd4bf` (Teal-400)
  - Left border indicator: `2px solid #2dd4bf`
  - Font weight: `550`
- **Inactive Navigation Item Styling:**
  - Background: `transparent`
  - Text Color: `#a7a9a9` (Gray-300)
  - Hover Background: `rgba(119, 124, 124, 0.1)`
  - Hover Text: `#f5f5f5`
- **Navigation Groups:**
  1. **Primary Workspace:**
     - `Valuations` (`/dashboard`) – Icon: `BarChart3`
     - `Indices` (`/indices`) – Icon: `TrendingUp`
     - `Performance` (`/performance-and-risk`) – Icon: `Activity`
     - `Scenarios` (`/scenarios`) – Icon: `PieChart`
     - `My Alerts` (`/my-alerts`) – Icon: `Bell`
  2. **Utilities & Support:**
     - `Settings` (`/settings`) – Icon: `Settings`
     - `What's New` (`/whats-new`) – Icon: `Sparkles` with cyan notification dot
     - `Blog` (`/blog`) – Icon: `BookOpen`
     - `Feedback` – Icon: `MessageSquare` (opens interactive modal)
- **Pro Trial Card (Sidebar Footer):**
  - Container: `border: 1px solid rgba(119, 124, 124, 0.25)`, background `rgba(38, 40, 40, 0.8)`, rounded `12px`, padding `14px`.
  - Label: `PRO TRIAL · 29 DAYS LEFT` (`text-xs uppercase tracking-wider text-gray-400 font-semibold`).
  - Progress bar: Height `6px`, background `#374151`, filled indicator `#0d9488`.
  - Details: `Ends 15 Dec · ₹499 a year after` (`text-xs text-gray-400 mt-1`).
  - CTA Button: `"Keep Pro"` (`bg: #0d9488 text-white rounded-md text-xs py-1.5 font-medium hover:bg-teal-700`).

#### B. Sticky Top Bar (`h-14`)
- **Background:** `#1f2121` with `backdrop-filter: blur(8px)` and bottom border `1px solid rgba(119, 124, 124, 0.2)`.
- **Trial Strip:** Optional notification pill: `"Pro trial, 29 days left · founding price ends in 15 days [See Pro]"`.
- **Theme Switcher:** Dark / Light mode toggle icon button.
- **User Profile Menu:**
  - Avatar: Circular badge (`w-8 h-8 rounded-full bg-charcoal-600 text-white font-medium`) with user initials.
  - Dropdown items: User display name & email header, `Settings`, `Billing & Subscription`, divider line, and `Sign out` (terminates NextAuth session).

---

### 5.3 `/baskets` Watchlist & Portfolio Architecture

The `/baskets` route enables creating, managing, and backtesting custom baskets of indices (specifically the 11-index core ETF universe).

#### A. Basket Overview Page
- **Page Header:**
  - H1: `Baskets` (`text-2xl font-bold text-white`)
  - Subtitle: `"Create and manage custom baskets of indices for valuation tracking, scenarios, and rebalancing."`
  - Primary Action: `"+ New Basket"` CTA button (`bg: #0d9488 text-white rounded-lg px-4 py-2 hover:bg-teal-700`).
- **Basket Cards Grid (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`):**
  - **Card Header:**
    - Basket Title: e.g. `Core 11 Sectoral & Broad ETF Basket`
    - Constituent Count Badge: `11 indices` (`bg: #1e293b text-gray-400 rounded-full text-xs px-2.5 py-0.5 font-mono`)
    - Context Menu: `Edit` button and `Delete` icon button.
  - **Index Badges Grid:**
    - Horizontal pill chips displaying all 11 constituent indices:
      - `NIFTY IT`
      - `NIFTY FMCG`
      - `NIFTY BANK`
      - `NIFTY PSU BANK`
      - `NIFTY AUTO`
      - `NIFTY PHARMA`
      - `NIFTY METAL`
      - `NIFTY ENERGY`
      - `NIFTY NEXT 50`
      - `NIFTY MIDCAP 150`
      - `NIFTY SMALLCAP 250`
  - **Card Footer Action:**
    - Button: `"View on dashboard →"` $\rightarrow$ navigates directly to `/dashboard?basket=<basket_id>`, applying the basket as an active table filter.

#### B. Basket Editor & Market Map Modal
- **Basket Name Field:** Text input with placeholder `"Enter basket name..."`.
- **Index Selector Market Map (Categorized Multi-Select):**
  1. **Broad Market**: Nifty 50, Nifty Next 50, Nifty Midcap 150, Nifty Smallcap 250, Nifty 500.
  2. **Sectoral**: Bank, PSU Bank, IT, Pharma, Auto, FMCG, Metal, Energy, Realty, Financial Services.
  3. **Thematic**: Commodities, Consumption, CPSE, Infrastructure, MNC.
  4. **Strategy / Factor**: Alpha 50, Quality 30, Low Volatility 50, Value 20.
- **Search & Filter:** Instant search box filtering indices inside the modal.
- **Correlation Matrix Engine:**
  - Renders an interactive pairwise correlation heatmap across selected indices to evaluate multi-index diversification.
- **Save / Cancel Actions:** `Save Basket` (`#0d9488`), `Cancel`, and `Delete Basket` (destructive red `#ef4444`).

---

### 5.4 `/dashboard` Authenticated Valuations Table

The `/dashboard` route is the primary workstation view when logged in.

#### A. Valuation Summary Strip
Horizontal row of statistic badges:
- `146 Indices` (Neutral dark pill `#262828`)
- `9 Overvalued` (`text: #ef4444`, `bg: rgba(239, 68, 68, 0.15)`)
- `25 Fairly Valued` (`text: #f59e0b`, `bg: rgba(245, 158, 11, 0.15)`)
- `28 Undervalued` (`text: #10b981`, `bg: rgba(16, 185, 129, 0.15)`)
- Benchmark indicator: `vs 7Y median PE`
- Sync timestamp: `Updated: 17 Nov 2026, 05:46 am`

#### B. Comprehensive Filter Bar (9 Interactive Controls)
1. **Metric Segmented Switcher:** `[ PE Ratio ]` \| `[ PB Ratio ]` \| `[ Div Yield ]` (Active button: `#0d9488`).
2. **Instant Search:** Textbox placeholder `"Search by index name..."` (debounced client-side filter).
3. **Basket Dropdown Filter:** `All indices` \| `Core 11 ETF Basket` \| `<Custom User Baskets>`.
4. **Category Filter Tabs:** `All Categories` \| `Broad Market` \| `Sectoral` \| `Thematic` \| `Strategy`.
5. **Valuation Status Filter:** `All Valuations` \| `Undervalued` \| `Fairly Valued` \| `Overvalued`.
6. **Investable Toggle Switch:** `"Show Investable Indices Only"` (filters exclusively for indices having traded ETFs/index funds).
7. **Comparison Median Horizon Dropdown:** `vs 1Y Median` \| `vs 3Y Median` \| `vs 5Y Median` \| `vs 7Y Median` *(Default)* \| `vs 10Y Median` \| `vs 15Y Median`.
8. **Sort Combobox:**
   - `Name (A-Z)`
   - `Current PE (High to Low)` / `(Low to High)`
   - `vs Median % (High to Low) - Overvalued First`
   - `vs Median % (Low to High) - Undervalued First` *(Default)*
9. **Copy Filtered Link Button:** Generates a shareable URL containing the current filter query parameters.

#### C. Table Column Architecture (11 Columns)

| Column # | Column Header | Data Type | Visual Style / Interaction |
| :---: | :--- | :--- | :--- |
| **1** | **Index Name** | Text + Action | Index title with slug subtext linking to `/indices?slug=<slug>`. Includes bookmark star icon to toggle basket membership. |
| **2** | **Change** | Numeric % | 1-day price return formatted as `+0.58%` (green `#10b981`) or `-1.50%` (red `#ef4444`). |
| **3** | **Category** | Badge | Pill badge: `Broad Market`, `Sectoral`, `Thematic`, `Strategy`. |
| **4** | **Current PE** | Numeric (`font-mono`) | Current daily closing ratio (e.g. `14.74`). |
| **5** | **7Y Median PE** | Numeric (`font-mono`) | Historical 7-year rolling median ratio (e.g. `16.20`). |
| **6** | **5Y Median PE** | Numeric (`font-mono`) | Historical 5-year rolling median ratio (e.g. `19.07`). |
| **7** | **3Y Median PE** | Numeric (`font-mono`) | Historical 3-year rolling median ratio (e.g. `19.82`). |
| **8** | **1Y Median PE** | Numeric (`font-mono`) | Historical 1-year rolling median ratio (e.g. `18.25`). |
| **9** | **vs 7Y Median (%)** | Green / Red % | Deviation formula: `((Current - Median) / Median) * 100` (e.g. `-22.70%` green or `+14.2%` red). |
| **10** | **Valuation Status** | Semantic Badge | 5 distinct valuation tiers (see CSS tokens below). |
| **11** | **Action** | Icon Button | Three-dot menu / Quick action dialog to add index to a basket or create an alert. |

#### D. Valuation Status Badge Design Tokens

```css
/* 1. Significantly Undervalued (Deviation < -20%) */
.badge-sig-undervalued {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399; /* emerald-400 */
  border: 1px solid rgba(16, 185, 129, 0.3);
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
}

/* 2. Moderately Undervalued (-20% <= Deviation < -10%) */
.badge-mod-undervalued {
  background: rgba(20, 184, 166, 0.15);
  color: #2dd4bf; /* teal-400 */
  border: 1px solid rgba(20, 184, 166, 0.3);
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
}

/* 3. Fairly Valued (-10% <= Deviation <= +10%) */
.badge-fairly-valued {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24; /* amber-400 */
  border: 1px solid rgba(245, 158, 11, 0.3);
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
}

/* 4. Moderately Overvalued (+10% < Deviation <= +20%) */
.badge-mod-overvalued {
  background: rgba(249, 115, 22, 0.15);
  color: #fb923c; /* orange-400 */
  border: 1px solid rgba(249, 115, 22, 0.3);
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
}

/* 5. Significantly Overvalued (Deviation > +20%) */
.badge-sig-overvalued {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171; /* red-400 */
  border: 1px solid rgba(239, 68, 68, 0.3);
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
}
```

#### E. `/dashboard` Inline Accordion Expansion Drawer
Clicking anywhere on an index row toggles an inline expansion drawer directly underneath the table row (spanning `colspan="11"`), providing instant multi-window and 52-week context without navigating away.

```
+---------------------------------------------------------------------------------------------------------------------------------+
| [▼] NIFTY IT (ITBEES)  |  +0.03%  |  Core / Defensive  |  19.41  |  27.12  |  26.95  |  27.53  |  20.00  |  -28.0%  | Significantly Undervalued |  [ > ] |
+---------------------------------------------------------------------------------------------------------------------------------+
| [ACCORDION EXPANSION DRAWER - colspan="11", bg: #1f2121, padding: 24px]                                                         |
|                                                                                                                                 |
| +---------------------------------------------------------+-------------------------------------------------------------------+ |
| | Detailed Analysis                                       | PE Ratio Comparison                                               | |
| | • Current PE: 19.41                                     | • Current PE: [████████████░░░░░░░░░░] 19.41 (#1fb8cd)            | |
| | • 1-Year Median PE: 20.00                               | • 1Y Median:  [█████████████░░░░░░░░░] 20.00 (#10b981)            | |
| | • 3-Year Median PE: 27.53                               | • 3Y Median:  [██████████████████░░░░] 27.53 (#ffc185)            | |
| | • 5-Year Median PE: 26.95                               | • 5Y Median:  [█████████████████░░░░░] 26.95 (#b4413c)            | |
| | • 7-Year Median PE: 27.12                               | • 7Y Median:  [█████████████████░░░░░] 27.12 (#8b5cf6)            | |
| | • vs 5Y Median: -28.0% (Emerald green)                  |                                                                   | |
| |                                                         |                                                                   | |
| | +-----------------------------------------------------+ |                                                                   | |
| | | 💡 Valuation Interpretation                         | |                                                                   | |
| | | Nifty IT is trading at 19.41, which is 28.0% below  | |                                                                   | |
| | | its 5-year median PE of 26.95.                      | |                                                                   | |
| | | This indicates the index is significantly           | |                                                                   | |
| | | undervalued. Current valuations are below historical| |                                                                   | |
| | | medians, potentially indicating a value opportunity.| |                                                                   | |
| | +-----------------------------------------------------+ |                                                                   | |
| +---------------------------------------------------------+-------------------------------------------------------------------+ |
|                                                                                                                                 |
| +-----------------------------------------------------------------------------------------------------------------------------+ |
| | Price                                                                                                                       | |
| | Level: 31,941.05  |  52W High: 39,488.00  |  52W Low: 25,769.80  |  From 52W High: -19.11%                                   | |
| | 52W Position: [████████████░░░░░░░░░░░░░░░░░░░░] 45.0%                                                                       | |
| | 52W Low (25,769.80) ----------------------------------------------------------------------------------- 52W High (39,488.00)| |
| +-----------------------------------------------------------------------------------------------------------------------------+ |
|                                                                                                                                 |
|                                                                                             [ View Full Details → (btn teal) ]  |
+---------------------------------------------------------------------------------------------------------------------------------+
```

- **Interactive Click Behavior**:
  1. **Row Body Click**: Toggles the accordion drawer open or closed. Clicking again collapses the drawer.
  2. **Index Name Click**: Navigates directly to `/[slug]`.
  3. **Right Chevron (`>` / ChevronRight)**: Navigates directly to `/[slug]`.
  4. **"View Full Details →" Button**: Navigates directly to `/[slug]`.

- **Visual Tokens inside Drawer**:
  - Background: `#1f2121` (`border-t border-b border-[rgba(119,124,124,0.2)]`)
  - Valuation Callout Card: `#161b26` background, `border-left: 4px solid #32b8c6`, lightbulb emoji header `💡 Valuation Interpretation`.
  - PE Comparison Horizontal Bars:
    - Current PE: `#1fb8cd` (Cyan)
    - 1Y Median: `#10b981` (Emerald)
    - 3Y Median: `#ffc185` (Peach / Light amber)
    - 5Y Median: `#b4413c` (Coral / Rust red)
    - 7Y Median: `#8b5cf6` (Purple)
  - 52W Position Slider: Track `#1e293b`, indicator bar `#0d9488` / `#14b8a6`, percentage formula:
    $$\text{Position}_{52W} = \frac{\text{Current Close} - \text{Low}_{52W}}{\text{High}_{52W} - \text{Low}_{52W}} \times 100\%$$
  - From 52W High formula:
    $$\text{From 52W High} = \frac{\text{Current Close} - \text{High}_{52W}}{\text{High}_{52W}} \times 100\%$$

---

### 5.5 `/scenarios` (Scenario Studio & Portfolio Backtester)

A 3-step scenario creation workflow:
- **Step 1: Select Basket**:
  - Choose an existing custom basket (e.g. `Core 11 Sectoral ETF Basket`) or dynamically select indices.
- **Step 2: Choose Weighting Methodology**:
  - `Equal Weight`: Each constituent index receives an equal slice:
    $$w_i = \frac{100\%}{N}$$
  - `Market Cap Weight`: Weight proportional to index free-float market capitalization.
  - `Inverse PE (Value Weighted)`: Weight inversely proportional to current P/E relative to historical 5Y medians (systematically overweights undervalued sectors):
    $$w_i \propto \frac{\text{Median PE}_i}{\text{Current PE}_i}$$
  - `Custom Weight`: User specifies manual allocation percentages summing to $100\%$.
- **Step 3: Backtest Configuration & Results**:
  - Configurable start date, end date, benchmark comparison (`Nifty 50` or `Nifty 500`), and rebalance interval (Quarterly, Semi-annually, Annually).
  - Produces:
    - Cumulative performance curve vs benchmark.
    - Risk & Return statistics (CAGR, Annualized Volatility, Sharpe Ratio, Maximum Drawdown).
    - Periodic rebalancing log detailing historical capital re-allocations.

---

### 5.6 `/my-alerts` (Valuation Trigger Engine)

- **Active Alerts Table:** Shows index name, metric, condition, target threshold, created date, notification channels, and active toggle switch.
- **Create PE Alert Modal Dialog:**
  - `Select Index`: Searchable combobox dropdown.
  - `Valuation Metric`: `PE Ratio` \| `PB Ratio` \| `Dividend Yield`.
  - `Condition`: `Drops below` *(Buy dip trigger)* or `Rises above` *(Profit booking trigger)*.
  - `Target Value`: Numeric threshold input (e.g. `14.5`).
  - `Cooldown Period`: Suppresses repeated alerts (`7 days`, `14 days`, `30 days`).
  - `Notification Channels`: Checkboxes for Email and Webhook.

---

### 5.7 `/settings` Sub-Navigation

1. **Account:**
   - Display name editor + `Save changes` button.
   - Read-only email address with security badge.
   - Product feature tour replays.
   - Optional password setup for credential-based logins.
2. **Billing & Subscription:**
   - Plan status card: `Pro trial` with remaining countdown and renewal details.
   - Pricing tiers: Free (`₹0`), Annual Pro (`₹499/year` founding offer), Lifetime Pro (`₹2,499`).
   - Razorpay payment checkout integration.
   - Invoice and receipt download history.
3. **Notifications:**
   - Email digest preference toggles for weekly valuation summaries and monthly market reviews.
4. **Data Management:**
   - `Reset Scenarios`: Clears custom scenario backtests and portfolio drafts.
   - `Delete Account`: Permanent account and watchlist deletion conforming to data protection standards.

---

### 5.8 Signed-In Differences on Index Detail Pages (`/[slug]`)

When navigating from `/baskets` or `/dashboard` to an individual index page (e.g. `NIFTY METAL` or `NIFTY IT`):
1. **Persistent Header Action:** An **`+ Add to basket`** button appears in the page header next to the index title, allowing one-click assignment to any user watchlist.
2. **User Profile Avatar:** Replaces the guest `"Sign in"` CTA button in the navigation header.
3. **Create Alert Trigger:** Direct button on the valuation card to pre-fill an alert modal for that index's current P/E ratio.
4. **Return Context:** Breadcrumbs retain navigation context (e.g. `Baskets / ETF Basket / Nifty Metal` or `Dashboard / Nifty Metal`).
