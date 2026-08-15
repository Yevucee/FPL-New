#!/usr/bin/env bash
set -euo pipefail

# Refresh stale history archives in the background so the web server starts immediately.
npm run job:ensure-history &
exec npm run start
