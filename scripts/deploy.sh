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

# Caddy uses a bind-mounted Caddyfile (./Caddyfile -> /etc/caddy/Caddyfile).
# Two issues `docker compose up -d` alone does NOT solve:
#   1. Caddy doesn't auto-reload its config when the bind-mounted file
#      changes — it parses the file at process start and runs from memory.
#   2. When git replaces a file (atomic temp-write + rename), the bind-mount
#      can detach from the new inode and keep showing old content. Verified
#      live 2026-05-06 — host had updated Caddyfile but container saw stale.
# A restart re-reads the file AND re-resolves the bind-mount inode. ~5s
# overhead per deploy is worth eliminating the silent stale-config class
# of bug.
log "Restarting caddy so it picks up any Caddyfile changes"
docker compose restart caddy

log "Waiting 5s for web to boot"
sleep 5

log "Pruning old images"
docker image prune -f >/dev/null

log "Deployment complete. Status:"
docker compose ps
echo
echo "Tail logs with:  docker compose logs -f web"
