import { and, desc, eq, lte } from "drizzle-orm";

import { db } from "@/db/client";
import { eventIntel } from "@/db/schema";
import type { EventSquadIntel } from "@/metrics/squadOverlap";
import type { MostOwnedPlayer } from "@/providers/fpl/mostOwned";

export interface MostOwnedIntel {
  players: MostOwnedPlayer[];
  eventNumber: number;
}

/**
 * Load the most-owned squad snapshot for a season.
 * Prefers the requested gameweek; falls back to the latest stored intel row.
 */
export async function loadMostOwnedIntel(
  seasonId: string,
  options: { preferredEvent?: number | null; limit?: number } = {},
): Promise<MostOwnedIntel | null> {
  const row = await findMostOwnedIntelRow(seasonId, options.preferredEvent);
  if (!row?.mostOwned?.length) {
    return null;
  }

  const players =
    options.limit != null
      ? row.mostOwned.slice(0, options.limit)
      : row.mostOwned;

  return {
    players,
    eventNumber: row.eventNumber,
  };
}

async function findMostOwnedIntelRow(
  seasonId: string,
  preferredEvent?: number | null,
) {
  if (preferredEvent != null) {
    const preferred = await db.query.eventIntel.findFirst({
      where: and(
        eq(eventIntel.seasonId, seasonId),
        eq(eventIntel.eventNumber, preferredEvent),
      ),
    });
    if (preferred?.mostOwned?.length) {
      return preferred;
    }
  }

  const [latest] = await db
    .select()
    .from(eventIntel)
    .where(eq(eventIntel.seasonId, seasonId))
    .orderBy(desc(eventIntel.eventNumber))
    .limit(1);

  return latest?.mostOwned?.length ? latest : null;
}

/** Squad snapshots + most-owned for template/contrarian stats through a gameweek. */
export async function loadSquadIntelThrough(
  seasonId: string,
  throughEvent: number,
): Promise<EventSquadIntel[]> {
  const rows = await db
    .select({
      eventNumber: eventIntel.eventNumber,
      mostOwned: eventIntel.mostOwned,
      entrySquads: eventIntel.entrySquads,
    })
    .from(eventIntel)
    .where(and(eq(eventIntel.seasonId, seasonId), lte(eventIntel.eventNumber, throughEvent)))
    .orderBy(eventIntel.eventNumber);

  return rows
    .filter((row) => row.mostOwned?.length && row.entrySquads?.length)
    .map((row) => ({
      eventNumber: row.eventNumber,
      mostOwned: row.mostOwned!,
      squads: row.entrySquads!,
    }));
}
