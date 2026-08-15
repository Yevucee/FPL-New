import champions from "../../data/sel-champions.json";

export interface SelChampionRecord {
  season: string;
  winner: string;
  team?: string;
}

export interface HallOfChampionRow {
  season: string;
  winner: string;
  teamName: string | null;
}

export const selChampions: SelChampionRecord[] = champions;

/** Merge chat-record winners with team names from imported season archives. */
export function hallOfChampions(
  archiveBySeason: ReadonlyMap<
    string,
    { managerName: string; teamName: string } | null | undefined
  >,
): HallOfChampionRow[] {
  return selChampions.map((row) => {
    const archived = archiveBySeason.get(row.season);
    return {
      season: row.season,
      winner: archived?.managerName ?? row.winner,
      teamName: archived?.teamName ?? row.team ?? null,
    };
  });
}

/** Match chat-record first names / partial names to FPL manager display names. */
export function managerMatchesChampion(managerName: string, champion: string): boolean {
  const manager = managerName.trim().toLowerCase();
  const expected = champion.trim().toLowerCase();
  if (!manager || !expected) return false;
  if (manager === expected) return true;
  if (manager.startsWith(expected)) return true;
  if (expected.split(/\s+/).every((part) => manager.includes(part))) return true;
  const managerFirst = manager.split(/\s+/)[0] ?? "";
  const championFirst = expected.split(/\s+/)[0] ?? "";
  return managerFirst.length > 0 && managerFirst === championFirst;
}

export function championForSeason(seasonName: string): SelChampionRecord | undefined {
  return selChampions.find((row) => row.season === seasonName);
}

export function titleCounts(): Array<{ winner: string; titles: number; seasons: string[] }> {
  const counts = new Map<string, { titles: number; seasons: string[] }>();
  for (const row of selChampions) {
    const key = row.winner;
    const existing = counts.get(key) ?? { titles: 0, seasons: [] };
    existing.titles += 1;
    existing.seasons.push(row.season);
    counts.set(key, existing);
  }
  return [...counts.entries()]
    .map(([winner, data]) => ({ winner, ...data }))
    .sort((a, b) => b.titles - a.titles || a.winner.localeCompare(b.winner));
}
