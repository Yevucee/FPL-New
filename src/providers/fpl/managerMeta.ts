import type { FplEntryHistoryEvent, FplEntryHistoryPast } from "./client";

export interface ManagerFplMeta {
  overallFplRank: number | null;
  careerBestSeason: string | null;
  careerBestPoints: number | null;
  seasonTransfers: number;
}

export function careerBestFromPast(
  past: ReadonlyArray<FplEntryHistoryPast>,
): { seasonName: string; totalPoints: number } | null {
  if (past.length === 0) return null;
  const best = past.reduce((a, b) =>
    a.total_points >= b.total_points ? a : b,
  );
  return { seasonName: best.season_name, totalPoints: best.total_points };
}

export function seasonTransfersFromCurrent(
  rows: ReadonlyArray<FplEntryHistoryEvent>,
): number {
  return rows.reduce((sum, row) => sum + (row.event_transfers ?? 0), 0);
}

export function managerMetaFromHistory(
  history: {
    past: ReadonlyArray<FplEntryHistoryPast>;
    current: ReadonlyArray<FplEntryHistoryEvent>;
  },
  seasonName?: string,
): ManagerFplMeta {
  const careerBest = careerBestFromPast(history.past);
  const seasonRow = seasonName
    ? history.past.find((p) => p.season_name === seasonName)
    : null;
  return {
    overallFplRank: seasonRow?.rank ?? null,
    careerBestSeason: careerBest?.seasonName ?? null,
    careerBestPoints: careerBest?.totalPoints ?? null,
    seasonTransfers: seasonTransfersFromCurrent(history.current),
  };
}
