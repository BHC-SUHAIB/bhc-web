#!/usr/bin/env bash
# One-shot migration: decouple dev's bespoke Caddyfile from the in-git
# canonical Caddyfile, so `git pull` on dev stops conflicting every time
# prod's Caddyfile changes.
#
# After this runs:
#   - /opt/bhc-web/Caddyfile     — git-tracked, identical to prod's config
#   - /opt/bhc-web/Caddyfile.dev — bespoke dev config (gitignored)
#   - /opt/bhc-web/.env has CADDYFILE_PATH=./Caddyfile.dev
#   - docker-compose mounts Caddyfile.dev into bhc-caddy via env-var sub
#   - Future `git pull` updates Caddyfile silently; dev keeps using its own
#
# Idempotent — safe to re-run; detects partial state and finishes the job.
#
# Usage (on the dev droplet):
#   cd /opt/bhc-web
#   bash scripts/dev-decouple-caddyfile.sh
#
# Refuses to run anywhere other than dev.

set -euo pipefail

log() { printf '\033[1;32m==>\033[0m %s\n' "$*"; }
err() { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; }

cd "$(dirname "$0")/.."

# ---------- 0. Sanity ----------
if [[ ! -f .env ]]; then
  err "Missing .env. Run from /opt/bhc-web on the dev droplet."
  exit 1
fi

if ! grep -q 'NEXT_PUBLIC_SITE_URL=.*dev\.blackhartconsulting\.com' .env; then
  err "This script is for the dev droplet only. Refusing to run."
  err "Expected NEXT_PUBLIC_SITE_URL=https://dev.blackhartconsulting.com in .env."
  exit 1
fi

if [[ ! -f Caddyfile ]]; then
  err "Missing Caddyfile in $(pwd)."
  exit 1
fi

# ---------- 1. Detect current state ----------
# If Caddyfile already matches HEAD's version (clean), we just need to
# create Caddyfile.dev (if missing) and set CADDYFILE_PATH. If Caddyfile
# diverges from HEAD, that's the bespoke config — move it to Caddyfile.dev,
# restore Caddyfile from git.

if git diff --quiet HEAD -- Caddyfile; then
  log "Caddyfile already matches git HEAD — already decoupled, or never bespoke"
  if [[ -f Caddyfile.dev ]]; then
    log "Caddyfile.dev already present — leaving as-is"
  else
    err "Caddyfile.dev is missing AND Caddyfile is the git version — there's no"
    err "bespoke config to preserve. Either:"
    err "  (a) you already migrated and someone deleted Caddyfile.dev — restore"
    err "      from a backup (Caddyfile.pre-devauth-* or similar) into Caddyfile.dev"
    err "  (b) this dev droplet was always running prod's Caddyfile, in which"
    err "      case the decoupling is a no-op and you can ignore this script"
    exit 1
  fi
else
  log "Caddyfile diverges from HEAD — saving as Caddyfile.dev"
  if [[ -f Caddyfile.dev ]]; then
    TS=$(date +%Y%m%d-%H%M%S)
    log "Caddyfile.dev already exists; backing it up to Caddyfile.dev.bak-${TS}"
    cp Caddyfile.dev "Caddyfile.dev.bak-${TS}"
  fi
  cp Caddyfile Caddyfile.dev
  log "Restoring git's canonical Caddyfile (matches prod)"
  git checkout HEAD -- Caddyfile
fi

# ---------- 2. Set CADDYFILE_PATH in .env (idempotent) ----------
if grep -q '^CADDYFILE_PATH=' .env; then
  log ".env already has CADDYFILE_PATH — leaving as-is"
else
  log "Appending CADDYFILE_PATH=./Caddyfile.dev to .env"
  printf 'CADDYFILE_PATH=%s\n' './Caddyfile.dev' >> .env
fi

# ---------- 3. Validate Caddyfile.dev parses ----------
# Done before recreating the container so a broken file doesn't take caddy
# down. Run validate against the running caddy container, pointing at the
# host-side path mounted into the container.
log "Validating Caddyfile.dev"
# Bind-mount the dev override into a tmp container and validate there —
# safer than poking the running container's filesystem.
if ! docker run --rm -v "$(pwd)/Caddyfile.dev:/tmp/Caddyfile.dev:ro" caddy:2-alpine caddy validate --config /tmp/Caddyfile.dev; then
  err "Caddyfile.dev failed validation. Aborting before container changes."
  err "Inspect $(pwd)/Caddyfile.dev manually."
  exit 1
fi

# ---------- 4. Recreate caddy so the new mount source takes effect ----------
# `restart` re-runs the existing container with the existing mount config —
# we need `up -d --force-recreate caddy` to pick up the docker-compose.yml
# change that introduced the env-var-driven mount source. The web service
# stays up; postgres stays up.
log "Recreating bhc-caddy with the new mount source"
docker compose up -d --force-recreate caddy

# ---------- 5. Verify ----------
log "Waiting 3s for caddy to settle"
sleep 3

log "Verify mount target points to Caddyfile.dev"
mount_source=$(docker inspect bhc-caddy --format '{{range .Mounts}}{{if eq .Destination "/etc/caddy/Caddyfile"}}{{.Source}}{{end}}{{end}}')
expected="$(pwd)/Caddyfile.dev"
if [[ "$mount_source" == "$expected" ]]; then
  log "OK — bhc-caddy mounts $mount_source"
else
  err "Mount source is $mount_source (expected $expected)."
  err "Likely CADDYFILE_PATH didn't load. Check .env, then re-run."
  exit 1
fi

log "Smoke test: GET https://dev.blackhartconsulting.com/dev-login (expect 200)"
status=$(curl -s -o /dev/null -w '%{http_code}' https://dev.blackhartconsulting.com/dev-login || echo 000)
if [[ "$status" == "200" ]]; then
  log "OK — /dev-login returns 200"
else
  err "Expected 200 from /dev-login, got ${status}. Check 'docker compose logs caddy'."
fi

log "Migration complete."
echo
echo "Caddyfile (in git, mirrors prod) and Caddyfile.dev (gitignored, bespoke)"
echo "are now decoupled. Future 'git pull' on dev will update Caddyfile cleanly"
echo "without touching Caddyfile.dev. Edit dev's Caddy config in Caddyfile.dev"
echo "directly + 'docker compose restart caddy' to apply."
