#!/usr/bin/env tsx
/**
 * Validate a candidate past-season FPL league ID against the recorded champion.
 *
 * Usage:
 *   LEAGUE_PROVIDER_ID=1004960 npx tsx scripts/validate-fpl-league-id.ts 1234567 2024/25
 */
import "dotenv/config";

import { championForSeason } from "../src/lib/selChampions";
import {
  buildPastSeasonSnapshotFromLeagueStandings,
  buildPastSeasonSnapshotFromMemberCareers,
  snapshotMatchesChampion,
  snapshotSeasonLeader,
} from "../src/providers/fpl/buildHistorySnapshot";

async function main(): Promise<void> {
  const leagueId = process.argv[2];
  const seasonName = process.argv[3];
  const currentLeagueId = process.env.LEAGUE_PROVIDER_ID?.trim();

  if (!leagueId || !seasonName) {
    console.error("Usage: tsx scripts/validate-fpl-league-id.ts <league-id> <season-name>");
    process.exit(1);
  }

  const champion = championForSeason(seasonName);
  if (!champion) {
    console.warn(`No recorded champion for ${seasonName} in data/sel-champions.json`);
  }

  console.log(`\n=== Official league ${leagueId} (${seasonName}) ===`);
  try {
    const official = await buildPastSeasonSnapshotFromLeagueStandings(leagueId, seasonName);
    const leader = snapshotSeasonLeader(official);
    console.log(`League: ${official.league.name}`);
    console.log(`Managers: ${official.entries.length}`);
    console.log(`Leader: ${leader?.managerName} (${leader?.teamName}) — ${leader?.totalPoints} pts`);
    if (champion) {
      console.log(
        `Champion match: ${snapshotMatchesChampion(official, champion.winner) ? "YES" : "NO"} (expected ${champion.winner})`,
      );
    }
  } catch (err) {
    console.error("Official fetch failed:", err instanceof Error ? err.message : err);
  }

  if (currentLeagueId) {
    console.log(`\n=== Reconstructed from current league ${currentLeagueId} ===`);
    try {
      const reconstructed = await buildPastSeasonSnapshotFromMemberCareers(
        currentLeagueId,
        seasonName,
      );
      const leader = snapshotSeasonLeader(reconstructed);
      console.log(`Managers: ${reconstructed.entries.length}`);
      console.log(`Leader: ${leader?.managerName} (${leader?.teamName}) — ${leader?.totalPoints} pts`);
      if (champion) {
        console.log(
          `Champion match: ${snapshotMatchesChampion(reconstructed, champion.winner) ? "YES" : "NO"} (expected ${champion.winner})`,
        );
      }
    } catch (err) {
      console.error("Reconstruction failed:", err instanceof Error ? err.message : err);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
