import type { EnrichedSquadPlayer, PlannerElement, SquadPlayer } from "./types";
import type { PlannerFixture } from "./types";

export function enrichSquadPlayers(args: {
  players: SquadPlayer[];
  catalog: ReadonlyMap<number, PlannerElement>;
  fixturesByTeam: ReadonlyMap<number, PlannerFixture[]>;
  fromEvent: number;
  pointsByElement?: ReadonlyMap<number, number | null>;
  fixtureCount?: number;
}): EnrichedSquadPlayer[] {
  const fixtureCount = args.fixtureCount ?? 5;

  return args.players
    .map((player) => {
      const element = args.catalog.get(player.elementId);
      if (!element) return null;

      const teamFixtures = args.fixturesByTeam.get(element.teamId) ?? [];
      const nextFixtures = teamFixtures
        .filter((fixture) => fixture.eventNumber >= args.fromEvent)
        .slice(0, fixtureCount);

      return {
        ...player,
        element,
        latestPoints: args.pointsByElement?.get(player.elementId) ?? null,
        nextFixtures,
      };
    })
    .filter((player): player is EnrichedSquadPlayer => player !== null)
    .sort((a, b) => a.slot - b.slot);
}

export function swapSquadSlots(
  players: ReadonlyArray<SquadPlayer>,
  draggedElementId: number,
  targetSlot: number,
): SquadPlayer[] | null {
  const dragged = players.find((player) => player.elementId === draggedElementId);
  const target = players.find((player) => player.slot === targetSlot);
  if (!dragged) return null;

  return players.map((player) => {
    if (player.elementId === dragged.elementId) {
      return {
        ...player,
        slot: targetSlot,
        isStarter: targetSlot <= 11,
      };
    }
    if (target && player.elementId === target.elementId) {
      return {
        ...player,
        slot: dragged.slot,
        isStarter: dragged.slot <= 11,
      };
    }
    return player;
  });
}

export function draftStorageKey(eventNumber: number): string {
  return `sel-planner-gw-${eventNumber}`;
}
