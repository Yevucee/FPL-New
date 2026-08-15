import Link from "next/link";

import { getLeagueOverview } from "@/server/leagueData";
import type { LeagueInsights } from "@/metrics/insights";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ gw?: string }>;
}

function Movement({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-400">–</span>;
  if (value > 0) return <span className="text-swiss-600">▲ {value}</span>;
  if (value < 0) return <span className="text-red-500">▼ {Math.abs(value)}</span>;
  return <span className="text-slate-400">—</span>;
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
          Run{" "}
          <code className="rounded bg-slate-100 px-1">bash scripts/sync-from-fpl.sh</code>{" "}
          once your FPL league ID is configured in <code>.env</code>.
        </p>
      </div>
    );
  }

  if (overview.dataMode === "preseason" && overview.standings.length === 0) {
    return (
      <div className="space-y-6">
        <SeasonHeader overview={overview} />
        <div className="rounded-lg border border-swiss-200 bg-swiss-50 p-6">
          <h2 className="text-lg font-semibold text-swiss-900">Season starts soon</h2>
          <p className="mt-2 text-sm text-slate-600">
            <strong>{overview.registeredManagers}</strong> managers are registered.
            Standings, awards, and live stats will appear here after Gameweek 1
            {overview.nextEvent ? ` (GW${overview.nextEvent})` : ""} completes.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Tip: after each deadline, run{" "}
            <code className="rounded bg-white px-1">bash scripts/sync-from-fpl.sh</code>{" "}
            to refresh from FPL.
          </p>
        </div>
      </div>
    );
  }

  const { standings, gameweekWinner, monthlyLeader, selectedEvent, insights } =
    overview;

  return (
    <div className="space-y-8">
      <SeasonHeader overview={overview} />

      {overview.finishedEvents.length > 1 && selectedEvent !== null && (
        <GameweekPicker events={overview.finishedEvents} selected={selectedEvent} />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <AwardBox
          title={`Gameweek ${selectedEvent} winner`}
          card={gameweekWinner}
          suffix="pts"
        />
        <AwardBox
          title={`Monthly leader — ${monthlyLeader?.phaseName ?? "current month"}`}
          card={monthlyLeader}
          suffix="pts"
        />
      </div>

      {insights && selectedEvent !== null && (
        <InsightsSection insights={insights} eventNumber={selectedEvent} />
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Standings{selectedEvent !== null ? ` through GW${selectedEvent}` : ""}
        </h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Move</th>
                <th className="px-3 py-2">Manager</th>
                <th className="px-3 py-2">Team</th>
                <th className="px-3 py-2 text-right">GW{selectedEvent}</th>
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
          Ranks use net points (after transfer hits). Tied scores share a rank.
        </p>
      </section>
    </div>
  );
}

function SeasonHeader({
  overview,
}: {
  overview: Awaited<ReturnType<typeof getLeagueOverview>>;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h1 className="text-2xl font-bold">{overview.league?.name}</h1>
        <p className="text-sm text-slate-500">
          Season {overview.seasonName}
          {overview.selectedEvent !== null && ` · GW${overview.selectedEvent}`}
          {overview.dataMode === "live" && overview.currentEvent !== null && (
            <> · live</>
          )}
          {" · "}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs uppercase tracking-wide">
            {overview.league?.visibility}
          </span>
        </p>
      </div>
      {overview.lastSync?.finishedAt && (
        <p className="text-xs text-slate-400">
          Updated{" "}
          {new Date(overview.lastSync.finishedAt)
            .toISOString()
            .replace("T", " ")
            .slice(0, 19)}{" "}
          UTC
        </p>
      )}
    </div>
  );
}

function GameweekPicker({
  events,
  selected,
}: {
  events: number[];
  selected: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-slate-500">View:</span>
      {events.map((ev) => (
        <Link
          key={ev}
          href={ev === events[events.length - 1] ? "/league" : `/league?gw=${ev}`}
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            ev === selected
              ? "bg-swiss-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          GW{ev}
        </Link>
      ))}
    </div>
  );
}

function InsightsSection({
  insights,
  eventNumber,
}: {
  insights: LeagueInsights;
  eventNumber: number;
}) {
  const cards = [
    insights.woodenSpoon && {
      label: `Wooden spoon · GW${eventNumber}`,
      value: `${insights.woodenSpoon.managerName} (${insights.woodenSpoon.value} pts)`,
      tone: "muted" as const,
    },
    insights.biggestClimber && {
      label: "Biggest climber",
      value: `${insights.biggestClimber.managerName} (+${insights.biggestClimber.movement})`,
      tone: "good" as const,
    },
    insights.biggestFaller && {
      label: "Biggest faller",
      value: `${insights.biggestFaller.managerName} (${insights.biggestFaller.movement})`,
      tone: "bad" as const,
    },
    insights.leagueAverageGw !== null && {
      label: `League average · GW${eventNumber}`,
      value: `${insights.leagueAverageGw} pts`,
      tone: "neutral" as const,
    },
    insights.seasonBestGw && {
      label: "Best single GW (season)",
      value: `${insights.seasonBestGw.managerName} — ${insights.seasonBestGw.value} pts (GW${insights.seasonBestGw.eventNumber})`,
      tone: "neutral" as const,
    },
    insights.benchPointsLeader && {
      label: "Bench hoarder",
      value: `${insights.benchPointsLeader.managerName} (${insights.benchPointsLeader.value} left on bench)`,
      tone: "muted" as const,
    },
    insights.transferHitsLeader && {
      label: "Transfer gambler",
      value: `${insights.transferHitsLeader.managerName} (−${insights.transferHitsLeader.value} hits)`,
      tone: "muted" as const,
    },
  ].filter(Boolean) as Array<{ label: string; value: string; tone: string }>;

  if (cards.length === 0 && insights.formLeaders.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">League storylines</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-slate-200 bg-white p-3"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {card.label}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-800">{card.value}</p>
          </div>
        ))}
      </div>
      {insights.formLeaders.length > 0 && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Form (last 3 gameweeks)
          </p>
          <ol className="mt-2 space-y-1 text-sm">
            {insights.formLeaders.map((leader, index) => (
              <li key={leader.entryId}>
                <span className="font-semibold text-swiss-700">{index + 1}.</span>{" "}
                {leader.managerName} — {leader.points} pts
              </li>
            ))}
          </ol>
        </div>
      )}
      {insights.chipsPlayed.length > 0 && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Chips played
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {insights.chipsPlayed.map((chip) => (
              <li key={`${chip.entryId}-${chip.eventNumber}`}>
                GW{chip.eventNumber}: {chip.managerName} played{" "}
                <span className="font-medium">{chip.chip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
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
              <span className="ml-2 rounded bg-swiss-100 px-1.5 py-0.5 text-xs font-medium text-swiss-700">
                joint
              </span>
            )}
          </p>
          <p className="text-sm text-slate-500">
            {card.winners.map((w) => w.teamName).join(", ")} · {card.value} {suffix}
          </p>
        </div>
      ) : (
        <p className="mt-1 text-sm text-slate-400">Not available yet</p>
      )}
    </div>
  );
}
