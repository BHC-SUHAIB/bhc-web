#!/usr/bin/env bash
# Add a client site to the bhc-clients stack.
#
# Usage (on the droplet, as deploy):
#   cd /opt/bhc-clients && bash scripts/add-client.sh <slug> <hostname> [site name]
#   e.g. bash scripts/add-client.sh acme-plumbing acme-plumbing.com "Acme Plumbing"
#
# Analytics IDs are optional and come from the environment, because they are only
# known once the client's GTM container / Clarity project exist:
#   GTM_ID=GTM-XXXXXXX CLARITY_ID=abcdefghij bash scripts/add-client.sh <slug> <host> "<name>"
# Leaving them unset writes empty build args, which is fine: the app renders no
# tags for an empty ID, and you can fill them in later (see step 3 note below).
#
# What it does (idempotent; re-running is safe):
#   1. creates Postgres role + database named after the slug (hyphens -> underscores)
#      and revokes CONNECT on that database from PUBLIC (only its role can open it)
#   2. writes clients/<slug>/.env  (DATABASE_URI, PAYLOAD_SECRET, NEXT_PUBLIC_*)
#   3. appends the <slug> service to docker-compose.yml, including the NEXT_PUBLIC_*
#      build args (Next.js inlines NEXT_PUBLIC_* at `next build`, so env_file alone
#      is not enough — they must be build args or the tags never reach the bundle)
#   4. writes caddy/sites/<slug>.caddy and reloads Caddy
#   5. prints the DNS records the client needs + the deploy commands
#
# It does NOT clone or build the client's app: run add-deploy-key.sh <slug> <owner/repo>
# (read-only GitHub deploy key + ssh alias), clone the client's repo (with a
# Dockerfile that serves on :3000) through that alias at clients/<slug>/ and run
#   docker compose up -d --build <slug>
#
# For a pre-launch preview use the preview hostname first, e.g.
#   add-client.sh acme-plumbing acme-plumbing.preview.getblackhart.com
# then at cutover edit caddy/sites/<slug>.caddy, the NEXT_PUBLIC_SITE_URL build arg in
# docker-compose.yml AND the same key in clients/<slug>/.env, then
#   docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
#   docker compose up -d --build <slug>      # --build, not --force-recreate:
#                                            # NEXT_PUBLIC_* is baked in at build time

set -euo pipefail
cd "$(dirname "$0")/.."

SLUG="${1:-}"; HOST="${2:-}"; SITE_NAME="${3:-}"
if [[ -z "$SLUG" || -z "$HOST" ]]; then
  echo "usage: $0 <slug> <hostname> [site name]" >&2; exit 1
fi
if [[ ! "$SLUG" =~ ^[a-z0-9][a-z0-9-]{1,40}$ ]]; then
  echo "slug must be lowercase [a-z0-9-], 2-41 chars: $SLUG" >&2; exit 1
fi
if [[ ! "$HOST" =~ ^[a-z0-9.-]+\.[a-z]{2,}$ ]]; then
  echo "hostname looks wrong: $HOST" >&2; exit 1
fi
if [[ "$SLUG" == "caddy" || "$SLUG" == "postgres" ]]; then
  echo "slug '$SLUG' is reserved" >&2; exit 1
fi

