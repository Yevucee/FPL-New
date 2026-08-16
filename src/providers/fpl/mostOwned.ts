export interface MostOwnedPlayer {
  elementId: number;
  webName: string;
  ownerCount: number;
  ownerPct: number;
}

/** Count how many squads include each player (all 15 picks). */
export function computeMostOwned(
  squads: ReadonlyArray<ReadonlyArray<number>>,
  playerNames: ReadonlyMap<number, string>,
  limit?: number,
): MostOwnedPlayer[] {
  if (squads.length === 0) return [];
  const counts = new Map<number, number>();
  for (const squad of squads) {
    for (const elementId of squad) {
      counts.set(elementId, (counts.get(elementId) ?? 0) + 1);
    }
  }

  const total = squads.length;
  const ranked = [...counts.entries()]
    .map(([elementId, ownerCount]) => ({
      elementId,
      webName: playerNames.get(elementId) ?? `Player ${elementId}`,
      ownerCount,
      ownerPct: Math.round((ownerCount / total) * 1000) / 10,
    }))
    .sort((a, b) => b.ownerCount - a.ownerCount || a.webName.localeCompare(b.webName));

  return limit === undefined ? ranked : ranked.slice(0, limit);
}

export function filterDifferentials(
  players: readonly MostOwnedPlayer[],
  maxOwners: number,
  limit: number,
): MostOwnedPlayer[] {
  return players
    .filter((player) => player.ownerCount > 0 && player.ownerCount <= maxOwners)
    .sort(
      (a, b) =>
        a.ownerCount - b.ownerCount ||
        b.ownerPct - a.ownerPct ||
        a.webName.localeCompare(b.webName),
    )
    .slice(0, limit);
}
