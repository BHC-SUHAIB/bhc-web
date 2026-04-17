#!/usr/bin/env bash
# Daily database + media backup. Dumps Postgres and tars /app/media.
# Keeps the last 7 days of backups in /opt/bhc-web/backups.
#
# Wire as a daily cron (on the droplet):
#   sudo crontab -e
#   0 3 * * *  /opt/bhc-web/scripts/backup.sh >> /var/log/bhc-backup.log 2>&1
#
# For off-site backups, extend this to upload to DO Spaces (see deploy doc).

set -euo pipefail

cd "$(dirname "$0")/.."
source .env

STAMP=$(date -u +%Y%m%d-%H%M%S)
DIR="backups"
mkdir -p "$DIR"

# Postgres dump
docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-bhc}" -d "${POSTGRES_DB:-bhc}" \
  | gzip > "$DIR/db-$STAMP.sql.gz"

# Media tar
docker run --rm \
  -v bhc-web_media:/source:ro \
  -v "$PWD/$DIR:/out" \
  alpine:3 \
  tar -czf "/out/media-$STAMP.tar.gz" -C /source .

# Retention: keep last 7 days
find "$DIR" -type f -name 'db-*.sql.gz'  -mtime +7 -delete
find "$DIR" -type f -name 'media-*.tar.gz' -mtime +7 -delete

echo "[$(date -u)] backup complete: $DIR/db-$STAMP.sql.gz + $DIR/media-$STAMP.tar.gz"
