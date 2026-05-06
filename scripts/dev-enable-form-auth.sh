#!/usr/bin/env bash
# One-shot migration: switch the dev droplet from Caddy basicauth to the
# Next.js form-based dev auth gate shipped in the same PR.
#
# Idempotent — safe to re-run. Reads existing config and only modifies what
# isn't already in the desired state.
#
# Usage (on the dev droplet):
#   cd /opt/bhc-web
#   bash scripts/dev-enable-form-auth.sh <dev-password>
#
# The password becomes the value users type into the /dev-login form.
# Stored in /opt/bhc-web/.env as DEV_AUTH_PASSWORD; change it later by
# editing that file and recreating the web container.
#
# Refuses to run anywhere other than the dev droplet (checks NEXT_PUBLIC_SITE_URL
# in .env). The form-auth gate is meaningless on prod — prod's whole
# value is being publicly accessible.

set -euo pipefail

DEV_PASSWORD="${1:?Usage: $0 <dev-password>}"

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

# ---------- 1. Caddyfile: strip basicauth blocks ----------
if grep -q '^[[:space:]]*basicauth[[:space:]]*{$' Caddyfile; then
  TS=$(date +%Y%m%d-%H%M%S)
  log "Backing up Caddyfile -> Caddyfile.pre-devauth-${TS}"
  cp Caddyfile "Caddyfile.pre-devauth-${TS}"

  log "Stripping basicauth blocks from Caddyfile"
  # Each basicauth block is exactly 3 lines:
  #   basicauth {
  #     <user> <bcrypt-hash>
  #   }
  # Range delete from `basicauth {` to the matching `}` (no nested braces in
  # this directive — verified by the corresponding pre-migration backup).
  sed -i '/^[[:space:]]*basicauth[[:space:]]*{$/,/^[[:space:]]*}$/d' Caddyfile

  if grep -q '^[[:space:]]*basicauth' Caddyfile; then
    err "basicauth still present after sed pass — aborting before validate."
    err "Restore from Caddyfile.pre-devauth-${TS} and inspect manually."
    exit 1
  fi

  log "Validating new Caddyfile against the running caddy container"
  if ! docker exec bhc-caddy caddy validate --config /etc/caddy/Caddyfile; then
    err "Caddy validation failed. Restoring backup."
    cp "Caddyfile.pre-devauth-${TS}" Caddyfile
    exit 1
  fi
else
  log "No basicauth block found in Caddyfile — already migrated, skipping."
fi

# ---------- 2. .env: append missing vars (idempotent) ----------
ensure_env() {
  local key="$1" value="$2"
  if grep -q "^${key}=" .env; then
    log ".env already has ${key} — leaving as-is"
  else
    log "Appending ${key} to .env"
    printf '%s=%s\n' "$key" "$value" >> .env
  fi
}

ensure_env DEV_AUTH_ENABLED "true"
ensure_env DEV_AUTH_PASSWORD "$DEV_PASSWORD"

if grep -q '^DEV_AUTH_SECRET=' .env; then
  log ".env already has DEV_AUTH_SECRET — leaving as-is"
else
  log "Generating DEV_AUTH_SECRET (openssl rand -hex 32)"
  printf 'DEV_AUTH_SECRET=%s\n' "$(openssl rand -hex 32)" >> .env
fi

# ---------- 3. Apply: recreate web + restart caddy ----------
log "Recreating web container so the new env vars load"
docker compose up -d web

log "Restarting caddy so the stripped-basicauth Caddyfile takes effect"
docker compose restart caddy

# ---------- 4. Verify ----------
log "Waiting 5s for web to boot"
sleep 5

log "Smoke test: GET https://dev.blackhartconsulting.com/dev-login (expect 200)"
status=$(curl -s -o /dev/null -w '%{http_code}' https://dev.blackhartconsulting.com/dev-login || echo 000)
if [[ "$status" == "200" ]]; then
  log "OK — /dev-login returns 200"
else
  err "Expected 200 from /dev-login, got ${status}. Check 'docker compose logs web' and 'docker compose logs caddy'."
fi

log "Smoke test: GET https://dev.blackhartconsulting.com/ (expect 307 redirect to /dev-login)"
status=$(curl -s -o /dev/null -w '%{http_code}' https://dev.blackhartconsulting.com/ || echo 000)
if [[ "$status" == "307" || "$status" == "302" ]]; then
  log "OK — / redirects (status $status) for unauthenticated visitors"
else
  err "Expected 307/302 redirect from /, got ${status}. The form-auth gate may not be active."
fi

log "Migration complete."
echo
echo "Visit https://dev.blackhartconsulting.com to confirm the branded login form replaces the browser popup."
echo "If anything looks off, restore Caddyfile.pre-devauth-<TIMESTAMP> and reset .env to taste."
