#!/usr/bin/env bash
# Give one client's clone on this droplet read-only pull access to its private
# GitHub repo, with no GitHub token or gh login on the box.
#
# Usage (on the droplet, as deploy):
#   cd /opt/bhc-clients && bash scripts/add-deploy-key.sh <slug> <github-owner/repo>
#   e.g. bash scripts/add-deploy-key.sh acme-plumbing BHC-SUHAIB/acme-plumbing
#
# What it does (idempotent; re-running is safe):
#   1. generates ~/.ssh/github-deploy-<slug> (ed25519, no passphrase) if missing
#   2. pins github.com's ed25519 host key in ~/.ssh/known_hosts (the key is
#      hardcoded below and its fingerprint is re-checked against the value
#      GitHub publishes, so no trust-on-first-use)
#   3. adds a `Host github.com-<slug>` alias to ~/.ssh/config that uses only
#      that key (IdentitiesOnly), so each clone can reach exactly its own repo
#   4. if clients/<slug> is already a git clone, points its origin at
#      git@github.com-<slug>:<owner/repo>.git
#   5. prints the public key and the GitHub page where it has to be added
#
# Then Suhaib (repo owner) adds the public key on GitHub:
#   https://github.com/<owner/repo>/settings/keys  ->  Add deploy key
#   title "bhc-clients droplet (read-only)", leave "Allow write access" UNCHECKED
# and confirms it works with:
#   bash scripts/add-deploy-key.sh <slug> <owner/repo> --check
#
# One key per client because GitHub lets a deploy key belong to exactly one
# repository. The first clone uses the alias too:
#   git clone git@github.com-<slug>:<owner/repo>.git clients/<slug>
# Redeploys after that are the documented
#   git -C clients/<slug> pull --ff-only && docker compose up -d --build <slug>

set -euo pipefail
cd "$(dirname "$0")/.."

SLUG="${1:-}"; REPO="${2:-}"; MODE="${3:-}"
if [[ -z "$SLUG" || -z "$REPO" ]]; then
  echo "usage: $0 <slug> <github-owner/repo> [--check]" >&2; exit 1
fi
if [[ ! "$SLUG" =~ ^[a-z0-9][a-z0-9-]{1,40}$ ]]; then
  echo "slug must be lowercase [a-z0-9-], 2-41 chars: $SLUG" >&2; exit 1
fi
if [[ ! "$REPO" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; then
  echo "repo must look like owner/name (no URL, no .git): $REPO" >&2; exit 1
fi
REPO="${REPO%.git}"

KEY="$HOME/.ssh/github-deploy-$SLUG"
HOST_ALIAS="github.com-$SLUG"
SSH_URL="git@$HOST_ALIAS:$REPO.git"
CLIENT_DIR="clients/$SLUG"
# github.com ed25519 host key, from https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints
GITHUB_HOSTKEY="github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl"
GITHUB_FPR="SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU"

log() { printf '\033[1;32m==>\033[0m %s\n' "$*"; }

if [[ "$MODE" == "--check" ]]; then
  log "Testing $SSH_URL with $KEY"
  # GitHub closes the shell after greeting; exit 1 is the success case for -T.
  OUT="$(ssh -T -o BatchMode=yes -o ConnectTimeout=15 "git@$HOST_ALIAS" 2>&1 || true)"
  echo "$OUT"
  if ! grep -q "successfully authenticated" <<<"$OUT"; then
    echo "Not accepted yet. Add the public key below on https://github.com/$REPO/settings/keys" >&2
    cat "$KEY.pub" >&2; exit 1
  fi
  if [[ -d "$CLIENT_DIR/.git" ]]; then
    log "git ls-remote through the clone's origin"
    git -C "$CLIENT_DIR" ls-remote --heads origin | head -5
    log "git pull --ff-only works from here:"
    echo "  git -C $CLIENT_DIR pull --ff-only && docker compose up -d --build $SLUG"
  else
    log "No clone at $CLIENT_DIR yet. Clone with:"
    echo "  git clone $SSH_URL $CLIENT_DIR"
  fi
  exit 0
fi

# 1. key ----------------------------------------------------------------------
install -d -m 700 "$HOME/.ssh"
if [[ -f "$KEY" ]]; then
  log "Key exists: $KEY"
else
  log "Generating $KEY"
  ssh-keygen -q -t ed25519 -N "" -C "bhc-clients deploy@$(hostname -I | awk '{print $1}') $SLUG read-only $(date +%F)" -f "$KEY"
fi
chmod 600 "$KEY"; chmod 644 "$KEY.pub"

# 2. pinned GitHub host key ---------------------------------------------------
if [[ "$(ssh-keygen -lf <(echo "$GITHUB_HOSTKEY") | awk '{print $2}')" != "$GITHUB_FPR" ]]; then
  echo "hardcoded GitHub host key does not match its fingerprint; refusing" >&2; exit 1
fi
touch "$HOME/.ssh/known_hosts"; chmod 644 "$HOME/.ssh/known_hosts"
if grep -qF "${GITHUB_HOSTKEY#github.com }" "$HOME/.ssh/known_hosts"; then
  log "github.com host key already pinned"
else
  log "Pinning github.com host key ($GITHUB_FPR)"
  echo "$GITHUB_HOSTKEY" >> "$HOME/.ssh/known_hosts"
fi

# 3. per-client Host alias ----------------------------------------------------
CONF="$HOME/.ssh/config"
touch "$CONF"; chmod 600 "$CONF"
if grep -qE "^Host $HOST_ALIAS\$" "$CONF"; then
  log "Alias $HOST_ALIAS already in $CONF"
else
  log "Adding Host $HOST_ALIAS to $CONF"
  cat >> "$CONF" <<EOF
# $SLUG: read-only deploy key for github.com/$REPO (added by add-deploy-key.sh $(date +%F))
Host $HOST_ALIAS
    HostName github.com
    User git
    IdentityFile $KEY
    IdentitiesOnly yes
EOF
fi

# 4. point an existing clone at the SSH URL -----------------------------------
if [[ -d "$CLIENT_DIR/.git" ]]; then
  CUR="$(git -C "$CLIENT_DIR" remote get-url origin 2>/dev/null || true)"
  if [[ "$CUR" == "$SSH_URL" ]]; then
    log "$CLIENT_DIR origin already $SSH_URL"
  else
    log "Switching $CLIENT_DIR origin: ${CUR:-<none>} -> $SSH_URL"
    if [[ -n "$CUR" ]]; then git -C "$CLIENT_DIR" remote set-url origin "$SSH_URL"
    else git -C "$CLIENT_DIR" remote add origin "$SSH_URL"; fi
  fi
fi

# 5. hand-off -------------------------------------------------------------------
cat <<NEXT

Public key for $SLUG (read-only; the private key never leaves this box):

$(cat "$KEY.pub")

Add it on GitHub (repo owner does this, it is an account-settings change):
  https://github.com/$REPO/settings/keys  ->  "Add deploy key"
  Title: bhc-clients droplet (read-only)     Allow write access: leave UNCHECKED

Then verify from here:
  bash scripts/add-deploy-key.sh $SLUG $REPO --check
$( [[ -d "$CLIENT_DIR/.git" ]] || printf '\nFirst clone:\n  git clone %s %s\n' "$SSH_URL" "$CLIENT_DIR" )
NEXT
