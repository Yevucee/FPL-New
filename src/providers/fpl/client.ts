const FPL_BASE = "https://fantasy.premierleague.com/api";

export interface FplBootstrapEvent {
  id: number;
  name: string;
  deadline_time: string;
  finished: boolean;
  data_checked: boolean;
  is_current: boolean;
  is_next: boolean;
}

export interface FplBootstrap {
  events: FplBootstrapEvent[];
  elements: Array<{ id: number; web_name: string }>;
}

export interface FplFixture {
  id: number;
  event: number;
  kickoff_time: string | null;
  started: boolean;
  finished: boolean;
  minutes: number;
}

export interface FplLiveEvent {
  elements: Array<{ id: number; stats: { total_points: number } }>;
}

export interface FplLeagueMeta {
  id: number;
  name: string;
  start_event: number;
}

export interface FplStandingRow {
  entry: number;
  entry_name: string;
  player_name: string;
  rank: number;
  last_rank: number;
  total: number;
  event_total: number;
}

export interface FplLeagueStandingsPage {
  league: FplLeagueMeta;
  standings: { results: FplStandingRow[] };
  new_entries?: { results: Array<{
    entry: number;
    entry_name: string;
    player_first_name: string;
    player_last_name: string;
  }> };
}

export interface FplEntryHistoryEvent {
  event: number;
  points: number;
  total_points: number;
  rank: number;
  event_transfers: number;
  event_transfers_cost: number;
  value: number;
  bank: number;
  points_on_bench: number;
}

export interface FplPick {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
}

export interface FplPickWithStats extends FplPick {
  stats?: { total_points?: number };
}

export interface FplPicksResponse {
  active_chip: string | null;
  picks: FplPickWithStats[];
}

export interface FplEntryHistoryPast {
  season_name: string;
  total_points: number;
  rank: number;
  rank_percentage?: string;
}

export interface FplEntryHistory {
  current: FplEntryHistoryEvent[];
  past: FplEntryHistoryPast[];
  chips: Array<{ name: string; event: number }>;
}

export interface FplTransfer {
  element_in: number;
  element_out: number;
  entry: number;
  event: number;
  time: string;
}

