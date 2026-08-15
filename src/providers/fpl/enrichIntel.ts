import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  entryEventResults,
  eventIntel,
  events,
  leagues,
  seasonEntries,
  seasons,
} from "@/db/schema";
import { leagueConfig, leagueProviderIdOrThrow } from "@/lib/leagueConfig";

import {
  fetchAllLeagueMembers,
  fetchBootstrap,
  fetchEntryPicks,
  latestLockedEvent,
  playerNameMap,
  sleep,
  type FplPickWithStats,
} from "./client";
import { computeMostOwned } from "./mostOwned";

export interface EnrichIntelResult {
  eventNumber: number | null;
  managersFetched: number;
  skipped: boolean;
  reason?: string;
}

function captainFromPicks(
  picks: ReadonlyArray<FplPickWithStats>,
  playerNames: ReadonlyMap<number, string>,
): { name: string | null; points: number | null } {
  const captain = picks.find((p) => p.is_captain);
  if (!captain) return { name: null, points: null };
  return {
    name: playerNames.get(captain.element) ?? null,
    points: captain.stats?.total_points ?? null,
  };
}

/**
 * Fetch squad picks after the GW deadline (rate-limited) to populate captain
 * choices and most-owned players for one locked gameweek.
 */
export async function enrichLeagueIntel(
  leagueId = leagueProviderIdOrThrow(),
  options: { forceEvent?: number; force?: boolean } = {},
): Promise<EnrichIntelResult> {
  const bootstrap = await fetchBootstrap();
  const eventNumber =
    options.forceEvent ?? latestLockedEvent(bootstrap.events);
  if (eventNumber === null) {
    return { eventNumber: null, managersFetched: 0, skipped: true, reason: "no locked gameweek" };
  }

  const league = await db.query.leagues.findFirst({
    where: eq(leagues.slug, leagueConfig.slug),
  });
  if (!league) {
    return { eventNumber, managersFetched: 0, skipped: true, reason: "league not in db" };
  }

  const season = await db.query.seasons.findFirst({
    where: eq(seasons.state, "active"),
  });
  if (!season) {
    return { eventNumber, managersFetched: 0, skipped: true, reason: "no active season" };
  }

  if (!options.force) {
    const existing = await db.query.eventIntel.findFirst({
      where: and(eq(eventIntel.seasonId, season.id), eq(eventIntel.eventNumber, eventNumber)),
    });
    if (existing) {
      return {
        eventNumber,
        managersFetched: 0,
        skipped: true,
        reason: "already enriched",
      };
    }
  }

  const { members } = await fetchAllLeagueMembers(leagueId);
  const playerNames = playerNameMap(bootstrap.elements);
  const squads: number[][] = [];
  let fetched = 0;

  const eventRow = await db.query.events.findFirst({
    where: and(eq(events.seasonId, season.id), eq(events.eventNumber, eventNumber)),
  });
  if (!eventRow) {
    return { eventNumber, managersFetched: 0, skipped: true, reason: "event not in db" };
  }

  for (const [index, member] of members.entries()) {
    if (index > 0) await sleep(150);
    const picksResponse = await fetchEntryPicks(member.entryId, eventNumber);
    if (!picksResponse) continue;
    fetched += 1;
    squads.push(picksResponse.picks.map((p) => p.element));

    const entryRow = await db.query.seasonEntries.findFirst({
      where: and(
        eq(seasonEntries.seasonId, season.id),
        eq(seasonEntries.providerEntryId, member.entryId),
      ),
    });
    if (!entryRow) continue;

    const { name, points } = captainFromPicks(picksResponse.picks, playerNames);
    await db
      .update(entryEventResults)
      .set({ captainName: name, captainPoints: points })
      .where(
        and(
          eq(entryEventResults.seasonEntryId, entryRow.id),
          eq(entryEventResults.eventId, eventRow.id),
        ),
      );
  }

  const mostOwned = computeMostOwned(squads, playerNames);
  await db
    .insert(eventIntel)
    .values({
      seasonId: season.id,
      eventNumber,
      mostOwned,
      fetchedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [eventIntel.seasonId, eventIntel.eventNumber],
      set: { mostOwned, fetchedAt: new Date() },
    });

  return { eventNumber, managersFetched: fetched, skipped: false };
}
