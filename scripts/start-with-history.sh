#!/usr/bin/env bash
set -euo pipefail

# Rebuild missing/stale history before serving pages (avoids 404s after archive refresh).
npm run job:ensure-history || echo "[start] history refresh failed — starting web anyway"

# Fallback live sync when sync-cron is delayed or down (schedule-gated inside the job).
npm run job:automated-sync || echo "[start] live sync failed — starting web anyway"

# Background watcher keeps 15-minute live sync during PL fixtures (sync-cron fallback).
npm run job:sync-watch >> /tmp/sync-watch.log 2>&1 &

exec npm run start