async function fplGet<T>(path: string, attempt = 1): Promise<T> {
  const res = await fetch(`${FPL_BASE}${path}`, {
    headers: { "User-Agent": "swiss-expert-league-archive/0.1" },
  });
  if ((res.status === 503 || res.status === 429) && attempt < 6) {
    await sleep(1000 * 2 ** attempt);
    return fplGet<T>(path, attempt + 1);
  }
  if (!res.ok) {
    throw new Error(`FPL API ${path} returned ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchBootstrap(): Promise<FplBootstrap> {
  return fplGet<FplBootstrap>("/bootstrap-static/");
}

export async function fetchFixtures(): Promise<FplFixture[]> {
  return fplGet<FplFixture[]>("/fixtures/");
}

export async function fetchEventLive(eventNumber: number): Promise<FplLiveEvent> {
  return fplGet<FplLiveEvent>(`/event/${eventNumber}/live/`);
}

export function livePointsByElement(live: FplLiveEvent): Map<number, number> {
  return new Map(live.elements.map((element) => [element.id, element.stats.total_points]));
}

/** True when at least one PL fixture is in play (kick-off to full time). */
export function hasLiveFixtures(
  fixtures: ReadonlyArray<
    Pick<FplFixture, "started" | "finished" | "kickoff_time" | "minutes">
  >,
  now = new Date(),
): boolean {
  return fixtures.some((fixture) => {
    if (!fixture.started || fixture.finished) return false;
    if (!fixture.kickoff_time) return false;
    const kickoff = new Date(fixture.kickoff_time);
    if (Number.isNaN(kickoff.getTime())) return false;
    const mins = fixture.minutes > 0 ? fixture.minutes : 105;
    const estimatedEnd = kickoff.getTime() + mins * 60_000;
    const bufferMs = 15 * 60_000;
    return now.getTime() >= kickoff.getTime() && now.getTime() <= estimatedEnd + bufferMs;
  });
}

export async function fetchLeagueStandingsPage(
  leagueId: string,
  page: number,
): Promise<FplLeagueStandingsPage> {
  return fplGet<FplLeagueStandingsPage>(
    `/leagues-classic/${leagueId}/standings/?page_standings=${page}&page_new_entries=1`,
  );
}

export async function fetchAllLeagueMembers(leagueId: string): Promise<{
  league: FplLeagueMeta;
  members: Array<{ entryId: string; managerName: string; teamName: string }>;
}> {
  const members = new Map<string, { entryId: string; managerName: string; teamName: string }>();
  let league: FplLeagueMeta | null = null;
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const data = await fetchLeagueStandingsPage(leagueId, page);
    league = data.league;
    for (const row of data.standings.results ?? []) {
      members.set(String(row.entry), {
        entryId: String(row.entry),
        managerName: row.player_name,
        teamName: row.entry_name,
      });
    }
    for (const row of data.new_entries?.results ?? []) {
      members.set(String(row.entry), {
        entryId: String(row.entry),
        managerName: `${row.player_first_name} ${row.player_last_name}`.trim(),
        teamName: row.entry_name,
      });
    }
    hasMore = (data.standings.results?.length ?? 0) > 0;
    page += 1;
    if (page > 50) break;
  }

  if (!league) {
    throw new Error(`League ${leagueId} not found or inaccessible`);
  }

  return { league, members: [...members.values()] };
}

export interface LiveLeagueScore {
  entryId: string;
  eventTotal: number;
  total: number;
  rank: number;
}

/** Live GW points from the league standings endpoint (updates during fixtures). */
export async function fetchLiveLeagueScoreboard(leagueId: string): Promise<Map<string, LiveLeagueScore>> {
  const scores = new Map<string, LiveLeagueScore>();
  let page = 1;

  while (page <= 50) {
    const data = await fetchLeagueStandingsPage(leagueId, page);
    const batch = data.standings.results ?? [];
    if (batch.length === 0) break;

    for (const row of batch) {
      scores.set(String(row.entry), {
        entryId: String(row.entry),
        eventTotal: row.event_total,
        total: row.total,
        rank: row.rank,
      });
    }
    page += 1;
  }

  return scores;
}

/** Final league table rows — use for completed-season private league archives. */
export async function fetchAllLeagueStandings(leagueId: string): Promise<{
  league: FplLeagueMeta;
  rows: Array<{
    entryId: string;
    managerName: string;
    teamName: string;
    total: number;
    rank: number;
  }>;
}> {
  const rows = new Map<
    string,
    {
      entryId: string;
      managerName: string;
      teamName: string;
      total: number;
      rank: number;
    }
  >();
  let league: FplLeagueMeta | null = null;
  let page = 1;

  while (page <= 50) {
    const data = await fetchLeagueStandingsPage(leagueId, page);
    league = data.league;
    const batch = data.standings.results ?? [];
    if (batch.length === 0) break;

    for (const row of batch) {
      rows.set(String(row.entry), {
        entryId: String(row.entry),
        managerName: row.player_name,
        teamName: row.entry_name,
        total: row.total,
        rank: row.rank,
      });
    }
    page += 1;
  }

  if (!league) {
    throw new Error(`League ${leagueId} not found or inaccessible`);
  }

  return { league, rows: [...rows.values()] };
}

export async function fetchEntryHistory(entryId: string): Promise<FplEntryHistory> {
  return fplGet<FplEntryHistory>(`/entry/${entryId}/history/`);
}

export async function fetchEntryTransfers(entryId: string): Promise<FplTransfer[]> {
  return fplGet<FplTransfer[]>(`/entry/${entryId}/transfers/`);
}

export async function fetchEntryProfile(entryId: string): Promise<{
  managerName: string;
  teamName: string;
}> {
  const data = await fplGet<{
    player_first_name: string;
    player_last_name: string;
    name: string;
  }>(`/entry/${entryId}/`);
  return {
    managerName: `${data.player_first_name} ${data.player_last_name}`.trim(),
    teamName: data.name,
  };
}

export async function fetchEntryPicks(
  entryId: string,
  eventNumber: number,
  attempt = 1,
): Promise<FplPicksResponse | null> {
  const res = await fetch(
    `${FPL_BASE}/entry/${entryId}/event/${eventNumber}/picks/`,
    { headers: { "User-Agent": "swiss-expert-league-archive/0.1" } },
  );
  if (res.status === 404) return null;
  if ((res.status === 503 || res.status === 429) && attempt < 6) {
    await sleep(1000 * 2 ** attempt);
    return fetchEntryPicks(entryId, eventNumber, attempt + 1);
  }
  if (!res.ok) {
    console.warn(
      `[fpl] entry/${entryId}/event/${eventNumber}/picks returned ${res.status} — skipping`,
    );
    return null;
  }
  return res.json() as Promise<FplPicksResponse>;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Sum live/final points for bench slots (positions 12–15). */
export function benchPointsFromPicks(
  picks: ReadonlyArray<FplPickWithStats>,
  livePointsByElement?: ReadonlyMap<number, number>,
): number {
  return picks
    .filter((pick) => pick.position >= 12)
    .reduce((sum, pick) => {
      const fromPick = pick.stats?.total_points;
      if (fromPick != null) return sum + fromPick;
      return sum + (livePointsByElement?.get(pick.element) ?? 0);
    }, 0);
}

export function playerNameMap(
  elements: ReadonlyArray<{ id: number; web_name: string }>,
): Map<number, string> {
  return new Map(elements.map((e) => [e.id, e.web_name]));
}

/** Latest gameweek whose deadline has passed (squads locked). */
export function latestLockedEvent(
  events: ReadonlyArray<FplBootstrapEvent>,
  now = Date.now(),
): number | null {
  const locked = events.filter((ev) => new Date(ev.deadline_time).getTime() <= now);
  if (locked.length === 0) return null;
  return locked[locked.length - 1]!.id;
}
