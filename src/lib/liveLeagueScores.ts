import type { ResultInput, StandingRow } from "@/metrics/types";
import type { LiveLeagueScore } from "@/providers/fpl/client";
import {
  benchPointsFromPicks,
  fetchEntryPicks,
  scoreFromPicks,
  sleep,
} from "@/providers/fpl/client";

/** Keep one row per manager per GW — live overlay + DB import can otherwise double-count. */
export function dedupeResultsByEntryEvent(
  results: ReadonlyArray<ResultInput>,
): ResultInput[] {
  const byKey = new Map<string, ResultInput>();
  for (const row of results) {
    byKey.set(`${row.entryId}:${row.eventNumber}`, row);
  }
  return [...byKey.values()];
}

/** Overlay live GW scores from the FPL league standings endpoint onto stored results. */
export function overlayLiveGameweekScores(
  results: ReadonlyArray<ResultInput>,
  eventNumber: number,
  providerToEntryId: ReadonlyMap<string, string>,
  liveScores: ReadonlyMap<string, LiveLeagueScore>,
  phaseByEvent: ReadonlyMap<number, number>,
): ResultInput[] {
  const patched = dedupeResultsByEntryEvent(results);

  for (const [providerEntryId, live] of liveScores) {
    const entryId = providerToEntryId.get(providerEntryId);
    if (!entryId) continue;

    const index = patched.findIndex(
      (row) => row.entryId === entryId && row.eventNumber === eventNumber,
    );
    const previous = index >= 0 ? patched[index]! : null;
    const transferCost = previous?.transferCost ?? 0;
    const liveResult: ResultInput = {
      entryId,
      eventNumber,
      phase: previous?.phase ?? phaseByEvent.get(eventNumber) ?? 1,
      netPoints: live.eventTotal,
      grossPoints: live.eventTotal + transferCost,
      transferCost,
      benchPoints: previous?.benchPoints ?? 0,
      benchBoostPoints: previous?.benchBoostPoints ?? null,
      chip: previous?.chip ?? null,
    };

    if (index >= 0) {
      patched[index] = liveResult;
    } else {
      patched.push(liveResult);
    }
  }

  return patched;
}

/** Recompute GW scores for Bench Boost managers from live picks (FPL league totals omit bench during live GWs). */
export async function correctBenchBoostLiveScores(
  results: ReadonlyArray<ResultInput>,
  eventNumber: number,
  entries: ReadonlyArray<{ entryId: string; providerEntryId: string }>,
  livePoints: ReadonlyMap<number, number>,
): Promise<ResultInput[]> {
  const patched = dedupeResultsByEntryEvent(results);
  const providerByEntryId = new Map(entries.map((row) => [row.entryId, row.providerEntryId]));

  const candidateIds = patched
    .filter(
      (row) =>
        row.eventNumber === eventNumber &&
        (row.chip ?? "").toLowerCase() === "bboost",
    )
    .map((row) => row.entryId);

  let fetched = 0;
  for (const entryId of candidateIds) {
    const providerEntryId = providerByEntryId.get(entryId);
    if (!providerEntryId) continue;

    if (fetched > 0) await sleep(120);
    fetched += 1;

    const picksResponse = await fetchEntryPicks(providerEntryId, eventNumber);
    if (!picksResponse?.picks.length) continue;

    const chip = (picksResponse.active_chip ?? "bboost").toLowerCase();
    if (chip !== "bboost") continue;

    const grossScore = scoreFromPicks(picksResponse.picks, livePoints);
    const index = patched.findIndex(
      (row) => row.entryId === entryId && row.eventNumber === eventNumber,
    );
    const previous = index >= 0 ? patched[index]! : null;
    const transferCost = previous?.transferCost ?? 0;
    const benchBoostPoints = benchPointsFromPicks(picksResponse.picks, livePoints);
    const netPoints = grossScore - transferCost;

    const updated: ResultInput = {
      entryId,
      eventNumber,
      phase: previous?.phase ?? 1,
      netPoints,
      grossPoints: grossScore,
      transferCost,
      benchPoints: 0,
      benchBoostPoints,
      chip: "bboost",
    };

    if (index >= 0) patched[index] = updated;
    else patched.push(updated);
  }

  return patched;
}

/** Use FPL league totals during an open GW so season points match the official mini-league table. */
export function applyLiveStandingsTotals(
  standings: ReadonlyArray<StandingRow>,
  entryRows: ReadonlyArray<{ entryId: string; providerEntryId: string }>,
  liveScores: ReadonlyMap<string, LiveLeagueScore>,
): StandingRow[] {
  const providerByEntryId = new Map(
    entryRows.map((row) => [row.entryId, row.providerEntryId]),
  );

  const patched = standings.map((row) => {
    const providerEntryId = providerByEntryId.get(row.entryId);
    if (!providerEntryId) return row;
    const live = liveScores.get(providerEntryId);
    if (!live) return row;
    return {
      ...row,
      eventNetPoints: live.eventTotal,
      totalNetPoints: live.total,
    };
  });

  const ordered = [...patched].sort(
    (a, b) =>
      b.totalNetPoints - a.totalNetPoints ||
      a.managerName.localeCompare(b.managerName),
  );

  const leaderTotal = ordered[0]?.totalNetPoints ?? 0;
  const previousRankById = new Map(standings.map((row) => [row.entryId, row.previousRank]));

  let rank = 0;
  let lastTotal: number | null = null;
  return ordered.map((row, index) => {
    if (lastTotal === null || row.totalNetPoints !== lastTotal) {
      rank = index + 1;
      lastTotal = row.totalNetPoints;
    }
    const above = index > 0 ? ordered[index - 1]! : null;
    const previousRank = previousRankById.get(row.entryId) ?? null;
    return {
      ...row,
      rank,
      previousRank,
      rankMovement: previousRank === null ? null : previousRank - rank,
      gapToLeader: leaderTotal - row.totalNetPoints,
      gapToAbove: above ? above.totalNetPoints - row.totalNetPoints : 0,
    };
  });
}
