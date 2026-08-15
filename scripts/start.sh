#!/usr/bin/env bash
# Per-boot startup: ensure PostgreSQL is up. The Next.js dev server runs in a
# dedicated terminal (see .cursor/environment.json) so agents can inspect logs.
set -euo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=scripts/pg.sh
source scripts/pg.sh

pg_up

echo "== PostgreSQL ready; Next.js dev server runs in the next-dev terminal =="
