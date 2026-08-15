#!/usr/bin/env bash
# Per-boot startup: ensure PostgreSQL is up, then run the Next.js dev server
# in the foreground (it stays attached for the life of the environment).
set -euo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=scripts/pg.sh
source scripts/pg.sh

pg_up

echo "== starting Next.js dev server on http://0.0.0.0:3000 =="
exec npm run dev
