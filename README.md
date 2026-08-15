# FPL League Archive + Private Team Planner

A private Fantasy Premier League league's **permanent record book** plus an
owner-only **decision desk**. Built as a modular monolith following
[`fpl-league-platform-cursor-build-spec`](#) — Next.js (App Router) + TypeScript,
PostgreSQL, Drizzle ORM, and Zod, targeting Railway.

> This repository currently contains the **Phase 1 first slice**: project
> scaffold, core schema + migrations, a fixtures data provider, an idempotent
> sample import, the current-league standings API/page, and health/readiness
> endpoints. Later phases (history archive, private planner, optimiser) build on
> this foundation. See the build specification for the full roadmap.

## Data-source policy

The current FPL JSON endpoints are undocumented and their terms restrict
automated extraction. This app therefore ships behind a `FantasyDataProvider`
abstraction and defaults to `FANTASY_PROVIDER_MODE=fixtures` (recorded/synthetic
sample data). It never stores FPL credentials/cookies and never submits team
changes. See specification section 2.

## Tech stack

- **Web/full stack:** Next.js App Router + strict TypeScript
- **UI:** Tailwind CSS (original league branding)
- **Database:** PostgreSQL + Drizzle ORM & SQL migrations
- **Validation:** Zod at provider/API boundaries
- **Tests:** Vitest (unit), Playwright (planned e2e)

## Requirements

- Node.js >= 22
- PostgreSQL 16 (a project-local cluster is provisioned automatically by the
  setup scripts; no root service required)

## Quick start

```bash
# 1) One-time bootstrap: starts a local PostgreSQL, installs deps,
#    runs migrations, and imports the sample league. Idempotent.
bash scripts/install.sh

# 2) Start PostgreSQL (if not already) + the dev server.
bash scripts/start.sh
# open http://localhost:3000/league
```

Manual equivalents:

```bash
npm ci
npm run db:migrate         # apply Drizzle migrations
npm run job:sync-current   # idempotent sample import (fixtures provider)
npm run dev                # Next.js dev server on 0.0.0.0:3000
```

## Useful endpoints

| Path | Purpose |
|---|---|
| `/league` | Current standings, Gameweek winner, monthly leader |
| `/api/v1/league/standings` | Standings + awards as JSON (`{ data, meta, error }`) |
| `/api/v1/meta/freshness` | Last sync run + automatic-sync flag |
| `/health` | Liveness (process only) |
| `/ready` | Readiness (checks the database) |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `next lint` |
| `npm run test` | Vitest unit tests |
| `npm run db:generate` | Generate a Drizzle migration from schema changes |
| `npm run db:migrate` | Apply migrations |
| `npm run job:sync-current` | Import the current league from the active provider |

## Configuration

Copy `.env.example` to `.env`. Key variables:

- `DATABASE_URL` — PostgreSQL connection (Railway: use the **private** URL).
- `FANTASY_PROVIDER_MODE` — `fixtures` (default) | `manual` | `approved-fpl`.
- `AUTOMATIC_SYNC_ENABLED` — stays `false` until a lawful FPL access basis is
  confirmed.

## Project layout

```text
src/
  app/          # pages + route handlers (App Router)
  contracts/    # Zod schemas validated at boundaries
  db/           # Drizzle schema, client, migrate runner
  ingestion/    # idempotent snapshot import
  jobs/         # short-lived job entrypoints (Railway cron)
  lib/          # shared helpers (API envelope)
  metrics/      # pure standings/award functions (+ unit tests)
  providers/    # FantasyDataProvider interface + fixtures provider + sample data
  server/       # server-side data loaders for pages/APIs
scripts/        # local environment bootstrap (PostgreSQL + install/start)
drizzle/        # generated SQL migrations
```
