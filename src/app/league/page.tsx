import Link from "next/link";

import { LeagueDashboard } from "@/components/league/LeagueDashboard";
import { getLeagueOverview } from "@/server/leagueData";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ gw?: string }>;
}

export default async function LeaguePage({ searchParams }: PageProps) {
  const { gw } = await searchParams;
  const throughEvent = gw ? Number.parseInt(gw, 10) : undefined;
  const overview = await getLeagueOverview({
    throughEvent: Number.isFinite(throughEvent) ? throughEvent : undefined,
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
        <div className="rounded-lg border border-swiss-200 bg-swiss-50 p-6">
          <h2 className="text-lg font-semibold text-swiss-900">Season starts soon</h2>
          <p className="mt-2 text-sm text-slate-600">
            <strong>{overview.registeredManagers}</strong> managers are registered.
            Standings, awards, and live stats will appear here after Gameweek 1
            {overview.nextEvent ? ` (GW${overview.nextEvent})` : ""} completes.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Data syncs from FPL automatically — no action needed from you.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Past seasons are in the{" "}
            <Link href="/history" className="font-medium text-swiss-700 hover:underline">
              archive
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return <LeagueDashboard overview={overview} />;
}
