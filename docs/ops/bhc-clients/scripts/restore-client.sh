#!/usr/bin/env bash
# Restore one client's database from a pg_dump custom-format (.dump) file.
#
# Usage: cd /opt/bhc-clients && sudo bash scripts/restore-client.sh <slug> <dumpfile> [--yes]
#   (sudo: dumps live in /root/db-backups; --yes skips the confirmation prompt)
#   e.g. bash scripts/restore-client.sh acme-plumbing /root/db-backups/acme_plumbing/acme_plumbing-2026-09-13_0330.dump
#
# Stops the client's container, drops + recreates its database, pg_restores the
# dump, starts the container again. The current DB is overwritten: a safety
# dump is taken to /root/db-backups/<db>/pre-restore-<stamp>.dump first.

set -euo pipefail
cd "$(dirname "$0")/.."

SLUG="${1:-}"; DUMP="${2:-}"; YES="${3:-}"
[[ -z "$SLUG" || -z "$DUMP" ]] && { echo "usage: $0 <slug> <dumpfile>" >&2; exit 1; }
[[ "$SLUG" =~ ^[a-z0-9][a-z0-9-]{1,40}$ ]] || { echo "bad slug" >&2; exit 1; }
[[ -r "$DUMP" ]] || { echo "cannot read $DUMP (try: sudo $0 ...)" >&2; exit 1; }

set -a; source .env; set +a
PGUSER="${POSTGRES_USER:-bhc_admin}"
DBNAME="${SLUG//-/_}"
STAMP="$(date +%Y-%m-%d_%H%M%S)"
SAFE_DIR="/root/db-backups/$DBNAME"
log() { printf '\033[1;32m==>\033[0m %s\n' "$*"; }
psql_admin() { docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U "$PGUSER" -d postgres -Atq "$@"; }

[[ "$(psql_admin -c "SELECT 1 FROM pg_roles WHERE rolname='$DBNAME'")" == "1" ]] \
  || { echo "role $DBNAME does not exist; run add-client.sh $SLUG <host> first" >&2; exit 1; }

if [[ "$YES" != "--yes" ]]; then
  read -r -p "Overwrite database '$DBNAME' with $DUMP? [y/N] " ans < /dev/tty
  [[ "$ans" == "y" || "$ans" == "Y" ]] || { echo "aborted"; exit 1; }
fi

HAS_SVC=0; grep -qE "^  $SLUG:$" docker-compose.yml && HAS_SVC=1
if [[ $HAS_SVC -eq 1 ]]; then
  log "Stopping $SLUG"
  docker compose stop "$SLUG" >/dev/null 2>&1 || true
fi

if [[ "$(psql_admin -c "SELECT 1 FROM pg_database WHERE datname='$DBNAME'")" == "1" ]]; then
  log "Safety dump of current $DBNAME -> $SAFE_DIR/pre-restore-$STAMP.dump"
  sudo mkdir -p "$SAFE_DIR" 2>/dev/null || mkdir -p "$SAFE_DIR"
  docker compose exec -T postgres pg_dump -U "$PGUSER" -F c -d "$DBNAME" \
    | sudo tee "$SAFE_DIR/pre-restore-$STAMP.dump" >/dev/null
  log "Dropping $DBNAME"
  psql_admin -c "DROP DATABASE \"$DBNAME\" WITH (FORCE)"
fi
log "Creating empty $DBNAME"
psql_admin -c "CREATE DATABASE \"$DBNAME\" OWNER \"$DBNAME\""

log "Restoring $DUMP"
docker compose exec -T postgres pg_restore -U "$PGUSER" -d "$DBNAME" \
  --no-owner --role="$DBNAME" --exit-on-error < "$DUMP"
psql_admin -c "ALTER DATABASE \"$DBNAME\" OWNER TO \"$DBNAME\""

if [[ $HAS_SVC -eq 1 ]]; then
  log "Starting $SLUG"
  docker compose start "$SLUG"
fi
log "Restore complete. Tables: $(psql_admin -d "$DBNAME" -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null || echo '?')"
