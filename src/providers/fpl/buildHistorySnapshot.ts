import type { LeagueSnapshot } from "@/contracts/snapshot";
import { leagueConfig } from "@/lib/leagueConfig";

import {
  fetchAllLeagueMembers,
  fetchEntryHistory,
  sleep,
  type FplEntryHistory,
} from "./client";
import { seasonNameFromBootstrap } from "./buildSnapshot";

export interface FplPastSeasonRecord {
  seasonName: string;
  totalPoints: number;
  overallRank: number;
}

const DEFAULT_FINAL_EVENT = 38;

/**
 * Past seasons available in members' official FPL career history.
 * Note: FPL only exposes season totals for completed seasons — not GW-by-GW.
 */
export async function listFplPastSeasonsForLeague(
  leagueId: string,
): Promise<string[]> {
  const { members } = await fetchAllLeagueMembers(leagueId);
  const seasons = new Set<string>();

  for (const [index, member] of members.entries()) {
    if (index > 0) await sleep(120);
    const history = await fetchEntryHistory(member.entryId);
    for (const row of history.past) {
      seasons.add(row.season_name);
    }
  }

  return [...seasons].sort((a, b) => b.localeCompare(a));
}

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

/**
 * Build an archived season snapshot from official FPL `history.past` totals.
 * All season points are stored on the final gameweek — suitable for final tables,
 * not for scrolling individual gameweeks (FPL does not expose those after rollover).
 */
export async function buildPastSeasonSnapshotFromFpl(
  leagueId: string,
  seasonName: string,
  finalEvent = DEFAULT_FINAL_EVENT,
): Promise<LeagueSnapshot> {
  const { league, members } = await fetchAllLeagueMembers(leagueId);
  const entries: LeagueSnapshot["entries"] = [];

  for (const [index, member] of members.entries()) {
    if (index > 0) await sleep(120);
    const history = await fetchEntryHistory(member.entryId);
    const past = pastSeasonRecord(history, seasonName);
    if (!past) continue;

    entries.push({
      providerEntryId: member.entryId,
      managerName: member.managerName,
      teamName: member.teamName,
      joinEvent: 1,
      results: [
        {
          eventNumber: finalEvent,
          netPoints: past.totalPoints,
          grossPoints: past.totalPoints,
          transferCost: 0,
          totalPoints: past.totalPoints,
          benchPoints: 0,
          chip: null,
        },
      ],
    });
  }

  if (entries.length === 0) {
    throw new Error(`No FPL history found for season ${seasonName} in league ${leagueId}`);
  }

  const events = Array.from({ length: finalEvent }, (_, index) => ({
    eventNumber: index + 1,
    deadline: null,
    phase: 1,
    phaseName: null,
    finished: true,
    checked: true,
  }));

  return {
    provider: "fpl-public",
    season: {
      name: seasonName,
      providerId: null,
      startEvent: 1,
    },
    league: {
      slug: leagueConfig.slug,
      name: leagueConfig.displayName || league.name,
      providerId: String(league.id),
      visibility: leagueConfig.visibility,
      timezone: leagueConfig.scoringTimezone,
    },
    events,
    entries,
  };
}

export { seasonNameFromBootstrap };