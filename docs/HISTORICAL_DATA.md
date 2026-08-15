# Historical season data (official FPL)

Past seasons are loaded from **official FPL public API** endpoints — not from
legacy databases.

## What FPL provides

| Source | Data available |
|--------|----------------|
| `entry/{id}/history/` → `current` | Gameweek-by-gameweek for the **active** season |
| `entry/{id}/history/` → `past` | **Season-end totals only** for completed seasons |
| `leagues-classic/{id}/standings/` | Current season league table only |

FPL does **not** publish gameweek-by-gameweek league standings for seasons that
have already finished. After rollover, only season totals remain in `past`.

## Two archive modes

1. **Full archive** (`state = archived`) — captured via `npm run sync:fpl` during
   the live season. Supports GW picker, awards, and storylines.
2. **Summary archive** (`state = archived-summary`) — imported from FPL `past`
   totals via `npm run import:fpl-history`. Final standings only.

When a new season sync runs, the previous active season is auto-archived with
full GW data (if you synced through the season).

## Import completed seasons from FPL

Requires `LEAGUE_PROVIDER_ID` in `.env` / Railway.

```bash
# All completed seasons for current league members
npm run import:fpl-history

# One season
FPL_HISTORY_SEASON=2025/26 npm run import:fpl-history
```

On Railway (web service shell):

```bash
npm run import:fpl-history
```

Browse at `/history`.

## Live season capture (recommended going forward)

After each gameweek:

```bash
npm run sync:fpl
```

This stores official FPL gameweek data in Postgres. When the next FPL season
starts and you sync again, the finished season is archived automatically with
full GW history.

## URLs

| Path | Purpose |
|------|---------|
| `/history` | List archived seasons |
| `/history/2025-26` | Season view (GW picker if full archive) |
| `/history/2025-26?gw=12` | Standings through GW12 (full archive only) |

## Limitations

- Past-season GW scrolling is only possible for seasons synced during the live year.
- FPL `past` imports use current league membership; managers who left the league
  are not included.
- Team names in summary imports reflect current FPL team names, not historical names.
