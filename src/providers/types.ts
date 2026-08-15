import type { LeagueSnapshot } from "@/contracts/snapshot";

/**
 * Provider abstraction (specification section 2).
 *
 * The product must not be coupled to one questionable source. The full spec
 * interface (getSeason/getFixtures/getLeague/getEntry/...) is the long-term
 * target; this Phase 1 slice needs a single idempotent league snapshot used to
 * populate standings and awards, so we expose `getLeagueSnapshot()` here and
 * grow the surface in later slices.
 *
 * Security boundary: providers never store or use FPL credentials/cookies and
 * never call authenticated team-management endpoints.
 */
export interface FantasyDataProvider {
  readonly name: string;
  getLeagueSnapshot(): Promise<LeagueSnapshot>;
}

export type ProviderMode = "fixtures" | "manual" | "approved-fpl";
