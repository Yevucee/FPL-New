# Historical season data (official FPL)

Past seasons are loaded automatically from **official FPL public API** data.
No manual import is required in production.

## How it works

| When | What happens |
|------|----------------|
| `LEAGUE_PROVIDER_ID` set on Railway | Cron runs `job:automated-sync` every 6 hours |
| First sync | Imports completed seasons from FPL `history.past` (final tables) |
| Each gameweek | Live GW data synced automatically |
| After GW deadline | Captain + most-owned enriched from picks API |
| New season starts | Previous live season auto-archived with full GW history |

## Archive types

1. **Full archive** — captured during the live season via automated sync
2. **Summary archive** — season-end totals from FPL `past` (completed seasons)

## FPL API limits

FPL does not expose gameweek-by-gameweek data for seasons that have already
finished. Only seasons synced during the live year support GW scrolling.

## URLs

| Path | Purpose |
|------|---------|
| `/history` | List archived seasons |
| `/history/2025-26` | Season view |

## Force re-import (optional)

Only needed if history is missing after automation:

```bash
FPL_FORCE_HISTORY_IMPORT=1 npm run job:automated-sync
```

Run in Railway sync-cron shell — not required for normal operation.
