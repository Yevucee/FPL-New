import type { Metadata } from "next";

import { SiteHeader } from "@/components/layout/SiteHeader";
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
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
          <footer className="mx-auto w-full max-w-5xl px-4 pb-10 pt-4 text-center text-xs text-slate-400">
            {leagueConfig.displayName} · refreshes every 15 min during match windows
            {process.env.FANTASY_PROVIDER_MODE === "fixtures" && (
              <> · sample data for development</>
            )}
          </footer>
        </div>
      </body>
    </html>
  );
}
