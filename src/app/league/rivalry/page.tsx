import Link from "next/link";
import { Suspense } from "react";

import { RivalryDashboard } from "@/components/league/RivalryDashboard";
import { SeasonHeader } from "@/components/league/SeasonHeader";
import { getRivalryOverview } from "@/server/rivalryData";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ a?: string; b?: string; gw?: string; window?: string }>;
}

export default async function RivalryPage({ searchParams }: PageProps) {
  const { a, b, gw, window: windowId } = await searchParams;
  const throughEvent = gw ? Number.parseInt(gw, 10) : undefined;
  const { league, rivalry, entryA, entryB } = await getRivalryOverview({
    entryA: a,
    entryB: b,
    throughEvent: Number.isFinite(throughEvent) ? throughEvent : undefined,
    window: windowId,
  });

  if (!league.league) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-6">
        <h1 className="text-xl font-semibold">League not set up yet</h1>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-swiss-600">
            Head-to-head
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Rivalry tracker</h1>
          <p className="mt-1 text-sm text-slate-600">
            Compare two managers on gameweek wins, rank trends, and squad overlap.
          </p>
        </div>
        <Link
          href="/league"
          className="text-sm font-semibold text-swiss-700 hover:underline"
        >
          ← Back to standings
        </Link>
      </div>

      <SeasonHeader overview={league} showLiveBadge={false} />

      <Suspense fallback={null}>
        <RivalryDashboard
          managers={league.managers}
          rivalry={rivalry}
          entryA={entryA}
          entryB={entryB}
          throughEvent={league.selectedEvent}
        />
      </Suspense>
    </div>
  );
}
