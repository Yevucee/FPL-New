import { getLeagueOverview } from "@/server/leagueData";

export const dynamic = "force-dynamic";

function Movement({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-400">–</span>;
  if (value > 0) return <span className="text-pitch-600">▲ {value}</span>;
  if (value < 0) return <span className="text-red-500">▼ {Math.abs(value)}</span>;
  return <span className="text-slate-400">—</span>;
}

export default async function LeaguePage() {
  const overview = await getLeagueOverview();

  if (!overview.league || overview.standings.length === 0) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-6">
        <h1 className="text-xl font-semibold">No league data yet</h1>
        <p className="mt-2 text-sm text-slate-600">
          Run the sample import to populate the league:{" "}
          <code className="rounded bg-slate-100 px-1">npm run job:sync-current</code>
        </p>
      </div>
    );
  }

  const { standings, gameweekWinner, monthlyLeader, latestEvent, seasonName } =
    overview;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{overview.league.name}</h1>
          <p className="text-sm text-slate-500">
            Season {seasonName} · Gameweek {latestEvent} ·{" "}
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs uppercase tracking-wide">
              {overview.league.visibility}
            </span>
          </p>
        </div>
        {overview.lastSync?.finishedAt && (
          <p className="text-xs text-slate-400">
            Last refresh:{" "}
            {new Date(overview.lastSync.finishedAt).toISOString().replace("T", " ").slice(0, 19)} UTC
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AwardBox
          title={`Gameweek ${latestEvent} winner`}
          card={gameweekWinner}
          suffix="pts"
        />
        <AwardBox
          title={`Monthly leader — ${monthlyLeader?.phaseName ?? "current phase"}`}
          card={monthlyLeader}
          suffix="pts"
        />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Standings</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Move</th>
                <th className="px-3 py-2">Manager</th>
                <th className="px-3 py-2">Team</th>
                <th className="px-3 py-2 text-right">GW{latestEvent}</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Gap</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => (
                <tr key={row.entryId} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-semibold">{row.rank}</td>
                  <td className="px-3 py-2">
                    <Movement value={row.rankMovement} />
                  </td>
                  <td className="px-3 py-2">{row.managerName}</td>
                  <td className="px-3 py-2 text-slate-500">{row.teamName}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.eventNetPoints}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">
                    {row.totalNetPoints}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                    {row.gapToLeader === 0 ? "—" : `-${row.gapToLeader}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Ranks are tie-aware and use net points (after transfer hits). Winners
          default to joint when scores are level.
        </p>
      </section>
    </div>
  );
}

function AwardBox({
  title,
  card,
  suffix,
}: {
  title: string;
  card: {
    value: number;
    joint: boolean;
    winners: { managerName: string; teamName: string }[];
  } | null;
  suffix: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {title}
      </p>
      {card ? (
        <div className="mt-1">
          <p className="text-lg font-semibold">
            {card.winners.map((w) => w.managerName).join(" & ")}
            {card.joint && (
              <span className="ml-2 rounded bg-pitch-100 px-1.5 py-0.5 text-xs font-medium text-pitch-700">
                joint
              </span>
            )}
          </p>
          <p className="text-sm text-slate-500">
            {card.winners.map((w) => w.teamName).join(", ")} · {card.value} {suffix}
          </p>
        </div>
      ) : (
        <p className="mt-1 text-sm text-slate-400">Not available</p>
      )}
    </div>
  );
}
