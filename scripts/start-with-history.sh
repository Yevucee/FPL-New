#!/usr/bin/env bash
set -euo pipefail

# Rebuild missing/stale history before serving pages (avoids 404s after archive refresh).
npm run job:ensure-history || echo "[start] history refresh failed — starting web anyway"

# One schedule-gated sync before serving traffic.
npm run job:automated-sync || echo "[start] live sync failed — starting web anyway"

# Run 15-minute sync watcher alongside Next.js. Do NOT exec — that orphans the watcher on Railway.
npm run job:sync-watch &
SYNC_WATCH_PID=$!

cleanup() {
  kill "$SYNC_WATCH_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

npm run start
