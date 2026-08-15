import { ok, fail } from "@/lib/api";
import { getLeagueOverview } from "@/server/leagueData";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const overview = await getLeagueOverview();
    return ok(
      {
        league: overview.league,
        season: overview.seasonName,
        event: overview.latestEvent,
        standings: overview.standings,
        gameweekWinner: overview.gameweekWinner,
        monthlyLeader: overview.monthlyLeader,
      },
      { source: "database", provider: process.env.FANTASY_PROVIDER_MODE ?? "fixtures" },
    );
  } catch (err) {
    return fail(
      "STANDINGS_UNAVAILABLE",
      err instanceof Error ? err.message : "Unknown error",
      500,
    );
  }
}
