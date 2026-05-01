#!/usr/bin/env bash
# Deploy (or update) the stack. Idempotent — safe to re-run.
# Pulls latest code, rebuilds the web image, rotates containers.
#
# Usage (on the droplet):
#   cd /opt/bhc-web && bash scripts/deploy.sh

set -euo pipefail

# Ensure BuildKit is active so the Dockerfile's `--mount=type=cache` directives
# work. Default on Docker 23+ but explicit here so cache mounts persist.
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

log() { printf '\033[1;32m==>\033[0m %s\n' "$*"; }

cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "Missing .env. Copy from .env.production.example and edit it first." >&2
  exit 1
fi

log "Pulling latest code"
git pull --ff-only

log "Building web image (Turbopack cache persists via BuildKit cache mounts)"
docker compose build web

# Pre-push schema cleanup. Drizzle's schema-push does interactive
# rename detection — when an old block-array table looks like a rename
# of a newly-introduced collection table, it prompts on stdin and
# hangs the web container in production (no TTY). Drop tables for
# fields that have been removed BEFORE the web container boots, so
# push has no ambiguity. Idempotent: DROP TABLE IF EXISTS is a no-op
# once the table is gone, so this block is safe to keep across deploys.
#
# Uses `docker exec bhc-postgres` directly (not `docker compose exec`)
# so the step doesn't depend on the compose project context being
# inferred correctly. The container name is set via `container_name:`
# in docker-compose.yml — fixed across deploys.
log "Pre-push: dropping legacy testimonials items tables (idempotent)"
docker exec -i bhc-postgres bash -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
DROP TABLE IF EXISTS pages_blocks_testimonials_items CASCADE;
DROP TABLE IF EXISTS _pages_v_blocks_testimonials_items CASCADE;
SQL

log "Bringing the stack up"
docker compose up -d

log "Waiting 5s for web to boot"
sleep 5

log "Pruning old images"
docker image prune -f >/dev/null

log "Deployment complete. Status:"
docker compose ps
echo
echo "Tail logs with:  docker compose logs -f web"
