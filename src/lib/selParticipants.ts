import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import { leagues, seasonEntries, seasons } from "@/db/schema";
import { leagueConfig } from "@/lib/leagueConfig";
import { leagueHistoryProviderIds } from "@/lib/leagueHistoryConfig";
import { firstSeasonJoinerIds } from "@/lib/selFirstSeasonMembers";
import { baseHistoricalParticipantIds } from "@/lib/selHistoricalMembers";
import { fetchAllLeagueMembers } from "@/providers/fpl/client";

/** Former members and manual overlays — always eligible for reconstruction. */
export { baseHistoricalParticipantIds } from "@/lib/selHistoricalMembers";

/** Entry IDs from official past-league archives in Postgres. */
export async function officialArchiveParticipantIds(leagueDbId: string): Promise<Set<string>> {
  const historyIds = [...leagueHistoryProviderIds().values()];
  if (historyIds.length === 0) return new Set();

  const rows = await db
    .select({ providerEntryId: seasonEntries.providerEntryId })
    .from(seasonEntries)
    .innerJoin(seasons, eq(seasons.id, seasonEntries.seasonId))
    .where(
      and(
        eq(seasonEntries.leagueId, leagueDbId),
        inArray(seasons.providerId, historyIds),
      ),
    );

  return new Set(rows.map((row) => row.providerEntryId));
}

/**
 * Managers who may appear in reconstructed SEL seasons.
 * Uses official past-league rosters plus configured former members — not every
 * current league member (first-time joiners are excluded).
 */
export async function eligibleReconstructionMemberIds(
  leagueDbId?: string,
): Promise<Set<string>> {
  const ids = baseHistoricalParticipantIds();

  if (!leagueDbId) {
    const league = await db.query.leagues.findFirst({
      where: eq(leagues.slug, leagueConfig.slug),
    });
    if (!league) return ids;
    leagueDbId = league.id;
  }

  const official = await officialArchiveParticipantIds(leagueDbId);
  for (const id of official) {
    ids.add(id);
  }
  return ids;
}

/** When official archives are unavailable, use current league members minus first-season joiners. */
export async function fallbackReconstructionMemberIds(
  currentLeagueId: string,
): Promise<Set<string>> {
  const excluded = firstSeasonJoinerIds();
  const { members } = await fetchAllLeagueMembers(currentLeagueId);
  const ids = new Set<string>();
  for (const member of members) {
    if (!excluded.has(member.entryId)) {
      ids.add(member.entryId);
    }
  }
  for (const id of baseHistoricalParticipantIds()) {
    ids.add(id);
  }
  return ids;
}
