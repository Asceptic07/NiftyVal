import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "IndexPE - Sectoral Valuation & ETF Decision Engine",
  description: "Live historical valuation percentiles, earnings CAGR, and ETF strategy signals strictly based on official NSE data.",
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
