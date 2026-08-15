import { FixtureProvider } from "./fixtureProvider";
import { ManualProvider } from "./manualProvider";
import type { FantasyDataProvider, ProviderMode } from "./types";

/**
 * Resolve the active provider from FANTASY_PROVIDER_MODE.
 *
 * - fixtures: synthetic sample data for development
 * - manual: snapshot JSON (from scripts/fetch-fpl-league.ts) for live season
 * - approved-fpl: reserved for gated automatic sync when lawful access is confirmed
 */
export function getProvider(
  mode: ProviderMode = (process.env.FANTASY_PROVIDER_MODE as ProviderMode) ??
    "fixtures",
): FantasyDataProvider {
  switch (mode) {
    case "fixtures":
      return new FixtureProvider();
    case "manual":
      return new ManualProvider();
    case "approved-fpl":
      throw new Error(
        `Provider mode "approved-fpl" is not enabled. Set AUTOMATIC_SYNC_ENABLED=true only after confirming lawful FPL access.`,
      );
    default:
      throw new Error(`Unknown FANTASY_PROVIDER_MODE: ${String(mode)}`);
  }
}

export * from "./types";
