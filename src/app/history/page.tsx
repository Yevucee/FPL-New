import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { selChampions, titleCounts } from "@/lib/selChampions";
import type { HistoryPodiumEntry, HistorySeasonSummary } from "@/server/historyData";
import { listHistorySeasons } from "@/server/historyData";
import { seasonSlugFromName } from "@/lib/seasonNaming";

export const dynamic = "force-dynamic";

function mergeSeasonPodiums(archives: HistorySeasonSummary[]) {
  const archiveBySeason = new Map(archives.map((season) => [season.name, season]));

  return [...selChampions].reverse().map((record) => {
    const archive = archiveBySeason.get(record.season);
    const podium = archive?.podium ?? [];
    return {
      season: record.season,
      slug: archive?.slug ?? seasonSlugFromName(record.season),
      hasFullTable: Boolean(archive && archive.managerCount > 0),
      first: podium.find((row) => row.place === 1),
      second: podium.find((row) => row.place === 2),
      third: podium.find((row) => row.place === 3),
    };
  });
}

function PodiumSlot({
  place,
  entry,
  variant,
}: {
  place: 1 | 2 | 3;
  entry: HistoryPodiumEntry | undefined;
  variant: "gold" | "silver" | "bronze";
}) {
  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" } as const;
  const variantClass = {
    gold: "podium-gold",
    silver: "podium-silver",
    bronze: "podium-bronze",
  }[variant];

  return (
    <div
      className={`flex flex-1 flex-col rounded-xl border p-4 ${variantClass} ${
        place === 1 ? "sm:min-h-[120px] sm:scale-[1.02]" : ""
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-lg">{medals[place]}</span>
        <Badge
          variant={variant === "gold" ? "gold" : variant === "silver" ? "silver" : "bronze"}
        >
          {place === 1 ? "1st" : place === 2 ? "2nd" : "3rd"}
        </Badge>
      </div>
      {entry ? (
        <>
          <p className="font-bold text-slate-900">{entry.managerName}</p>
          <p className="text-sm text-slate-600">{entry.teamName}</p>
          <p className="mt-auto pt-2 text-lg font-bold tabular-nums text-swiss-800">
            {entry.totalPoints}
            <span className="text-sm font-medium text-slate-500"> pts</span>
          </p>
        </>
      ) : (
        <p className="text-sm text-slate-400">—</p>
      )}
    </div>
  );
}

function SeasonPodiumCard({
  season,
  slug,
  hasFullTable,
  first,
  second,
  third,
}: {
  season: string;
  slug: string;
  hasFullTable: boolean;
  first: HistoryPodiumEntry | undefined;
  second: HistoryPodiumEntry | undefined;
  third: HistoryPodiumEntry | undefined;
}) {
  return (
    <Card className="transition-shadow hover:shadow-card-hover">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">{season}</h2>
        {hasFullTable ? (
          <Link
            href={`/history/${slug}`}
            className="text-sm font-semibold text-swiss-700 hover:underline"
          >
            Full table →
          </Link>
        ) : (
          <span className="text-sm text-slate-400">Import pending</span>
        )}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <PodiumSlot place={2} entry={second} variant="silver" />
        <PodiumSlot place={1} entry={first} variant="gold" />
        <PodiumSlot place={3} entry={third} variant="bronze" />
      </div>
    </Card>
  );
}

export default async function HistoryIndexPage() {
  const seasons = await listHistorySeasons();
  const titles = titleCounts();
  const podiums = mergeSeasonPodiums(seasons);
  const maxTitles = Math.max(...titles.map((row) => row.titles), 1);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-swiss-600">
          Swiss Expert League
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Hall of Champions
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
          Every season&apos;s podium and a link to the full final table.
        </p>
      </div>

      <Card className="bg-gradient-to-br from-swiss-50/80 to-white">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Title count
        </h2>
        <ul className="space-y-3">
          {titles.map((row) => (
            <li key={row.winner}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-semibold text-slate-900">{row.winner}</span>
                <span className="font-bold tabular-nums text-swiss-800">
                  {row.titles}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-swiss-500 to-swiss-700"
                  style={{ width: `${(row.titles / maxTitles) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <div className="space-y-6">
        {podiums.map((row) => (
          <SeasonPodiumCard key={row.season} {...row} />
        ))}
      </div>

      {seasons.length === 0 && (
        <Card className="border-dashed bg-slate-50/50 text-center">
          <p className="text-sm text-slate-600">
            Full tables import automatically after sync. The current season is on{" "}
            <Link href="/league" className="font-semibold text-swiss-700 hover:underline">
              Standings
            </Link>
            .
          </p>
        </Card>
      )}
    </div>
  );
}
