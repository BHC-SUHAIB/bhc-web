#!/usr/bin/env bash
# sync-from-prod.sh
# Pulls a snapshot of production content (Payload Postgres DB + Spaces media
# config) and applies it to the dev droplet so changes you make in the live
# admin show up on dev for testing.
#
# Usage:
#   PROD_HOST=104.131.82.31 DEV_HOST=68.183.144.201 ./scripts/sync-from-prod.sh
#
# Or set defaults inline:
PROD_HOST="${PROD_HOST:-104.131.82.31}"
PROD_USER="${PROD_USER:-deploy}"
DEV_HOST="${DEV_HOST:-68.183.144.201}"
DEV_USER="${DEV_USER:-deploy}"
DUMP_DIR="${DUMP_DIR:-/tmp/bhc-sync}"
KEEP_DUMP_HOURS="${KEEP_DUMP_HOURS:-1}"

set -euo pipefail
mkdir -p "$DUMP_DIR"

DUMP_FILE="$DUMP_DIR/prod-$(date +%Y%m%d-%H%M%S).sql"

echo "[sync] dumping prod Postgres → $DUMP_FILE"
ssh "$PROD_USER@$PROD_HOST" '
  cd /opt/bhc-web
  # Read DB credentials from .env so we don'\''t hardcode them.
  export $(grep -E "^POSTGRES_(USER|PASSWORD|DB)=" .env | xargs)
  docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" bhc-postgres \
    pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --clean --if-exists
' > "$DUMP_FILE"

DUMP_SIZE=$(wc -c < "$DUMP_FILE")
echo "[sync] dump size: $DUMP_SIZE bytes"
if [ "$DUMP_SIZE" -lt 1000 ]; then
  echo "[sync] dump suspiciously small — aborting"
  exit 1
fi

echo "[sync] copying dump to dev → $DEV_HOST"
scp "$DUMP_FILE" "$DEV_USER@$DEV_HOST:/tmp/bhc-prod.sql"

echo "[sync] restoring on dev (drop existing data, then apply)"
ssh "$DEV_USER@$DEV_HOST" '
  cd /opt/bhc-web
  export $(grep -E "^POSTGRES_(USER|PASSWORD|DB)=" .env | xargs)
  docker exec -i -e PGPASSWORD="$POSTGRES_PASSWORD" bhc-postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < /tmp/bhc-prod.sql > /tmp/bhc-restore.log 2>&1
  tail -5 /tmp/bhc-restore.log
  rm /tmp/bhc-prod.sql
'

echo "[sync] copying S3/Spaces config from prod to dev (so media URLs resolve)"
ssh "$PROD_USER@$PROD_HOST" '
  cd /opt/bhc-web
  grep -E "^S3_" .env
' > "$DUMP_DIR/s3.env"
ssh "$DEV_USER@$DEV_HOST" "cd /opt/bhc-web && \
  sed -i '/^S3_/d' .env && \
  cat >> .env" < "$DUMP_DIR/s3.env"
ssh "$DEV_USER@$DEV_HOST" "cd /opt/bhc-web && docker compose up -d"

echo "[sync] cleaning up old dumps (keeping last $KEEP_DUMP_HOURS hours)"
find "$DUMP_DIR" -name "prod-*.sql" -mmin +$((KEEP_DUMP_HOURS * 60)) -delete 2>/dev/null || true

echo "[sync] done"
echo
echo "Verify on dev:"
echo "  curl -s -o /dev/null -w '%{http_code}\n' -u bhcdev:<pass> https://dev.blackhartconsulting.com/admin"
echo
echo "If you want this to run automatically (e.g. nightly), add a cron entry on a"
echo "machine that has SSH access to both droplets:"
echo "  0 3 * * * /path/to/sync-from-prod.sh >> /var/log/bhc-sync.log 2>&1"
