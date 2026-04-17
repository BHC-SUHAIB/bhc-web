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
