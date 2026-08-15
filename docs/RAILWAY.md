# Railway deployment — Swiss Expert League

This guide deploys two Railway services from the same GitHub repo:

| Service | Config file | Purpose |
|---------|-------------|---------|
| **Web** | `railway.toml` | Next.js app (standings UI + API) |
| **Sync cron** | `railway.cron.toml` | Fetches FPL data every 6 hours |

## Prerequisites

- [Railway account](https://railway.app)
- GitHub repo connected: `Yevucee/FPL-New`
- Branch merged or deploy from `cursor/swiss-expert-league-live-e3b3`
- FPL league ID (when available)

## Step 1 — Create project

1. Go to [railway.app/new](https://railway.app/new)
2. **Deploy from GitHub repo** → select `FPL-New`
3. Railway creates a **Web** service automatically

## Step 2 — Add PostgreSQL

1. In the project canvas, click **+ New** → **Database** → **PostgreSQL**
2. Wait for provisioning (~30 seconds)

## Step 3 — Configure the Web service

Open the **Web** service (not Postgres) → **Variables** tab.

### Required variables

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Click **Add Reference** → `${{Postgres.DATABASE_URL}}` |
| `LEAGUE_SLUG` | `swiss-expert-league` |
| `LEAGUE_DISPLAY_NAME` | `Swiss Expert League` |
| `LEAGUE_SHORT_NAME` | `SEL` |
| `LEAGUE_VISIBILITY` | `unlisted` |
| `LEAGUE_PROVIDER_ID` | *(your FPL league ID — leave empty until you have it)* |
| `FANTASY_PROVIDER_MODE` | `manual` |
| `SNAPSHOT_PATH` | `data/league-snapshot.json` |
| `APP_TIMEZONE` | `Europe/Zurich` |
| `SCORING_TIMEZONE` | `Europe/London` |
| `NEXT_TELEMETRY_DISABLED` | `1` |

### Networking

1. **Settings** → **Networking** → **Generate Domain**
2. Copy the URL (e.g. `https://fpl-new-production.up.railway.app`)
3. Set variable `APP_URL` to that URL

### Deploy

Railway auto-deploys on push. The web service will:

1. `npm ci && npm run build`
2. Pre-deploy: `npm run db:migrate`
3. Start: `npm run start`
4. Health check: `/ready`

## Step 4 — First data import (once you have league ID)

After `LEAGUE_PROVIDER_ID` is set, run a one-off sync from your machine **or** trigger the cron service manually:

```bash
# Local (with Railway DATABASE_URL from dashboard → Connect → Public URL)
export DATABASE_URL="postgresql://..."
export LEAGUE_PROVIDER_ID="your_id"
export FANTASY_PROVIDER_MODE=manual
npm run sync:fpl
```

Or use Railway CLI:

```bash
npx railway login
npx railway link          # select project + web service
npx railway run npm run sync:fpl
```

## Step 5 — Add cron sync service

1. Project canvas → **+ New** → **GitHub Repo** → same `FPL-New` repo
2. Rename service to **sync-cron**
3. **Settings** → **Config file path** → `railway.cron.toml`
4. **Variables** — copy the same vars as Web (especially `DATABASE_URL`, `LEAGUE_PROVIDER_ID`, `FANTASY_PROVIDER_MODE=manual`)
5. **Settings** → confirm **Cron Schedule** shows `0 */6 * * *` (every 6 hours)

The cron service runs `npm run sync:fpl` on schedule: fetch from FPL → import to Postgres.

Tune the schedule during the season (e.g. `0 8,14,22 * * 5,6,0` for Fri–Sun evenings).

## Step 6 — Share with the league

Post the generated Railway URL in your Swiss Expert League chat. Members can bookmark `/league`.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Deploy fails on migrate | Check `DATABASE_URL` reference is set on Web service |
| `/ready` returns 503 | Postgres not linked or migrations failed — check deploy logs |
| Pre-season shows 0 managers | Set `LEAGUE_PROVIDER_ID` and run `npm run sync:fpl` once |
| Stale standings | Check sync-cron logs; run manual sync; verify FPL has updated |
| Build fails on Node version | `.node-version` pins Node 22 |

## Cost estimate

Railway Hobby plan: ~$5/month credit. Web + Postgres + infrequent cron typically fits within free tier for a small private league.
