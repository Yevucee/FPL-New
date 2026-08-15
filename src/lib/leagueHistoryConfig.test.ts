import { afterEach, describe, expect, it } from "vitest";

import { parseLeagueHistoryProviderIds } from "./leagueHistoryConfig";

describe("parseLeagueHistoryProviderIds", () => {
  const original = process.env.LEAGUE_HISTORY_PROVIDER_IDS;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.LEAGUE_HISTORY_PROVIDER_IDS;
    } else {
      process.env.LEAGUE_HISTORY_PROVIDER_IDS = original;
    }
  });

  it("returns empty map when unset", () => {
    delete process.env.LEAGUE_HISTORY_PROVIDER_IDS;
    expect(parseLeagueHistoryProviderIds()).toEqual({});
  });

  it("parses season → league id pairs", () => {
    process.env.LEAGUE_HISTORY_PROVIDER_IDS =
      '{"2025/26":"1234567","2024/25":"9876543"}';
    expect(parseLeagueHistoryProviderIds()).toEqual({
      "2025/26": "1234567",
      "2024/25": "9876543",
    });
  });
});
