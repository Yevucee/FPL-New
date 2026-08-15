/**
 * League identity and branding from environment variables.
 * Set these in Railway / .env once the Swiss Expert League FPL ID is known.
 */
export const leagueConfig = {
  slug: process.env.LEAGUE_SLUG ?? "swiss-expert-league",
  displayName: process.env.LEAGUE_DISPLAY_NAME ?? "Swiss Expert League",
  shortName: process.env.LEAGUE_SHORT_NAME ?? "SEL",
  visibility: process.env.LEAGUE_VISIBILITY ?? "unlisted",
  timezone: process.env.APP_TIMEZONE ?? "Europe/Zurich",
  scoringTimezone: process.env.SCORING_TIMEZONE ?? "Europe/London",
  providerId: process.env.LEAGUE_PROVIDER_ID ?? "",
  tagline: "Live standings, awards, and season archive for our private FPL league.",
} as const;

export function leagueProviderIdOrThrow(): string {
  const id = leagueConfig.providerId.trim();
  if (!id) {
    throw new Error(
      "LEAGUE_PROVIDER_ID is not set. Find it in the FPL league URL: " +
        "fantasy.premierleague.com/leagues/<ID>/standings/c",
    );
  }
  return id;
}
