import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  entryEventResults,
  events,
  leagues,
  managers,
  seasonEntries,
  seasons,
} from "@/db/schema";
import { leagueConfig } from "@/lib/leagueConfig";
import {
  DIFFERENTIAL_MAX_OWNERS,
  DIFFERENTIAL_PLANNER_LIMIT,
  MOST_OWNED_PLANNER_LIMIT,
} from "@/lib/mostOwnedLimits";
import { formatChipName, SEASON_CHIP_TYPES, type SeasonChipType } from "@/lib/chipLabels";
import { loadMostOwnedIntel } from "@/server/eventIntelData";
import { filterDifferentials } from "@/providers/fpl/mostOwned";
import type { MostOwnedPlayer } from "@/providers/fpl/mostOwned";

export interface ChipPlayRow {
  managerName: string;
  teamName: string;
  eventNumber: number;
  chip: string;
  chipLabel: string;
}

export interface ChipStatusRow {
  managerName: string;
  teamName: string;
  used: Partial<Record<SeasonChipType, number>>;
  remaining: SeasonChipType[];
}

export interface CaptainPickRow {
  managerName: string;
  teamName: string;
  captainName: string | null;
  captainPoints: number | null;
}

export interface PlannerOverview {
  seasonName: string | null;
  eventNumber: number | null;
  managerCount: number;
  mostOwned: MostOwnedPlayer[];
  differentials: MostOwnedPlayer[];
  chipsPlayed: ChipPlayRow[];
  chipStatus: ChipStatusRow[];
  captainPicks: CaptainPickRow[];
}

export async function getPlannerOverview(): Promise<PlannerOverview | null> {
  const leagueRow = await db.query.leagues.findFirst({
    where: eq(leagues.slug, leagueConfig.slug),
  });
  if (!leagueRow) return null;

  const season = await db.query.seasons.findFirst({
    where: eq(seasons.state, "active"),
  });
  if (!season) return null;

  const entries = await db
    .select({
      entryId: seasonEntries.id,
      managerName: managers.displayName,
      teamName: seasonEntries.teamName,
    })
    .from(seasonEntries)
    .innerJoin(managers, eq(managers.id, seasonEntries.managerId))
    .where(
      and(eq(seasonEntries.leagueId, leagueRow.id), eq(seasonEntries.seasonId, season.id)),
    );

  if (entries.length === 0) {
    return {
      seasonName: season.name,
      eventNumber: null,
      managerCount: 0,
      mostOwned: [],
      differentials: [],
      chipsPlayed: [],
      chipStatus: [],
      captainPicks: [],
    };
  }

  const eventRows = await db
    .select()
    .from(events)
    .where(eq(events.seasonId, season.id))
    .orderBy(events.eventNumber);

  const finishedEvents = eventRows.filter((ev) => ev.finished && ev.checked);
  const latestEvent =
    finishedEvents.length > 0
      ? Math.max(...finishedEvents.map((ev) => ev.eventNumber))
      : null;

  let mostOwned: MostOwnedPlayer[] = [];
  let differentials: MostOwnedPlayer[] = [];
  const fullIntel = await loadMostOwnedIntel(season.id, { preferredEvent: latestEvent });
  if (fullIntel) {
    mostOwned = fullIntel.players.slice(0, MOST_OWNED_PLANNER_LIMIT);
    differentials = filterDifferentials(
      fullIntel.players,
      DIFFERENTIAL_MAX_OWNERS,
      DIFFERENTIAL_PLANNER_LIMIT,
    );
  }

  const resultRows = await db
    .select({
      managerName: managers.displayName,
      teamName: seasonEntries.teamName,
      eventNumber: events.eventNumber,
      chip: entryEventResults.chip,
      captainName: entryEventResults.captainName,
      captainPoints: entryEventResults.captainPoints,
    })
    .from(entryEventResults)
    .innerJoin(seasonEntries, eq(seasonEntries.id, entryEventResults.seasonEntryId))
    .innerJoin(managers, eq(managers.id, seasonEntries.managerId))
    .innerJoin(events, eq(events.id, entryEventResults.eventId))
    .where(eq(events.seasonId, season.id));

  const chipsPlayed: ChipPlayRow[] = resultRows
    .filter((row) => row.chip)
    .map((row) => ({
      managerName: row.managerName,
      teamName: row.teamName,
      eventNumber: row.eventNumber,
      chip: row.chip!,
      chipLabel: formatChipName(row.chip!),
    }))
    .sort((a, b) => b.eventNumber - a.eventNumber);

  const usedByManager = new Map<string, Partial<Record<SeasonChipType, number>>>();
  for (const row of chipsPlayed) {
    const chipKey = row.chip.toLowerCase() as SeasonChipType;
    if (!SEASON_CHIP_TYPES.includes(chipKey)) continue;
    const existing = usedByManager.get(row.managerName) ?? {};
    existing[chipKey] = row.eventNumber;
    usedByManager.set(row.managerName, existing);
  }

  const chipStatus: ChipStatusRow[] = entries.map((entry) => {
    const used = usedByManager.get(entry.managerName) ?? {};
    const remaining = SEASON_CHIP_TYPES.filter((chip) => used[chip] === undefined);
    return {
      managerName: entry.managerName,
      teamName: entry.teamName,
      used,
      remaining,
    };
  });

  const snapshotEvent = fullIntel?.eventNumber ?? latestEvent;

  const captainPicks: CaptainPickRow[] =
    snapshotEvent === null
      ? []
      : resultRows
          .filter((row) => row.eventNumber === snapshotEvent)
          .map((row) => ({
            managerName: row.managerName,
            teamName: row.teamName,
            captainName: row.captainName,
            captainPoints: row.captainPoints,
          }))
          .sort((a, b) => (b.captainPoints ?? 0) - (a.captainPoints ?? 0));

  return {
    seasonName: season.name,
    eventNumber: snapshotEvent,
    managerCount: entries.length,
    mostOwned,
    differentials,
    chipsPlayed,
    chipStatus,
    captainPicks,
  };
}
