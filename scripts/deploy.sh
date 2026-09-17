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

# Serialize deploys. GitHub Actions runs this script on every push to main, so a
# manual `bash scripts/deploy.sh` right after a push races the Actions run on the
# same host. Two concurrent `compose up` calls both create the temporary
# `<id>_bhc-<svc>` container and one dies with "container name already in use",
# leaving the other service half-created (seen 3x on 2026-09-16, site down ~1 min
# each time). The lock makes the second deploy wait instead of colliding.
LOCK_FILE="${DEPLOY_LOCK_FILE:-/tmp/bhc-web-deploy.lock}"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "Another deploy is running; waiting for it to finish (up to 20 min)"
  flock -w 1200 9 || { echo "Timed out waiting for the other deploy." >&2; exit 1; }
fi

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

# Compose names containers after `container_name` (bhc-web, bhc-jobhunt, ...).
# During a recreate it briefly uses a temporary `<id>_bhc-<svc>` name. An
# aborted deploy can leave either name behind in 'created'/'exited' state, and
# Compose then fails with "container name already in use". Remove NON-running
# leftovers for every service (the old version of this step only knew about
# bhc-web, so a stale bhc-jobhunt broke deploy after deploy).
SERVICES=(postgres web jobhunt caddy)
clear_stale_containers() {
  local svc line id name state removed=0
  while read -r id name state; do
    [[ -z "$id" ]] && continue
    [[ "$state" == "running" ]] && continue
    for svc in "${SERVICES[@]}"; do
      if [[ "$name" == "bhc-$svc" || "$name" == *"_bhc-$svc" ]]; then
        docker rm -f "$id" >/dev/null 2>&1 && { log "Removed stale container $name ($state)"; removed=1; }
      fi
    done
  done < <(docker ps -a --format '{{.ID}} {{.Names}} {{.State}}')
  return 0
}
log "Clearing any stale containers from a prior aborted deploy"
clear_stale_containers

# Bring services up one at a time in dependency order. A single `compose up -d`
# rotates web and jobhunt in parallel, so a failure on one aborts the other
# mid-recreate (that is how bhc-web ended up stuck in 'created'). Per-service
# `up` keeps a failure contained, and one retry after a cleanup covers the
# transient name collision.
up_service() {
  local svc="$1"
  if ! docker compose up -d --no-deps "$svc"; then
    log "up $svc failed; clearing stale containers and retrying once"
    clear_stale_containers
    sleep 3
    docker compose up -d --no-deps "$svc"
  fi
}
log "Bringing the stack up (one service at a time)"
for svc in "${SERVICES[@]}"; do
  log "  -> $svc"
  up_service "$svc"
done

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

# Verify the result instead of sleeping and hoping. Every container must be
# running, and web must answer HTTP inside the container (port 3000 is only
# exposed on the compose network). Next's standalone server binds to the
# container's HOSTNAME (Docker sets it to the container id), not loopback, so
# the probe targets $(hostname) rather than 127.0.0.1. A failed check exits
# non-zero so the GitHub Actions run goes red with the container logs shown.
log "Verifying the stack"
for svc in "${SERVICES[@]}"; do
  if [[ "$(docker inspect -f '{{.State.Running}}' "bhc-$svc" 2>/dev/null)" != "true" ]]; then
    echo "bhc-$svc is not running after deploy:" >&2
    docker ps -a --filter "name=bhc-$svc" >&2
    docker compose logs --tail=50 "$svc" >&2 || true
    exit 1
  fi
done
WEB_OK=0
for i in $(seq 1 30); do
  # `|| true` inside the substitution: while web is still booting wget fails, and
  # under `set -e -o pipefail` a failing assignment would silently abort the script.
  code="$(docker exec bhc-web sh -c 'wget -q -S -O /dev/null --timeout=3 "http://$(hostname):3000/" 2>&1' | awk '/HTTP\//{c=$2} END{print c}' || true)"
  if [[ "$code" =~ ^(200|301|302|307|308)$ ]]; then WEB_OK=1; break; fi
  sleep 2
done
if [[ "$WEB_OK" != "1" ]]; then
  echo "bhc-web is running but did not answer HTTP on :3000 within 60s (last status: ${code:-none})." >&2
  docker compose logs --tail=80 web >&2 || true
  exit 1
fi
log "web answers HTTP ($code)"

log "Pruning old images"
docker image prune -f >/dev/null

log "Deployment complete. Status:"
docker compose ps
echo
echo "Tail logs with:  docker compose logs -f web"
