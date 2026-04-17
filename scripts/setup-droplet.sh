#!/usr/bin/env bash
# One-time droplet setup. Run this ONCE on a fresh Ubuntu 24.04 droplet
# (the "Docker on Ubuntu" Marketplace image already has Docker + Compose).
#
# Usage (as root or via sudo on the droplet):
#   curl -fsSL https://raw.githubusercontent.com/BHC-SUHAIB/bhc-web/main/scripts/setup-droplet.sh | bash
# OR after cloning the repo:
#   sudo bash scripts/setup-droplet.sh

set -euo pipefail

APP_DIR="/opt/bhc-web"
REPO_URL="${REPO_URL:-git@github.com:BHC-SUHAIB/bhc-web.git}"
BRANCH="${BRANCH:-main}"

log() { printf '\033[1;32m==>\033[0m %s\n' "$*"; }

if [[ $EUID -ne 0 ]]; then
  echo "Run as root: sudo bash $0" >&2
  exit 1
fi

log "Updating apt"
apt-get update -y
apt-get upgrade -y

log "Installing utilities"
apt-get install -y git ufw fail2ban jq unattended-upgrades

log "Enabling automatic security updates"
dpkg-reconfigure -plow unattended-upgrades

log "Configuring firewall (allow 22, 80, 443)"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment "SSH"
ufw allow 80/tcp comment "HTTP"
ufw allow 443/tcp comment "HTTPS"
ufw --force enable

log "Ensuring Docker is running"
systemctl enable --now docker

# When this script is invoked with `sudo`, $SUDO_USER is the original user
# (typically `deploy`). We chown the app dir to that user so git + docker can
# run without sudo afterwards. When invoked directly as root, we leave it
# root-owned.
OWNER_USER="${SUDO_USER:-root}"
OWNER_GROUP="$(id -gn "$OWNER_USER")"

log "Preparing app directory at $APP_DIR (owner: $OWNER_USER:$OWNER_GROUP)"
mkdir -p "$APP_DIR"
chown -R "$OWNER_USER:$OWNER_GROUP" "$APP_DIR"

if [[ -d "$APP_DIR/.git" ]]; then
  log "Repo already cloned, pulling latest"
  git -C "$APP_DIR" pull
else
  if [[ "$REPO_URL" == git@* ]]; then
    log "Repo URL is SSH. Ensure the droplet has a deploy key configured in GitHub."
    log "Trusting github.com SSH host key"
    ssh-keyscan -t ed25519,rsa github.com >> /root/.ssh/known_hosts 2>/dev/null || true
  fi
  log "Cloning $REPO_URL"
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

log "Creating .env if missing"
cd "$APP_DIR"
if [[ ! -f .env ]]; then
  cp .env.production.example .env
  echo
  echo "  \033[1;33m!!!\033[0m Edit $APP_DIR/.env before first deploy:"
  echo "      - PAYLOAD_SECRET (generate: openssl rand -hex 32)"
  echo "      - POSTGRES_PASSWORD"
  echo "      - NEXT_PUBLIC_SITE_URL"
  echo "      - SITE_DOMAIN (only once DNS is pointing here)"
  echo
fi

log "Done. Next:"
echo "  1. nano $APP_DIR/.env   # fill in the secrets"
echo "  2. cd $APP_DIR && bash scripts/deploy.sh"
