import Link from "next/link";

import { listHistorySeasons } from "@/server/historyData";

export const dynamic = "force-dynamic";

export default async function HistoryIndexPage() {
  const seasons = await listHistorySeasons();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Season archive</h1>
        <p className="mt-1 text-sm text-slate-500">
          Browse past seasons of the Swiss Expert League. Standings, awards, and
          storylines are preserved gameweek by gameweek.
        </p>
      </div>

      {seasons.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-lg font-semibold text-slate-800">No archived seasons yet</h2>
          <p className="mt-2 text-sm text-slate-600">
            Once last season&apos;s data is imported, it will appear here. The current
            live season is on the{" "}
            <Link href="/league" className="font-medium text-swiss-700 hover:underline">
              Standings
            </Link>{" "}
            page.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Import command (Railway shell):{" "}
            <code className="rounded bg-white px-1">
              LEGACY_SEASON_NAME=2024/25 LEGACY_SNAPSHOT_FILE=data/legacy/league_snapshots.json
              npm run import:legacy
            </code>
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {seasons.map((season) => (
            <li key={season.slug}>
              <Link
                href={`/history/${season.slug}`}
                className="block rounded-lg border border-slate-200 bg-white p-5 transition hover:border-swiss-300 hover:shadow-sm"
              >
                <h2 className="text-lg font-semibold text-slate-900">{season.name}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {season.managerCount} managers
                  {season.finalGameweek !== null && ` · ${season.finalGameweek} gameweeks`}
                </p>
                {season.champion && (
                  <p className="mt-3 text-sm">
                    <span className="font-medium text-swiss-700">Champion:</span>{" "}
                    {season.champion.managerName} ({season.champion.teamName}) —{" "}
                    {season.champion.totalPoints} pts
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
