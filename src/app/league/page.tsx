import Link from "next/link";

import { LeagueDashboard } from "@/components/league/LeagueDashboard";
import { getLeagueOverview } from "@/server/leagueData";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ gw?: string; window?: string }>;
}

export default async function LeaguePage({ searchParams }: PageProps) {
  const { gw, window: windowId } = await searchParams;
  const throughEvent = gw ? Number.parseInt(gw, 10) : undefined;
  const overview = await getLeagueOverview({
    throughEvent: Number.isFinite(throughEvent) ? throughEvent : undefined,
    window: windowId,
  });

  if (!overview.league) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-6">
        <h1 className="text-xl font-semibold">League not set up yet</h1>
        <p className="mt-2 text-sm text-slate-600">
          Waiting for the Swiss Expert League FPL ID to be configured. Once
          <code className="mx-1 rounded bg-slate-100 px-1">LEAGUE_PROVIDER_ID</code>{" "}
          is set on Railway, standings refresh automatically every few hours.
        </p>
      </div>
    );
  }

  if (overview.dataMode === "preseason" && overview.standings.length === 0) {
    return (
      <div className="space-y-6">
        <LeagueDashboard overview={overview} />
        <div className="rounded-xl border border-swiss-200 bg-gradient-to-br from-swiss-50 to-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-swiss-900">Season starts soon</h2>
          <p className="mt-2 text-sm text-slate-600">
            <strong>{overview.registeredManagers}</strong> managers are registered.
            Standings, awards, and live stats will appear here after Gameweek 1
            {overview.nextEvent ? ` (GW${overview.nextEvent})` : ""} completes.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/league/preview"
              className="inline-flex items-center rounded-full bg-swiss-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-swiss-700"
            >
              Preview in-season layout →
            </Link>
            <Link
              href="/planner/preview"
              className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-swiss-700 ring-1 ring-swiss-200 hover:bg-swiss-50"
            >
              Preview team planner →
            </Link>
            <Link
              href="/history"
              className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-swiss-700 ring-1 ring-swiss-200 hover:bg-swiss-50"
            >
              Hall of Champions
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Data syncs from FPL automatically — no action needed from you.
          </p>
        </div>
      </div>
    );
  }

  return <LeagueDashboard overview={overview} />;
}
