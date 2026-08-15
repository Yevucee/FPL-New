import Link from "next/link";

import { selChampions, titleCounts } from "@/lib/selChampions";
import type { HistoryPodiumEntry, HistorySeasonSummary } from "@/server/historyData";
import { listHistorySeasons } from "@/server/historyData";
import { seasonSlugFromName } from "@/lib/seasonNaming";

export const dynamic = "force-dynamic";

function podiumCell(entry: HistoryPodiumEntry | undefined) {
  if (!entry) {
    return <span className="text-slate-400">—</span>;
  }
  return (
    <div>
      <div className="font-medium text-slate-900">{entry.managerName}</div>
      <div className="text-slate-600">{entry.teamName}</div>
      <div className="text-xs text-slate-500">{entry.totalPoints} pts</div>
    </div>
  );
}

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

export default async function HistoryIndexPage() {
  const seasons = await listHistorySeasons();
  const titles = titleCounts();
  const podiums = mergeSeasonPodiums(seasons);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Season archive</h1>
        <p className="mt-1 text-sm text-slate-500">
          Use <strong className="font-medium text-slate-700">History</strong> in the top nav, then
          open any season for the <strong className="font-medium text-slate-700">full league table</strong>.
          The summary below shows 1st, 2nd, and 3rd for each year.
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Podiums by season</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-2 py-2">Season</th>
                <th className="px-2 py-2">1st</th>
                <th className="px-2 py-2">2nd</th>
                <th className="px-2 py-2">3rd</th>
                <th className="px-2 py-2">Full table</th>
              </tr>
            </thead>
            <tbody>
              {podiums.map((row) => (
                <tr key={row.season} className="border-t border-slate-100 align-top">
                  <td className="px-2 py-3 font-medium">{row.season}</td>
                  <td className="px-2 py-3">{podiumCell(row.first)}</td>
                  <td className="px-2 py-3">{podiumCell(row.second)}</td>
                  <td className="px-2 py-3">{podiumCell(row.third)}</td>
                  <td className="px-2 py-3">
                    {row.hasFullTable ? (
                      <Link
                        href={`/history/${row.slug}`}
                        className="font-medium text-swiss-700 hover:underline"
                      >
                        View table →
                      </Link>
                    ) : (
                      <span className="text-slate-400">Import pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          {titles.map((row) => (
            <span
              key={row.winner}
              className="rounded-full bg-slate-100 px-3 py-1 text-slate-700"
            >
              {row.winner}: {row.titles} title{row.titles === 1 ? "" : "s"}
            </span>
          ))}
        </div>
      </section>

      {seasons.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-lg font-semibold text-slate-800">Full tables importing</h2>
          <p className="mt-2 text-sm text-slate-600">
            Podiums above fill in once sync runs. Each season&apos;s complete standings will
            appear at <code className="text-xs">/history/2024-25</code> etc. The current season
            is on{" "}
            <Link href="/league" className="font-medium text-swiss-700 hover:underline">
              Standings
            </Link>
            .
          </p>
        </div>
      ) : (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Browse full tables</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {seasons.map((season) => (
              <li key={season.slug}>
                <Link
                  href={`/history/${season.slug}`}
                  className="block rounded-lg border border-slate-200 bg-white p-5 transition hover:border-swiss-300 hover:shadow-sm"
                >
                  <h3 className="text-lg font-semibold text-slate-900">{season.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {season.managerCount} managers · full final standings
                  </p>
                  {season.podium.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm text-slate-700">
                      {season.podium.map((entry) => (
                        <li key={entry.place}>
                          <span className="font-medium text-swiss-700">{entry.place}.</span>{" "}
                          {entry.managerName} · {entry.teamName} — {entry.totalPoints} pts
                        </li>
                      ))}
                    </ul>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
