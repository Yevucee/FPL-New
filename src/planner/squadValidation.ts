import type { PlannerElement, PlannerPosition, SquadPlayer } from "./types";

export function positionFromId(id: number): PlannerPosition {
  switch (id) {
    case 1:
      return "GK";
    case 2:
      return "DEF";
    case 3:
      return "MID";
    case 4:
      return "FWD";
    default:
      return "MID";
  }
}

export function countByPosition(
  players: ReadonlyArray<{ element: Pick<PlannerElement, "position"> }>,
): Record<PlannerPosition, number> {
  const counts: Record<PlannerPosition, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const player of players) {
    counts[player.element.position] += 1;
  }
  return counts;
}

export function isValidStartingFormation(
  starters: ReadonlyArray<{ element: Pick<PlannerElement, "position"> }>,
): boolean {
  if (starters.length !== 11) return false;
  const counts = countByPosition(starters);
  return counts.GK === 1 && counts.DEF >= 3 && counts.MID >= 2 && counts.FWD >= 1;
}

export function formationLabel(
  starters: ReadonlyArray<{ element: Pick<PlannerElement, "position"> }>,
): string {
  const counts = countByPosition(starters);
  return `${counts.DEF}-${counts.MID}-${counts.FWD}`;
}

export function sortPlayersBySlot(players: ReadonlyArray<SquadPlayer>): SquadPlayer[] {
  return [...players].sort((a, b) => a.slot - b.slot);
}
