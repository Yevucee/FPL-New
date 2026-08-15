# Historical season data

Past seasons are imported from the legacy Swiss Expert League Supabase
export and browsed at `/history`. The live season stays on `/league`.

## When to import

You can import archived seasons **before** the new FPL league is renewed. History
does not depend on `LEAGUE_PROVIDER_ID` — only the import script uses it as
metadata on the league row.

Once the correct league ID is known:

1. Set `LEAGUE_PROVIDER_ID` on Railway (web + sync-cron)
2. Run `npm run sync:fpl` for the new live season
3. Past seasons remain available under **History**

## Export from legacy Supabase

In the [Supabase SQL editor](https://supabase.com/dashboard) for project
`bxkcrzyuiddzqgnflhfw`, run:

```sql
select gw, entry_id, manager_name, team_name, total_points, gw_points, active_chip, transfer_cost
from league_snapshots
order by gw, entry_id;
```

Export the result as JSON and save to `data/legacy/league_snapshots.json` in
this repo (or upload to Railway).

Optional gameweek metadata (deadlines, phase names):

```sql
select gw, deadline_time, phase, phase_name
from fpl_gameweeks
order by gw;
```

Wrap both in one file:

```json
{
  "snapshots": [ ... ],
  "gameweeks": [ ... ]
}
```

Or pass a plain array of snapshot rows — the import script accepts both.

## Import locally

```bash
LEGACY_SEASON_NAME=2024/25 \
LEGACY_SNAPSHOT_FILE=data/legacy/league_snapshots.json \
npm run import:legacy
```

The season is marked `archived` in Postgres and appears at `/history/2024-25`.

## Import on Railway

1. Upload `league_snapshots.json` (e.g. commit under `data/legacy/` or paste
   into a shell temp file)
2. Open the **web** service shell
3. Run:

```bash
LEGACY_SEASON_NAME=2024/25 \
LEGACY_SNAPSHOT_FILE=data/legacy/league_snapshots.json \
npm run import:legacy
```

### Pull directly from Supabase (alternative)

```bash
LEGACY_SEASON_NAME=2024/25 \
LEGACY_SUPABASE_URL=https://bxkcrzyuiddzqgnflhfw.supabase.co \
LEGACY_SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
npm run import:legacy
```

## Multiple seasons

Repeat the import for each season with a different `LEGACY_SEASON_NAME` and
export file. Seasons sort newest-first on `/history`.

When a new live season starts, ensure its row has `state = active` (default
from FPL sync). Archived imports set `state = archived` automatically.

## URLs

| Path | Purpose |
|------|---------|
| `/history` | List archived seasons |
| `/history/2024-25` | Full season through final GW |
| `/history/2024-25?gw=12` | Standings through GW12 |
