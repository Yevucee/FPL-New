import type { FplPick, FplPicksResponse } from "@/providers/fpl/client";
import type { SquadPlayer } from "@/planner/types";

/** Convert FPL public picks into planner squad slots. Positions 1–11 = starters in FPL. */
export function picksToSquadPlayers(picks: ReadonlyArray<FplPick>): SquadPlayer[] {
  return picks.map((pick) => ({
    elementId: pick.element,
    slot: pick.position,
    isStarter: pick.position <= 11,
    isCaptain: pick.is_captain,
    isViceCaptain: pick.is_vice_captain,
    sellPriceTenths: null,
  }));
}

export function enrichPicksWithPoints(
  picks: ReadonlyArray<{ element: number; stats?: { total_points?: number } }>,
): Map<number, number | null> {
  const map = new Map<number, number | null>();
  for (const p of picks) {
    map.set(p.element, p.stats?.total_points ?? null);
  }
  return map;
}

export function squadFromPicksResponse(response: FplPicksResponse): SquadPlayer[] {
  return picksToSquadPlayers(response.picks);
}
