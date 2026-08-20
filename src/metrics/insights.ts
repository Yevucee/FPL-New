import type { EntryInput, ResultInput, StandingRow } from "./types";
import { gameweekWinner, monthlyWinner, woodenSpoon as woodenSpoonAward } from "./awards";
import { formatChipName } from "@/lib/chipLabels";
import { averageTemplateOverlapByEntry, type EventSquadIntel } from "./squadOverlap";
import { computeStandings } from "./standings";

export interface CaptainHistoryInput {
  entryId: string;
  eventNumber: number;
  captainName: string;
}

export interface CaptainPointsHistoryInput {
  entryId: string;
  eventNumber: number;
  points: number;
}

export interface InsightPerson {
  entryId: string;
  managerName: string;
  teamName: string;
}

export interface RankMovementInsight {
  entryId: string;
  managerName: string;
  teamName: string;
  movement: number;
  fromRank: number;
  toRank: number;
}

export interface ValueInsight extends InsightPerson {
  value: number;
}

export interface SeasonBestGwInsight extends ValueInsight {
  eventNumber: number;
}

export interface ChipInsight extends InsightPerson {
  chip: string;
  eventNumber: number;
}

export interface FormInsight extends InsightPerson {
  value: number;
  points: number;
  events: number;
}

export interface EntryMetaInput {
  seasonTransfers?: number | null;
  careerBestSeason?: string | null;
  careerBestPoints?: number | null;
  overallFplRank?: number | null;
}

export interface CaptainInsight extends ValueInsight {
  captainName: string;
}

export interface ChipWeekInsight extends SeasonBestGwInsight {
  chip: string;
  chipLabel: string;
}

export interface LeagueInsights {
  woodenSpoon: ValueInsight | null;
  biggestClimber: RankMovementInsight | null;
  biggestFaller: RankMovementInsight | null;
  leagueAverageGw: number | null;
  seasonBestGw: SeasonBestGwInsight | null;
  seasonWorstGw: SeasonBestGwInsight | null;
  mostGameweekWins: ValueInsight | null;
  mostMonthlyWins: ValueInsight | null;
  seasonWoodenSpoonCount: ValueInsight | null;
  transferTaxSeason: ValueInsight | null;
  benchRegretSeason: ValueInsight | null;
  benchPointsLeader: ValueInsight | null;
  transferHitsLeader: ValueInsight | null;
  seasonTransferLeader: ValueInsight | null;
  captaincyLeader: CaptainInsight | null;
  captainPointsLeader: ValueInsight | null;
  captainCopycat: ValueInsight | null;
  captainDifferential: ValueInsight | null;
  bestFplRank: ValueInsight | null;
  bestBenchBoost: ChipWeekInsight | null;
  bestFreeHit: ChipWeekInsight | null;
  bestTripleCaptain: ChipWeekInsight | null;
  mostTemplate: ValueInsight | null;
  mostContrarian: ValueInsight | null;
  mostWeeksAtTop: ValueInsight | null;
  mostWeeksLast: ValueInsight | null;
  formLeaders: FormInsight[];
  chipsPlayed: ChipInsight[];
}

function person(
  entryId: string,
  entries: ReadonlyMap<string, EntryInput>,
): InsightPerson {
  const e = entries.get(entryId);
  return {
    entryId,
    managerName: e?.managerName ?? "Unknown",
    teamName: e?.teamName ?? "Unknown",
  };
}

function bottomByCount(
  counts: ReadonlyMap<string, number>,
  entryMap: ReadonlyMap<string, EntryInput>,
): ValueInsight | null {
  let worst: ValueInsight | null = null;
  for (const [entryId, count] of counts) {
    if (
      !worst ||
      count < worst.value ||
      (count === worst.value &&
        person(entryId, entryMap).managerName.localeCompare(worst.managerName) < 0)
    ) {
      worst = { ...person(entryId, entryMap), value: count };
    }
  }
  return worst;
}

function topByNumericValue(
  values: ReadonlyMap<string, number>,
  entryMap: ReadonlyMap<string, EntryInput>,
  direction: "high" | "low",
): ValueInsight | null {
  let best: ValueInsight | null = null;
  for (const [entryId, value] of values) {
    if (
      !best ||
      (direction === "high" ? value > best.value : value < best.value) ||
      (value === best.value &&
        person(entryId, entryMap).managerName.localeCompare(best.managerName) < 0)
    ) {
      best = { ...person(entryId, entryMap), value };
    }
  }
  return best;
}

function countMonthlyWins(
  results: ReadonlyArray<ResultInput>,
  completedPhases: ReadonlyArray<number>,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const phase of completedPhases) {
    const award = monthlyWinner(results, phase);
    if (!award) continue;
    for (const entryId of award.entryIds) {
      counts.set(entryId, (counts.get(entryId) ?? 0) + 1);
    }
  }
  return counts;
}

