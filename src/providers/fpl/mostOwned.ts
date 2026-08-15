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
  limit = 10,
): MostOwnedPlayer[] {
  if (squads.length === 0) return [];
  const counts = new Map<number, number>();
  for (const squad of squads) {
    for (const elementId of squad) {
      counts.set(elementId, (counts.get(elementId) ?? 0) + 1);
    }
  }

  const total = squads.length;
  return [...counts.entries()]
    .map(([elementId, ownerCount]) => ({
      elementId,
      webName: playerNames.get(elementId) ?? `Player ${elementId}`,
      ownerCount,
      ownerPct: Math.round((ownerCount / total) * 1000) / 10,
    }))
    .sort((a, b) => b.ownerCount - a.ownerCount || a.webName.localeCompare(b.webName))
    .slice(0, limit);
}
