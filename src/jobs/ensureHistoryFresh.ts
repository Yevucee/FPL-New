import { leagueConfig } from "@/lib/leagueConfig";

import {
  hasArchivedSeasons,
  importFplHistory,
  needsReconstructedHistoryRefresh,
  purgeReconstructedArchives,
  purgeReconstructedSeasonArchives,
  purgeSummaryArchives,
} from "./importFplHistory";

export interface EnsureHistoryFreshResult {
  action: "skipped" | "bootstrapped" | "refreshed" | "forced";
  reason: string;
  purged: number;
  imported: number;
}

/**
 * Rebuild reconstructed history when archives are missing, stale, or omit former members.
 * Safe to run on every deploy (web preDeploy) and from the automated sync cron.
 */
export async function ensureHistoryFresh(
  leagueId = leagueConfig.providerId.trim(),
): Promise<EnsureHistoryFreshResult> {
  if (!leagueId) {
    return {
      action: "skipped",
      reason: "LEAGUE_PROVIDER_ID not set",
      purged: 0,
      imported: 0,
    };
  }

  const forceHistory = process.env.FPL_FORCE_HISTORY_IMPORT === "1";
  const refreshCheck = await needsReconstructedHistoryRefresh(leagueId);
  const hasHistory = await hasArchivedSeasons();

  if (forceHistory) {
    const purged = await purgeSummaryArchives();
    const imported = await importFplHistory(leagueId);
    return {
      action: "forced",
      reason: "FPL_FORCE_HISTORY_IMPORT=1",
      purged,
      imported,
    };
  }

  if (!hasHistory) {
    const imported = await importFplHistory(leagueId);
    return {
      action: "bootstrapped",
      reason: "no archived seasons",
      purged: 0,
      imported,
    };
  }

  if (!refreshCheck.needed) {
    return {
      action: "skipped",
      reason: refreshCheck.reason,
      purged: 0,
      imported: 0,
    };
  }

  const targetSeasons = refreshCheck.seasons;
  const imported = await importFplHistory(leagueId, {
    reconstructedOnly: true,
    seasonNames: targetSeasons,
  });
  return {
    action: imported > 0 ? "refreshed" : "skipped",
    reason:
      imported > 0
        ? refreshCheck.reason
        : `${refreshCheck.reason} — import produced 0 seasons`,
    purged: 0,
    imported,
  };
}
