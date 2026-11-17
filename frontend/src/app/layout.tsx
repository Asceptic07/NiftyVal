import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "NiftyVal — NSE Sectoral Valuation & ETF Analytics",
  description: "Live historical valuation percentiles, multi-window rolling medians, implied EPS dynamics, and ETF analytics strictly based on official NSE data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#1f2121] text-[#f5f5f5] antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
