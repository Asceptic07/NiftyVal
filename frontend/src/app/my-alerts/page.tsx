import Link from "next/link";
import { Bell, ArrowLeft } from "lucide-react";

export default function MyAlertsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bell className="w-6 h-6 text-[#32b8c6]" />
          My Valuation Alerts
        </h1>
        <Link
          href="/baskets"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(119,124,124,0.2)] bg-[#262828] text-xs font-medium text-[#a7a9a9] hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Baskets</span>
        </Link>
      </div>
      <div className="rounded-xl border border-[rgba(119,124,124,0.2)] bg-[#262828] p-8 text-center text-[#a7a9a9]">
        <p className="text-sm">
          Valuation alerts manager allows configuring P/E and P/B drop triggers across all 11 core indices.
        </p>
      </div>
    </div>
  );
}
