import { ok, fail } from "@/lib/api";
import { getLeagueOverview } from "@/server/leagueData";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const gw = url.searchParams.get("gw");
    const throughEvent = gw ? Number.parseInt(gw, 10) : undefined;
    const overview = await getLeagueOverview({
      throughEvent: Number.isFinite(throughEvent) ? throughEvent : undefined,
    });
    return ok(
      {
        league: overview.league,
        season: overview.seasonName,
        event: overview.selectedEvent,
        registeredManagers: overview.registeredManagers,
        dataMode: overview.dataMode,
        standings: overview.standings,
        gameweekWinner: overview.gameweekWinner,
        monthlyLeader: overview.monthlyLeader,
        insights: overview.insights,
        mostOwned: overview.mostOwned,
        mostOwnedEvent: overview.mostOwnedEvent,
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
