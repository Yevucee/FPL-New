import type { EntryInput, ResultInput } from "./types";
import type { EventSquadIntel } from "./squadOverlap";
import { computeStandings } from "./standings";

export interface RivalryManager {
  entryId: string;
  managerName: string;
  teamName: string;
}

export interface RivalryRankPoint {
  eventNumber: number;
  rankA: number;
  rankB: number;
}

export interface RivalryStats {
  managerA: RivalryManager;
  managerB: RivalryManager;
  throughEvent: number;
  gwWinsA: number;
  gwWinsB: number;
  gwTies: number;
  rankTimeline: RivalryRankPoint[];
  templateOverlapPct: number | null;
  sameCaptainWeeks: number;
}

function pairwiseOverlap(starterA: readonly number[], starterB: readonly number[]): number {
  if (starterA.length === 0 || starterB.length === 0) return 0;
  const setB = new Set(starterB);
  const shared = starterA.filter((id) => setB.has(id)).length;
  return Math.round((shared / starterA.length) * 1000) / 10;
}

function averagePairwiseTemplateOverlap(
  entryA: string,
  entryB: string,
  intelByEvent: readonly EventSquadIntel[],
  throughEvent: number,
): number | null {
  let sum = 0;
  let count = 0;
  for (const intel of intelByEvent) {
    if (intel.eventNumber > throughEvent) continue;
    const squadA = intel.squads.find((row) => row.entryId === entryA);
    const squadB = intel.squads.find((row) => row.entryId === entryB);
    if (!squadA || !squadB) continue;
    sum += pairwiseOverlap(squadA.starterIds, squadB.starterIds);
    count += 1;
  }
  if (count === 0) return null;
  return Math.round((sum / count) * 10) / 10;
}

/** Head-to-head stats for two managers through a gameweek. */
export function computeRivalryStats(
  entryA: string,
  entryB: string,
  entries: ReadonlyArray<EntryInput>,
  results: ReadonlyArray<ResultInput>,
  throughEvent: number,
  options: {
    captainHistory?: ReadonlyArray<{
      entryId: string;
      eventNumber: number;
      captainName: string;
    }>;
    squadIntelByEvent?: readonly EventSquadIntel[];
  } = {},
): RivalryStats | null {
  const map = new Map(entries.map((entry) => [entry.entryId, entry]));
  const a = map.get(entryA);
  const b = map.get(entryB);
  if (!a || !b) return null;

  let gwWinsA = 0;
  let gwWinsB = 0;
  let gwTies = 0;
  let sameCaptainWeeks = 0;

  for (let event = 1; event <= throughEvent; event++) {
    const scoreA = results.find((row) => row.entryId === entryA && row.eventNumber === event);
    const scoreB = results.find((row) => row.entryId === entryB && row.eventNumber === event);
    if (!scoreA || !scoreB) continue;

    if (scoreA.netPoints > scoreB.netPoints) gwWinsA += 1;
    else if (scoreB.netPoints > scoreA.netPoints) gwWinsB += 1;
    else gwTies += 1;

    const captainA = options.captainHistory?.find(
      (row) => row.entryId === entryA && row.eventNumber === event,
    )?.captainName;
    const captainB = options.captainHistory?.find(
      (row) => row.entryId === entryB && row.eventNumber === event,
    )?.captainName;
    if (captainA && captainB && captainA === captainB) {
      sameCaptainWeeks += 1;
    }
  }

  const rankTimeline: RivalryRankPoint[] = [];
  for (let event = 1; event <= throughEvent; event++) {
    if (!results.some((row) => row.eventNumber === event)) continue;
    const standings = computeStandings(entries, results, event);
    const rankA = standings.find((row) => row.entryId === entryA)?.rank;
    const rankB = standings.find((row) => row.entryId === entryB)?.rank;
    if (rankA === undefined || rankB === undefined) continue;
    rankTimeline.push({ eventNumber: event, rankA, rankB });
  }

  const templateOverlapPct =
    options.squadIntelByEvent && options.squadIntelByEvent.length > 0
      ? averagePairwiseTemplateOverlap(entryA, entryB, options.squadIntelByEvent, throughEvent)
      : null;

  return {
    managerA: { entryId: a.entryId, managerName: a.managerName, teamName: a.teamName },
    managerB: { entryId: b.entryId, managerName: b.managerName, teamName: b.teamName },
    throughEvent,
    gwWinsA,
    gwWinsB,
    gwTies,
    rankTimeline,
    templateOverlapPct,
    sameCaptainWeeks,
  };
}
