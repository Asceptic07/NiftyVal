"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Layers,
  TrendingUp,
  PieChart,
  Bell,
  PanelLeftClose,
  PanelLeft,
  RefreshCw,
  Check,
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

function AppShellInner({ children }: AppShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [latestDate, setLatestDate] = useState<string>("2026-11-16");

  useEffect(() => {
    let timer: NodeJS.Timeout;

    async function fetchStatus() {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/sync/status");
        if (res.ok) {
          const data = await res.json();
          if (data.latest_date) {
            setLatestDate(data.latest_date);
          }
          if (data.is_syncing !== undefined) {
            setSyncing((prev) => {
              if (prev && !data.is_syncing) {
                setSyncSuccess(true);
                setTimeout(() => setSyncSuccess(false), 3000);
              }
              return data.is_syncing;
            });
          }
        }
      } catch (err) {
        // Backend may be initializing
      }
    }

    fetchStatus();
    timer = setInterval(fetchStatus, syncing ? 4000 : 20000);
    return () => clearInterval(timer);
  }, [syncing]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncSuccess(false);
    try {
      await fetch("http://127.0.0.1:8000/api/sync", {
        method: "POST",
      });
    } catch (e) {
      console.error("Sync trigger failed:", e);
      setSyncing(false);
    }
  };

  const navItems = [
    { name: "Valuations", href: "/dashboard", icon: BarChart3 },
    { name: "Baskets", href: "/baskets", icon: Layers },
    { name: "Indices", href: "/indices", icon: TrendingUp },
    { name: "Scenarios", href: "/scenarios", icon: PieChart },
    { name: "My Alerts", href: "/my-alerts", icon: Bell },
  ];

  return (
    <div className="flex min-h-screen bg-[#1f2121] text-[#f5f5f5]">
      {/* ---------------------------------------------------- */}
      {/* Left Sidebar                                         */}
      {/* ---------------------------------------------------- */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-30 flex flex-col transition-all duration-200 border-r border-[rgba(119,124,124,0.2)] bg-[#1a1c1c] ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-[rgba(119,124,124,0.2)]">
          <Link href="/baskets" className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-[rgba(50,184,198,0.15)] border border-[#32b8c6] flex items-center justify-center shrink-0">
              <span className="font-bold text-[#32b8c6] text-sm">PE</span>
            </div>
            {!collapsed && (
              <span className="font-bold text-lg tracking-tight text-white">
                Index<span className="text-[#32b8c6]">PE</span>
              </span>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-md text-[#a7a9a9] hover:text-white hover:bg-[rgba(119,124,124,0.15)] transition"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
          {!collapsed && (
            <div className="px-2 pb-1 text-[11px] font-semibold tracking-wider text-[#777c7c] uppercase">
              Workspace
            </div>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition group ${
                  active
                    ? "bg-[rgba(13,148,136,0.18)] text-[#2dd4bf] border-l-2 border-[#2dd4bf]"
                    : "text-[#a7a9a9] hover:bg-[rgba(119,124,124,0.1)] hover:text-white"
                }`}
                title={collapsed ? item.name : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? "text-[#2dd4bf]" : "text-[#a7a9a9] group-hover:text-white"}`} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Watchlist Card (When Expanded) */}
        {!collapsed && (
          <div className="p-3 m-2.5 rounded-xl border border-[rgba(119,124,124,0.2)] bg-[#262828]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">ETF Watchlist</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[rgba(50,184,198,0.15)] text-[#32b8c6] font-mono">
                11 Indices
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[#a7a9a9]">
              5 Undervalued · 4 Fair · 2 Overvalued
            </p>
            <Link
              href="/baskets"
              className="mt-2.5 block text-center text-xs py-1.5 rounded-lg bg-[rgba(13,148,136,0.15)] text-[#2dd4bf] hover:bg-[rgba(13,148,136,0.25)] transition font-medium"
            >
              Open Basket →
            </Link>
          </div>
        )}

        {/* User profile strip */}
        <div className="flex items-center justify-between h-14 px-3 border-t border-[rgba(119,124,124,0.2)]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-[#30363d] text-white flex items-center justify-center font-semibold text-xs shrink-0">
              S
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <div className="text-xs font-medium text-white truncate">Swanik Srivastava</div>
                <div className="text-[10px] text-[#2dd4bf] font-mono">PRO SUBSCRIBER</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ---------------------------------------------------- */}
      {/* Main App Content Area (Offset by sidebar width)     */}
      {/* ---------------------------------------------------- */}
      <div
        className={`flex-1 flex flex-col transition-all duration-200 ${
          collapsed ? "ml-16" : "ml-60"
        }`}
      >
        {/* Sticky Top Bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between h-14 px-6 border-b border-[rgba(119,124,124,0.2)] bg-[#1f2121]/95 backdrop-blur-md">
          {/* Breadcrumb / Section Header */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold tracking-wider uppercase text-[#a7a9a9]">
              IndexPE Workstation
            </span>
            <span className="text-sm text-[#777c7c]">/</span>
            <span className="text-sm font-medium text-white capitalize">
              {pathname === "/" ? "Baskets" : pathname.replace("/", "")}
            </span>
          </div>

          {/* Right Header Status & Actions */}
          <div className="flex items-center gap-3">
            {/* Live NSE Status Badge */}
            <div className="flex items-center gap-2 px-3 py-1 text-xs rounded-full bg-[#262828] border border-[rgba(119,124,124,0.2)] text-[#a7a9a9]">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
              <span>
                Connected <strong className="text-white font-mono">{latestDate}</strong>
              </span>
            </div>

            {/* Sync NSE Button */}
            <button
              onClick={handleSync}
              disabled={syncing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                syncSuccess
                  ? "border-[#10b981] bg-[rgba(16,185,129,0.15)] text-[#10b981]"
                  : "border-[#32b8c6] bg-[rgba(50,184,198,0.12)] text-[#32b8c6] hover:bg-[rgba(50,184,198,0.22)]"
              }`}
            >
              {syncSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Synced!</span>
                </>
              ) : (
                <>
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                  <span>{syncing ? "Syncing NSE..." : "Sync NSE"}</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#1f2121]" />}>
      <AppShellInner>{children}</AppShellInner>
    </Suspense>
  );
}
