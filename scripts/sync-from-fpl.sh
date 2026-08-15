#!/usr/bin/env bash
# Fetch the latest FPL snapshot, then import it into PostgreSQL.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== Swiss Expert League: fetch + sync =="
npm run fetch:fpl
FANTASY_PROVIDER_MODE=manual npm run job:sync-current
npm run enrich:fpl || echo "[sync] enrich skipped (pre-deadline or already done)"
echo "== Done. Open /league to verify. =="
