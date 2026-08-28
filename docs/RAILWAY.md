# Railway deployment — Swiss Expert League

Everything runs automatically once `LEAGUE_PROVIDER_ID` is set. You do not need
to run sync commands manually.

## Architecture

| Service | Config | What it does |
|---------|--------|--------------|
| **Web** | `railway.toml` | Next.js app — standings, history, API; **preDeploy** runs `job:ensure-history` |
| **Sync cron** | `railway.cron.toml` | `job:automated-sync` every 15 min (gated) |

### Automated sync pipeline (`job:automated-sync`)

Cron ticks every **15 minutes**. The job itself decides whether to call FPL:

| When | Frequency |
|------|-----------|
| **PL fixture live** | Every 15 min — while FPL reports a game in play |
| **Post-whistle buffer** | Every 15 min — up to 15 min after a fixture ends |
| **GW deadline** | Once — ~10 min after FPL `deadline_time` (any day of week) |
| **End of fixture day** | Once — 1 hour after the last game that UK calendar day finishes |
| **Morning after** | Once — 08:00 UK the day after fixtures were played |
| **GW finalised** | Once — when FPL marks the GW `finished` + `data_checked` |
| **Other times** | Skipped — no FPL calls |

1. **Live season** — fetch FPL standings, GW scores, chips, transfers, manager meta
2. **Post-deadline enrich** — captain picks + most-owned (only after GW deadline)
3. **History bootstrap** — import past season final tables from FPL (once, then skip)
4. **History refresh** — rebuild reconstructed archives when former members (e.g. Dominik) are missing or new managers join

Each **web deploy** starts the app immediately, runs one schedule-gated sync, and keeps a
**sync watcher process** alive alongside Next.js (same container) for 15-minute live refresh
during PL fixtures even if sync-cron misses ticks.

Force a full run locally: `FPL_SYNC_FORCE=1 npm run job:automated-sync`

## Setup

### 1. Create project

[railway.app/new](https://railway.app/new) → deploy `FPL-New` from GitHub.

### 2. Add PostgreSQL

**+ New** → **Database** → **PostgreSQL**

### 3. Web service variables

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `LEAGUE_SLUG` | `swiss-expert-league` |
| `LEAGUE_DISPLAY_NAME` | `Swiss Expert League` |
| `LEAGUE_SHORT_NAME` | `SEL` |
| `LEAGUE_VISIBILITY` | `unlisted` |
| `LEAGUE_PROVIDER_ID` | `1004960` *(Swiss Expert League — 2026/27 renewal)* |
| `LEAGUE_HISTORY_PROVIDER_IDS` | `{"2025/26":"<last-season-id>"}` *(one FPL league ID per past season)* |
| `FANTASY_PROVIDER_MODE` | `manual` |
| `APP_TIMEZONE` | `Europe/Zurich` |
| `SCORING_TIMEZONE` | `Europe/London` |
| `PLANNER_SECRET` | *(your private passcode)* — unlocks `/planner` team-building page |
| `PORT` | `3000` |

Generate a public domain under **Networking**.

### 4. Sync cron service

1. **+ New** → **GitHub Repo** → same `FPL-New` repo
2. Rename to **sync-cron**
3. **Settings** → **Config file path** → `railway.cron.toml`
4. Copy the **same variables** as Web (especially `DATABASE_URL`, `LEAGUE_PROVIDER_ID`)

Cron runs `db:migrate` before each deploy (same as Web). Cron schedule: `*/15 * * * *` (every 15 min, gated inside the job). Tune in Railway if needed.

### 5. When the league renews

Set `LEAGUE_PROVIDER_ID=1004960` on **both** Web and sync-cron (Swiss Expert League
2026/27 renewal). FPL creates a new private league ID each season — add past IDs via
`LEAGUE_HISTORY_PROVIDER_IDS` (see [HISTORICAL_DATA.md](HISTORICAL_DATA.md)).

Within one maintenance or match-window sync:

- Live standings appear on `/league`
- Past seasons appear on `/history`
- Post-deadline stats (most owned, captains) fill in after the first GW deadline

**Nothing to run manually.**

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Pre-season, 0 managers | League ID wrong or league not renewed yet — check sync-cron logs |
| Stale data | Check sync-cron ran successfully; FPL may not have updated yet |
| sync-cron "Deployment crashed" | Usually an unhandled error during enrich/history at GW deadline — check deploy logs; cron now retries incomplete one-offs and exits cleanly on partial failures |
| No history | Wait for first automated sync after `LEAGUE_PROVIDER_ID` is set |
| `/ready` 503 | Postgres not linked or migrations failed |

## Local development only

```bash
bash scripts/install.sh
LEAGUE_PROVIDER_ID=123456 npm run job:automated-sync
```

Production uses Railway cron — not manual syncs.
