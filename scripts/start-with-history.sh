#!/usr/bin/env bash
set -euo pipefail

# Rebuild missing/stale history before serving pages (avoids 404s after archive refresh).
npm run job:ensure-history || echo "[start] history refresh failed — starting web anyway"

# Fallback live sync when sync-cron is delayed or down (schedule-gated inside the job).
npm run job:automated-sync || echo "[start] live sync failed — starting web anyway"

exec npm run start
