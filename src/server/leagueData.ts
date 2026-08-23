import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import {
  entryEventResults,
  events,
  leagues,
  managers,
  seasonEntries,
  seasons,
  syncRuns,
} from "@/db/schema";
import type { MostOwnedPlayer } from "@/providers/fpl/mostOwned";
import { seasonNameFromSlug } from "@/lib/seasonNaming";
import { leagueConfig } from "@/lib/leagueConfig";
import { leagueHistoryProviderIds } from "@/lib/leagueHistoryConfig";
import { MOST_OWNED_PUBLIC_LIMIT } from "@/lib/mostOwnedLimits";
import { mergeManualHistoricalEntries } from "@/lib/mergeHistoricalStandings";
import { loadMostOwnedIntel, loadSquadIntelThrough } from "@/server/eventIntelData";
import { RECONSTRUCTED_SEASON_PROVIDER_ID } from "@/providers/fpl/buildHistorySnapshot";
import { buildSelectableEvents, findLiveGameweek } from "@/lib/liveGameweek";
import {
  buildSeasonWindowOptions,
  clampThroughEventForWindow,
  filterResultsForWindow,
  resolveSeasonWindow,
  type ResolvedSeasonWindow,
  type SeasonWindowOption,
} from "@/lib/seasonWindow";
import { gameweekWinner, monthlyWinner } from "@/metrics/awards";
import { computeLeagueInsights, type LeagueInsights } from "@/metrics/insights";
import { computeStandings } from "@/metrics/standings";
import type { EntryInput, ResultInput, StandingRow } from "@/metrics/types";

export interface AwardCard {
  eventNumber?: number;
  phase?: number;
  phaseName?: string | null;
  value: number;
  joint: boolean;
  winners: { entryId: string; managerName: string; teamName: string }[];
}

export interface EntryIntel {
  overallFplRank: number | null;
  careerBestSeason: string | null;
  careerBestPoints: number | null;
  seasonTransfers: number | null;
}

export interface LeagueOverview {
  league: { slug: string; name: string; visibility: string } | null;
  seasonName: string | null;
  registeredManagers: number;
  latestFinishedEvent: number | null;
  liveEvent: number | null;
  isLiveGameweek: boolean;
  currentEvent: number | null;
  nextEvent: number | null;
  selectedEvent: number | null;
  finishedEvents: number[];
  standings: StandingRow[];
  managers: Array<{ entryId: string; managerName: string; teamName: string }>;
  entryIntel: Record<string, EntryIntel>;
  mostOwned: MostOwnedPlayer[] | null;
  mostOwnedEvent: number | null;
  gameweekWinner: AwardCard | null;
  monthlyLeader: AwardCard | null;
  insights: LeagueInsights | null;
  seasonWindow: ResolvedSeasonWindow;
  seasonWindowOptions: SeasonWindowOption[];
  lastSync: { status: string; finishedAt: Date | null } | null;
  dataMode: "preseason" | "live" | "archived" | "empty";
  seasonState: string | null;
  isSummaryArchive: boolean;
  isReconstructedArchive: boolean;
}

export interface LeagueOverviewOptions {
  throughEvent?: number;
  /** Season display name (e.g. "2024/25") or URL slug (e.g. "2024-25"). */
  seasonName?: string;
  /** When true, only seasons with state=archived are considered. */
  archivedOnly?: boolean;
  /** Standings window: full, first-half, second-half, phase-N */
  window?: string;
}

/**
 * Load everything the League home / standings views need. Reads normalised rows
 * from PostgreSQL and applies the pure metric functions — the UI never contains
 * scoring formulas (specification section 9).
 */
