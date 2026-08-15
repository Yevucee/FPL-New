import type { Metadata } from "next";
import Link from "next/link";

import { leagueConfig } from "@/lib/leagueConfig";

import "./globals.css";

export const metadata: Metadata = {
  title: `${leagueConfig.displayName} — Live standings & archive`,
  description: leagueConfig.tagline,
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
                <span className="grid h-8 w-8 place-items-center rounded-md bg-swiss-600 text-sm font-bold text-white">
                  {leagueConfig.shortName}
                </span>
                <span className="text-lg font-semibold">{leagueConfig.displayName}</span>
              </Link>
              <nav className="flex gap-4 text-sm font-medium text-slate-600">
                <Link href="/league" className="hover:text-swiss-600">
                  Standings
                </Link>
                <Link href="/history" className="hover:text-swiss-600">
                  History
                </Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
          <footer className="mx-auto max-w-5xl px-4 pb-10 pt-4 text-xs text-slate-400">
            {leagueConfig.displayName} · refreshes hourly from FPL during the season.
            {process.env.FANTASY_PROVIDER_MODE === "fixtures" && (
              <> Currently showing sample data for development.</>
            )}
          </footer>
        </div>
      </body>
    </html>
  );
}
