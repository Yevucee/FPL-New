import type { LeagueSnapshot } from "@/contracts/snapshot";
import { leagueConfig } from "@/lib/leagueConfig";

import {
  fetchAllLeagueStandings,
  fetchEntryHistory,
  sleep,
  type FplEntryHistory,
} from "./client";
import { managerMetaFromHistory } from "./managerMeta";
import { seasonNameFromBootstrap } from "./buildSnapshot";

export interface FplPastSeasonRecord {
  seasonName: string;
  totalPoints: number;
  overallRank: number;
}

const DEFAULT_FINAL_EVENT = 38;

export function pastSeasonRecord(
  history: FplEntryHistory,
  seasonName: string,
): FplPastSeasonRecord | null {
  const row = history.past.find((p) => p.season_name === seasonName);
  if (!row) return null;
  return {
    seasonName: row.season_name,
    totalPoints: row.total_points,
    overallRank: row.rank,
  };
}

function assertSwissExpertLeague(leagueName: string, leagueId: string): void {
  const expected = leagueConfig.displayName.trim().toLowerCase();
  const actual = leagueName.trim().toLowerCase();
  if (!actual.includes("swiss expert")) {
    throw new Error(
      `League ${leagueId} is "${leagueName}" — expected a Swiss Expert League archive`,
    );
  }
}

/**
 * Build an archived season snapshot from that season's private FPL league table.
 * Requires the historical league ID (FPL creates a new ID each season).
 */
export async function buildPastSeasonSnapshotFromLeagueStandings(
  leagueId: string,
  seasonName: string,
  finalEvent = DEFAULT_FINAL_EVENT,
): Promise<LeagueSnapshot> {
  const { league, rows } = await fetchAllLeagueStandings(leagueId);
  assertSwissExpertLeague(league.name, leagueId);

  if (rows.length === 0) {
    throw new Error(
      `No standings returned for league ${leagueId} (${league.name}) — is this the correct past-season ID?`,
    );
  }

  const entries: LeagueSnapshot["entries"] = [];

  for (const [index, row] of rows.entries()) {
    if (index > 0) await sleep(120);

    let overallFplRank: number | null = null;
    let careerBestSeason: string | null = null;
    let careerBestPoints: number | null = null;

    try {
      const history = await fetchEntryHistory(row.entryId);
      const meta = managerMetaFromHistory(history, seasonName);
      overallFplRank = pastSeasonRecord(history, seasonName)?.overallRank ?? meta.overallFplRank;
      careerBestSeason = meta.careerBestSeason;
      careerBestPoints = meta.careerBestPoints;
    } catch {
      // Optional enrichment — league table points are authoritative.
    }

    entries.push({
      providerEntryId: row.entryId,
      managerName: row.managerName,
      teamName: row.teamName,
      joinEvent: 1,
      overallFplRank,
      careerBestSeason,
      careerBestPoints,
      seasonTransfers: 0,
      results: [
        {
          eventNumber: finalEvent,
          netPoints: row.total,
          grossPoints: row.total,
          transferCost: 0,
          totalPoints: row.total,
          benchPoints: 0,
          chip: null,
        },
      ],
    });
  }

  return {
    provider: "fpl-public",
    season: {
      name: seasonName,
      providerId: leagueId,
      startEvent: 1,
    },
    league: {
      slug: leagueConfig.slug,
      name: leagueConfig.displayName || league.name,
      providerId: leagueId,
      visibility: leagueConfig.visibility,
      timezone: leagueConfig.scoringTimezone,
    },
    events: Array.from({ length: finalEvent }, (_, index) => ({
      eventNumber: index + 1,
      deadline: null,
      phase: 1,
      phaseName: null,
      finished: true,
      checked: true,
    })),
    entries,
  };
}

export { seasonNameFromBootstrap };
