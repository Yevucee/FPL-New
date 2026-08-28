import type { FplPick, FplPicksResponse } from "@/providers/fpl/client";

import type { SquadPlayer } from "./types";

export function picksToSquadPlayers(picks: ReadonlyArray<FplPick>): SquadPlayer[] {
  return picks.map((pick) => ({
    elementId: pick.element,
    slot: pick.position,
    isStarter: pick.position <= 11,
    isCaptain: pick.is_captain,
    isViceCaptain: pick.is_vice_captain,
  }));
}

export function squadFromPicksResponse(response: FplPicksResponse): SquadPlayer[] {
  return picksToSquadPlayers(response.picks);
}

export function pointsByElementFromPicks(
  picks: ReadonlyArray<{ element: number; stats?: { total_points?: number } }>,
): Map<number, number | null> {
  const map = new Map<number, number | null>();
  for (const pick of picks) {
    map.set(pick.element, pick.stats?.total_points ?? null);
  }
  return map;
}
