#!/usr/bin/env bash
set -euo pipefail

# Rebuild missing/stale history before serving pages (avoids 404s after archive refresh).
npm run job:ensure-history || echo "[start] history refresh failed — starting web anyway"

# One schedule-gated sync before serving (history ensure + live refresh).
npm run job:automated-sync || echo "[start] live sync failed — starting web anyway"

# Live 15-minute sync runs in-process via src/instrumentation.ts when Next.js starts.

exec npm run start
