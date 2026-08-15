/**
 * Past-season FPL league IDs — one private league ID per completed season.
 *
 * Example:
 * LEAGUE_HISTORY_PROVIDER_IDS={"2025/26":"1234567","2024/25":"9876543"}
 */
export function parseLeagueHistoryProviderIds(): Record<string, string> {
  const raw = process.env.LEAGUE_HISTORY_PROVIDER_IDS?.trim();
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("expected a JSON object");
    }

    const out: Record<string, string> = {};
    for (const [seasonName, leagueId] of Object.entries(parsed)) {
      const id = String(leagueId).trim();
      if (!id) continue;
      out[seasonName] = id;
    }
    return out;
  } catch (err) {
    throw new Error(
      `LEAGUE_HISTORY_PROVIDER_IDS is invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function leagueHistoryProviderIds(): Map<string, string> {
  return new Map(Object.entries(parseLeagueHistoryProviderIds()));
}
