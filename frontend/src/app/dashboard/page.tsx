"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BarChart3,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Info,
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
  median_1y_pe: number;
  median_3y_pe: number;
  median_5y_pe: number;
  median_7y_pe: number;
  vs_5y_median_pct: number;
  vs_7y_median_pct: number;
  valuation_tier: string;
  high_52w: number;
  low_52w: number;
  from_52w_high_pct: number;
  position_52w_pct: number;
}

type SortColumn =
  | "nse_name"
  | "change_pct"
  | "category"
  | "pe"
  | "median_7y_pe"
  | "median_5y_pe"
  | "median_3y_pe"
  | "median_1y_pe"
  | "vs_5y_median_pct"
  | "valuation_tier";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const basketParam = searchParams.get("basket");

  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Accordion expansion state
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<
    "all" | "undervalued" | "fair" | "overvalued"
  >("all");

  // Sorting
  const [sortCol, setSortCol] = useState<SortColumn>("vs_5y_median_pct");
  const [sortAsc, setSortAsc] = useState<boolean>(true); // default: lowest vs_5y_median_pct (deepest discount first)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch("http://127.0.0.1:8000/api/basket");
        if (!res.ok) throw new Error("Failed to load valuations data from API");
        const json = await res.json();
        setBasket(json);
      } catch (err: any) {
        setError(err.message || "Failed to connect to backend");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Summary categories
  const sigUndervalued = useMemo(
    () => basket.filter((b) => b.valuation_tier === "Significantly Undervalued"),
    [basket]
  );
  const modUndervalued = useMemo(
    () => basket.filter((b) => b.valuation_tier === "Moderately Undervalued"),
    [basket]
  );
  const fairlyValued = useMemo(
    () => basket.filter((b) => b.valuation_tier === "Fairly Valued"),
    [basket]
  );
  const overvalued = useMemo(
    () => basket.filter((b) => b.valuation_tier.includes("Overvalued")),
    [basket]
  );

  // Filtered & Sorted items
  const processedItems = useMemo(() => {
    let items = [...basket];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (b) =>
          b.nse_name.toLowerCase().includes(q) ||
          b.etf.toLowerCase().includes(q) ||
          b.slug.toLowerCase().includes(q)
      );
    }

    // Tier filter
    if (tierFilter === "undervalued") {
      items = items.filter((b) => b.valuation_tier.includes("Undervalued"));
    } else if (tierFilter === "fair") {
      items = items.filter((b) => b.valuation_tier === "Fairly Valued");
    } else if (tierFilter === "overvalued") {
      items = items.filter((b) => b.valuation_tier.includes("Overvalued"));
    }

    // Sorting
    items.sort((a, b) => {
      let valA: any = a[sortCol];
      let valB: any = b[sortCol];

      if (typeof valA === "string") {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return items;
  }, [basket, searchQuery, tierFilter, sortCol, sortAsc]);

  const handleSort = (col: SortColumn) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  const getSortIcon = (col: SortColumn) => {
    if (sortCol !== col) {
      return <ArrowUpDown className="w-3 h-3 text-[#777c7c] inline ml-1 opacity-60" />;
    }
    return sortAsc ? (
      <ArrowUp className="w-3 h-3 text-[#32b8c6] inline ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#32b8c6] inline ml-1" />
    );
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-[#32b8c6] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-sm text-[#a7a9a9]">Loading Valuations Screener...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl border border-red-500/30 bg-red-950/20 text-red-400">
        <h3 className="text-lg font-bold">Failed to load valuations</h3>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------- */}
      {/* 1. Header & Active Basket Filter Banner              */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-[#32b8c6]" />
            Index Valuations Screener
          </h1>
          <p className="mt-1 text-sm text-[#a7a9a9]">
            NSE sectoral & broad-market valuation multiples across 1Y–7Y historical rolling windows.
          </p>
        </div>

        {basketParam && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(50,184,198,0.15)] border border-[#32b8c6] text-xs">
            <span className="text-[#32b8c6] font-semibold">Active Basket:</span>
            <span className="text-white font-medium">ETF Index Watchlist (11 Indices)</span>
            <Link
              href="/dashboard"
              className="p-0.5 ml-1 rounded hover:bg-[#32b8c6]/30 text-[#32b8c6] hover:text-white transition"
              title="Clear basket filter"
            >
              <X className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. 4-Card Valuation Deviation Summary Strip (#262828) */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Significantly Undervalued */}
        <div className="rounded-xl border border-[rgba(16,185,129,0.3)] bg-[#262828] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-[#34d399] tracking-wider">
              Significantly Undervalued
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[rgba(16,185,129,0.15)] text-[#34d399] font-bold">
              {sigUndervalued.length}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-[#777c7c]">&lt; -20% vs 5Y Median P/E</div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {sigUndervalued.map((b) => (
              <Link
                key={b.slug}
                href={`/${b.slug}`}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1f2121] border border-[rgba(16,185,129,0.2)] text-[#34d399] hover:border-[#34d399] transition"
              >
                {b.etf} ({b.vs_5y_median_pct.toFixed(0)}%)
              </Link>
            ))}
          </div>
        </div>

        {/* Moderately Undervalued */}
        <div className="rounded-xl border border-[rgba(20,184,166,0.3)] bg-[#262828] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-[#2dd4bf] tracking-wider">
              Moderately Undervalued
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[rgba(20,184,166,0.15)] text-[#2dd4bf] font-bold">
              {modUndervalued.length}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-[#777c7c]">-20% to -10% vs 5Y Median</div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {modUndervalued.map((b) => (
              <Link
                key={b.slug}
                href={`/${b.slug}`}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1f2121] border border-[rgba(20,184,166,0.2)] text-[#2dd4bf] hover:border-[#2dd4bf] transition"
              >
                {b.etf} ({b.vs_5y_median_pct.toFixed(0)}%)
              </Link>
            ))}
          </div>
        </div>

        {/* Fairly Valued */}
        <div className="rounded-xl border border-[rgba(245,158,11,0.3)] bg-[#262828] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-[#fbbf24] tracking-wider">
              Fairly Valued
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[rgba(245,158,11,0.15)] text-[#fbbf24] font-bold">
              {fairlyValued.length}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-[#777c7c]">-10% to +10% vs 5Y Median</div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {fairlyValued.map((b) => (
              <Link
                key={b.slug}
                href={`/${b.slug}`}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1f2121] border border-[rgba(245,158,11,0.2)] text-[#fbbf24] hover:border-[#fbbf24] transition"
              >
                {b.etf} ({b.vs_5y_median_pct > 0 ? "+" : ""}{b.vs_5y_median_pct.toFixed(0)}%)
              </Link>
            ))}
          </div>
        </div>

        {/* Overvalued */}
        <div className="rounded-xl border border-[rgba(239,68,68,0.3)] bg-[#262828] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-[#f87171] tracking-wider">
              Overvalued
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[rgba(239,68,68,0.15)] text-[#f87171] font-bold">
              {overvalued.length}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-[#777c7c]">&gt; +10% vs 5Y Median P/E</div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {overvalued.map((b) => (
              <Link
                key={b.slug}
                href={`/${b.slug}`}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1f2121] border border-[rgba(239,68,68,0.2)] text-[#f87171] hover:border-[#f87171] transition"
              >
                {b.etf} (+{b.vs_5y_median_pct.toFixed(0)}%)
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. Search & Tier Filter Bar                          */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-[rgba(119,124,124,0.2)] bg-[#262828]">
        {/* Instant Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#777c7c]" />
          <input
            type="text"
            placeholder="Search index name, ETF ticker (ITBEES, METALIETF)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#1f2121] border border-[rgba(119,124,124,0.2)] text-xs text-white placeholder-[#777c7c] focus:outline-none focus:border-[#32b8c6] transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#777c7c] hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setTierFilter("all")}
            className={`px-3 py-1.5 rounded-lg border transition font-medium ${
              tierFilter === "all"
                ? "bg-[rgba(50,184,198,0.18)] text-[#32b8c6] border-[#32b8c6]"
                : "border-[rgba(119,124,124,0.2)] bg-[#1f2121] text-[#a7a9a9] hover:text-white"
            }`}
          >
            All ({basket.length})
          </button>
          <button
            onClick={() => setTierFilter("undervalued")}
            className={`px-3 py-1.5 rounded-lg border transition font-medium ${
              tierFilter === "undervalued"
                ? "bg-[rgba(16,185,129,0.18)] text-[#34d399] border-[#34d399]"
                : "border-[rgba(119,124,124,0.2)] bg-[#1f2121] text-[#a7a9a9] hover:text-white"
            }`}
          >
            Undervalued ({sigUndervalued.length + modUndervalued.length})
          </button>
          <button
            onClick={() => setTierFilter("fair")}
            className={`px-3 py-1.5 rounded-lg border transition font-medium ${
              tierFilter === "fair"
                ? "bg-[rgba(245,158,11,0.18)] text-[#fbbf24] border-[#fbbf24]"
                : "border-[rgba(119,124,124,0.2)] bg-[#1f2121] text-[#a7a9a9] hover:text-white"
            }`}
          >
            Fairly Valued ({fairlyValued.length})
          </button>
          <button
            onClick={() => setTierFilter("overvalued")}
            className={`px-3 py-1.5 rounded-lg border transition font-medium ${
              tierFilter === "overvalued"
                ? "bg-[rgba(239,68,68,0.18)] text-[#f87171] border-[#f87171]"
                : "border-[rgba(119,124,124,0.2)] bg-[#1f2121] text-[#a7a9a9] hover:text-white"
            }`}
          >
            Overvalued ({overvalued.length})
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 4. Exact 11-Column Sortable Table with Accordion     */}
      {/* ---------------------------------------------------- */}
      <div className="rounded-xl border border-[rgba(119,124,124,0.2)] bg-[#262828] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-[rgba(119,124,124,0.2)] bg-[#1a1c1c] text-[11px] font-semibold text-[#777c7c] uppercase select-none">
                {/* 1. Index Name */}
                <th
                  onClick={() => handleSort("nse_name")}
                  className="py-3 px-3.5 cursor-pointer hover:text-white transition whitespace-nowrap"
                >
                  <span>Index Name</span>
                  {getSortIcon("nse_name")}
                </th>

                {/* 2. Change % */}
                <th
                  onClick={() => handleSort("change_pct")}
                  className="py-3 px-3 text-right cursor-pointer hover:text-white transition whitespace-nowrap"
                >
                  <span>1D Chg</span>
                  {getSortIcon("change_pct")}
                </th>

                {/* 3. Category */}
                <th
                  onClick={() => handleSort("category")}
                  className="py-3 px-3 cursor-pointer hover:text-white transition whitespace-nowrap"
                >
                  <span>Category</span>
                  {getSortIcon("category")}
                </th>

                {/* 4. Current PE */}
                <th
                  onClick={() => handleSort("pe")}
                  className="py-3 px-3 text-right cursor-pointer hover:text-white transition whitespace-nowrap"
                >
                  <span>Current PE</span>
                  {getSortIcon("pe")}
                </th>

                {/* 5. 7Y Med PE */}
                <th
                  onClick={() => handleSort("median_7y_pe")}
                  className="py-3 px-3 text-right cursor-pointer hover:text-white transition whitespace-nowrap"
                >
                  <span>7Y Med</span>
                  {getSortIcon("median_7y_pe")}
                </th>

                {/* 6. 5Y Med PE */}
                <th
                  onClick={() => handleSort("median_5y_pe")}
                  className="py-3 px-3 text-right cursor-pointer hover:text-white transition whitespace-nowrap"
                >
                  <span>5Y Med</span>
                  {getSortIcon("median_5y_pe")}
                </th>

                {/* 7. 3Y Med PE */}
                <th
                  onClick={() => handleSort("median_3y_pe")}
                  className="py-3 px-3 text-right cursor-pointer hover:text-white transition whitespace-nowrap"
                >
                  <span>3Y Med</span>
                  {getSortIcon("median_3y_pe")}
                </th>

                {/* 8. 1Y Med PE */}
                <th
                  onClick={() => handleSort("median_1y_pe")}
                  className="py-3 px-3 text-right cursor-pointer hover:text-white transition whitespace-nowrap"
                >
                  <span>1Y Med</span>
                  {getSortIcon("median_1y_pe")}
                </th>

                {/* 9. vs 5Y Med (%) */}
                <th
                  onClick={() => handleSort("vs_5y_median_pct")}
                  className="py-3 px-3 text-right cursor-pointer hover:text-white transition whitespace-nowrap"
                >
                  <span>vs 5Y Med %</span>
                  {getSortIcon("vs_5y_median_pct")}
                </th>

                {/* 10. Valuation Status */}
                <th
                  onClick={() => handleSort("valuation_tier")}
                  className="py-3 px-3 cursor-pointer hover:text-white transition whitespace-nowrap"
                >
                  <span>Valuation Status</span>
                  {getSortIcon("valuation_tier")}
                </th>

                {/* 11. Details Navigation Chevron */}
                <th className="py-3 px-3 text-right whitespace-nowrap">
                  <span>Details</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(119,124,124,0.1)]">
              {processedItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-[#777c7c]">
                    No indices match the current search or filter criteria.
                  </td>
                </tr>
              ) : (
                processedItems.map((item) => {
                  const isPositiveChange = item.change_pct >= 0;
                  const isDiscounted = item.vs_5y_median_pct <= 0;
                  const tierStyle = getTierBadgeStyle(item.valuation_tier);
                  const isExpanded = expandedSlug === item.slug;

                  // PE Bar comparison values
                  const peBars = [
                    { label: "Current PE", val: item.pe, color: "#1fb8cd" },
                    { label: "1Y Median", val: item.median_1y_pe, color: "#10b981" },
                    { label: "3Y Median", val: item.median_3y_pe, color: "#ffc185" },
                    { label: "5Y Median", val: item.median_5y_pe, color: "#b4413c" },
                    { label: "7Y Median", val: item.median_7y_pe, color: "#8b5cf6" },
                  ];
                  const maxPeVal = Math.max(...peBars.map((b) => b.val || 0), 1) * 1.15;

                  return (
                    <React.Fragment key={item.slug}>
                      {/* Main Table Row: Clicking anywhere on body toggles accordion */}
                      <tr
                        onClick={() =>
                          setExpandedSlug(isExpanded ? null : item.slug)
                        }
                        className={`transition cursor-pointer select-none group ${
                          isExpanded
                            ? "bg-[#1f2121] border-b-0"
                            : "hover:bg-[#1f2121]/80"
                        }`}
                      >
                        {/* 1. Index Name & ETF - Click navigates to /[slug] */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/${item.slug}`);
                            }}
                            className="font-semibold text-white group-hover:text-[#32b8c6] transition hover:underline"
                          >
                            {item.nse_name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-[rgba(50,184,198,0.12)] text-[#32b8c6]">
                              {item.etf}
                            </span>
                            <span className="text-[10px] text-[#777c7c]">·</span>
                            <span className="text-[10px] text-[#777c7c]">{item.slug}</span>
                          </div>
                        </td>

                        {/* 2. Change % */}
                        <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                          <span
                            className={`font-semibold ${
                              isPositiveChange ? "text-[#4ade80]" : "text-[#f87171]"
                            }`}
                          >
                            {isPositiveChange ? "+" : ""}
                            {item.change_pct.toFixed(2)}%
                          </span>
                        </td>

                        {/* 3. Category */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="text-[11px] px-2 py-0.5 rounded-full border border-[rgba(119,124,124,0.2)] bg-[#1f2121] text-[#a7a9a9]">
                            {item.category}
                          </span>
                        </td>

                        {/* 4. Current PE */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-white whitespace-nowrap">
                          {item.pe.toFixed(2)}
                        </td>

                        {/* 5. 7Y Med PE */}
                        <td className="py-3 px-3 text-right font-mono text-[#a7a9a9] whitespace-nowrap">
                          {item.median_7y_pe.toFixed(2)}
                        </td>

                        {/* 6. 5Y Med PE */}
                        <td className="py-3 px-3 text-right font-mono text-[#a7a9a9] whitespace-nowrap">
                          {item.median_5y_pe.toFixed(2)}
                        </td>

                        {/* 7. 3Y Med PE */}
                        <td className="py-3 px-3 text-right font-mono text-[#a7a9a9] whitespace-nowrap">
                          {item.median_3y_pe.toFixed(2)}
                        </td>

                        {/* 8. 1Y Med PE */}
                        <td className="py-3 px-3 text-right font-mono text-[#a7a9a9] whitespace-nowrap">
                          {item.median_1y_pe.toFixed(2)}
                        </td>

                        {/* 9. vs 5Y Med (%) */}
                        <td className="py-3 px-3 text-right font-mono font-bold whitespace-nowrap">
                          <span
                            className={
                              isDiscounted ? "text-[#4ade80]" : "text-[#f87171]"
                            }
                          >
                            {item.vs_5y_median_pct > 0 ? "+" : ""}
                            {item.vs_5y_median_pct.toFixed(1)}%
                          </span>
                        </td>

                        {/* 10. Valuation Status Badge */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${tierStyle}`}
                          >
                            {item.valuation_tier}
                          </span>
                        </td>

                        {/* 11. Right Chevron Button - Navigates directly to /[slug] */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/${item.slug}`);
                            }}
                            className="p-1.5 rounded-lg text-[#a7a9a9] hover:text-[#32b8c6] hover:bg-[#1a1c1c] transition inline-flex items-center"
                            title={`View full details for ${item.nse_name}`}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>

                      {/* Inline Accordion Expansion Drawer */}
                      {isExpanded && (
                        <tr className="bg-[#1f2121] border-b border-[rgba(119,124,124,0.25)]">
                          <td colSpan={11} className="p-6">
                            <div className="space-y-6 animate-fadeIn">
                              {/* Top 2-Column Split: Detailed Analysis & PE Comparison */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left Column: Detailed Analysis + Valuation Interpretation */}
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="text-sm font-bold text-white tracking-tight">
                                      Detailed Analysis
                                    </h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3 font-mono text-xs">
                                      <div className="p-2.5 rounded-lg bg-[#262828] border border-[rgba(119,124,124,0.15)]">
                                        <span className="text-[10px] text-[#777c7c] uppercase block">
                                          Current PE
                                        </span>
                                        <span className="text-white font-bold text-sm mt-0.5 block">
                                          {item.pe.toFixed(2)}
                                        </span>
                                      </div>
                                      <div className="p-2.5 rounded-lg bg-[#262828] border border-[rgba(119,124,124,0.15)]">
                                        <span className="text-[10px] text-[#777c7c] uppercase block">
                                          1Y Median PE
                                        </span>
                                        <span className="text-[#a7a9a9] font-medium text-sm mt-0.5 block">
                                          {item.median_1y_pe.toFixed(2)}
                                        </span>
                                      </div>
                                      <div className="p-2.5 rounded-lg bg-[#262828] border border-[rgba(119,124,124,0.15)]">
                                        <span className="text-[10px] text-[#777c7c] uppercase block">
                                          3Y Median PE
                                        </span>
                                        <span className="text-[#a7a9a9] font-medium text-sm mt-0.5 block">
                                          {item.median_3y_pe.toFixed(2)}
                                        </span>
                                      </div>
                                      <div className="p-2.5 rounded-lg bg-[#262828] border border-[rgba(119,124,124,0.15)]">
                                        <span className="text-[10px] text-[#777c7c] uppercase block">
                                          5Y Median PE
                                        </span>
                                        <span className="text-[#a7a9a9] font-medium text-sm mt-0.5 block">
                                          {item.median_5y_pe.toFixed(2)}
                                        </span>
                                      </div>
                                      <div className="p-2.5 rounded-lg bg-[#262828] border border-[rgba(119,124,124,0.15)]">
                                        <span className="text-[10px] text-[#777c7c] uppercase block">
                                          7Y Median PE
                                        </span>
                                        <span className="text-[#a7a9a9] font-medium text-sm mt-0.5 block">
                                          {item.median_7y_pe.toFixed(2)}
                                        </span>
                                      </div>
                                      <div className="p-2.5 rounded-lg bg-[#262828] border border-[rgba(119,124,124,0.15)]">
                                        <span className="text-[10px] text-[#777c7c] uppercase block">
                                          vs 5Y Median
                                        </span>
                                        <span
                                          className={`font-bold text-sm mt-0.5 block ${
                                            isDiscounted ? "text-[#34d399]" : "text-[#f87171]"
                                          }`}
                                        >
                                          {item.vs_5y_median_pct > 0 ? "+" : ""}
                                          {item.vs_5y_median_pct.toFixed(1)}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Valuation Interpretation Callout Card */}
                                  <div className="p-4 rounded-r-lg bg-[#161b26] border-l-4 border-[#32b8c6]">
                                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                      <span>💡</span> Valuation Interpretation
                                    </div>
                                    <p className="mt-2 text-xs text-[#a7a9a9] leading-relaxed">
                                      {item.nse_name} is trading at{" "}
                                      <span className="text-white font-mono font-semibold">
                                        {item.pe.toFixed(2)}
                                      </span>
                                      , which is{" "}
                                      <span className="text-white font-mono font-semibold">
                                        {Math.abs(item.vs_5y_median_pct).toFixed(1)}%{" "}
                                        {item.vs_5y_median_pct < 0 ? "below" : "above"}
                                      </span>{" "}
                                      its 5-year median PE of{" "}
                                      <span className="text-white font-mono font-semibold">
                                        {item.median_5y_pe.toFixed(2)}
                                      </span>
                                      . This indicates the index is{" "}
                                      <strong className="text-white lowercase">
                                        {item.valuation_tier}
                                      </strong>
                                      .
                                      {item.vs_5y_median_pct < 0
                                        ? " Current valuations are below historical medians, potentially indicating a value opportunity."
                                        : " Current valuations are elevated relative to historical medians, suggesting caution."}
                                    </p>
                                  </div>
                                </div>

                                {/* Right Column: PE Ratio Comparison Horizontal Bars */}
                                <div className="space-y-3">
                                  <h4 className="text-sm font-bold text-white tracking-tight">
                                    PE Ratio Comparison
                                  </h4>
                                  <div className="space-y-2.5 pt-1">
                                    {peBars.map((bar) => {
                                      const barPct = Math.min(
                                        100,
                                        Math.max(4, (bar.val / maxPeVal) * 100)
                                      );
                                      return (
                                        <div key={bar.label} className="text-xs">
                                          <div className="flex items-center justify-between text-[11px] mb-1">
                                            <span className="text-[#a7a9a9] font-medium">
                                              {bar.label}
                                            </span>
                                            <span
                                              className="font-mono font-bold"
                                              style={{ color: bar.color }}
                                            >
                                              {bar.val ? bar.val.toFixed(2) : "N/A"}
                                            </span>
                                          </div>
                                          <div className="h-2.5 w-full rounded-full bg-[#1e293b] overflow-hidden">
                                            <div
                                              className="h-full rounded-full transition-all duration-500"
                                              style={{
                                                width: `${barPct}%`,
                                                backgroundColor: bar.color,
                                              }}
                                            />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>

                              {/* Bottom Section: Price & 52-Week Position */}
                              <div className="p-4 rounded-xl bg-[#262828] border border-[rgba(119,124,124,0.15)]">
                                <div className="text-xs font-bold text-white mb-3 uppercase tracking-wider">
                                  Price & 52-Week Range
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-[rgba(119,124,124,0.15)] text-xs font-mono">
                                  <div>
                                    <span className="text-[10px] text-[#777c7c] uppercase block">
                                      Current Level
                                    </span>
                                    <span className="text-white font-bold text-sm mt-0.5 block">
                                      {item.close.toLocaleString("en-IN", {
                                        maximumFractionDigits: 2,
                                      })}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-[#777c7c] uppercase block">
                                      52W High
                                    </span>
                                    <span className="text-[#a7a9a9] font-semibold text-sm mt-0.5 block">
                                      {item.high_52w.toLocaleString("en-IN", {
                                        maximumFractionDigits: 2,
                                      })}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-[#777c7c] uppercase block">
                                      52W Low
                                    </span>
                                    <span className="text-[#a7a9a9] font-semibold text-sm mt-0.5 block">
                                      {item.low_52w.toLocaleString("en-IN", {
                                        maximumFractionDigits: 2,
                                      })}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-[#777c7c] uppercase block">
                                      From 52W High
                                    </span>
                                    <span
                                      className={`font-bold text-sm mt-0.5 block ${
                                        item.from_52w_high_pct <= 0
                                          ? "text-[#f87171]"
                                          : "text-[#4ade80]"
                                      }`}
                                    >
                                      {item.from_52w_high_pct > 0 ? "+" : ""}
                                      {item.from_52w_high_pct.toFixed(2)}%
                                    </span>
                                  </div>
                                </div>

                                {/* 52W Position Slider */}
                                <div className="mt-4">
                                  <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
                                    <span className="text-[#777c7c] text-[11px]">
                                      52W Low: {item.low_52w.toLocaleString("en-IN")}
                                    </span>
                                    <span className="text-[#2dd4bf] font-bold text-xs">
                                      52W Position: {item.position_52w_pct.toFixed(1)}%
                                    </span>
                                    <span className="text-[#777c7c] text-[11px]">
                                      52W High: {item.high_52w.toLocaleString("en-IN")}
                                    </span>
                                  </div>
                                  <div className="h-2.5 w-full rounded-full bg-[#1e293b] overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-[#0d9488] to-[#14b8a6] transition-all duration-500"
                                      style={{ width: `${item.position_52w_pct}%` }}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Accordion Footer Action Bar */}
                              <div className="flex justify-end pt-2">
                                <button
                                  onClick={() => router.push(`/${item.slug}`)}
                                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#32b8c6] text-[#13343b] hover:bg-[#289ba7] transition font-bold text-xs shadow-md"
                                >
                                  <span>View Full Details</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="w-10 h-10 border-4 border-[#32b8c6] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-sm text-[#a7a9a9]">Loading Valuations Screener...</div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}