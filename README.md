# Swiss Expert League — Live standings & archive

A private Fantasy Premier League league's **live standings hub** and growing
**season archive**. Built as a modular monolith — Next.js (App Router) + TypeScript,
PostgreSQL, Drizzle ORM, and Zod, targeting Railway.

## What members see today

- **Live standings** with gameweek picker (once the season is underway)
- **Gameweek winner** and **monthly leader** awards
- **League storylines** — wooden spoon, biggest climber/faller, form table, bench hoarder, transfer gambler, season-best GW
- **Team planner** (`/planner`) — your squad with drag-and-drop XI/bench, next 5 fixtures, GW planning, plus league chips/transfers intel
- **Pre-season view** — registered manager count before GW1
- JSON API at `/api/v1/league/standings`

## Data-source policy

FPL's public JSON endpoints are undocumented and their terms restrict automated
extraction. This app therefore:

- Uses a `FantasyDataProvider` abstraction
- Defaults to `fixtures` (sample data) for development
- Production: Railway cron runs `job:automated-sync` every 6 hours (no manual steps)
- Never stores FPL credentials or submits team changes

## Quick start (development)

```bash
bash scripts/install.sh   # Postgres + deps + sample import
bash scripts/start.sh     # ensure Postgres is up
# Next.js runs in the next-dev terminal (port 3000)
open http://localhost:3000/league
```

## Production workflow

1. Deploy to Railway (see [docs/RAILWAY.md](docs/RAILWAY.md))
2. Set `LEAGUE_PROVIDER_ID` on **web** and **sync-cron** when the FPL league renews
3. Done — cron syncs live standings, history, and post-deadline stats automatically

## Local development

**Full step-by-step guide:** [docs/RAILWAY.md](docs/RAILWAY.md)

Quick summary:

1. [railway.app/new](https://railway.app/new) → deploy `FPL-New` from GitHub
2. Add **PostgreSQL** database to the project
3. Web service variables: `DATABASE_URL` (reference Postgres), `FANTASY_PROVIDER_MODE=manual`, league config from `.env.example`
4. Generate a **public domain** under Networking
5. Add a second **sync-cron** service with config file `railway.cron.toml` (auto FPL refresh every 6 hours)

## Planned stats (next slice)

Ideas queued for a future release:

- **Longest unbeaten run** — consecutive GWs above league average
- **Closest race to leader** — smallest gap to top spot
- **Captaincy king** — best captain picks (needs captain data from FPL)
- **Monthly wooden spoon** — lowest monthly phase total
- **Head-to-head record** — mini-league style pairwise results

## Useful endpoints

| Path | Purpose |
|---|---|
| `/league` | Standings, awards, league storylines |
| `/league/preview` | In-season layout preview (sample GW data) |
| `/planner` | Team planner — live chips, transfers, ownership, captains |
| `/league?gw=3` | Standings through GW3 |
| `/history` | Archived seasons list |
| `/history/2024-25` | Past season with GW picker |
| `/api/v1/league/standings` | Standings + insights as JSON |
| `/api/v1/meta/freshness` | Last sync run |
| `/health` | Liveness |
| `/ready` | Readiness (database) |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server |
| `npm run job:automated-sync` | Full pipeline: live sync + enrich + history bootstrap |
| `npm run sync:fpl` | Alias for `job:automated-sync` |
| `npm run import:fpl-history` | Import completed seasons from official FPL entry history |
| `npm run enrich:fpl` | Post-deadline squad intel (captain + most owned) |
| `npm run job:sync-current` | Import active provider snapshot |
| `npm run test` | Vitest unit tests |

## Finding your league ID

We could not find a public listing for **Swiss Expert League**. When your FPL
league is created:

1. Open the league in a browser while logged into FPL
2. Copy the number from the URL: `fantasy.premierleague.com/leagues/123456/standings/c`
3. Set `LEAGUE_PROVIDER_ID=123456` in Railway / `.env`

## Project layout

```text
src/
  app/          # pages + route handlers
  contracts/    # Zod schemas at provider boundaries
  db/           # Drizzle schema + migrations
  ingestion/    # idempotent snapshot import
  jobs/         # sync-current entrypoint
  lib/          # league config, API envelope
  metrics/      # standings, awards, insights (+ tests)
  providers/    # fixtures, manual, FPL fetch helpers
  server/       # server-side data loaders
scripts/        # install, start, fetch-fpl, sync-from-fpl, import-legacy
data/           # live snapshot + legacy exports
```

**Historical data:** see [docs/HISTORICAL_DATA.md](docs/HISTORICAL_DATA.md). Uses official FPL API — full GW history only for seasons synced live; older seasons show final standings from FPL season totals.