export async function getLeagueOverview(
  options: LeagueOverviewOptions = {},
): Promise<LeagueOverview> {
  const league = await db.query.leagues.findFirst({
    where: eq(leagues.slug, leagueConfig.slug),
  });

  const lastSyncRow = await db.query.syncRuns.findFirst({
    orderBy: desc(syncRuns.startedAt),
  });
  const lastSync = lastSyncRow
    ? { status: lastSyncRow.status, finishedAt: lastSyncRow.finishedAt }
    : null;

  const empty: LeagueOverview = {
    league: league
      ? { slug: league.slug, name: league.name, visibility: league.visibility }
      : null,
    seasonName: null,
    registeredManagers: 0,
    latestFinishedEvent: null,
    liveEvent: null,
    isLiveGameweek: false,
    currentEvent: null,
    nextEvent: null,
    selectedEvent: null,
    finishedEvents: [],
    standings: [],
    managers: [],
    entryIntel: {},
    mostOwned: null,
    mostOwnedEvent: null,
    gameweekWinner: null,
    monthlyLeader: null,
    insights: null,
    seasonWindow: { id: "full", label: "Full season", kind: "full", fromEvent: 1, phase: null },
    seasonWindowOptions: [{ id: "full", label: "Full season", kind: "full" }],
    lastSync,
    dataMode: "empty",
    seasonState: null,
    isSummaryArchive: false,
    isReconstructedArchive: false,
  };

  if (!league) return empty;

  const season = await resolveSeason(league.id, options);
  if (!season) {
    return {
      ...empty,
      league: { slug: league.slug, name: league.name, visibility: league.visibility },
      dataMode: options.archivedOnly ? "empty" : "preseason",
    };
  }

  const entryRows = await db
    .select({
      entryId: seasonEntries.id,
      managerName: managers.displayName,
      teamName: seasonEntries.teamName,
      joinEvent: seasonEntries.joinEvent,
      seasonId: seasonEntries.seasonId,
      overallFplRank: seasonEntries.overallFplRank,
      careerBestSeason: seasonEntries.careerBestSeason,
      careerBestPoints: seasonEntries.careerBestPoints,
      seasonTransfers: seasonEntries.seasonTransfers,
    })
    .from(seasonEntries)
    .innerJoin(managers, eq(managers.id, seasonEntries.managerId))
    .where(
      and(
        eq(seasonEntries.leagueId, league.id),
        eq(seasonEntries.seasonId, season.id),
      ),
    );

  if (entryRows.length === 0) {
    return {
      ...empty,
      league: { slug: league.slug, name: league.name, visibility: league.visibility },
      seasonName: season.name,
      seasonState: season.state,
      isSummaryArchive: season.state === "archived-summary",
      isReconstructedArchive: season.providerId === RECONSTRUCTED_SEASON_PROVIDER_ID,
      dataMode: season.state === "archived-summary" || season.state === "archived" ? "archived" : "preseason",
    };
  }

  const eventRows = await db
    .select()
    .from(events)
    .where(eq(events.seasonId, season.id))
    .orderBy(events.eventNumber);

  const phaseByEvent = new Map<number, { phase: number; phaseName: string | null }>();
  for (const ev of eventRows) {
    phaseByEvent.set(ev.eventNumber, { phase: ev.phase, phaseName: ev.phaseName });
  }

  const resultRows = await db
    .select({
      entryId: entryEventResults.seasonEntryId,
      eventNumber: events.eventNumber,
      netPoints: entryEventResults.netPoints,
      grossPoints: entryEventResults.grossPoints,
      transferCost: entryEventResults.transferCost,
      benchPoints: entryEventResults.benchPoints,
      benchBoostPoints: entryEventResults.benchBoostPoints,
      chip: entryEventResults.chip,
      captainName: entryEventResults.captainName,
      captainPoints: entryEventResults.captainPoints,
    })
    .from(entryEventResults)
    .innerJoin(events, eq(events.id, entryEventResults.eventId))
    .where(eq(events.seasonId, season.id));

  const entries: EntryInput[] = entryRows.map((e) => ({
    entryId: e.entryId,
    managerName: e.managerName,
    teamName: e.teamName,
    joinEvent: e.joinEvent,
  }));

  const results: ResultInput[] = resultRows.map((r) => ({
    entryId: r.entryId,
    eventNumber: r.eventNumber,
    phase: phaseByEvent.get(r.eventNumber)?.phase ?? 1,
    netPoints: r.netPoints,
    grossPoints: r.grossPoints,
    transferCost: r.transferCost,
    benchPoints: r.benchPoints,
    benchBoostPoints: r.benchBoostPoints,
    chip: r.chip,
  }));

  const finishedEvents = eventRows
    .filter((ev) => ev.finished && ev.checked)
    .map((ev) => ev.eventNumber);

  const gameweekMeta = eventRows.map((ev) => ({
    eventNumber: ev.eventNumber,
    deadline: ev.deadline,
    finished: ev.finished,
    checked: ev.checked,
  }));

  const liveEvent = findLiveGameweek(gameweekMeta);

  const eventsWithScores = [...new Set(results.map((r) => r.eventNumber))].sort(
    (a, b) => a - b,
  );

  const latestFinishedEvent =
    finishedEvents.length > 0
      ? Math.max(...finishedEvents)
      : eventsWithScores.length > 0
        ? Math.max(...eventsWithScores)
        : null;

  const currentEvent =
    liveEvent ??
    eventRows.find((ev) => ev.finished === false && ev.checked === false)?.eventNumber ??
    eventRows.find((ev) => !ev.finished)?.eventNumber ??
    latestFinishedEvent;

  const nextEvent =
    eventRows.find((ev) => !ev.finished && (liveEvent === null || ev.eventNumber > liveEvent))
      ?.eventNumber ?? null;

  const selectableEvents = buildSelectableEvents(gameweekMeta, finishedEvents, liveEvent);

  const eventMeta = eventRows.map((ev) => ({
    eventNumber: ev.eventNumber,
    phase: ev.phase,
    phaseName: ev.phaseName,
  }));
  const seasonWindowOptions = buildSeasonWindowOptions(eventMeta);
  const seasonWindow = resolveSeasonWindow(options.window, eventMeta);

  const selectedEvent =
    options.throughEvent && selectableEvents.includes(options.throughEvent)
      ? options.throughEvent
      : liveEvent ?? latestFinishedEvent;

  const windowThroughEvent =
    selectedEvent !== null
      ? clampThroughEventForWindow(selectedEvent, seasonWindow, eventMeta)
      : selectedEvent;

  const isLiveGameweek = liveEvent !== null && selectedEvent === liveEvent;

  let displayEntries = entries;
  let displayResults = results;
  if (
    season.state === "archived-summary" &&
    selectedEvent !== null &&
    season.providerId === RECONSTRUCTED_SEASON_PROVIDER_ID
  ) {
    const merged = mergeManualHistoricalEntries(
      season.name,
      entries,
      results,
      selectedEvent,
    );
    displayEntries = merged.entries;
    displayResults = merged.results;
  }

  const nameById = new Map(displayEntries.map((e) => [e.entryId, e]));
  const toCard = (
    winner: ReturnType<typeof gameweekWinner>,
    meta: Partial<AwardCard>,
  ): AwardCard | null => {
    if (!winner) return null;
    return {
      value: winner.value,
      joint: winner.joint,
      winners: winner.entryIds.map((id) => ({
        entryId: id,
        managerName: nameById.get(id)?.managerName ?? "Unknown",
        teamName: nameById.get(id)?.teamName ?? "Unknown",
      })),
      ...meta,
    };
  };

  const entryIntel: Record<string, EntryIntel> = {};
  const entryMeta = new Map<string, EntryIntel>();
  for (const e of entryRows) {
    const intel = {
      overallFplRank: e.overallFplRank,
      careerBestSeason: e.careerBestSeason,
      careerBestPoints: e.careerBestPoints,
      seasonTransfers: e.seasonTransfers,
    };
    entryIntel[e.entryId] = intel;
    entryMeta.set(e.entryId, intel);
  }

  const captainByEntry = new Map<string, { name: string; points: number | null }>();
  const captainHistory: { entryId: string; eventNumber: number; captainName: string }[] = [];
  const captainPointsHistory: { entryId: string; eventNumber: number; points: number }[] = [];
  for (const r of resultRows) {
    if (selectedEvent !== null && r.eventNumber > selectedEvent) continue;
    if (r.captainName) {
      captainHistory.push({
        entryId: r.entryId,
        eventNumber: r.eventNumber,
        captainName: r.captainName,
      });
    }
    if (r.captainPoints != null && r.captainPoints > 0) {
      captainPointsHistory.push({
        entryId: r.entryId,
        eventNumber: r.eventNumber,
        points: r.captainPoints,
      });
    }
    if (selectedEvent !== null && r.eventNumber === selectedEvent && r.captainName) {
      captainByEntry.set(r.entryId, {
        name: r.captainName,
        points: r.captainPoints,
      });
    }
  }

  const scopedResults =
    windowThroughEvent !== null
      ? filterResultsForWindow(displayResults, windowThroughEvent, seasonWindow)
      : displayResults;
  const scopedEventNumbers = new Set(scopedResults.map((row) => row.eventNumber));
  const scopedCaptainHistory = captainHistory.filter((row) =>
    scopedEventNumbers.has(row.eventNumber),
  );
  const scopedCaptainPointsHistory = captainPointsHistory.filter((row) =>
    scopedEventNumbers.has(row.eventNumber),
  );

  const completedPhases = (() => {
    const maxByPhase = new Map<number, number>();
    for (const event of eventMeta) {
      maxByPhase.set(event.phase, Math.max(maxByPhase.get(event.phase) ?? 0, event.eventNumber));
    }
    if (windowThroughEvent === null) return [];
    return [...maxByPhase.entries()]
      .filter(([, maxEvent]) => maxEvent <= windowThroughEvent)
      .map(([phase]) => phase);
  })();

  const squadIntelByEvent =
    windowThroughEvent !== null && !season.state.includes("archived-summary")
      ? await loadSquadIntelThrough(season.id, windowThroughEvent)
      : [];

  const insights =
    windowThroughEvent !== null
      ? computeLeagueInsights(displayEntries, scopedResults, windowThroughEvent, {
          entryMeta,
          captainByEntry,
          captainHistory: scopedCaptainHistory,
          captainPointsHistory: scopedCaptainPointsHistory,
          squadIntelByEvent,
          completedPhases,
        })
      : null;

  const standingsRaw =
    windowThroughEvent !== null
      ? computeStandings(displayEntries, scopedResults, windowThroughEvent)
      : [];
  const standings = standingsRaw.map((row) => ({
    ...row,
    gwVsAverage:
      insights?.leagueAverageGw != null
        ? Math.round((row.eventNetPoints - insights.leagueAverageGw) * 10) / 10
        : null,
  }));

  let mostOwned: MostOwnedPlayer[] | null = null;
  let mostOwnedEvent: number | null = null;
  if (!season.state.includes("archived-summary")) {
    const intel = await loadMostOwnedIntel(season.id, {
      preferredEvent: selectedEvent ?? liveEvent ?? currentEvent,
      limit: MOST_OWNED_PUBLIC_LIMIT,
    });
    if (intel) {
      mostOwned = intel.players;
      mostOwnedEvent = intel.eventNumber;
    }
  }

  const gwCard =
    selectedEvent !== null
      ? toCard(gameweekWinner(displayResults, selectedEvent), { eventNumber: selectedEvent })
      : null;

  const selectedPhase =
    selectedEvent !== null ? phaseByEvent.get(selectedEvent)?.phase ?? 1 : null;
  const monthlyCard =
    selectedPhase !== null && selectedEvent !== null
      ? toCard(monthlyWinner(displayResults, selectedPhase), {
          phase: selectedPhase,
          phaseName: phaseByEvent.get(selectedEvent)?.phaseName ?? null,
        })
      : null;

  const dataMode: LeagueOverview["dataMode"] =
    season.state === "archived" || season.state === "archived-summary"
      ? "archived"
      : latestFinishedEvent === null
        ? "preseason"
        : "live";

  return {
    league: { slug: league.slug, name: league.name, visibility: league.visibility },
    seasonName: season.name,
    seasonState: season.state,
    isSummaryArchive: season.state === "archived-summary",
    isReconstructedArchive: season.providerId === RECONSTRUCTED_SEASON_PROVIDER_ID,
    registeredManagers: displayEntries.length,
    latestFinishedEvent,
    liveEvent,
    isLiveGameweek,
    currentEvent,
    nextEvent,
    selectedEvent,
    finishedEvents: selectableEvents,
    standings,
    managers: displayEntries.map((entry) => ({
      entryId: entry.entryId,
      managerName: entry.managerName,
      teamName: entry.teamName,
    })),
    entryIntel,
    mostOwned,
    mostOwnedEvent,
    gameweekWinner: gwCard,
    monthlyLeader: monthlyCard,
    insights,
    seasonWindow,
    seasonWindowOptions,
    lastSync,
    dataMode,
  };
}