set -a; source .env; set +a
PGUSER="${POSTGRES_USER:-bhc_admin}"
DBNAME="${SLUG//-/_}"
CLIENT_DIR="clients/$SLUG"
ENV_FILE="$CLIENT_DIR/.env"
SITE_FILE="caddy/sites/$SLUG.caddy"
# Public site name: 3rd arg, else the slug title-cased ("acme-plumbing" -> "Acme Plumbing").
if [[ -z "$SITE_NAME" ]]; then
  SITE_NAME="$(printf '%s' "${SLUG//-/ }" | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2)}1')"
fi
# Analytics IDs: optional, from the environment. Empty is valid.
GTM_ID="${GTM_ID:-}"
CLARITY_ID="${CLARITY_ID:-}"
IPV4="$(curl -fsS -4 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"
IPV6="$(curl -fsS -6 https://api64.ipify.org 2>/dev/null || true)"

log() { printf '\033[1;32m==>\033[0m %s\n' "$*"; }
psql_admin() { docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U "$PGUSER" -d postgres -Atq "$@"; }

# 1. database + role -------------------------------------------------------
mkdir -p "$CLIENT_DIR/media"
if [[ -f "$ENV_FILE" ]] && grep -q '^DB_PASSWORD=' "$ENV_FILE"; then
  DB_PASSWORD="$(grep '^DB_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)"
  log "Reusing DB password from $ENV_FILE"
else
  DB_PASSWORD="$(openssl rand -hex 24)"
fi

if [[ "$(psql_admin -c "SELECT 1 FROM pg_roles WHERE rolname='$DBNAME'")" == "1" ]]; then
  log "Role $DBNAME exists; syncing password"
  psql_admin -c "ALTER ROLE \"$DBNAME\" WITH PASSWORD '$DB_PASSWORD'"
else
  log "Creating role $DBNAME"
  psql_admin -c "CREATE ROLE \"$DBNAME\" LOGIN PASSWORD '$DB_PASSWORD'"
fi
if [[ "$(psql_admin -c "SELECT 1 FROM pg_database WHERE datname='$DBNAME'")" == "1" ]]; then
  log "Database $DBNAME exists"
else
  log "Creating database $DBNAME"
  psql_admin -c "CREATE DATABASE \"$DBNAME\" OWNER \"$DBNAME\""
fi
# Postgres grants CONNECT on every new database to PUBLIC by default, so any
# client's role could open a session against another client's database (it
# would see no tables, but the door should not be open at all). Revoke it;
# the owner role keeps CONNECT implicitly. Idempotent.
log "Restricting CONNECT on $DBNAME to its owner"
psql_admin -c "REVOKE CONNECT ON DATABASE \"$DBNAME\" FROM PUBLIC"

# 2. per-client env ----------------------------------------------------------
if [[ ! -f "$ENV_FILE" ]]; then
  log "Writing $ENV_FILE"
  PAYLOAD_SECRET="$(openssl rand -hex 32)"
  cat > "$ENV_FILE" <<ENV
# $SLUG — generated by add-client.sh on $(date +%F). Never commit.
NODE_ENV=production
DB_PASSWORD=$DB_PASSWORD
DATABASE_URI=postgres://$DBNAME:$DB_PASSWORD@postgres:5432/$DBNAME
PAYLOAD_SECRET=$PAYLOAD_SECRET
NEXT_PUBLIC_SITE_URL=https://$HOST
NEXT_PUBLIC_SITE_NAME=$SITE_NAME
SITE_DOMAIN=$HOST
# Analytics — must ALSO be build args in docker-compose.yml (Next.js inlines these
# at build time); keep the two copies in sync or a rebuild will drop the tags.
NEXT_PUBLIC_GTM_ID=$GTM_ID
NEXT_PUBLIC_CLARITY_PROJECT_ID=$CLARITY_ID
# Seed admin (first boot only) — client resets it via the login page.
# suhaib@ is the real mailbox; hello@ is only a forwarding alias, never a login.
SEED_ADMIN_EMAIL=suhaib@blackhartconsulting.com
SEED_ADMIN_PASSWORD=$(openssl rand -base64 18 | tr -d '/+=')
# Transactional email (fill in per client)
RESEND_API_KEY=
EMAIL_FROM=
CONTACT_NOTIFY_EMAIL=
ENV
  chmod 600 "$ENV_FILE"
else
  log "$ENV_FILE already exists; leaving it alone"
fi
# The Next.js image runs as uid 1001 (nextjs) — let it write media.
sudo chown -R 1001:1001 "$CLIENT_DIR/media" 2>/dev/null || chown -R 1001:1001 "$CLIENT_DIR/media" || true

# 3. compose service ---------------------------------------------------------
if grep -qE "^  $SLUG:$" docker-compose.yml; then
  log "Service $SLUG already in docker-compose.yml"
else
  log "Appending service $SLUG to docker-compose.yml"
  cat >> docker-compose.yml <<YML

  $SLUG:
    build:
      context: ./clients/$SLUG
      dockerfile: Dockerfile
      # NEXT_PUBLIC_* values are inlined by \`next build\`, so they have to be
      # build args, not just env_file entries. Keep them in sync with
      # clients/$SLUG/.env, and rebuild (not just recreate) after changing one:
      #   docker compose up -d --build $SLUG
      args:
        NEXT_PUBLIC_SITE_URL: https://$HOST
        NEXT_PUBLIC_SITE_NAME: $SITE_NAME
        NEXT_PUBLIC_GTM_ID: "$GTM_ID"
        NEXT_PUBLIC_CLARITY_PROJECT_ID: "$CLARITY_ID"
    container_name: bhc-client-$SLUG
    restart: unless-stopped
    env_file: ./clients/$SLUG/.env
    depends_on:
      postgres:
        condition: service_healthy
    expose:
      - "3000"
    volumes:
      - ./clients/$SLUG/media:/app/media
    deploy:
      resources:
        limits:
          memory: 768M
YML
fi
docker compose config -q

# 4. caddy site --------------------------------------------------------------
if [[ -f "$SITE_FILE" ]]; then
  log "$SITE_FILE already exists; leaving it alone"
else
  log "Writing $SITE_FILE"
  WWW_BLOCK=""
  # Only add a www redirect for apex-style hostnames (2 labels), not previews.
  if [[ "$(awk -F. '{print NF}' <<<"$HOST")" -eq 2 ]]; then
    WWW_BLOCK="www.$HOST {
	redir https://$HOST{uri} 308
}
"
  fi
  cat > "$SITE_FILE" <<CADDY
