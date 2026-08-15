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
        <Link href="/history" className="text-swiss-700 hover:underline">
          History
        </Link>
        <span className="text-slate-300">/</span>
        <span className="font-medium text-slate-700">{overview.seasonName}</span>
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
      <span className="text-sm font-medium text-slate-500">Season:</span>
      {seasons.map((season) => (
        <Link
          key={season.slug}
          href={`/history/${season.slug}`}
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            season.slug === currentSlug
              ? "bg-swiss-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {season.name}
        </Link>
      ))}
    </div>
  );
}
