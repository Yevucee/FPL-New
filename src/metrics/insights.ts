import type { EntryInput, ResultInput, StandingRow } from "./types";
import { computeStandings } from "./standings";

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

export interface LeagueInsights {
  woodenSpoon: ValueInsight | null;
  biggestClimber: RankMovementInsight | null;
  biggestFaller: RankMovementInsight | null;
  leagueAverageGw: number | null;
  seasonBestGw: SeasonBestGwInsight | null;
  benchPointsLeader: ValueInsight | null;
  transferHitsLeader: ValueInsight | null;
  seasonTransferLeader: ValueInsight | null;
  captaincyLeader: CaptainInsight | null;
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
  for (const r of results) {
    if (r.eventNumber > throughEvent) continue;
    if (!seasonBestGw || r.netPoints > seasonBestGw.value) {
      seasonBestGw = {
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

  return {
    woodenSpoon,
    biggestClimber: topMovement(standings, "up"),
    biggestFaller: topMovement(standings, "down"),
    leagueAverageGw,
    seasonBestGw,
    benchPointsLeader,
    transferHitsLeader,
    seasonTransferLeader,
    captaincyLeader,
    formLeaders,
    chipsPlayed: chipsPlayed.sort((a, b) => b.eventNumber - a.eventNumber),
  };
}
