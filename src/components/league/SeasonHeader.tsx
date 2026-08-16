import { Badge } from "@/components/ui/Badge";
import { formatSyncLabel } from "@/lib/formatTime";
import type { LeagueOverview } from "@/server/leagueData";

interface SeasonHeaderProps {
  overview: LeagueOverview;
  showLiveBadge: boolean;
}

export function SeasonHeader({ overview, showLiveBadge }: SeasonHeaderProps) {
  const leader = overview.standings[0];

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {overview.league?.name}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>Season {overview.seasonName}</span>
            {overview.selectedEvent !== null && (
              <span className="text-slate-400">·</span>
            )}
            {overview.selectedEvent !== null && (
              <span className="font-medium">GW{overview.selectedEvent}</span>
            )}
            {showLiveBadge && overview.isLiveGameweek && (
              <Badge variant="live">Live</Badge>
            )}
            {overview.dataMode === "archived" && (
              <Badge variant="default">Archive</Badge>
            )}
          </p>
        </div>
        {overview.lastSync?.finishedAt && showLiveBadge && (
          <p className="text-xs text-slate-400">
            Updated {formatSyncLabel(new Date(overview.lastSync.finishedAt))}
          </p>
        )}
      </div>
      {leader && overview.dataMode === "live" && !overview.isSummaryArchive && (
        <div className="mt-4 flex flex-wrap items-baseline gap-2 border-t border-slate-100 pt-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Leader
          </span>
          <span className="text-lg font-bold text-slate-900">{leader.managerName}</span>
          <span className="text-slate-500">{leader.teamName}</span>
          <span className="ml-auto text-xl font-bold tabular-nums text-swiss-700">
            {leader.totalNetPoints}
            <span className="text-sm font-medium text-slate-500"> pts</span>
          </span>
        </div>
      )}
    </div>
  );
}