async function resolveSeason(
  leagueId: string,
  options: LeagueOverviewOptions,
) {
  const ARCHIVED_STATES = ["archived", "archived-summary"] as const;
  if (options.seasonName) {
    const name = options.seasonName.includes("/")
      ? options.seasonName
      : seasonNameFromSlug(options.seasonName);
    const season = await db.query.seasons.findFirst({
      where: eq(seasons.name, name),
    });
    if (!season) return null;
    if (options.archivedOnly && !ARCHIVED_STATES.includes(season.state as (typeof ARCHIVED_STATES)[number])) {
      return null;
    }
    if (options.archivedOnly && !isVerifiedSummaryArchive(season)) {
      return null;
    }
    const hasEntries = await db.query.seasonEntries.findFirst({
      where: and(
        eq(seasonEntries.leagueId, leagueId),
        eq(seasonEntries.seasonId, season.id),
      ),
    });
    return hasEntries ? season : null;
  }

  if (options.archivedOnly) {
    const archived = await db
      .select({ season: seasons })
      .from(seasons)
      .innerJoin(seasonEntries, eq(seasonEntries.seasonId, seasons.id))
      .where(
        and(
          eq(seasonEntries.leagueId, leagueId),
          inArray(seasons.state, [...ARCHIVED_STATES]),
        ),
      )
      .orderBy(desc(seasons.name))
      .limit(1);
    return archived[0]?.season ?? null;
  }

  const active = await db.query.seasons.findFirst({
    where: eq(seasons.state, "active"),
    orderBy: desc(seasons.name),
  });
  if (active) {
    const hasEntries = await db.query.seasonEntries.findFirst({
      where: and(
        eq(seasonEntries.leagueId, leagueId),
        eq(seasonEntries.seasonId, active.id),
      ),
    });
    if (hasEntries) return active;
  }

  const fallback = await db
    .select({ season: seasons })
    .from(seasons)
    .innerJoin(seasonEntries, eq(seasonEntries.seasonId, seasons.id))
    .where(eq(seasonEntries.leagueId, leagueId))
    .orderBy(desc(seasons.name))
    .limit(1);
  return fallback[0]?.season ?? null;
}

function isVerifiedSummaryArchive(season: {
  state: string;
  providerId: string | null;
}): boolean {
  if (season.state !== "archived-summary") return true;
  if (season.providerId === RECONSTRUCTED_SEASON_PROVIDER_ID) return true;
  const verifiedIds = new Set(leagueHistoryProviderIds().values());
  if (verifiedIds.size === 0) return false;
  return season.providerId !== null && verifiedIds.has(season.providerId);
}
