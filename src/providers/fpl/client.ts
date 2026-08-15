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

export interface FplEntryHistory {
  current: FplEntryHistoryEvent[];
  past: FplEntryHistoryEvent[];
  chips: Array<{ name: string; event: number }>;
}

async function fplGet<T>(path: string): Promise<T> {
  const res = await fetch(`${FPL_BASE}${path}`, {
    headers: { "User-Agent": "swiss-expert-league-archive/0.1" },
  });
  if (!res.ok) {
    throw new Error(`FPL API ${path} returned ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchBootstrap(): Promise<FplBootstrap> {
  return fplGet<FplBootstrap>("/bootstrap-static/");
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

export async function fetchEntryHistory(entryId: string): Promise<FplEntryHistory> {
  return fplGet<FplEntryHistory>(`/entry/${entryId}/history/`);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
