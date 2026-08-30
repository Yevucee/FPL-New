import type { ResultInput } from "@/metrics/types";
import type { LiveLeagueScore } from "@/providers/fpl/client";

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
