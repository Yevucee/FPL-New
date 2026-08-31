import type { ResultInput } from "@/metrics/types";
import type { LiveLeagueScore } from "@/providers/fpl/client";
import {
  benchPointsFromPicks,
  fetchEntryPicks,
  scoreFromPicks,
  sleep,
} from "@/providers/fpl/client";

/** Overlay live GW scores from the FPL league standings endpoint onto stored results. */
export function overlayLiveGameweekScores(
  results: ReadonlyArray<ResultInput>,
  eventNumber: number,
  providerToEntryId: ReadonlyMap<string, string>,
  liveScores: ReadonlyMap<string, LiveLeagueScore>,
  phaseByEvent: ReadonlyMap<number, number>,
): ResultInput[] {
  const patched = [...results];

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
  const patched = [...results];
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
