import { computeRivalryStats, type RivalryStats } from "@/metrics/rivalry";
import { filterResultsForWindow } from "@/lib/seasonWindow";
import { getLeagueOverview } from "@/server/leagueData";
import { loadSquadIntelThrough } from "@/server/eventIntelData";

export interface RivalryOverview {
  league: Awaited<ReturnType<typeof getLeagueOverview>>;
  rivalry: RivalryStats | null;
  entryA: string | null;
  entryB: string | null;
}

export async function getRivalryOverview(options: {
  entryA?: string;
  entryB?: string;
  throughEvent?: number;
  window?: string;
}): Promise<RivalryOverview> {
  const league = await getLeagueOverview({
    throughEvent: options.throughEvent,
    window: options.window,
  });

  const entryA = options.entryA ?? null;
  const entryB = options.entryB ?? null;
  if (
    !entryA ||
    !entryB ||
    entryA === entryB ||
    league.selectedEvent === null ||
    league.managers.length === 0
  ) {
    return { league, rivalry: null, entryA, entryB };
  }

  const entries = league.managers.map((manager) => ({
    entryId: manager.entryId,
    managerName: manager.managerName,
    teamName: manager.teamName,
    joinEvent: 1,
  }));

  const resultRows = await loadResultsForRivalry(league.seasonName);
  if (!resultRows) {
    return { league, rivalry: null, entryA, entryB };
  }

  const scopedResults = filterResultsForWindow(
    resultRows.results,
    league.selectedEvent,
    league.seasonWindow,
  );

  const squadIntelByEvent = await loadSquadIntelForSeason(league.seasonName, league.selectedEvent);

  const rivalry = computeRivalryStats(entryA, entryB, entries, scopedResults, league.selectedEvent, {
    captainHistory: resultRows.captainHistory.filter((row) =>
      scopedResults.some((result) => result.eventNumber === row.eventNumber),
    ),
    squadIntelByEvent,
  });

  return { league, rivalry, entryA, entryB };
}

async function loadSquadIntelForSeason(seasonName: string | null, throughEvent: number) {
  if (!seasonName) return [];
  const { db } = await import("@/db/client");
  const { seasons } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const season = await db.query.seasons.findFirst({ where: eq(seasons.name, seasonName) });
  if (!season) return [];
  return loadSquadIntelThrough(season.id, throughEvent);
}

async function loadResultsForRivalry(seasonName: string | null) {
  if (!seasonName) return null;
  const { db } = await import("@/db/client");
  const { entryEventResults, events, seasonEntries, seasons, leagues, managers } = await import(
    "@/db/schema"
  );
  const { and, eq } = await import("drizzle-orm");
  const { leagueConfig } = await import("@/lib/leagueConfig");

  const league = await db.query.leagues.findFirst({
    where: eq(leagues.slug, leagueConfig.slug),
  });
  const season = await db.query.seasons.findFirst({ where: eq(seasons.name, seasonName) });
  if (!league || !season) return null;

  const eventRows = await db
    .select()
    .from(events)
    .where(eq(events.seasonId, season.id))
    .orderBy(events.eventNumber);
  const phaseByEvent = new Map(eventRows.map((event) => [event.eventNumber, event.phase]));

  const resultRows = await db
    .select({
      entryId: entryEventResults.seasonEntryId,
      eventNumber: events.eventNumber,
      netPoints: entryEventResults.netPoints,
      grossPoints: entryEventResults.grossPoints,
      transferCost: entryEventResults.transferCost,
      benchPoints: entryEventResults.benchPoints,
      chip: entryEventResults.chip,
      captainName: entryEventResults.captainName,
      captainPoints: entryEventResults.captainPoints,
    })
    .from(entryEventResults)
    .innerJoin(events, eq(events.id, entryEventResults.eventId))
    .where(eq(events.seasonId, season.id));

  return {
    results: resultRows.map((row) => ({
      entryId: row.entryId,
      eventNumber: row.eventNumber,
      phase: phaseByEvent.get(row.eventNumber) ?? 1,
      netPoints: row.netPoints,
      grossPoints: row.grossPoints,
      transferCost: row.transferCost,
      benchPoints: row.benchPoints,
      chip: row.chip,
    })),
    captainHistory: resultRows
      .filter((row) => row.captainName)
      .map((row) => ({
        entryId: row.entryId,
        eventNumber: row.eventNumber,
        captainName: row.captainName!,
      })),
  };
}
