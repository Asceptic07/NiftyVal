"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  TrendingUp,
  Layers,
  ChevronDown,
  Info,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Activity,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";

type MetricType = "pe" | "pb" | "div_yield";
type TimeframeType = "3M" | "6M" | "1Y" | "3Y" | "5Y" | "7Y" | "Max";
type GaugeWindowType = "1Y" | "3Y" | "5Y" | "7Y";

const ALL_SLUGS = [
  { slug: "nifty-it", name: "NIFTY IT", etf: "ITBEES" },
  { slug: "nifty-fmcg", name: "NIFTY FMCG", etf: "FMCGIETF" },
  { slug: "nifty-bank", name: "NIFTY BANK", etf: "BANKBEES" },
  { slug: "nifty-psu-bank", name: "NIFTY PSU BANK", etf: "PSUBANKADD" },
  { slug: "nifty-auto", name: "NIFTY AUTO", etf: "AUTOIETF" },
  { slug: "nifty-pharma", name: "NIFTY PHARMA", etf: "PHARMABEES" },
  { slug: "nifty-metal", name: "NIFTY METAL", etf: "METALIETF" },
  { slug: "nifty-energy", name: "NIFTY ENERGY", etf: "ENERGY" },
  { slug: "nifty-next-50", name: "NIFTY NEXT 50", etf: "NEXT50IETF" },
  { slug: "nifty-midcap-150", name: "NIFTY MIDCAP 150", etf: "MIDCAPETF" },
  { slug: "nifty-smallcap-250", name: "NIFTY SMALLCAP 250", etf: "HDFCSML250" },
];

const TIMEFRAME_DAYS: Record<TimeframeType, number | null> = {
  "3M": 63,
  "6M": 126,
  "1Y": 252,
  "3Y": 756,
  "5Y": 1238,
  "7Y": 1738,
  Max: null,
};

function IndexDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const slug = params?.slug as string;
  const initialMetric = (searchParams.get("metric") as MetricType) || "pe";

  const [activeMetric, setActiveMetric] = useState<MetricType>(
    ["pe", "pb", "div_yield"].includes(initialMetric) ? initialMetric : "pe"
  );
  const [chartTimeframe, setChartTimeframe] = useState<TimeframeType>("5Y");
  const [gaugeWindow, setGaugeWindow] = useState<GaugeWindowType>("5Y");

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`http://127.0.0.1:8000/api/index/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Index '${slug}' not found`);
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  const handleMetricChange = (m: MetricType) => {
    setActiveMetric(m);
    router.replace(`/${slug}?metric=${m}`, { scroll: false });
  };

  // Filtered chart data based on timeframe
  const chartData = useMemo(() => {
    if (!data || !data.history) return [];
    const days = TIMEFRAME_DAYS[chartTimeframe];
    if (!days) return data.history;
    return data.history.slice(-days);
  }, [data, chartTimeframe]);

  // Metric metadata
  const metricLabel =
    activeMetric === "pe"
      ? "P/E Ratio"
      : activeMetric === "pb"
      ? "P/B Ratio"
      : "Dividend Yield";

  const currentMetricVal = data ? data[activeMetric] : 0;
  const median5YVal =
    data?.window_stats?.["5Y"]?.[activeMetric]?.median ?? null;
  const vs5YMedianPct =
    data?.window_stats?.["5Y"]?.[activeMetric]?.pct_vs_median ?? null;

  // Active gauge percentile
  const gaugePercentile =
    data?.window_stats?.[gaugeWindow]?.[activeMetric]?.percentile ?? 50.0;

  // Dynamic window median for chart reference line
  const activeChartMedian = useMemo(() => {
    if (!data || !data.window_stats) return null;
    if (chartTimeframe === "1Y") return data.window_stats["1Y"]?.[activeMetric]?.median;
    if (chartTimeframe === "3Y") return data.window_stats["3Y"]?.[activeMetric]?.median;
    if (chartTimeframe === "5Y") return data.window_stats["5Y"]?.[activeMetric]?.median;
    if (chartTimeframe === "7Y") return data.window_stats["7Y"]?.[activeMetric]?.median;
    if (chartTimeframe === "Max") return data.window_stats["Max"]?.[activeMetric]?.median;
    return data.window_stats["5Y"]?.[activeMetric]?.median;
  }, [data, chartTimeframe, activeMetric]);

  // Semantic valuation badge for gauge
  const getGaugeTier = (pct: number) => {
    if (pct <= 20) return { label: "Cheap", color: "#57996f" };
    if (pct <= 40) return { label: "Fairly Cheap", color: "#a6cdb4" };
    if (pct <= 60) return { label: "Fair", color: "#5f6565" };
    if (pct <= 80) return { label: "Fairly Expensive", color: "#d6a17f" };
    return { label: "Expensive", color: "#c75948" };
  };

  const getTierBadgeStyle = (tier: string) => {
    switch (tier) {
      case "Significantly Undervalued":
        return "bg-[rgba(16,185,129,0.15)] text-[#34d399] border-[rgba(16,185,129,0.3)]";
      case "Moderately Undervalued":
        return "bg-[rgba(20,184,166,0.15)] text-[#2dd4bf] border-[rgba(20,184,166,0.3)]";
      case "Fairly Valued":
        return "bg-[rgba(245,158,11,0.15)] text-[#fbbf24] border-[rgba(245,158,11,0.3)]";
      case "Moderately Overvalued":
        return "bg-[rgba(249,115,22,0.15)] text-[#fb923c] border-[rgba(249,115,22,0.3)]";
      case "Significantly Overvalued":
        return "bg-[rgba(239,68,68,0.15)] text-[#f87171] border-[rgba(239,68,68,0.3)]";
      default:
        return "bg-[rgba(119,124,124,0.15)] text-[#a7a9a9] border-[rgba(119,124,124,0.3)]";
    }
  };

  const currentGaugeTier = getGaugeTier(gaugePercentile);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-[#32b8c6] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-sm text-[#a7a9a9]">Loading valuation deep-dive for {slug}...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-xl border border-red-500/30 bg-red-950/20 text-red-400">
        <h2 className="text-lg font-bold">Failed to load index</h2>
        <p className="text-sm mt-1">{error || "Index not found"}</p>
        <Link href="/baskets" className="inline-block mt-4 text-xs text-[#32b8c6] underline">
          ← Back to Baskets
        </Link>
      </div>
    );
  }

  const isPositiveDiscount =
    activeMetric === "div_yield"
      ? vs5YMedianPct !== null && vs5YMedianPct >= 0
      : vs5YMedianPct !== null && vs5YMedianPct <= 0;

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------- */}
      {/* 1. Top Breadcrumb & Action Bar                       */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Breadcrumb + Ticker + Valuation Tier */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#a7a9a9]">
          <Link href="/baskets" className="hover:text-white transition flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-[#32b8c6]" />
            <span>Baskets</span>
          </Link>
          <span>/</span>
          <span className="font-bold text-white text-sm">{data.nse_name}</span>
          <span className="px-2 py-0.5 rounded font-mono font-semibold bg-[rgba(50,184,198,0.15)] text-[#32b8c6]">
            {data.etf}
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full border font-semibold text-[11px] ${getTierBadgeStyle(
              data.valuation_tier
            )}`}
          >
            {data.valuation_tier}
          </span>
        </div>

        {/* Quick Index Switcher Dropdown */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={slug}
              onChange={(e) => router.push(`/${e.target.value}?metric=${activeMetric}`)}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-lg bg-[#262828] border border-[rgba(119,124,124,0.2)] text-xs font-semibold text-white focus:outline-none focus:border-[#32b8c6] transition cursor-pointer"
            >
              {ALL_SLUGS.map((s) => (
                <option key={s.slug} value={s.slug} className="bg-[#1f2121] text-white">
                  {s.name} ({s.etf})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#777c7c] pointer-events-none" />
          </div>

          <span className="px-3 py-1.5 rounded-lg border border-[rgba(50,184,198,0.3)] bg-[rgba(50,184,198,0.12)] text-[#32b8c6] text-xs font-semibold">
            ✓ In Watchlist
          </span>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* Title & Strategy Decision Banner                     */}
      {/* ---------------------------------------------------- */}
      <div className="p-5 rounded-xl border border-[rgba(119,124,124,0.2)] bg-[#262828] shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {data.nse_name} {metricLabel} & Valuation Profile
            </h1>
            <p className="mt-1 text-xs text-[#a7a9a9]">
              {data.cyclical ? "Cyclical Sector" : "Core / Defensive Sector"} · Benchmark ETF:{" "}
              <strong className="text-white font-mono">{data.etf}</strong> · As of{" "}
              <strong className="text-white font-mono">{data.latest_date}</strong>
            </p>
          </div>

          {/* Valuation Interpretation Callout Card */}
          <div className="p-3.5 rounded-r-lg bg-[#161b26] border-l-4 border-[#32b8c6] text-xs max-w-lg">
            <div className="text-xs font-bold text-white flex items-center gap-1.5 mb-1">
              <span>💡</span> Valuation Interpretation
            </div>
            <p className="text-[#a7a9a9] leading-relaxed">
              {data.nse_name} is trading at{" "}
              <span className="text-white font-mono font-semibold">{data.pe.toFixed(2)}</span>, which is{" "}
              <span className="text-white font-mono font-semibold">
                {Math.abs(data.window_stats?.["5Y"]?.pe?.pct_vs_median ?? 0).toFixed(1)}%{" "}
                {(data.window_stats?.["5Y"]?.pe?.pct_vs_median ?? 0) < 0 ? "below" : "above"}
              </span>{" "}
              its 5-year median PE of{" "}
              <span className="text-white font-mono font-semibold">
                {data.window_stats?.["5Y"]?.pe?.median?.toFixed(2) ?? "N/A"}
              </span>
              . This indicates the index is <strong className="text-white lowercase">{data.valuation_tier}</strong>.
              {(data.window_stats?.["5Y"]?.pe?.pct_vs_median ?? 0) < 0
                ? " Current valuations are below historical medians, potentially indicating a value opportunity."
                : " Current valuations are elevated relative to historical medians, suggesting caution."}
            </p>
          </div>
        </div>

        {/* Primary Metric Pill Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-[rgba(119,124,124,0.15)]">
          <button
            onClick={() => handleMetricChange("pe")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeMetric === "pe"
                ? "bg-[#32b8c6] text-[#13343b] shadow"
                : "bg-[#1f2121] text-[#a7a9a9] hover:text-white border border-[rgba(119,124,124,0.2)]"
            }`}
          >
            PE Ratio
          </button>
          <button
            onClick={() => handleMetricChange("pb")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeMetric === "pb"
                ? "bg-[#32b8c6] text-[#13343b] shadow"
                : "bg-[#1f2121] text-[#a7a9a9] hover:text-white border border-[rgba(119,124,124,0.2)]"
            }`}
          >
            PB Ratio
          </button>
          <button
            onClick={() => handleMetricChange("div_yield")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeMetric === "div_yield"
                ? "bg-[#32b8c6] text-[#13343b] shadow"
                : "bg-[#1f2121] text-[#a7a9a9] hover:text-white border border-[rgba(119,124,124,0.2)]"
            }`}
          >
            Dividend Yield
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. 3 Top KPI Cards (#262828)                         */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Current */}
        <div className="rounded-xl border border-[rgba(119,124,124,0.2)] bg-[#262828] p-5 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider text-[#777c7c] font-semibold block">
            Current {metricLabel}
          </span>
          <span className="text-3xl font-bold font-mono text-white mt-2 block">
            {currentMetricVal.toFixed(2)}
            {activeMetric === "div_yield" ? "%" : ""}
          </span>
          <span className="text-[11px] text-[#777c7c] mt-1 block">
            As of {data.latest_date}
          </span>
        </div>

        {/* Card 2: 5Y Median */}
        <div className="rounded-xl border border-[rgba(119,124,124,0.2)] bg-[#262828] p-5 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider text-[#777c7c] font-semibold block">
            5-Year Median {metricLabel}
          </span>
          <span className="text-3xl font-bold font-mono text-white mt-2 block">
            {median5YVal !== null ? median5YVal.toFixed(2) : "N/A"}
            {activeMetric === "div_yield" ? "%" : ""}
          </span>
          <span className="text-[11px] text-[#777c7c] mt-1 block">
            1,238 trading sessions benchmark
          </span>
        </div>

        {/* Card 3: vs 5Y Median */}
        <div className="rounded-xl border border-[rgba(119,124,124,0.2)] bg-[#262828] p-5 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider text-[#777c7c] font-semibold block">
            vs 5-Year Median (%)
          </span>
          <span
            className={`text-3xl font-bold font-mono mt-2 block ${
              isPositiveDiscount ? "text-[#4ade80]" : "text-[#f87171]"
            }`}
          >
            {vs5YMedianPct !== null
              ? `${vs5YMedianPct > 0 ? "+" : ""}${vs5YMedianPct.toFixed(1)}%`
              : "N/A"}
          </span>
          <span className="text-[11px] text-[#a7a9a9] mt-1 block">
            {isPositiveDiscount
              ? `Currently trading below its 5-year median valuation.`
              : `Currently trading above its 5-year median valuation.`}
          </span>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. 5-Segment Valuation Percentile Gauge Card         */}
      {/* ---------------------------------------------------- */}
      <div className="rounded-xl border border-[rgba(119,124,124,0.2)] bg-[#262828] p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[rgba(119,124,124,0.15)]">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Valuation Percentile Spectrum</span>
              <span className="text-xs font-normal text-[#a7a9a9]">
                ({metricLabel})
              </span>
            </h2>
            <p className="text-xs text-[#a7a9a9] mt-0.5">
              Historical distribution benchmarked across the selected rolling timeframe.
            </p>
          </div>

          {/* Timeframe Toggles for Gauge */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            {(["1Y", "3Y", "5Y", "7Y"] as GaugeWindowType[]).map((win) => (
              <button
                key={win}
                onClick={() => setGaugeWindow(win)}
                className={`px-3 py-1 rounded-md border transition font-semibold ${
                  gaugeWindow === win
                    ? "bg-[#32b8c6] text-[#13343b] border-[#32b8c6]"
                    : "bg-[#1f2121] text-[#a7a9a9] hover:text-white border-[rgba(119,124,124,0.2)]"
                }`}
              >
                {win}
              </button>
            ))}
          </div>
        </div>

        {/* The 5-Segment Horizontal Gauge Track */}
        <div className="mt-8 relative pt-6 pb-2">
          {/* Floating Marker Pin */}
          <div
            className="absolute top-0 -translate-x-1/2 flex flex-col items-center transition-all duration-300 z-10"
            style={{ left: `${Math.min(99, Math.max(1, gaugePercentile))}%` }}
          >
            <span
              className="text-[11px] font-bold font-mono px-2 py-0.5 rounded shadow whitespace-nowrap text-white"
              style={{ backgroundColor: currentGaugeTier.color }}
            >
              {gaugePercentile.toFixed(1)}% · {currentGaugeTier.label}
            </span>
            <div
              className="w-0 h-0 border-x-4 border-x-transparent border-t-4"
              style={{ borderTopColor: currentGaugeTier.color }}
            ></div>
          </div>

          {/* Color Segments Track (Exact UI_BLUEPRINT.md Hexes) */}
          <div className="h-4 w-full rounded-full overflow-hidden flex shadow-inner">
            <div className="h-full flex-1 bg-[#57996f]" title="Cheap (0-20%)" />
            <div className="h-full flex-1 bg-[#a6cdb4]" title="Fairly Cheap (20-40%)" />
            <div className="h-full flex-1 bg-[#5f6565]" title="Fair (40-60%)" />
            <div className="h-full flex-1 bg-[#d6a17f]" title="Fairly Expensive (60-80%)" />
            <div className="h-full flex-1 bg-[#c75948]" title="Expensive (80-100%)" />
          </div>

          {/* Segment Labels */}
          <div className="flex justify-between text-[11px] text-[#777c7c] mt-2 font-mono">
            <span className="w-1/5 text-left text-[#57996f] font-semibold">Cheap (0-20%)</span>
            <span className="w-1/5 text-center text-[#a6cdb4] font-semibold">Fairly Cheap (20-40%)</span>
            <span className="w-1/5 text-center text-[#a7a9a9] font-semibold">Fair (40-60%)</span>
            <span className="w-1/5 text-center text-[#d6a17f] font-semibold">Fairly Exp (60-80%)</span>
            <span className="w-1/5 text-right text-[#c75948] font-semibold">Expensive (80-100%)</span>
          </div>
        </div>

        {/* Dynamic Interpretation Text */}
        <div className="mt-6 pt-4 border-t border-[rgba(119,124,124,0.15)] text-xs text-[#a7a9a9] flex items-center gap-2">
          <Info className="w-4 h-4 text-[#32b8c6] shrink-0" />
          <span>
            {data.nse_name} is currently cheaper than{" "}
            <strong className="text-white font-mono">{(100 - gaugePercentile).toFixed(1)}%</strong> of
            trading sessions in the last {gaugeWindow} window (
            <strong className="text-[#2dd4bf] font-mono">{gaugePercentile.toFixed(1)}th percentile</strong>).
          </span>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 4. Interactive Recharts Valuation Chart Card         */}
      {/* ---------------------------------------------------- */}
      <div className="rounded-xl border border-[rgba(119,124,124,0.2)] bg-[#262828] p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[rgba(119,124,124,0.15)]">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Historical {metricLabel} Trajectory
            </h2>
            <p className="text-xs text-[#a7a9a9] mt-0.5">
              Daily time-series with {chartTimeframe} rolling median benchmark reference line.
            </p>
          </div>

          {/* Timeframe Selector Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            {(["3M", "6M", "1Y", "3Y", "5Y", "7Y", "Max"] as TimeframeType[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setChartTimeframe(tf)}
                className={`px-2.5 py-1 rounded-md border transition font-semibold ${
                  chartTimeframe === tf
                    ? "bg-[#32b8c6] text-[#13343b] border-[#32b8c6]"
                    : "bg-[#1f2121] text-[#a7a9a9] hover:text-white border-[rgba(119,124,124,0.2)]"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="mt-6 h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#32b8c6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#32b8c6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(119, 124, 124, 0.15)" />
              <XAxis
                dataKey="date"
                stroke="#777c7c"
                fontSize={11}
                tickFormatter={(str) => (str ? str.slice(0, 7) : "")}
              />
              <YAxis stroke="#777c7c" fontSize={11} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1c1c",
                  borderColor: "rgba(119, 124, 124, 0.3)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontFamily: "monospace",
                }}
                labelStyle={{ color: "#ffffff", fontWeight: "bold" }}
                formatter={(val: any) => [
                  typeof val === "number" ? val.toFixed(2) : val,
                  metricLabel,
                ]}
              />
              {activeChartMedian && (
                <ReferenceLine
                  y={activeChartMedian}
                  stroke="#e68161"
                  strokeDasharray="4 4"
                  label={{
                    value: `Median: ${activeChartMedian.toFixed(2)}`,
                    fill: "#e68161",
                    fontSize: 11,
                    position: "right",
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey={activeMetric}
                stroke="#32b8c6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#metricGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 5. 2-Column Analytics Grid                           */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Historical Medians Table */}
        <div className="rounded-xl border border-[rgba(119,124,124,0.2)] bg-[#262828] p-5 shadow-xl">
          <h3 className="text-base font-bold text-white tracking-tight">
            Multi-Window Historical Medians
          </h3>
          <p className="text-xs text-[#a7a9a9] mt-0.5">
            Comparing current {metricLabel} against rolling historical benchmarks.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-[rgba(119,124,124,0.2)] text-[11px] text-[#777c7c] uppercase">
                  <th className="py-2.5 px-3 text-left">Window</th>
                  <th className="py-2.5 px-3 text-right">Current</th>
                  <th className="py-2.5 px-3 text-right">Median</th>
                  <th className="py-2.5 px-3 text-right">Current vs Median</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(119,124,124,0.1)]">
                {["1Y", "3Y", "5Y", "7Y", "Max"].map((winKey) => {
                  const m = data.window_stats?.[winKey]?.[activeMetric];
                  if (!m) return null;
                  const isDisc =
                    activeMetric === "div_yield"
                      ? m.pct_vs_median >= 0
                      : m.pct_vs_median <= 0;

                  return (
                    <tr key={winKey} className="hover:bg-[#1f2121]/60">
                      <td className="py-2.5 px-3 font-sans font-semibold text-white">
                        {winKey} Window
                      </td>
                      <td className="py-2.5 px-3 text-right text-white font-mono font-bold">
                        {currentMetricVal.toFixed(2)}
                        {activeMetric === "div_yield" ? "%" : ""}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#a7a9a9] font-mono">
                        {m.median !== null ? m.median.toFixed(2) : "N/A"}
                        {activeMetric === "div_yield" ? "%" : ""}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono font-bold ${
                          isDisc ? "text-[#4ade80]" : "text-[#f87171]"
                        }`}
                      >
                        {m.pct_vs_median !== null
                          ? `${m.pct_vs_median > 0 ? "+" : ""}${m.pct_vs_median.toFixed(1)}%`
                          : "N/A"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: 5Y Forward Return Band & Benchmark ETF */}
        <div className="space-y-4">
          {/* 5Y Forward Return Band */}
          <div className="rounded-xl border border-[rgba(119,124,124,0.2)] bg-[#262828] p-5 shadow-xl">
            <h3 className="text-base font-bold text-white tracking-tight flex items-center justify-between">
              <span>5Y Forward Return Distribution</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1f2121] text-[#32b8c6] border border-[rgba(119,124,124,0.2)]">
                PE Band [{data.fwd_5y_band.band_min_pe} - {data.fwd_5y_band.band_max_pe}]
              </span>
            </h3>
            <p className="text-xs text-[#a7a9a9] mt-0.5">
              Historical 5-year CAGR outcomes when entering {data.nse_name} within ±1.5 of current P/E.
            </p>

            <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-[rgba(119,124,124,0.15)] text-center font-mono">
              <div className="p-3 rounded-lg bg-[#1f2121]">
                <span className="text-[10px] text-[#777c7c] uppercase block">Median 5Y CAGR</span>
                <span className="text-lg font-bold text-[#4ade80] mt-1 block">
                  {data.fwd_5y_band.median_fwd_cagr !== null
                    ? `+${data.fwd_5y_band.median_fwd_cagr.toFixed(1)}%`
                    : "N/A"}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#1f2121]">
                <span className="text-[10px] text-[#777c7c] uppercase block">Positive Windows</span>
                <span className="text-lg font-bold text-[#32b8c6] mt-1 block">
                  {data.fwd_5y_band.positive_window_pct !== null
                    ? `${data.fwd_5y_band.positive_window_pct.toFixed(0)}%`
                    : "N/A"}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#1f2121]">
                <span className="text-[10px] text-[#777c7c] uppercase block">Sample Days</span>
                <span className="text-lg font-bold text-white mt-1 block">
                  {data.fwd_5y_band.sample_count}
                </span>
              </div>
            </div>
          </div>

          {/* Benchmark ETF Instrument Card */}
          <div className="rounded-xl border border-[rgba(119,124,124,0.2)] bg-[#262828] p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#777c7c] font-semibold block">
                  Benchmark Tradable ETF
                </span>
                <span className="text-lg font-bold font-mono text-[#32b8c6] mt-0.5 block">
                  {data.etf}
                </span>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-[#1f2121] text-white border border-[rgba(119,124,124,0.2)]">
                Index Close: {data.close.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="mt-3 pt-3 border-t border-[rgba(119,124,124,0.15)] flex items-center justify-between text-xs">
              <span className="text-[#a7a9a9]">Implied TTM EPS:</span>
              <strong className="text-white font-mono font-bold">₹{data.eps.toFixed(2)}</strong>
            </div>

            {/* 52-Week Range & Position Bar */}
            {data.high_52w && data.low_52w && (
              <div className="mt-4 pt-3 border-t border-[rgba(119,124,124,0.15)] space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[#777c7c]">
                    52W Low: ₹{data.low_52w.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[#2dd4bf] font-bold">
                    Position: {data.position_52w_pct.toFixed(1)}% (
                    <span className={data.from_52w_high_pct <= 0 ? "text-[#f87171]" : "text-[#4ade80]"}>
                      {data.from_52w_high_pct > 0 ? "+" : ""}{data.from_52w_high_pct.toFixed(1)}% from high
                    </span>
                    )
                  </span>
                  <span className="text-[#777c7c]">
                    52W High: ₹{data.high_52w.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#1e293b] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#0d9488] to-[#14b8a6] transition-all duration-500"
                    style={{ width: `${data.position_52w_pct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 6. Index Earnings (EPS) Dynamics & Growth Matrix     */}
      {/* ---------------------------------------------------- */}
      <div className="rounded-xl border border-[rgba(119,124,124,0.2)] bg-[#262828] p-6 shadow-xl">
        <div className="pb-4 border-b border-[rgba(119,124,124,0.15)]">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>Fundamental Earnings (EPS) Dynamics & Compound Growth</span>
          </h2>
          <p className="text-xs text-[#a7a9a9] mt-0.5">
            Evaluating whether index returns are backed by fundamental corporate earnings growth or valuation expansion.
          </p>
        </div>

        {/* EPS Chart & Growth Table Split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* EPS Line Chart */}
          <div className="h-64 w-full">
            <span className="text-xs font-semibold text-[#a78bfa] block mb-2 font-mono">
              Implied EPS Index Points (Close / PE)
            </span>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(119, 124, 124, 0.15)" />
                <XAxis
                  dataKey="date"
                  stroke="#777c7c"
                  fontSize={10}
                  tickFormatter={(str) => (str ? str.slice(0, 7) : "")}
                />
                <YAxis stroke="#777c7c" fontSize={10} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1c1c",
                    borderColor: "rgba(119, 124, 124, 0.3)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontFamily: "monospace",
                  }}
                  formatter={(val: any) => [
                    typeof val === "number" ? val.toFixed(2) : val,
                    "Derived EPS",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="eps"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Annualized Compound Growth Table */}
          <div className="overflow-x-auto">
            <span className="text-xs font-semibold text-white block mb-2 font-mono">
              Annualized CAGR Comparison Matrix
            </span>
            <table className="w-full text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-[rgba(119,124,124,0.2)] text-[11px] text-[#777c7c] uppercase">
                  <th className="py-2 px-3 text-left">Window</th>
                  <th className="py-2 px-3 text-right">EPS CAGR</th>
                  <th className="py-2 px-3 text-right">Price CAGR</th>
                  <th className="py-2 px-3 text-right">PE Then</th>
                  <th className="py-2 px-3 text-right">PE Now</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(119,124,124,0.1)]">
                {Object.entries(data.growth || {}).map(([winKey, g]: any) => (
                  <tr key={winKey} className="hover:bg-[#1f2121]/60">
                    <td className="py-2.5 px-3 font-sans font-semibold text-white">
                      {winKey} Period
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        g.eps_cagr > 0 ? "text-[#4ade80]" : "text-[#f87171]"
                      }`}
                    >
                      {g.eps_cagr !== null ? `${g.eps_cagr > 0 ? "+" : ""}${g.eps_cagr.toFixed(1)}%` : "N/A"}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-semibold ${
                        g.close_cagr > 0 ? "text-[#38bdf8]" : "text-[#f87171]"
                      }`}
                    >
                      {g.close_cagr !== null ? `${g.close_cagr > 0 ? "+" : ""}${g.close_cagr.toFixed(1)}%` : "N/A"}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#a7a9a9]">
                      {g.pe_then !== null ? g.pe_then.toFixed(2) : "N/A"}
                    </td>
                    <td className="py-2.5 px-3 text-right text-white font-bold">
                      {g.pe_now !== null ? g.pe_now.toFixed(2) : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IndexDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="w-10 h-10 border-4 border-[#32b8c6] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-sm text-[#a7a9a9]">Loading Index Valuation Deep-Dive...</div>
        </div>
      }
    >
      <IndexDetailContent />
    </Suspense>
  );
}