function sumByEntry(
  results: ReadonlyArray<ResultInput>,
  throughEvent: number,
  pick: (result: ResultInput) => number,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const result of results) {
    if (result.eventNumber > throughEvent) continue;
    const value = pick(result);
    if (value <= 0) continue;
    totals.set(result.entryId, (totals.get(result.entryId) ?? 0) + value);
  }
  return totals;
}

function bestChipWeek(
  results: ReadonlyArray<ResultInput>,
  chip: string,
  throughEvent: number,
  entryMap: ReadonlyMap<string, EntryInput>,
): ChipWeekInsight | null {
  let best: ChipWeekInsight | null = null;
  for (const result of results) {
    if (result.eventNumber > throughEvent) continue;
    if ((result.chip ?? "").toLowerCase() !== chip) continue;
    if (!best || result.netPoints > best.value) {
      best = {
        ...person(result.entryId, entryMap),
        value: result.netPoints,
        eventNumber: result.eventNumber,
        chip,
        chipLabel: formatChipName(chip),
      };
    }
  }
  return best;
}

function countAwardWins(
  results: ReadonlyArray<ResultInput>,
  throughEvent: number,
  awardFn: (results: ReadonlyArray<ResultInput>, eventNumber: number) => { entryIds: string[] } | null,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (let event = 1; event <= throughEvent; event++) {
    const award = awardFn(results, event);
    if (!award) continue;
    for (const entryId of award.entryIds) {
      counts.set(entryId, (counts.get(entryId) ?? 0) + 1);
    }
  }
  return counts;
}

function countCaptainHerdMatches(
  captainHistory: ReadonlyArray<CaptainHistoryInput>,
  throughEvent: number,
): Map<string, number> {
  const copycatCounts = new Map<string, number>();
  for (const row of captainHistory) {
    if (row.eventNumber > throughEvent || !row.captainName) continue;
    if (!copycatCounts.has(row.entryId)) copycatCounts.set(row.entryId, 0);
  }

  for (let event = 1; event <= throughEvent; event++) {
    const gwCaptains = captainHistory.filter(
      (row) => row.eventNumber === event && row.captainName.length > 0,
    );
    if (gwCaptains.length === 0) continue;

    const freq = new Map<string, number>();
    for (const row of gwCaptains) {
      freq.set(row.captainName, (freq.get(row.captainName) ?? 0) + 1);
    }
    const maxFreq = Math.max(...freq.values());
    const herdCaptains = new Set(
      [...freq.entries()].filter(([, count]) => count === maxFreq).map(([name]) => name),
    );

    for (const row of gwCaptains) {
      if (herdCaptains.has(row.captainName)) {
        copycatCounts.set(row.entryId, (copycatCounts.get(row.entryId) ?? 0) + 1);
      }
    }
  }

  return copycatCounts;
}

function topByCount(
  counts: ReadonlyMap<string, number>,
  entryMap: ReadonlyMap<string, EntryInput>,
): ValueInsight | null {
  let best: ValueInsight | null = null;
  for (const [entryId, count] of counts) {
    if (count <= 0) continue;
    if (
      !best ||
      count > best.value ||
      (count === best.value &&
        person(entryId, entryMap).managerName.localeCompare(best.managerName) < 0)
    ) {
      best = { ...person(entryId, entryMap), value: count };
    }
  }
  return best;
}

function countWeeksAtRankExtremes(
  entries: ReadonlyArray<EntryInput>,
  results: ReadonlyArray<ResultInput>,
  throughEvent: number,
): { weeksAtTop: Map<string, number>; weeksLast: Map<string, number> } {
  const weeksAtTop = new Map<string, number>();
  const weeksLast = new Map<string, number>();
  for (const e of entries) {
    weeksAtTop.set(e.entryId, 0);
    weeksLast.set(e.entryId, 0);
  }

  for (let event = 1; event <= throughEvent; event++) {
    const hasGwResults = results.some((r) => r.eventNumber === event);
    if (!hasGwResults) continue;

    const standings = computeStandings(entries, results, event);
    const maxRank = Math.max(...standings.map((s) => s.rank));

    for (const row of standings) {
      if (row.rank === 1) {
        weeksAtTop.set(row.entryId, (weeksAtTop.get(row.entryId) ?? 0) + 1);
      }
      if (row.rank === maxRank) {
        weeksLast.set(row.entryId, (weeksLast.get(row.entryId) ?? 0) + 1);
      }
    }
  }

  return { weeksAtTop, weeksLast };
}

