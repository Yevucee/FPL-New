import { Badge } from "@/components/ui/Badge";
import type { LeagueOverview } from "@/server/leagueData";
import type { StandingRow } from "@/metrics/types";

interface StandingsTableProps {
  overview: LeagueOverview;
  standings: StandingRow[];
  title: string;
}

function rowAccent(rank: number): string {
  if (rank === 1) return "border-l-4 border-l-amber-400 bg-amber-50/40";
  if (rank === 2) return "border-l-4 border-l-slate-300 bg-slate-50/50";
  if (rank === 3) return "border-l-4 border-l-orange-300 bg-orange-50/30";
  return "border-l-4 border-l-transparent";
}

function Movement({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-400">–</span>;
  if (value > 0) return <span className="font-medium text-pitch-700">▲ {value}</span>;
  if (value < 0) return <span className="font-medium text-red-600">▼ {Math.abs(value)}</span>;
  return <span className="text-slate-400">—</span>;
}

export function StandingsTable({ overview, standings, title }: StandingsTableProps) {
  const { selectedEvent, isSummaryArchive, entryIntel } = overview;

  return (
    <section>
      <h2 className="mb-3 text-lg font-bold tracking-tight text-slate-900">{title}</h2>
      <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-card">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50/90 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="sticky-col-rank px-3 py-3 w-10">#</th>
              <th className="px-2 py-3 w-12">Move</th>
              <th className="sticky-col-manager min-w-[140px] px-3 py-3">Manager</th>
              <th className="px-3 py-3">Team</th>
              {!isSummaryArchive && (
                <th className="px-3 py-3 text-right">GW{selectedEvent}</th>
              )}
              {!isSummaryArchive && (
                <th className="px-3 py-3 text-right">vs avg</th>
              )}
              {!isSummaryArchive && (
                <th className="px-3 py-3 text-right">FPL rank</th>
              )}
              {isSummaryArchive && (
                <th className="px-3 py-3 text-right">FPL rank</th>
              )}
              <th className="px-3 py-3 text-right">Total</th>
              <th className="px-3 py-3 text-right">Gap</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row) => (
              <tr
                key={row.entryId}
                className={`border-t border-slate-100 transition-colors hover:bg-slate-50/80 ${rowAccent(row.rank)}`}
              >
                <td className="sticky-col-rank px-3 py-2.5 font-bold tabular-nums">
                  {row.rank}
                </td>
                <td className="px-2 py-2.5">
                  <Movement value={row.rankMovement} />
                </td>
                <td className="sticky-col-manager px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">{row.managerName}</span>
                    {row.rank === 1 && !isSummaryArchive && (
                      <Badge variant="gold">Leader</Badge>
                    )}
                  </div>
                  {entryIntel[row.entryId]?.careerBestSeason && (
                    <div className="mt-0.5 text-xs text-slate-400">
                      Best {entryIntel[row.entryId]?.careerBestSeason} ·{" "}
                      {entryIntel[row.entryId]?.careerBestPoints} pts
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-slate-600">{row.teamName}</td>
                {!isSummaryArchive && (
                  <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                    {row.eventNetPoints}
                  </td>
                )}
                {!isSummaryArchive && (
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">
                    {row.gwVsAverage === null || row.gwVsAverage === undefined ? (
                      "—"
                    ) : row.gwVsAverage > 0 ? (
                      <span className="font-medium text-pitch-700">+{row.gwVsAverage}</span>
                    ) : row.gwVsAverage < 0 ? (
                      <span className="font-medium text-red-600">{row.gwVsAverage}</span>
                    ) : (
                      "0"
                    )}
                  </td>
                )}
                {!isSummaryArchive && (
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">
                    {entryIntel[row.entryId]?.overallFplRank?.toLocaleString() ?? "—"}
                  </td>
                )}
                {isSummaryArchive && (
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">
                    {entryIntel[row.entryId]?.overallFplRank?.toLocaleString() ?? "—"}
                  </td>
                )}
                <td className="px-3 py-2.5 text-right text-base font-bold tabular-nums text-slate-900">
                  {row.totalNetPoints}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">
                  {row.gapToLeader === 0 ? "—" : `−${row.gapToLeader}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Net points after transfer hits. Tied scores share a rank.
      </p>
    </section>
  );
}
