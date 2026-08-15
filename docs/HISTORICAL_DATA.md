# Historical season data (official FPL)

Past seasons are loaded automatically from **official FPL public API** data.
No manual import is required in production.

## How it works

| When | What happens |
|------|----------------|
| `LEAGUE_PROVIDER_ID` set on Railway | Cron runs `job:automated-sync` (gated every 15 min) |
| First sync | Imports completed seasons from FPL `history.past` (final tables) |
| Each gameweek | Live GW data synced automatically |
| After GW deadline | Captain + most-owned enriched from picks API |
| New season starts | Previous live season auto-archived with full GW history |

## Archive types

1. **Full archive** — captured during the live season via automated sync
2. **Summary archive** — season-end totals from FPL `past` (completed seasons)

## FPL API limits

FPL creates a **new league ID each season** for private leagues. The old ID only
shows that year's standings on FPL's site. This app keeps history by:

1. **Summary archives** — season-end totals from each manager's `history.past`
   (imported automatically on first sync after `LEAGUE_PROVIDER_ID` is set)
2. **Full archives** — GW-by-GW data only for seasons captured live via cron

FPL does not expose gameweek-by-gameweek league standings for completed seasons.
Only seasons synced during the live year support GW scrolling.

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
