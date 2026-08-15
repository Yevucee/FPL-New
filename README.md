# Swiss Expert League — Live standings & archive

A private Fantasy Premier League league's **live standings hub** and growing
**season archive**. Built as a modular monolith — Next.js (App Router) + TypeScript,
PostgreSQL, Drizzle ORM, and Zod, targeting Railway.

## What members see today

- **Live standings** with gameweek picker (once the season is underway)
- **Gameweek winner** and **monthly leader** awards
- **League storylines** — wooden spoon, biggest climber/faller, form table, chips played, bench hoarder, transfer gambler, season-best GW
- **Pre-season view** — registered manager count before GW1
- JSON API at `/api/v1/league/standings`

## Data-source policy

FPL's public JSON endpoints are undocumented and their terms restrict automated
extraction. This app therefore:

- Uses a `FantasyDataProvider` abstraction
- Defaults to `fixtures` (sample data) for development
- Uses `manual` mode in production: you run `npm run fetch:fpl` after each gameweek
- Never stores FPL credentials or submits team changes

## Quick start (development)

```bash
bash scripts/install.sh   # Postgres + deps + sample import
bash scripts/start.sh     # ensure Postgres is up
# Next.js runs in the next-dev terminal (port 3000)
open http://localhost:3000/league
```

## Live season workflow (once you have the FPL league ID)

1. Copy `.env.example` → `.env`
2. Set `LEAGUE_PROVIDER_ID` from your FPL league URL:
   `https://fantasy.premierleague.com/leagues/<ID>/standings/c`
3. Set `FANTASY_PROVIDER_MODE=manual`
4. After each gameweek deadline (when FPL updates scores):

```bash
npm run sync:fpl
# or: npm run fetch:fpl && FANTASY_PROVIDER_MODE=manual npm run job:sync-current
```

5. Share the deployed URL with the league

## Railway deploy

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
| `npm run fetch:fpl` | Pull public FPL league → `data/league-snapshot.json` |
| `npm run sync:fpl` | Fetch + import into Postgres |
| `npm run import:legacy` | Import archived season from legacy Supabase export |
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

**Historical data:** see [docs/HISTORICAL_DATA.md](docs/HISTORICAL_DATA.md).
