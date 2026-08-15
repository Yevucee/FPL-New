import { FixtureProvider } from "./fixtureProvider";
import type { FantasyDataProvider, ProviderMode } from "./types";

/**
 * Resolve the active provider from FANTASY_PROVIDER_MODE.
 *
 * Only the fixtures provider is available in this Phase 1 slice. Manual import
 * and approved-FPL providers are added in later slices; approved-FPL stays
 * behind AUTOMATIC_SYNC_ENABLED=false until a lawful access basis is confirmed.
 */
export function getProvider(
  mode: ProviderMode = (process.env.FANTASY_PROVIDER_MODE as ProviderMode) ??
    "fixtures",
): FantasyDataProvider {
  switch (mode) {
    case "fixtures":
      return new FixtureProvider();
    case "manual":
    case "approved-fpl":
      throw new Error(
        `Provider mode "${mode}" is not implemented in this slice. Use FANTASY_PROVIDER_MODE=fixtures.`,
      );
    default:
      throw new Error(`Unknown FANTASY_PROVIDER_MODE: ${String(mode)}`);
  }
}

export * from "./types";
