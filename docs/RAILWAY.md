# Railway deployment — Swiss Expert League

Everything runs automatically once `LEAGUE_PROVIDER_ID` is set. You do not need
to run sync commands manually.

## Architecture

| Service | Config | What it does |
|---------|--------|--------------|
| **Web** | `railway.toml` | Next.js app — standings, history, API |
| **Sync cron** | `railway.cron.toml` | `job:automated-sync` every 6 hours |

### Automated sync pipeline (`job:automated-sync`)

1. **Live season** — fetch FPL standings, GW scores, chips, transfers, manager meta
2. **Post-deadline enrich** — captain picks + most-owned (only after GW deadline)
3. **History bootstrap** — import past season final tables from FPL (once, then skip)

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
| `LEAGUE_PROVIDER_ID` | *(FPL league ID — set when league renews)* |
| `FANTASY_PROVIDER_MODE` | `manual` |
| `APP_TIMEZONE` | `Europe/Zurich` |
| `SCORING_TIMEZONE` | `Europe/London` |
| `PORT` | `3000` |

Generate a public domain under **Networking**.

### 4. Sync cron service

1. **+ New** → **GitHub Repo** → same `FPL-New` repo
2. Rename to **sync-cron**
3. **Settings** → **Config file path** → `railway.cron.toml`
4. Copy the **same variables** as Web (especially `DATABASE_URL`, `LEAGUE_PROVIDER_ID`)

Cron schedule: `0 */6 * * *` (every 6 hours). Tune during the season if needed
(e.g. more frequent on deadline weekends).

### 5. When the league renews

Set `LEAGUE_PROVIDER_ID` on **both** Web and sync-cron to the Swiss Expert League
ID from the FPL URL:

`https://fantasy.premierleague.com/leagues/<ID>/standings/c`

Within one cron cycle (~6 hours):

- Live standings appear on `/league`
- Past seasons appear on `/history`
- Post-deadline stats (most owned, captains) fill in after the first GW deadline

**Nothing to run manually.**

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Pre-season, 0 managers | League ID wrong or league not renewed yet — check sync-cron logs |
| Stale data | Check sync-cron ran successfully; FPL may not have updated yet |
| No history | Wait for first automated sync after `LEAGUE_PROVIDER_ID` is set |
| `/ready` 503 | Postgres not linked or migrations failed |

## Local development only

```bash
bash scripts/install.sh
LEAGUE_PROVIDER_ID=123456 npm run job:automated-sync
```

Production uses Railway cron — not manual syncs.
