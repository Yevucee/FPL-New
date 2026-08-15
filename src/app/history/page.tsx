import Link from "next/link";

import { hallOfChampions, titleCounts } from "@/lib/selChampions";
import { listHistorySeasons } from "@/server/historyData";

export const dynamic = "force-dynamic";

export default async function HistoryIndexPage() {
  const seasons = await listHistorySeasons();
  const titles = titleCounts();
  const archiveBySeason = new Map(
    seasons.map((season) => [season.name, season.champion]),
  );
  const champions = hallOfChampions(archiveBySeason);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Season archive</h1>
        <p className="mt-1 text-sm text-slate-500">
          Final league tables from FPL (official past league IDs where available, otherwise
          reconstructed from members&apos; season totals). Live-captured seasons also support
          gameweek-by-gameweek browsing.
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Hall of champions</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-2 py-2">Season</th>
                <th className="px-2 py-2">Manager</th>
                <th className="px-2 py-2">Team</th>
              </tr>
            </thead>
            <tbody>
              {[...champions].reverse().map((row) => (
                <tr key={row.season} className="border-t border-slate-100">
                  <td className="px-2 py-2 font-medium">{row.season}</td>
                  <td className="px-2 py-2">{row.winner}</td>
                  <td className="px-2 py-2 text-slate-700">{row.teamName ?? "—"}</td>
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
          <h2 className="text-lg font-semibold text-slate-800">League tables importing</h2>
          <p className="mt-2 text-sm text-slate-600">
            Tables are rebuilt automatically from current members&apos; FPL data and validated
            against the champions list above. Run a forced sync on Railway if this section stays
            empty after deploy. The current live season is on the{" "}
            <Link href="/league" className="font-medium text-swiss-700 hover:underline">
              Standings
            </Link>{" "}
            page.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            For authoritative past tables, add each season&apos;s FPL league ID via{" "}
            <code className="text-xs">LEAGUE_HISTORY_PROVIDER_IDS</code> (see docs).
          </p>
        </div>
      ) : (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Season tables</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {seasons.map((season) => (
              <li key={season.slug}>
                <Link
                  href={`/history/${season.slug}`}
                  className="block rounded-lg border border-slate-200 bg-white p-5 transition hover:border-swiss-300 hover:shadow-sm"
                >
                  <h3 className="text-lg font-semibold text-slate-900">{season.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {season.managerCount} managers
                    {season.finalGameweek !== null && ` · ${season.finalGameweek} gameweeks`}
                  </p>
                  {season.champion && (
                    <p className="mt-3 text-sm">
                      <span className="font-medium text-swiss-700">Champion:</span>{" "}
                      {season.champion.managerName} ({season.champion.teamName}) —{" "}
                      {season.champion.totalPoints} pts
                      {season.champion.overallFplRank !== null && (
                        <> · FPL rank {season.champion.overallFplRank.toLocaleString()}</>
                      )}
                    </p>
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