function topMovement(
  standings: StandingRow[],
  direction: "up" | "down",
): RankMovementInsight | null {
  const candidates = standings.filter((s) => s.rankMovement !== null && s.rankMovement !== 0);
  if (candidates.length === 0) return null;

  const sorted = [...candidates].sort((a, b) => {
    const am = a.rankMovement ?? 0;
    const bm = b.rankMovement ?? 0;
    return direction === "up" ? bm - am : am - bm;
  });
  const best = sorted[0]!;
  const movement = best.rankMovement ?? 0;
  if (direction === "up" && movement <= 0) return null;
  if (direction === "down" && movement >= 0) return null;

  return {
    entryId: best.entryId,
    managerName: best.managerName,
    teamName: best.teamName,
    movement,
    fromRank: best.previousRank ?? best.rank,
    toRank: best.rank,
  };
}

/** Pure league insights for the selected gameweek — no DB coupling. */
export function computeLeagueInsights(
  entries: ReadonlyArray<EntryInput>,
  results: ReadonlyArray<ResultInput>,
  throughEvent: number,
  options: {
    entryMeta?: ReadonlyMap<string, EntryMetaInput>;
    captainByEntry?: ReadonlyMap<string, { name: string; points: number | null }>;
    captainHistory?: ReadonlyArray<CaptainHistoryInput>;
    captainPointsHistory?: ReadonlyArray<CaptainPointsHistoryInput>;
    squadIntelByEvent?: ReadonlyArray<EventSquadIntel>;
    completedPhases?: ReadonlyArray<number>;
  } = {},
): LeagueInsights {
  const entryMap = new Map(entries.map((e) => [e.entryId, e]));
  const standings = computeStandings(entries, results, throughEvent);
  const gwResults = results.filter((r) => r.eventNumber === throughEvent);

  const woodenSpoon =
    gwResults.length > 0
      ? (() => {
          const min = Math.min(...gwResults.map((r) => r.netPoints));
          const losers = gwResults.filter((r) => r.netPoints === min);
          const id = losers[0]!.entryId;
          return { ...person(id, entryMap), value: min };
        })()
      : null;

  const leagueAverageGw =
    gwResults.length > 0
      ? Math.round(
          (gwResults.reduce((sum, r) => sum + r.netPoints, 0) / gwResults.length) * 10,
        ) / 10
      : null;

  let seasonBestGw: SeasonBestGwInsight | null = null;
  let seasonWorstGw: SeasonBestGwInsight | null = null;
  for (const r of results) {
    if (r.eventNumber > throughEvent) continue;
    if (!seasonBestGw || r.netPoints > seasonBestGw.value) {
      seasonBestGw = {
        ...person(r.entryId, entryMap),
        value: r.netPoints,
        eventNumber: r.eventNumber,
      };
    }
    if (!seasonWorstGw || r.netPoints < seasonWorstGw.value) {
      seasonWorstGw = {
        ...person(r.entryId, entryMap),
        value: r.netPoints,
        eventNumber: r.eventNumber,
      };
    }
  }

  const benchPointsLeader =
    gwResults.length > 0
      ? (() => {
          const top = [...gwResults].sort((a, b) => b.benchPoints - a.benchPoints)[0]!;
          if (top.benchPoints <= 0) return null;
          return { ...person(top.entryId, entryMap), value: top.benchPoints };
        })()
      : null;

  const transferHitsLeader =
    gwResults.length > 0
      ? (() => {
          const top = [...gwResults].sort((a, b) => b.transferCost - a.transferCost)[0]!;
          if (top.transferCost <= 0) return null;
          return { ...person(top.entryId, entryMap), value: top.transferCost };
        })()
      : null;

  const formWindow = 3;
  const formTotals = new Map<string, number>();
  for (const r of results) {
    if (r.eventNumber > throughEvent || r.eventNumber <= throughEvent - formWindow) continue;
    formTotals.set(r.entryId, (formTotals.get(r.entryId) ?? 0) + r.netPoints);
  }
  const formLeaders = [...formTotals.entries()]
    .map(([entryId, points]) => ({
      ...person(entryId, entryMap),
      value: points,
      points,
      events: Math.min(formWindow, throughEvent),
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 3);

  const chipsPlayed: ChipInsight[] = [];
  for (const r of results) {
    if (r.chip && r.eventNumber <= throughEvent) {
      chipsPlayed.push({
        ...person(r.entryId, entryMap),
        chip: r.chip,
        eventNumber: r.eventNumber,
      });
    }
  }

  let seasonTransferLeader: ValueInsight | null = null;
  if (options.entryMeta) {
    for (const e of entries) {
      const transfers = options.entryMeta.get(e.entryId)?.seasonTransfers ?? 0;
      if (
        transfers > 0 &&
        (!seasonTransferLeader || transfers > seasonTransferLeader.value)
      ) {
        seasonTransferLeader = { ...person(e.entryId, entryMap), value: transfers };
      }
    }
  }

  let captaincyLeader: CaptainInsight | null = null;
  if (options.captainByEntry) {
    for (const [entryId, captain] of options.captainByEntry) {
      const points = captain.points ?? 0;
      if (
        points > 0 &&
        (!captaincyLeader || points > captaincyLeader.value)
      ) {
        captaincyLeader = {
          ...person(entryId, entryMap),
          captainName: captain.name,
          value: points,
        };
      }
    }
  }

  const { weeksAtTop, weeksLast } = countWeeksAtRankExtremes(entries, results, throughEvent);
  const mostWeeksAtTop = topByCount(weeksAtTop, entryMap);
  const mostWeeksLast = topByCount(weeksLast, entryMap);

  const gwWinCounts = countAwardWins(results, throughEvent, gameweekWinner);
  const mostGameweekWins = topByCount(gwWinCounts, entryMap);

  const monthlyWinCounts = countMonthlyWins(
    results.filter((row) => row.eventNumber <= throughEvent),
    options.completedPhases ?? [],
  );
  const mostMonthlyWins = topByCount(monthlyWinCounts, entryMap);

  const spoonCounts = countAwardWins(results, throughEvent, woodenSpoonAward);
  const seasonWoodenSpoonCount = topByCount(spoonCounts, entryMap);

  const transferTaxTotals = sumByEntry(results, throughEvent, (row) => row.transferCost);
  const transferTaxSeason = topByNumericValue(transferTaxTotals, entryMap, "high");

  const benchRegretTotals = sumByEntry(results, throughEvent, (row) => row.benchPoints);
  const benchRegretSeason = topByNumericValue(benchRegretTotals, entryMap, "high");

  let captainPointsLeader: ValueInsight | null = null;
  if (options.captainPointsHistory && options.captainPointsHistory.length > 0) {
    const captainTotals = new Map<string, number>();
    for (const row of options.captainPointsHistory) {
      if (row.eventNumber > throughEvent || row.points <= 0) continue;
      captainTotals.set(row.entryId, (captainTotals.get(row.entryId) ?? 0) + row.points);
    }
    captainPointsLeader = topByNumericValue(captainTotals, entryMap, "high");
  }

  let bestFplRank: ValueInsight | null = null;
  if (options.entryMeta) {
    const rankValues = new Map<string, number>();
    for (const entry of entries) {
      const rank = options.entryMeta.get(entry.entryId)?.overallFplRank;
      if (rank != null && rank > 0) rankValues.set(entry.entryId, rank);
    }
    bestFplRank = topByNumericValue(rankValues, entryMap, "low");
  }

  const bestBenchBoost = bestChipWeek(results, "bboost", throughEvent, entryMap);
  const bestFreeHit = bestChipWeek(results, "freehit", throughEvent, entryMap);
  const bestTripleCaptain = bestChipWeek(results, "3xc", throughEvent, entryMap);

  let captainCopycat: ValueInsight | null = null;
  let captainDifferential: ValueInsight | null = null;
  if (options.captainHistory && options.captainHistory.length > 0) {
    const herdMatches = countCaptainHerdMatches(options.captainHistory, throughEvent);
    captainCopycat = topByCount(herdMatches, entryMap);
    captainDifferential = bottomByCount(herdMatches, entryMap);
  }

  let mostTemplate: ValueInsight | null = null;
  let mostContrarian: ValueInsight | null = null;
  if (options.squadIntelByEvent && options.squadIntelByEvent.length > 0) {
    const overlapByEntry = averageTemplateOverlapByEntry(options.squadIntelByEvent, throughEvent);
    mostTemplate = topByNumericValue(overlapByEntry, entryMap, "high");
    mostContrarian = topByNumericValue(overlapByEntry, entryMap, "low");
  }

  return {
    woodenSpoon,
    biggestClimber: topMovement(standings, "up"),
    biggestFaller: topMovement(standings, "down"),
    leagueAverageGw,
    seasonBestGw,
    seasonWorstGw,
    mostGameweekWins,
    mostMonthlyWins,
    seasonWoodenSpoonCount,
    transferTaxSeason,
    benchRegretSeason,
    benchPointsLeader,
    transferHitsLeader,
    seasonTransferLeader,
    captaincyLeader,
    captainPointsLeader,
    captainCopycat,
    captainDifferential,
    bestFplRank,
    bestBenchBoost,
    bestFreeHit,
    bestTripleCaptain,
    mostTemplate,
    mostContrarian,
    mostWeeksAtTop,
    mostWeeksLast,
    formLeaders,
    chipsPlayed: chipsPlayed.sort((a, b) => b.eventNumber - a.eventNumber),
  };
}
