import type { EntryInput, ResultInput, StandingRow } from "./types";

/**
 * League standings (specification sections 5.2 and 6.1).
 *
 * Total points use NET points. Ranks are tie-aware ("1224" style): tied entries
 * share a rank and the next rank skips accordingly. Rank movement compares the
 * current standings to the standings through the previous finalised event.
 */
export function computeStandings(
  entries: ReadonlyArray<EntryInput>,
  results: ReadonlyArray<ResultInput>,
  throughEvent: number,
): StandingRow[] {
  const previousRanks =
    throughEvent > 1
      ? rankMap(entries, results, throughEvent - 1)
      : new Map<string, number>();

  const totals = new Map<string, number>();
  const eventPoints = new Map<string, number>();
  for (const e of entries) {
    totals.set(e.entryId, 0);
    eventPoints.set(e.entryId, 0);
  }
  for (const r of results) {
    if (r.eventNumber > throughEvent) continue;
    totals.set(r.entryId, (totals.get(r.entryId) ?? 0) + r.netPoints);
    if (r.eventNumber === throughEvent) {
      eventPoints.set(r.entryId, r.netPoints);
    }
  }

  const ordered = [...entries]
    .map((e) => ({
      entry: e,
      total: totals.get(e.entryId) ?? 0,
      event: eventPoints.get(e.entryId) ?? 0,
    }))
    .sort((a, b) => b.total - a.total || a.entry.managerName.localeCompare(b.entry.managerName));

  const leaderTotal = ordered.length > 0 ? ordered[0]!.total : 0;

  const rows: StandingRow[] = [];
  let rank = 0;
  let lastTotal: number | null = null;
  ordered.forEach((row, index) => {
    if (lastTotal === null || row.total !== lastTotal) {
      rank = index + 1;
      lastTotal = row.total;
    }
    const previousRank = previousRanks.get(row.entry.entryId) ?? null;
    const above = index > 0 ? ordered[index - 1]! : null;
    rows.push({
      entryId: row.entry.entryId,
      managerName: row.entry.managerName,
      teamName: row.entry.teamName,
      totalNetPoints: row.total,
      eventNetPoints: row.event,
      rank,
      previousRank,
      rankMovement: previousRank === null ? null : previousRank - rank,
      gapToLeader: leaderTotal - row.total,
      gapToAbove: above ? above.total - row.total : 0,
    });
  });

  return rows;
}

function rankMap(
  entries: ReadonlyArray<EntryInput>,
  results: ReadonlyArray<ResultInput>,
  throughEvent: number,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const e of entries) totals.set(e.entryId, 0);
  for (const r of results) {
    if (r.eventNumber > throughEvent) continue;
    totals.set(r.entryId, (totals.get(r.entryId) ?? 0) + r.netPoints);
  }
  const ordered = [...entries]
    .map((e) => ({ id: e.entryId, total: totals.get(e.entryId) ?? 0, name: e.managerName }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  const map = new Map<string, number>();
  let rank = 0;
  let lastTotal: number | null = null;
  ordered.forEach((row, index) => {
    if (lastTotal === null || row.total !== lastTotal) {
      rank = index + 1;
      lastTotal = row.total;
    }
    map.set(row.id, rank);
  });
  return map;
}
