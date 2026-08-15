import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import {
  entryEventResults,
  events,
  leagues,
  managers,
  seasonEntries,
  seasons,
} from "@/db/schema";
import { leagueHistoryProviderIds } from "@/lib/leagueHistoryConfig";
import { RECONSTRUCTED_SEASON_PROVIDER_ID } from "@/providers/fpl/buildHistorySnapshot";
import { seasonSlugFromName } from "@/lib/seasonNaming";
import { leagueConfig } from "@/lib/leagueConfig";
import { computeStandings } from "@/metrics/standings";
import type { EntryInput, ResultInput } from "@/metrics/types";

import { getLeagueOverview, type LeagueOverview } from "./leagueData";

const ARCHIVED_STATES = ["archived", "archived-summary"] as const;

export interface HistorySeasonSummary {
  name: string;
  slug: string;
  managerCount: number;
  finalGameweek: number | null;
  champion: {
    managerName: string;
    teamName: string;
    totalPoints: number;
    overallFplRank: number | null;
  } | null;
}

/**
 * Archived seasons for the league, newest first.
 */
export async function listHistorySeasons(): Promise<HistorySeasonSummary[]> {
  const league = await db.query.leagues.findFirst({
    where: eq(leagues.slug, leagueConfig.slug),
  });
  if (!league) return [];

  const seasonRows = await db
    .select({
      id: seasons.id,
      name: seasons.name,
      state: seasons.state,
      providerId: seasons.providerId,
    })
    .from(seasons)
    .innerJoin(seasonEntries, eq(seasonEntries.seasonId, seasons.id))
    .where(
      and(
        eq(seasonEntries.leagueId, league.id),
        inArray(seasons.state, [...ARCHIVED_STATES]),
      ),
    )
    .groupBy(seasons.id, seasons.name, seasons.state, seasons.providerId)
    .orderBy(desc(seasons.name));

  const verifiedHistoryLeagueIds = new Set(leagueHistoryProviderIds().values());

  const summaries: HistorySeasonSummary[] = [];
  for (const row of seasonRows) {
    if (row.state === "archived-summary") {
      if (row.providerId === RECONSTRUCTED_SEASON_PROVIDER_ID) {
        // validated against chat-record champions at import time
      } else {
        const verifiedHistoryLeagueIds = new Set(leagueHistoryProviderIds().values());
        if (verifiedHistoryLeagueIds.size === 0) continue;
        if (!row.providerId || !verifiedHistoryLeagueIds.has(row.providerId)) continue;
      }
    }

    const summary = await buildSeasonSummary(league.id, row.id, row.name);
    summaries.push(summary);
  }
  return summaries;
}

export async function getHistorySeasonOverview(
  seasonSlug: string,
  throughEvent?: number,
): Promise<LeagueOverview> {
  return getLeagueOverview({
    seasonName: seasonSlug,
    archivedOnly: true,
    throughEvent,
  });
}

async function buildSeasonSummary(
  leagueId: string,
  seasonId: string,
  seasonName: string,
): Promise<HistorySeasonSummary> {
  const entryRows = await db
    .select({
      entryId: seasonEntries.id,
      managerName: managers.displayName,
      teamName: seasonEntries.teamName,
      joinEvent: seasonEntries.joinEvent,
      overallFplRank: seasonEntries.overallFplRank,
    })
    .from(seasonEntries)
    .innerJoin(managers, eq(managers.id, seasonEntries.managerId))
    .where(
      and(eq(seasonEntries.leagueId, leagueId), eq(seasonEntries.seasonId, seasonId)),
    );

  const eventRows = await db
    .select()
    .from(events)
    .where(eq(events.seasonId, seasonId))
    .orderBy(events.eventNumber);

  const finishedEvents = eventRows
    .filter((ev) => ev.finished && ev.checked)
    .map((ev) => ev.eventNumber);
  const eventsWithData = eventRows.map((ev) => ev.eventNumber);
  const finalGw =
    finishedEvents.length > 0
      ? Math.max(...finishedEvents)
      : eventsWithData.length > 0
        ? Math.max(...eventsWithData)
        : null;

  let champion: HistorySeasonSummary["champion"] = null;
  if (finalGw !== null && entryRows.length > 0) {
    const phaseByEvent = new Map(
      eventRows.map((ev) => [ev.eventNumber, ev.phase]),
    );
    const resultRows = await db
      .select({
        entryId: entryEventResults.seasonEntryId,
        eventNumber: events.eventNumber,
        netPoints: entryEventResults.netPoints,
        grossPoints: entryEventResults.grossPoints,
        transferCost: entryEventResults.transferCost,
        benchPoints: entryEventResults.benchPoints,
        chip: entryEventResults.chip,
      })
      .from(entryEventResults)
      .innerJoin(events, eq(events.id, entryEventResults.eventId))
      .where(eq(events.seasonId, seasonId));

    const entries: EntryInput[] = entryRows.map((e) => ({
      entryId: e.entryId,
      managerName: e.managerName,
      teamName: e.teamName,
      joinEvent: e.joinEvent,
    }));
    const results: ResultInput[] = resultRows.map((r) => ({
      entryId: r.entryId,
      eventNumber: r.eventNumber,
      phase: phaseByEvent.get(r.eventNumber) ?? 1,
      netPoints: r.netPoints,
      grossPoints: r.grossPoints,
      transferCost: r.transferCost,
      benchPoints: r.benchPoints,
      chip: r.chip,
    }));
    const standings = computeStandings(entries, results, finalGw);
    const winner = standings[0];
    if (winner) {
      const winnerMeta = entryRows.find((e) => e.entryId === winner.entryId);
      champion = {
        managerName: winner.managerName,
        teamName: winner.teamName,
        totalPoints: winner.totalNetPoints,
        overallFplRank: winnerMeta?.overallFplRank ?? null,
      };
    }
  }

  return {
    name: seasonName,
    slug: seasonSlugFromName(seasonName),
    managerCount: entryRows.length,
    finalGameweek: finalGw,
    champion,
  };
}