# $SLUG — generated by add-client.sh on $(date +%F)
${WWW_BLOCK}
$HOST {
	encode gzip zstd

	@nextStatic path /_next/static/*
	header @nextStatic Cache-Control "public, max-age=31536000, immutable"

	@nextImage path /_next/image*
	header @nextImage >Cache-Control "public, max-age=2592000, immutable"

	reverse_proxy $SLUG:3000 {
		header_up Host {host}
		header_up X-Real-IP {remote}
	}

	header {
		X-Frame-Options "SAMEORIGIN"
		X-Content-Type-Options "nosniff"
		Referrer-Policy "strict-origin-when-cross-origin"
		Permissions-Policy "geolocation=(), microphone=(), camera=()"
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
	}

	log {
		output stdout
		format json
	}
}
CADDY
fi
log "Reloading Caddy"
docker compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile >/dev/null
docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile 2>/dev/null

# 5. next steps --------------------------------------------------------------
cat <<NEXT

Client '$SLUG' is wired up.

DNS records for $HOST (Cloudflare: DNS only / grey cloud, or the registrar):
  A     @      $IPV4
  A     www    $IPV4$( [[ -n "$IPV6" ]] && printf '\n  AAAA  @      %s   (optional)\n  AAAA  www    %s   (optional)' "$IPV6" "$IPV6" )

Deploy the app:
  bash scripts/add-deploy-key.sh $SLUG <github-owner/repo>    # prints a read-only key; Suhaib adds it to the repo's Deploy keys
  git clone git@github.com-$SLUG:<github-owner/repo>.git clients/$SLUG   # must contain a Dockerfile serving :3000
  docker compose up -d --build $SLUG
  docker compose logs -f $SLUG
Redeploy later:
  git -C clients/$SLUG pull --ff-only && docker compose up -d --build $SLUG

Analytics (build args, already written into docker-compose.yml):
  NEXT_PUBLIC_SITE_NAME            $SITE_NAME
  NEXT_PUBLIC_GTM_ID               ${GTM_ID:-(empty — no GTM tag will render)}
  NEXT_PUBLIC_CLARITY_PROJECT_ID   ${CLARITY_ID:-(empty — no Clarity tag will render)}
  To change one: edit BOTH the args: block in docker-compose.yml and clients/$SLUG/.env,
  then 'docker compose up -d --build $SLUG' (a plain recreate will not re-inline them).

Files:
  clients/$SLUG/.env        secrets (DATABASE_URI, PAYLOAD_SECRET, seed admin)
  caddy/sites/$SLUG.caddy   hostname -> $SLUG:3000
  database: $DBNAME  (role $DBNAME)  — backed up nightly to /root/db-backups/$DBNAME/
                                       and off-box to s3://bhc-client-backups/bhc-clients/
NEXT
