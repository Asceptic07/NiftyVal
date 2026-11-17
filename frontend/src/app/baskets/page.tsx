"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Info,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";

interface BasketItem {
  slug: string;
  nse_name: string;
  etf: string;
  cyclical: boolean;
  date: string;
  close: number;
  pe: number;
  pb: number;
  div_yield: number;
  pe_5y_pct: number;
  pb_5y_pct: number;
  eps_1y_pct: number;
  eps_5y_pct: number;
  signal: "BUY" | "HALF-TRANCHE" | "SKIP";
  reason: string;
  category: string;
  change_pct: number;
  median_5y_pe: number;
  vs_5y_median_pct: number;
  valuation_tier: string;
}

interface CorrelationData {
  slugs: string[];
  names: string[];
  matrix: number[][];
}

export default function BasketsPage() {
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [correlation, setCorrelation] = useState<CorrelationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{
    row: number;
    col: number;
    val: number;
  } | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [resBasket, resCorr] = await Promise.all([
          fetch("http://127.0.0.1:8000/api/basket"),
          fetch("http://127.0.0.1:8000/api/correlation"),
        ]);

        if (!resBasket.ok || !resCorr.ok) {
          throw new Error("Failed to fetch basket or correlation data from API");
        }

        const basketJson = await resBasket.json();
        const corrJson = await resCorr.json();

        setBasket(basketJson);
        setCorrelation(corrJson);
      } catch (err: any) {
        console.error("Error loading data:", err);
        setError(err.message || "Failed to connect to FastAPI backend");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

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

  const getCorrColor = (val: number, isDiagonal: boolean) => {
    if (isDiagonal) return "bg-[#1f2121] text-[#777c7c] font-bold";
    if (val < 0.25) return "bg-[rgba(45,212,191,0.18)] text-[#2dd4bf]";
    if (val < 0.5) return "bg-[rgba(56,189,248,0.18)] text-[#38bdf8]";
    if (val < 0.7) return "bg-[rgba(245,158,11,0.22)] text-[#fbbf24]";
    return "bg-[rgba(239,68,68,0.25)] text-[#f87171] font-semibold";
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-[#32b8c6] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-sm text-[#a7a9a9]">Loading ETF Basket & Correlation Matrix...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl border border-red-500/30 bg-red-950/20 text-red-400">
        <h3 className="text-lg font-bold">API Connection Error</h3>
        <p className="mt-1 text-sm">{error}</p>
        <p className="mt-3 text-xs text-[#a7a9a9]">
          Make sure the FastAPI backend is running on <code>http://127.0.0.1:8000</code>.
        </p>
      </div>
    );
  }

  const sigUndervaluedCount = basket.filter((b) => b.valuation_tier === "Significantly Undervalued").length;
  const modUndervaluedCount = basket.filter((b) => b.valuation_tier === "Moderately Undervalued").length;
  const fairCount = basket.filter((b) => b.valuation_tier === "Fairly Valued").length;
  const overvaluedCount = basket.filter((b) => b.valuation_tier.includes("Overvalued")).length;

  return (
    <div className="space-y-8">
      {/* ---------------------------------------------------- */}
      {/* Header Section                                       */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-[#32b8c6]" />
            Baskets & Portfolio Watchlists
          </h1>
          <p className="mt-1 text-sm text-[#a7a9a9]">
            Manage curated multi-index baskets for valuation monitoring, allocation scenarios, and systematic ETF rebalancing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard?basket=etf-watchlist"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(50,184,198,0.15)] text-[#32b8c6] border border-[#32b8c6] hover:bg-[rgba(50,184,198,0.25)] transition font-medium text-sm"
          >
            <span>View on dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 1. ETF Index Watchlist Card                          */}
      {/* ---------------------------------------------------- */}
      <div className="rounded-xl border border-[rgba(119,124,124,0.2)] bg-[#262828] p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[rgba(119,124,124,0.15)]">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-white tracking-tight">
                ETF Index Watchlist
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-[#1a1c1c] text-[#32b8c6] border border-[rgba(119,124,124,0.2)]">
                11 Indices
              </span>
            </div>
            <p className="text-xs text-[#a7a9a9]">
              Core investable NSE sectoral & broad market indices with liquid India ETFs.
            </p>
          </div>

          {/* Valuation Status Counters */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="px-3 py-1 rounded-full border border-[rgba(16,185,129,0.3)] text-[#34d399] bg-[rgba(16,185,129,0.15)] font-semibold">
              {sigUndervaluedCount + modUndervaluedCount} Undervalued
            </span>
            <span className="px-3 py-1 rounded-full border border-[rgba(245,158,11,0.3)] text-[#fbbf24] bg-[rgba(245,158,11,0.15)] font-semibold">
              {fairCount} Fairly Valued
            </span>
            <span className="px-3 py-1 rounded-full border border-[rgba(239,68,68,0.3)] text-[#f87171] bg-[rgba(239,68,68,0.15)] font-semibold">
              {overvaluedCount} Overvalued
            </span>
          </div>
        </div>

        {/* Clickable Index Chips Grid */}
        <div className="mt-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#777c7c] mb-3">
            Constituent Indices (Click any index to open deep-dive)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {basket.map((item) => {
              const tierBadgeStyle = getTierBadgeStyle(item.valuation_tier);
              const isPositiveChange = item.change_pct >= 0;

              return (
                <Link
                  key={item.slug}
                  href={`/${item.slug}`}
                  className="group flex flex-col justify-between p-4 rounded-xl border border-[rgba(119,124,124,0.2)] bg-[#1f2121] hover:bg-[#262828] hover:border-[#32b8c6]/50 transition shadow-sm h-full"
                >
                  {/* Card Header: Index Name, Subtitle (ETF • Category), and Dedicated Valuation Status Pill */}
                  <div className="space-y-2.5">
                    <div>
                      <div
                        className="text-sm font-semibold text-[#f5f5f5] group-hover:text-[#32b8c6] transition truncate"
                        title={item.nse_name}
                      >
                        {item.nse_name}
                      </div>
                      <div className="text-[11px] text-[#a7a9a9] truncate mt-0.5">
                        <span className="font-mono text-[#32b8c6] font-medium">{item.etf}</span>
                        <span className="mx-1.5 text-[#777c7c]">•</span>
                        <span>{item.category}</span>
                      </div>
                    </div>

                    <div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium w-fit border ${tierBadgeStyle}`}
                      >
                        {item.valuation_tier}
                      </span>
                    </div>
                  </div>

                  {/* Metrics Row at Bottom */}
                  <div className="mt-4 pt-3 border-t border-[rgba(119,124,124,0.15)] flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="text-[#777c7c] text-[10px] block">P/E</span>
                      <span className="text-white font-semibold">{item.pe.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[#777c7c] text-[10px] block">5Y P/E PCT</span>
                      <span className="text-[#2dd4bf] font-bold">
                        {item.pe_5y_pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[#777c7c] text-[10px] block">1D CHG</span>
                      <span
                        className={isPositiveChange ? "text-[#4ade80]" : "text-[#f87171]"}
                      >
                        {isPositiveChange ? "+" : ""}
                        {item.change_pct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Card Footer Banner */}
        <div className="mt-6 pt-4 border-t border-[rgba(119,124,124,0.15)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#a7a9a9]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
            <span>
              All constituent valuations synchronized with official NSE bhavcopy up to{" "}
              <strong className="text-white font-mono">{basket[0]?.date || "latest"}</strong>.
            </span>
          </div>
          <Link
            href="/dashboard?basket=etf-watchlist"
            className="flex items-center gap-1.5 font-semibold text-[#32b8c6] hover:underline"
          >
            <span>View complete 11-column screener table</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. Interactive 11x11 Correlation Matrix Card        */}
      {/* ---------------------------------------------------- */}
      {correlation && (
        <div className="rounded-xl border border-[rgba(119,124,124,0.2)] bg-[#262828] p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[rgba(119,124,124,0.15)]">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                1-Year Return Correlation Matrix (252 Trading Sessions)
              </h2>
              <p className="mt-1 text-xs text-[#a7a9a9]">
                Pairwise Pearson correlation of daily close returns across all 11 core indices.
                Lower correlation (&lt; 0.40) provides strong portfolio diversification.
              </p>
            </div>

            {/* Heatmap Legend */}
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="text-[#777c7c] mr-1">Scale:</span>
              <span className="px-2 py-0.5 rounded bg-[rgba(45,212,191,0.2)] text-[#2dd4bf]">
                &lt; 0.25 Low
              </span>
              <span className="px-2 py-0.5 rounded bg-[rgba(56,189,248,0.2)] text-[#38bdf8]">
                0.25 - 0.50
              </span>
              <span className="px-2 py-0.5 rounded bg-[rgba(245,158,11,0.25)] text-[#fbbf24]">
                0.50 - 0.70
              </span>
              <span className="px-2 py-0.5 rounded bg-[rgba(239,68,68,0.3)] text-[#f87171]">
                &gt; 0.70 High
              </span>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse text-center text-xs font-mono">
              <thead>
                <tr>
                  <th className="p-2 text-left text-[11px] text-[#777c7c] font-normal uppercase tracking-wider sticky left-0 bg-[#262828] z-10">
                    Index
                  </th>
                  {correlation.names.map((name, idx) => (
                    <th
                      key={idx}
                      className="p-2 text-[11px] text-[#a7a9a9] font-semibold whitespace-nowrap min-w-[70px]"
                      title={name}
                    >
                      {name.replace("NIFTY ", "")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {correlation.matrix.map((row, rIdx) => {
                  const rowName = correlation.names[rIdx];
                  const rowSlug = correlation.slugs[rIdx];

                  return (
                    <tr key={rowSlug} className="border-t border-[rgba(119,124,124,0.1)]">
                      {/* Sticky Row Header */}
                      <td className="p-2 text-left font-semibold text-white whitespace-nowrap sticky left-0 bg-[#262828] z-10 border-r border-[rgba(119,124,124,0.15)]">
                        <Link
                          href={`/${rowSlug}`}
                          className="hover:text-[#32b8c6] transition"
                        >
                          {rowName.replace("NIFTY ", "")}
                        </Link>
                      </td>

                      {/* Correlation Cells */}
                      {row.map((val, cIdx) => {
                        const isDiag = rIdx === cIdx;
                        const cellStyle = getCorrColor(val, isDiag);

                        return (
                          <td
                            key={cIdx}
                            onMouseEnter={() =>
                              setHoveredCell({ row: rIdx, col: cIdx, val })
                            }
                            onMouseLeave={() => setHoveredCell(null)}
                            className={`p-2 transition cursor-default ${cellStyle} hover:ring-2 hover:ring-[#32b8c6]`}
                            title={`${correlation.names[rIdx]} vs ${correlation.names[cIdx]}: ${val.toFixed(2)}`}
                          >
                            {val.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Hover Inspector Tooltip */}
          <div className="mt-4 pt-3 border-t border-[rgba(119,124,124,0.15)] h-6 flex items-center text-xs">
            {hoveredCell ? (
              <div className="flex items-center gap-2 text-white">
                <span className="font-semibold text-[#32b8c6]">
                  {correlation.names[hoveredCell.row]}
                </span>
                <span className="text-[#777c7c]">&</span>
                <span className="font-semibold text-[#32b8c6]">
                  {correlation.names[hoveredCell.col]}
                </span>
                <span className="text-[#a7a9a9]">→ Correlation:</span>
                <strong className="font-mono text-white text-sm">
                  {hoveredCell.val.toFixed(2)}
                </strong>
                <span className="text-xs text-[#a7a9a9]">
                  {hoveredCell.val === 1.0
                    ? "(Self Correlation)"
                    : hoveredCell.val < 0.25
                    ? "(High Diversification Benefit)"
                    : hoveredCell.val < 0.5
                    ? "(Moderate Diversification)"
                    : "(High Common Factor / Low Diversification)"}
                </span>
              </div>
            ) : (
              <span className="text-[#777c7c]">
                Hover over any correlation cell to inspect the pairwise relationship.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
