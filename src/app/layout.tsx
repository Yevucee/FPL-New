import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: "The Gaffers League — FPL Archive & Planner",
  description:
    "A private FPL league's permanent record book plus an owner-only decision desk.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
              <Link href="/league" className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-md bg-pitch-700 text-sm font-bold text-white">
                  GL
                </span>
                <span className="text-lg font-semibold">The Gaffers League</span>
              </Link>
              <nav className="flex gap-4 text-sm font-medium text-slate-600">
                <Link href="/league" className="hover:text-pitch-700">
                  League
                </Link>
                <span className="cursor-not-allowed text-slate-300" title="Coming in a later slice">
                  History
                </span>
                <span className="cursor-not-allowed text-slate-300" title="Owner only — later slice">
                  My Team
                </span>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
          <footer className="mx-auto max-w-5xl px-4 pb-10 pt-4 text-xs text-slate-400">
            Original league branding. Data shown here is synthetic sample data
            (provider: fixtures) — no live FPL data is collected.
          </footer>
        </div>
      </body>
    </html>
  );
}
