#!/usr/bin/env bash
# Nightly backup of the job-hunt cockpit: the SQLite DB (consistent snapshot via
# the sqlite3 .backup API) plus the uploaded resume/cover files. Keeps the last
# 14 daily archives.
#
# Install on the droplet (run once):
#   crontab -e
#   15 3 * * * /opt/bhc-web/scripts/backup-jobhunt.sh >> /var/log/jobhunt-backup.log 2>&1
set -euo pipefail

DATA_DIR="${JOBHUNT_DATA_DIR:-/opt/bhc-web/jobhunt-data}"
DEST="${JOBHUNT_BACKUP_DIR:-/opt/bhc-web/backups/jobhunt}"
KEEP=14
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$DEST"

if [[ ! -f "$DATA_DIR/jobhunt.db" ]]; then
  echo "[backup] no DB at $DATA_DIR/jobhunt.db — nothing to do"
  exit 0
fi

# Consistent DB snapshot. Prefer the running container's sqlite; fall back to a
# host sqlite3 if present, else a WAL-checkpointed file copy.
SNAP="$DEST/jobhunt-$STAMP.db"
if docker exec bhc-jobhunt sh -c 'command -v sqlite3 >/dev/null 2>&1'; then
  docker exec bhc-jobhunt sqlite3 /data/jobhunt.db ".backup '/data/.backup-tmp.db'"
  cp "$DATA_DIR/.backup-tmp.db" "$SNAP"
  rm -f "$DATA_DIR/.backup-tmp.db"
elif command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DATA_DIR/jobhunt.db" ".backup '$SNAP'"
else
  # Last resort: copy the DB plus WAL/SHM so no committed data is lost.
  cp "$DATA_DIR/jobhunt.db" "$SNAP"
  [[ -f "$DATA_DIR/jobhunt.db-wal" ]] && cp "$DATA_DIR/jobhunt.db-wal" "$SNAP-wal" || true
fi

# Archive DB snapshot + the files directory together.
ARCHIVE="$DEST/jobhunt-$STAMP.tar.gz"
tar -czf "$ARCHIVE" -C "$DEST" "$(basename "$SNAP")" -C "$DATA_DIR" files 2>/dev/null || \
  tar -czf "$ARCHIVE" -C "$DEST" "$(basename "$SNAP")"
rm -f "$SNAP"

echo "[backup] wrote $ARCHIVE"

# Prune old archives.
ls -1t "$DEST"/jobhunt-*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f
echo "[backup] retained last $KEEP archives in $DEST"
