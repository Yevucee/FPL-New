import type { LeagueSnapshot } from "@/contracts/snapshot";
import { leagueConfig } from "@/lib/leagueConfig";

import {
  fetchAllLeagueMembers,
  fetchAllLeagueStandings,
  fetchEntryHistory,
  fetchEntryProfile,
  sleep,
  type FplEntryHistory,
} from "./client";
import { managerMatchesChampion } from "@/lib/selChampions";
import {
  manualHistoricalEntryForSeason,
  selHistoricalMembers,
} from "@/lib/selHistoricalMembers";
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

export const RECONSTRUCTED_SEASON_PROVIDER_ID = "reconstructed";

/**
 * Rebuild a season table from current league members' official FPL season totals.
 * Valid for classic-scoring private leagues when membership was stable.
 * Validated against the chat-record champions list before import.
 */
export async function buildPastSeasonSnapshotFromMemberCareers(
  currentLeagueId: string,
  seasonName: string,
  finalEvent = DEFAULT_FINAL_EVENT,
): Promise<LeagueSnapshot> {
  const { league, members } = await fetchAllLeagueMembers(currentLeagueId);
  const entries: LeagueSnapshot["entries"] = [];
  const seenEntryIds = new Set<string>();

  const addEntry = (entry: LeagueSnapshot["entries"][number]) => {
    if (seenEntryIds.has(entry.providerEntryId)) return;
    seenEntryIds.add(entry.providerEntryId);
    entries.push(entry);
  };

  for (const [index, member] of members.entries()) {
    if (index > 0) await sleep(120);
    const history = await fetchEntryHistory(member.entryId);
    const past = pastSeasonRecord(history, seasonName);
    if (!past) continue;
    const meta = managerMetaFromHistory(history, seasonName);

    addEntry({
      providerEntryId: member.entryId,
      managerName: member.managerName,
      teamName: member.teamName,
      joinEvent: 1,
      overallFplRank: past.overallRank,
      careerBestSeason: meta.careerBestSeason,
      careerBestPoints: meta.careerBestPoints,
      seasonTransfers: 0,
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

  for (const [index, historical] of selHistoricalMembers.entries()) {
    if (historical.entryId && !seenEntryIds.has(historical.entryId)) {
      if (index > 0) await sleep(120);
      try {
        const history = await fetchEntryHistory(historical.entryId);
        const past = pastSeasonRecord(history, seasonName);
        if (past) {
          const profile = await fetchEntryProfile(historical.entryId);
          const meta = managerMetaFromHistory(history, seasonName);
          addEntry({
            providerEntryId: historical.entryId,
            managerName: profile.managerName || historical.managerName,
            teamName: profile.teamName,
            joinEvent: 1,
            overallFplRank: past.overallRank,
            careerBestSeason: meta.careerBestSeason,
            careerBestPoints: meta.careerBestPoints,
            seasonTransfers: 0,
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
      } catch {
        // fall through to manual season totals
      }
    }
  }

  for (const manual of manualHistoricalEntryForSeason(seasonName)) {
    if (seenEntryIds.has(manual.providerEntryId)) continue;
    addEntry({
      providerEntryId: manual.providerEntryId,
      managerName: manual.managerName,
      teamName: manual.teamName,
      joinEvent: 1,
      overallFplRank: null,
      careerBestSeason: null,
      careerBestPoints: null,
      seasonTransfers: 0,
      results: [
        {
          eventNumber: finalEvent,
          netPoints: manual.totalPoints,
          grossPoints: manual.totalPoints,
          transferCost: 0,
          totalPoints: manual.totalPoints,
          benchPoints: 0,
          chip: null,
        },
      ],
    });
  }

  if (entries.length === 0) {
    throw new Error(`No FPL season totals for ${seasonName} among current league members`);
  }

  return {
    provider: "fpl-public",
    season: {
      name: seasonName,
      providerId: RECONSTRUCTED_SEASON_PROVIDER_ID,
      startEvent: 1,
    },
    league: {
      slug: leagueConfig.slug,
      name: leagueConfig.displayName || league.name,
      providerId: String(league.id),
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

export function snapshotSeasonLeader(snapshot: LeagueSnapshot): {
  managerName: string;
  teamName: string;
  totalPoints: number;
} | null {
  let leader: { managerName: string; teamName: string; totalPoints: number } | null = null;
  for (const entry of snapshot.entries) {
    const final = entry.results.at(-1);
    if (!final) continue;
    if (!leader || final.netPoints > leader.totalPoints) {
      leader = {
        managerName: entry.managerName,
        teamName: entry.teamName,
        totalPoints: final.netPoints,
      };
    }
  }
  return leader;
}

export function snapshotMatchesChampion(
  snapshot: LeagueSnapshot,
  expectedWinner: string,
): boolean {
  const leader = snapshotSeasonLeader(snapshot);
  if (!leader) return false;
  return managerMatchesChampion(leader.managerName, expectedWinner);
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
