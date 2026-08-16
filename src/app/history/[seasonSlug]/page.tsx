import Link from "next/link";
import { notFound } from "next/navigation";

import { LeagueDashboard } from "@/components/league/LeagueDashboard";
import { getHistorySeasonOverview, listHistorySeasons } from "@/server/historyData";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ seasonSlug: string }>;
  searchParams: Promise<{ gw?: string }>;
}

export default async function HistorySeasonPage({ params, searchParams }: PageProps) {
  const { seasonSlug } = await params;
  const { gw } = await searchParams;
  const throughEvent = gw ? Number.parseInt(gw, 10) : undefined;

  const overview = await getHistorySeasonOverview(
    seasonSlug,
    Number.isFinite(throughEvent) ? throughEvent : undefined,
  );

  if (!overview.league || overview.dataMode === "empty") {
    notFound();
  }

  const allSeasons = await listHistorySeasons();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          href="/history"
          className="font-medium text-swiss-700 hover:underline"
        >
          Hall of Champions
        </Link>
        <span className="text-slate-300">/</span>
        <span className="font-semibold text-slate-800">{overview.seasonName}</span>
      </div>

      {allSeasons.length > 1 && (
        <SeasonPicker seasons={allSeasons} currentSlug={seasonSlug} />
      )}

      <LeagueDashboard
        overview={overview}
        gameweekBasePath={`/history/${seasonSlug}`}
        showLiveBadge={false}
      />
    </div>
  );
}

function SeasonPicker({
  seasons,
  currentSlug,
}: {
  seasons: Awaited<ReturnType<typeof listHistorySeasons>>;
  currentSlug: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-slate-500">Season</span>
      <div className="flex flex-wrap gap-1.5">
        {seasons.map((season) => (
          <Link
            key={season.slug}
            href={`/history/${season.slug}`}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              season.slug === currentSlug
                ? "bg-swiss-600 text-white shadow-sm"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {season.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
