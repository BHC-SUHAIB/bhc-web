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

# Source .env so script-level flags like RESET_IMAGE_CACHE=1 work as documented.
# `docker compose` reads .env on its own, but bash conditionals in this script
# don't see those vars unless we explicitly load them. `set -a` exports every
# subsequent assignment, then we unset it so we don't accidentally export the
# rest of the script's locals. Skip lines that don't look like KEY=VALUE so a
# stray comment or blank line in .env doesn't blow up the shell.
set -a
# shellcheck disable=SC1091
source <(grep -E '^[A-Z_][A-Z0-9_]*=' .env || true)
set +a

log "Pulling latest code"
git pull --ff-only

# One-shot reset for the image-optimization cache volume. Dockerfile change
# 2026-05-06 pre-creates /app/.next/cache/images with nextjs:nodejs ownership
# so Sharp can persist transforms across requests. Existing deployments have
# a root-owned volume from the original Dockerfile that ignored ownership;
# Docker won't re-init ownership on a populated volume, so the volume must
# be deleted ONCE for the new ownership to take effect. Set
# RESET_IMAGE_CACHE=1 in /opt/bhc-web/.env on the next deploy, then remove
# the line after it succeeds.
if [[ "${RESET_IMAGE_CACHE:-}" == "1" ]]; then
  log "RESET_IMAGE_CACHE=1 — wiping next_image_cache volume so new ownership takes effect"
  # Stop just the web service so the volume detaches; postgres + caddy stay up.
  docker compose stop web
  docker compose rm -f web
  # Project name is the directory basename (bhc-web on prod). Volume is namespaced.
  PROJECT="$(basename "$PWD")"
  VOLUME_NAME="${PROJECT}_next_image_cache"
  if docker volume ls --format '{{.Name}}' | grep -qx "$VOLUME_NAME"; then
    docker volume rm "$VOLUME_NAME"
    log "Removed volume $VOLUME_NAME — fresh init on next 'compose up' will inherit nextjs ownership"
  else
    log "Volume $VOLUME_NAME does not exist — nothing to reset"
  fi
fi

log "Building web image (Turbopack cache persists via BuildKit cache mounts)"
docker compose build web

# Job-hunt cockpit lives in its own build context (./jobhunt). `up -d` below
# would auto-build it only on first deploy (when no image exists yet); building
# it explicitly here ensures code changes ship on every subsequent deploy too.
log "Building jobhunt image"
docker compose build jobhunt

# Clear containers left in 'created'/'exited' by a previously aborted deploy.
# Compose won't reuse a half-created container, so `up` fails with "container
# name already in use" and set -e aborts the whole deploy (recurring on prod).
# Only removes NON-running containers — a healthy stack is untouched, since
# compose rotates the running web container itself.
log "Clearing any stale containers from a prior aborted deploy"
STALE_WEB="$(docker ps -aq --filter name=bhc-web --filter status=created --filter status=exited)"
if [[ -n "$STALE_WEB" ]]; then
  docker rm -f $STALE_WEB >/dev/null 2>&1 || true
fi

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
