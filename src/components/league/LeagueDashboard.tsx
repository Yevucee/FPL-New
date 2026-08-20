import type { LeagueOverview } from "@/server/leagueData";

import { AwardsSection } from "./AwardsSection";
import { GameweekPicker } from "./GameweekPicker";
import { InsightsSection } from "./InsightsSection";
import { MostOwnedSection } from "./MostOwnedSection";
import { SeasonHeader } from "./SeasonHeader";
import { StandingsTable } from "./StandingsTable";
import { formatSyncLabel } from "@/lib/formatTime";

interface LeagueDashboardProps {
  overview: LeagueOverview;
  gameweekBasePath?: string;
  showLiveBadge?: boolean;
}

export function LeagueDashboard({
  overview,
  gameweekBasePath = "/league",
  showLiveBadge = true,
}: LeagueDashboardProps) {
  const { standings, gameweekWinner, monthlyLeader, selectedEvent, insights } =
    overview;

  const standingsTitle = overview.isSummaryArchive
    ? "Final standings"
    : overview.isLiveGameweek
      ? `Live standings · GW${selectedEvent}`
      : `Standings${selectedEvent !== null ? ` through GW${selectedEvent}` : ""}`;

  return (
    <div className="space-y-8">
      <SeasonHeader overview={overview} showLiveBadge={showLiveBadge} />

      {overview.isLiveGameweek && (
        <div className="flex items-center gap-3 rounded-xl border border-swiss-200 bg-swiss-50 px-4 py-3 text-sm text-swiss-900 shadow-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <div>
            <strong>GW{overview.liveEvent} is live</strong>
            <span className="text-slate-600">
              {" "}
              — scores refresh every 15 min during matches
              {overview.lastSync?.finishedAt && (
                <>
                  {" "}
                  · last sync{" "}
                  {formatSyncLabel(new Date(overview.lastSync.finishedAt))}
                </>
              )}
            </span>
          </div>
        </div>
      )}

      {overview.isSummaryArchive && (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          {overview.isReconstructedArchive ? (
            <>
              Reconstructed from official FPL season totals, validated against our
              recorded champions. For gameweek-by-gameweek detail, seasons synced
              live retain full GW history.
            </>
          ) : (
            <>
              Final standings from official FPL season totals. Only seasons captured
              during the live year include gameweek-by-gameweek scrolling.
            </>
          )}
        </div>
      )}

      {!overview.isSummaryArchive &&
        overview.finishedEvents.length > 0 &&
        selectedEvent !== null && (
          <GameweekPicker
            events={overview.finishedEvents}
            selected={selectedEvent}
            liveEvent={overview.liveEvent}
            basePath={gameweekBasePath}
          />
        )}

      {!overview.isSummaryArchive && (
        <AwardsSection
          gameweekTitle={
            overview.isLiveGameweek
              ? `Gameweek ${selectedEvent} leader`
              : `Gameweek ${selectedEvent} winner`
          }
          monthlyTitle={`Monthly leader · ${monthlyLeader?.phaseName ?? "current month"}`}
          gameweekWinner={gameweekWinner}
          monthlyLeader={monthlyLeader}
        />
      )}

      {!overview.isSummaryArchive && insights && selectedEvent !== null && (
        <InsightsSection insights={insights} eventNumber={selectedEvent} />
      )}

      {overview.mostOwned && overview.mostOwned.length > 0 ? (
        <MostOwnedSection
          players={overview.mostOwned}
          eventNumber={overview.mostOwnedEvent ?? selectedEvent}
          managerCount={overview.registeredManagers}
        />
      ) : overview.dataMode === "preseason" ? (
        <section>
          <h2 className="mb-1 text-lg font-bold tracking-tight text-slate-900">
            Most owned
          </h2>
          <p className="text-sm text-slate-500">
            League ownership appears here after squads lock for Gameweek 1 — same
            snapshot data as the team planner, visible to everyone on this page.
          </p>
        </section>
      ) : null}

      <StandingsTable
        overview={overview}
        standings={standings}
        title={standingsTitle}
      />
    </div>
  );
}
