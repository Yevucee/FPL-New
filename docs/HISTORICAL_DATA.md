# Historical season data (official FPL)

Past Swiss Expert League tables are imported from **that season's private FPL league ID**.
FPL creates a new league ID each year when the league renews — the current ID alone
cannot reconstruct last year's league table.

## How it works

| When | What happens |
|------|----------------|
| `LEAGUE_PROVIDER_ID` set | Cron syncs the **current** season (`1004960` for 2026/27) |
| `LEAGUE_HISTORY_PROVIDER_IDS` set | One-off import of **final league tables** per past season |
| Each live gameweek | GW-by-GW data synced automatically for the active season |
| New season starts | Previous live season auto-archived with full GW history |

## Configure past seasons

On Railway (web + sync-cron), add a JSON map of season name → that year's FPL league ID:

```bash
LEAGUE_HISTORY_PROVIDER_IDS={"2025/26":"PAST_ID_HERE"}
```

Find each past ID from the FPL league URL (bookmark, email, or admin):

`https://fantasy.premierleague.com/leagues/<PAST_ID>/standings/c`

Then run once in sync-cron:

```bash
FPL_FORCE_HISTORY_IMPORT=1 FPL_SYNC_FORCE=1 npm run job:automated-sync
```

This purges incorrect summary archives and re-imports from the configured league IDs.

## Archive types

1. **Full archive** — captured during the live season via automated sync (GW scrolling)
2. **Summary archive** — final league table from that season's FPL league standings API

## What we do *not* use

Manager career history (`entry/.../history/past`) is **global FPL performance**, not your
private league table. That approach showed wrong managers and wrong rankings — it has been removed.

## URLs

| Path | Purpose |
|------|---------|
| `/history` | List archived seasons |
| `/history/2025-26` | Season view |
