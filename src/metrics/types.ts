/**
 * Plain, source-agnostic inputs for pure metric functions.
 * Keeping these decoupled from the DB rows lets metrics be unit-tested with
 * fixtures and reused across ingestion, API, and UI (specification section 9:
 * "The UI must not contain scoring formulas.").
 */

export interface ResultInput {
  entryId: string;
  eventNumber: number;
  phase: number;
  netPoints: number;
  grossPoints: number;
  transferCost: number;
  benchPoints: number;
  /** Bench player points when Bench Boost was played (FPL points_on_bench is 0 that week). */
  benchBoostPoints?: number | null;
  chip?: string | null;
}

export interface EntryInput {
  entryId: string;
  managerName: string;
  teamName: string;
  joinEvent: number;
}

export interface StandingRow {
  entryId: string;
  managerName: string;
  teamName: string;
  totalNetPoints: number;
  eventNetPoints: number;
  rank: number;
  previousRank: number | null;
  rankMovement: number | null;
  gapToLeader: number;
  gapToAbove: number;
  gwVsAverage?: number | null;
}

export interface AwardWinner {
  entryIds: string[];
  value: number;
  joint: boolean;
}
