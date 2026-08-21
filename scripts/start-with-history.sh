#!/usr/bin/env bash
set -euo pipefail

# Rebuild missing/stale history before serving pages (avoids 404s after archive refresh).
npm run job:ensure-history || echo "[start] history refresh failed — starting web anyway"
exec npm run start
