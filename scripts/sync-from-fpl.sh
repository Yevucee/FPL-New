#!/usr/bin/env bash
# Fully automated FPL sync — used by Railway cron and optional local dev.
set -euo pipefail
cd "$(dirname "$0")/.."
npm run job:automated-sync
