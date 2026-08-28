import { plannerEntryConfigured, plannerEntryId } from "@/lib/plannerConfig";
import { buildElementCatalog, buildFixturesByTeam } from "@/planner/elementCatalog";
import { enrichSquadPlayers } from "@/planner/enrichSquad";
import { picksToSquadPlayers, pointsByElementFromPicks } from "@/planner/squadImport";
import type { EnrichedSquadPlayer, PlannerElement, PlannerFixture, SquadPlayer } from "@/planner/types";
import {
  fetchBootstrap,
  fetchEntryPicks,
  fetchEntryProfile,
  fetchFixtures,
  latestLockedEvent,
} from "@/providers/fpl/client";

export interface PlannerTeamPayload {
  configured: boolean;
  entryId: string | null;
  managerName: string | null;
  teamName: string | null;
  lockedEvent: number | null;
  selectedEvent: number;
  availableEvents: number[];
  squad: EnrichedSquadPlayer[];
  isImportedPick: boolean;
  catalogJson: Record<number, PlannerElement>;
  fixturesByTeamJson: Record<number, PlannerFixture[]>;
}

const FUTURE_GW_LOOKAHEAD = 5;

export async function getPlannerTeamPayload(
  selectedEvent?: number,
): Promise<PlannerTeamPayload | null> {
  if (!plannerEntryConfigured()) return null;

  const entryId = plannerEntryId()!;
  const [bootstrap, fixtures, profile] = await Promise.all([
    fetchBootstrap(),
    fetchFixtures(),
    fetchEntryProfile(entryId),
  ]);

  const lockedEvent = latestLockedEvent(bootstrap.events);
  if (lockedEvent === null) return null;

  const maxEvent = Math.max(
    ...bootstrap.events.map((event) => event.id),
    lockedEvent + FUTURE_GW_LOOKAHEAD,
  );
  const availableEvents = Array.from(
    { length: Math.min(FUTURE_GW_LOOKAHEAD + 1, maxEvent - lockedEvent + 1) },
    (_, index) => lockedEvent + index,
  );

  const eventNumber =
    selectedEvent && availableEvents.includes(selectedEvent)
      ? selectedEvent
      : lockedEvent;

  const catalog = buildElementCatalog(bootstrap.elements, bootstrap.teams);
  const fixturesByTeam = buildFixturesByTeam(fixtures, bootstrap.teams, eventNumber);

  let squadPlayers: SquadPlayer[] = [];
  let pointsByElement = new Map<number, number | null>();
  let isImportedPick = false;

  if (eventNumber <= lockedEvent) {
    const picksResponse = await fetchEntryPicks(entryId, eventNumber);
    if (picksResponse?.picks?.length) {
      squadPlayers = picksToSquadPlayers(picksResponse.picks);
      pointsByElement = pointsByElementFromPicks(picksResponse.picks);
      isImportedPick = true;
    }
  }

  if (squadPlayers.length === 0) {
    const fallbackPicks = await fetchEntryPicks(entryId, lockedEvent);
    if (fallbackPicks?.picks?.length) {
      squadPlayers = picksToSquadPlayers(fallbackPicks.picks);
      pointsByElement = pointsByElementFromPicks(fallbackPicks.picks);
    }
  }

  const squad = enrichSquadPlayers({
    players: squadPlayers,
    catalog,
    fixturesByTeam,
    fromEvent: eventNumber,
    pointsByElement,
    fixtureCount: 5,
  });

  const catalogJson = Object.fromEntries(catalog.entries());
  const fixturesByTeamJson = Object.fromEntries(fixturesByTeam.entries());

  return {
    configured: true,
    entryId,
    managerName: profile.managerName,
    teamName: profile.teamName,
    lockedEvent,
    selectedEvent: eventNumber,
    availableEvents,
    squad,
    isImportedPick,
    catalogJson,
    fixturesByTeamJson,
  };
}

/** Serializable squad for client draft persistence. */
export type SerializableSquadPlayer = SquadPlayer;

export function serializeSquad(players: ReadonlyArray<SquadPlayer>): SerializableSquadPlayer[] {
  return players.map((player) => ({ ...player }));
}
