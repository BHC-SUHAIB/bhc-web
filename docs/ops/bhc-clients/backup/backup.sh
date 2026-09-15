#!/usr/bin/env bash
# Nightly backup for the bhc-clients droplet. Installed at /root/db-backups/backup.sh,
# run by root's crontab at 3:30 AM America/Chicago (see crontab.txt).
#
#   for every database in the postgres container (except templates + 'postgres'):
#       pg_dump -F c  -> /root/db-backups/<db>/<db>-YYYY-MM-DD_HHMMSS.dump
#   for every client with media:  tar  -> /root/db-backups/<db>/<db>-media-<stamp>.tar.gz
#   delete anything older than 14 days; append a line per run to backup.log
#
# TODO (runbook): weekly off-box copy to DO Spaces (s3cmd / rclone) is NOT wired yet.

set -uo pipefail
BACKUP_DIR="/root/db-backups"
KEEP_DAYS=14
STACK_DIR="/opt/bhc-clients"
CONTAINER="bhc-clients-postgres"
LOG="$BACKUP_DIR/backup.log"
STAMP="$(date +%Y-%m-%d_%H%M%S)"

mkdir -p "$BACKUP_DIR"
exec > >(tee -a "$LOG") 2>&1
log() { printf '[%s] %s\n' "$(date '+%F %T')" "$*"; }

set -a; source "$STACK_DIR/.env"; set +a
PGUSER="${POSTGRES_USER:-bhc_admin}"

if ! docker exec "$CONTAINER" pg_isready -U "$PGUSER" -d postgres >/dev/null 2>&1; then
  log "ERROR: $CONTAINER not ready; aborting"
  exit 1
fi

DBS="$(docker exec "$CONTAINER" psql -U "$PGUSER" -d postgres -Atq \
  -c "SELECT datname FROM pg_database WHERE datistemplate = false AND datname <> 'postgres' ORDER BY 1")"

if [[ -z "$DBS" ]]; then
  log "no client databases yet; nothing to dump"
fi

ok=0; fail=0
for db in $DBS; do
  dir="$BACKUP_DIR/$db"; mkdir -p "$dir"
  out="$dir/$db-$STAMP.dump"
  if docker exec "$CONTAINER" pg_dump -U "$PGUSER" -F c -d "$db" > "$out.tmp" && mv "$out.tmp" "$out"; then
    log "ok   $db  db  $(du -h "$out" | cut -f1)  $out"
    ok=$((ok+1))
  else
    log "FAIL $db  db  (see errors above)"; rm -f "$out.tmp"; fail=$((fail+1))
  fi
  # media dir lives at clients/<slug>/media where slug = db with hyphens
  slug="${db//_/-}"
  media="$STACK_DIR/clients/$slug/media"
  if [[ -d "$media" ]] && [[ -n "$(ls -A "$media" 2>/dev/null)" ]]; then
    mout="$dir/$db-media-$STAMP.tar.gz"
    if tar -czf "$mout" -C "$media" .; then
      log "ok   $db  media  $(du -h "$mout" | cut -f1)"
    else
      log "FAIL $db  media"; fail=$((fail+1))
    fi
  fi
done

# 14-day rotation (dumps + media tars + pre-restore safety dumps)
deleted="$(find "$BACKUP_DIR" -type f \( -name '*.dump' -o -name '*.tar.gz' \) -mtime +$KEEP_DAYS -print -delete | wc -l)"
log "done: $ok dumped, $fail failed, $deleted old file(s) removed, disk: $(du -sh "$BACKUP_DIR" | cut -f1)"
[[ $fail -eq 0 ]]
