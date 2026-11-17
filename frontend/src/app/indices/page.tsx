"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Search,
  X,
  ArrowRight,
  Filter,
  CheckCircle2,
  Layers,
} from "lucide-react";

interface IndexSummary {
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

function IndicesContent() {
  const [indices, setIndices] = useState<IndexSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "cyclical" | "defensive" | "undervalued">("all");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch("http://127.0.0.1:8000/api/basket");
        if (!res.ok) throw new Error("Failed to load indices from backend API");
        const json = await res.json();
        setIndices(json);
      } catch (err: any) {
        setError(err.message || "Failed to connect to API");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredIndices = useMemo(() => {
    let items = [...indices];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.nse_name.toLowerCase().includes(q) ||
          item.etf.toLowerCase().includes(q) ||
          item.slug.toLowerCase().includes(q)
      );
    }

    if (categoryFilter === "cyclical") {
      items = items.filter((item) => item.cyclical);
    } else if (categoryFilter === "defensive") {
      items = items.filter((item) => !item.cyclical);
    } else if (categoryFilter === "undervalued") {
      items = items.filter((item) => item.valuation_tier.includes("Undervalued"));
    }

    return items;
  }, [indices, searchQuery, categoryFilter]);

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
        <div className="text-sm text-[#a7a9a9]">Loading Indices Explorer...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl border border-red-500/30 bg-red-950/20 text-red-400">
        <h3 className="text-lg font-bold">Failed to load indices</h3>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-[#32b8c6]" />
            Indices Valuation Explorer
          </h1>
          <p className="mt-1 text-sm text-[#a7a9a9]">
            Search and inspect official NSE sectoral and thematic valuation multiples, 5-year percentiles, and strategy rules.
          </p>
        </div>

        <Link
          href="/baskets"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-[rgba(119,124,124,0.2)] bg-[#262828] text-xs font-medium text-[#a7a9a9] hover:text-white transition"
        >
          <Layers className="w-4 h-4 text-[#32b8c6]" />
          <span>View Watchlist Baskets</span>
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-[rgba(119,124,124,0.2)] bg-[#262828]">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#777c7c]" />
          <input
            type="text"
            placeholder="Search index name, ticker (ITBEES, METALIETF)..."
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

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setCategoryFilter("all")}
            className={`px-3 py-1.5 rounded-lg border transition font-medium ${
              categoryFilter === "all"
                ? "bg-[rgba(50,184,198,0.18)] text-[#32b8c6] border-[#32b8c6]"
                : "border-[rgba(119,124,124,0.2)] bg-[#1f2121] text-[#a7a9a9] hover:text-white"
            }`}
          >
            All ({indices.length})
          </button>
          <button
            onClick={() => setCategoryFilter("undervalued")}
            className={`px-3 py-1.5 rounded-lg border transition font-medium ${
              categoryFilter === "undervalued"
                ? "bg-[rgba(16,185,129,0.18)] text-[#34d399] border-[#34d399]"
                : "border-[rgba(119,124,124,0.2)] bg-[#1f2121] text-[#a7a9a9] hover:text-white"
            }`}
          >
            Undervalued ({indices.filter((i) => i.valuation_tier.includes("Undervalued")).length})
          </button>
          <button
            onClick={() => setCategoryFilter("cyclical")}
            className={`px-3 py-1.5 rounded-lg border transition font-medium ${
              categoryFilter === "cyclical"
                ? "bg-[rgba(245,158,11,0.18)] text-[#fbbf24] border-[#fbbf24]"
                : "border-[rgba(119,124,124,0.2)] bg-[#1f2121] text-[#a7a9a9] hover:text-white"
            }`}
          >
            Cyclical ({indices.filter((i) => i.cyclical).length})
          </button>
          <button
            onClick={() => setCategoryFilter("defensive")}
            className={`px-3 py-1.5 rounded-lg border transition font-medium ${
              categoryFilter === "defensive"
                ? "bg-[rgba(56,189,248,0.18)] text-[#38bdf8] border-[#38bdf8]"
                : "border-[rgba(119,124,124,0.2)] bg-[#1f2121] text-[#a7a9a9] hover:text-white"
            }`}
          >
            Core / Defensive ({indices.filter((i) => !i.cyclical).length})
          </button>
        </div>
      </div>

      {/* Grid of Index Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIndices.map((item) => {
          const isPositiveChange = item.change_pct >= 0;

          return (
            <Link
              key={item.slug}
              href={`/${item.slug}`}
              className="group block p-5 rounded-xl border border-[rgba(119,124,124,0.2)] bg-[#262828] hover:bg-[#2e3030] hover:border-[#32b8c6]/50 transition shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-base text-white group-hover:text-[#32b8c6] transition">
                    {item.nse_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[rgba(50,184,198,0.15)] text-[#32b8c6]">
                      {item.etf}
                    </span>
                    <span className="text-xs text-[#777c7c]">·</span>
                    <span className="text-xs text-[#a7a9a9]">{item.category}</span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${getTierBadgeStyle(
                    item.valuation_tier
                  )}`}
                >
                  {item.valuation_tier}
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-[rgba(119,124,124,0.15)] font-mono text-xs">
                <div>
                  <span className="text-[10px] text-[#777c7c] uppercase block">Current P/E</span>
                  <span className="text-white font-bold text-sm">{item.pe.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#777c7c] uppercase block">5Y P/E Pct</span>
                  <span className="text-[#2dd4bf] font-bold text-sm">
                    {item.pe_5y_pct.toFixed(1)}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#777c7c] uppercase block">1D Change</span>
                  <span
                    className={`font-bold text-sm ${
                      isPositiveChange ? "text-[#4ade80]" : "text-[#f87171]"
                    }`}
                  >
                    {isPositiveChange ? "+" : ""}
                    {item.change_pct.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Valuation Tier & Action */}
              <div className="mt-4 pt-3 border-t border-[rgba(119,124,124,0.1)] flex items-center justify-between text-xs">
                <span className="text-[#a7a9a9]">{item.valuation_tier}</span>
                <span className="text-[#32b8c6] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition">
                  <span>Open Deep-Dive</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function IndicesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="w-10 h-10 border-4 border-[#32b8c6] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-sm text-[#a7a9a9]">Loading Indices Explorer...</div>
        </div>
      }
    >
      <IndicesContent />
    </Suspense>
  );
}
