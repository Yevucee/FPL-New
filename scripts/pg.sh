#!/usr/bin/env bash
# Shared PostgreSQL helpers for the local Cloud Agent development environment.
#
# Runs a project-local PostgreSQL cluster as the current (non-root) user, with
# no systemd/service dependency. Every function is idempotent so it is safe to
# call from both install (one-time) and start (per-boot) paths.
set -euo pipefail

PG_MAJOR="${PG_MAJOR:-16}"
PGBIN="/usr/lib/postgresql/${PG_MAJOR}/bin"
export PGDATA="${PGDATA:-$HOME/.fpl/pgdata}"
PG_PORT="${PG_PORT:-5432}"
PG_LOG="${PG_LOG:-$HOME/.fpl/pg.log}"
DB_NAME="${DB_NAME:-fpl}"
DB_USER="${DB_USER:-fpl}"
DB_PASS="${DB_PASS:-fpl}"

pg_ensure_installed() {
  if [ ! -x "$PGBIN/initdb" ]; then
    echo "[pg] installing postgresql-${PG_MAJOR} ..."
    sudo apt-get update -qq
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
      postgresql postgresql-contrib
  fi
}

pg_ensure_cluster() {
  mkdir -p "$(dirname "$PGDATA")"
  if [ ! -f "$PGDATA/PG_VERSION" ]; then
    echo "[pg] initializing cluster at $PGDATA"
    "$PGBIN/initdb" -D "$PGDATA" -U postgres --auth=trust --encoding=UTF8 >/dev/null
    sed -i "/unix_socket_directories/d" "$PGDATA/postgresql.conf"
    {
      echo "unix_socket_directories = '/tmp'"
      echo "listen_addresses = '127.0.0.1'"
      echo "port = $PG_PORT"
    } >>"$PGDATA/postgresql.conf"
  fi
}

pg_start() {
  if "$PGBIN/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; then
    echo "[pg] already running"
  else
    echo "[pg] starting"
    "$PGBIN/pg_ctl" -D "$PGDATA" -l "$PG_LOG" -w start
  fi
}

pg_wait_ready() {
  for _ in $(seq 1 30); do
    if "$PGBIN/pg_isready" -h 127.0.0.1 -p "$PG_PORT" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "[pg] database did not become ready" >&2
  tail -n 20 "$PG_LOG" >&2 || true
  return 1
}

pg_ensure_role_db() {
  "$PGBIN/psql" -h /tmp -U postgres -tc \
    "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 ||
    "$PGBIN/psql" -h /tmp -U postgres -c \
      "CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASS' SUPERUSER;"
  "$PGBIN/psql" -h /tmp -U postgres -tc \
    "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 ||
    "$PGBIN/psql" -h /tmp -U postgres -c \
      "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
}

pg_up() {
  pg_ensure_installed
  pg_ensure_cluster
  pg_start
  pg_wait_ready
  pg_ensure_role_db
  echo "[pg] ready on 127.0.0.1:$PG_PORT (db=$DB_NAME user=$DB_USER)"
}
