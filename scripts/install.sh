#!/usr/bin/env bash
# Idempotent repository bootstrap for the Cloud Agent environment.
# Safe to run repeatedly. Must terminate (no long-running processes here).
set -euo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=scripts/pg.sh
source scripts/pg.sh

echo "== FPL League Platform: install =="

# 1) Local PostgreSQL (binaries, cluster, role/db) — the durable base.
pg_up

# 2) Local env file for tooling/dev (never overwrites an existing one).
if [ ! -f .env ]; then
  cp .env.example .env
  echo "[env] created .env from .env.example"
fi

# 3) Node dependencies (prefer the committed lockfile for reproducibility).
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

# 4) Database schema + idempotent sample import (fixtures provider).
npm run db:migrate
npm run job:sync-current

echo "== install complete =="
