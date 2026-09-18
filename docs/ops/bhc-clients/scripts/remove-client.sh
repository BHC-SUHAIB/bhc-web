#!/usr/bin/env bash
# Remove a client site from the bhc-clients stack (the reverse of add-client.sh).
#
# Usage: cd /opt/bhc-clients && bash scripts/remove-client.sh <slug> [--purge] [--yes]
#
#   default : stop + remove the container, drop the compose service + Caddy block.
#             KEEPS the database, clients/<slug>/ (code, .env, media) and backups.
#   --purge : ALSO drops the database + role and deletes clients/<slug>/.
#             Backups in /root/db-backups/<db>/ are always kept (14-day rotation).
#
# Take a final backup first:  sudo /root/db-backups/backup.sh

set -euo pipefail
cd "$(dirname "$0")/.."

SLUG="${1:-}"; PURGE="${2:-}"; YES="${3:-}"
[[ "$PURGE" == "--yes" ]] && { PURGE=""; YES="--yes"; }
[[ -z "$SLUG" ]] && { echo "usage: $0 <slug> [--purge]" >&2; exit 1; }
[[ "$SLUG" =~ ^[a-z0-9][a-z0-9-]{1,40}$ ]] || { echo "bad slug" >&2; exit 1; }

set -a; source .env; set +a
PGUSER="${POSTGRES_USER:-bhc_admin}"
DBNAME="${SLUG//-/_}"
log() { printf '\033[1;32m==>\033[0m %s\n' "$*"; }
psql_admin() { docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U "$PGUSER" -d postgres -Atq "$@"; }

if [[ "$YES" != "--yes" ]]; then
  read -r -p "Remove client '$SLUG'${PURGE:+ AND PURGE its database + files}? [y/N] " ans < /dev/tty
  [[ "$ans" == "y" || "$ans" == "Y" ]] || { echo "aborted"; exit 1; }
fi

if grep -qE "^  $SLUG:$" docker-compose.yml; then
  log "Stopping container"
  docker compose rm -sf "$SLUG" >/dev/null 2>&1 || true
  log "Removing service block from docker-compose.yml"
  # Delete from "  <slug>:" up to (not including) the next top-level service or EOF.
  awk -v s="  $SLUG:" '
    $0 == s { skip=1; next }
    skip && /^  [a-z0-9-]+:$/ { skip=0 }
    !skip { print }
  ' docker-compose.yml > docker-compose.yml.tmp
  # Trim trailing blank lines.
  sed -e :a -e '/^\n*$/{$d;N;ba' -e '}' docker-compose.yml.tmp > docker-compose.yml
  rm -f docker-compose.yml.tmp
  docker compose config -q
fi

if [[ -f "caddy/sites/$SLUG.caddy" ]]; then
  log "Removing Caddy site + reloading"
  rm -f "caddy/sites/$SLUG.caddy"
  docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile 2>/dev/null
fi

if [[ "$PURGE" == "--purge" ]]; then
  log "Dropping database + role $DBNAME"
  psql_admin -c "DROP DATABASE IF EXISTS \"$DBNAME\" WITH (FORCE)"
  psql_admin -c "DROP ROLE IF EXISTS \"$DBNAME\""
  log "Deleting clients/$SLUG"
  sudo rm -rf "clients/$SLUG" 2>/dev/null || rm -rf "clients/$SLUG"
else
  log "Kept database $DBNAME and clients/$SLUG/ (use --purge to delete)"
fi
log "Done"
