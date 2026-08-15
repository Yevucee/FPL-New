import type { AwardWinner, ResultInput } from "./types";

/**
 * Award calculations (specification sections 6.1 and 12).
 *
 * Rules honoured:
 * - Winners are decided on NET points (after transfer hits), never gross.
 * - Ties default to joint winners; we never invent a single winner.
 * - Only eligible results are passed in (caller filters by join/leave event).
 */

/** Highest net score in a single Gameweek; joint winners by default. */
export function gameweekWinner(
  results: ReadonlyArray<ResultInput>,
  eventNumber: number,
): AwardWinner | null {
  const inEvent = results.filter((r) => r.eventNumber === eventNumber);
  return topByNet(inEvent.map((r) => ({ entryId: r.entryId, net: r.netPoints })));
}

/** Highest sum of net points across every event in a monthly phase. */
export function monthlyWinner(
  results: ReadonlyArray<ResultInput>,
  phase: number,
): AwardWinner | null {
  const totals = new Map<string, number>();
  for (const r of results) {
    if (r.phase !== phase) continue;
    totals.set(r.entryId, (totals.get(r.entryId) ?? 0) + r.netPoints);
  }
  return topByNet(
    [...totals.entries()].map(([entryId, net]) => ({ entryId, net })),
  );
}

/** Wooden spoon: lowest net score in a Gameweek; joint by default. */
export function woodenSpoon(
  results: ReadonlyArray<ResultInput>,
  eventNumber: number,
): AwardWinner | null {
  const inEvent = results.filter((r) => r.eventNumber === eventNumber);
  if (inEvent.length === 0) return null;
  const min = Math.min(...inEvent.map((r) => r.netPoints));
  const entryIds = inEvent.filter((r) => r.netPoints === min).map((r) => r.entryId);
  return { entryIds, value: min, joint: entryIds.length > 1 };
}

function topByNet(
  rows: ReadonlyArray<{ entryId: string; net: number }>,
): AwardWinner | null {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => r.net));
  const entryIds = rows.filter((r) => r.net === max).map((r) => r.entryId);
  return { entryIds, value: max, joint: entryIds.length > 1 };
}
