#!/usr/bin/env bash
# install-dev-tunnel-agent.sh
#
# Installs a macOS LaunchAgent that keeps the dev-droplet Postgres tunnel
# always running on localhost:5432. With this agent active and your
# .env.local DATABASE_URI pointing at postgres://...@localhost:5432/bhc,
# `npm run dev` reads/writes the same database as
# https://dev.blackhartconsulting.com — which itself gets a fresh prod
# snapshot every 15 minutes from the bhc-dev cron (see
# scripts/sync-from-prod.sh). The result: open your laptop, the tunnel
# comes back up automatically, and your local Payload admin sees the
# same content as prod (max 15min stale).
#
# Pairs with scripts/uninstall-dev-tunnel-agent.sh to remove.
#
# Usage:
#   ./scripts/install-dev-tunnel-agent.sh
#
# Optional env overrides (mirror scripts/dev-tunnel.sh):
#   DEV_HOST=68.183.144.201
#   DEV_USER=deploy
#   LOCAL_PORT=5432

set -euo pipefail

if [[ "$(uname)" != "Darwin" ]]; then
  echo "[install] this script is macOS-only (uses launchctl + LaunchAgents)."
  exit 1
fi

LABEL="com.bhc.dev-tunnel"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
DEV_HOST="${DEV_HOST:-68.183.144.201}"
DEV_USER="${DEV_USER:-deploy}"
LOCAL_PORT="${LOCAL_PORT:-5432}"
SSH_PATH="$(command -v ssh || true)"

if [[ -z "$SSH_PATH" ]]; then
  echo "[install] ssh not found in PATH"
  exit 1
fi

# Refuse if port is occupied by something OTHER than a previous instance
# of this agent. The bootout step further down will reclaim the port from
# our own agent, but a foreign listener (e.g. a local Postgres container)
# would silently lose the tunnel and we'd rather fail loud.
if lsof -i ":$LOCAL_PORT" -P 2>/dev/null | grep -q LISTEN; then
  if ! launchctl print "gui/$(id -u)/$LABEL" >/dev/null 2>&1; then
    echo "[install] port $LOCAL_PORT is already in use locally by something other"
    echo "[install] than this agent. Close it before installing — otherwise the"
    echo "[install] tunnel will keep failing to bind."
    lsof -i ":$LOCAL_PORT" -P 2>/dev/null | head -3
    exit 1
  fi
fi

# Stop + remove any existing instance of THIS agent so the install is
# idempotent. `launchctl print` returns non-zero when the label isn't
# loaded, hence the `|| true` guard on bootout.
if launchctl print "gui/$(id -u)/$LABEL" >/dev/null 2>&1; then
  echo "[install] removing existing agent"
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
fi

mkdir -p "$HOME/Library/LaunchAgents"

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$SSH_PATH</string>
    <string>-N</string>
    <string>-T</string>
    <string>-o</string>
    <string>ServerAliveInterval=60</string>
    <string>-o</string>
    <string>ServerAliveCountMax=3</string>
    <string>-o</string>
    <string>ExitOnForwardFailure=yes</string>
    <string>-o</string>
    <string>StrictHostKeyChecking=accept-new</string>
    <string>-L</string>
    <string>$LOCAL_PORT:127.0.0.1:5432</string>
    <string>$DEV_USER@$DEV_HOST</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <dict>
    <key>NetworkState</key>
    <true/>
    <key>SuccessfulExit</key>
    <false/>
  </dict>
  <key>ThrottleInterval</key>
  <integer>10</integer>
  <key>StandardOutPath</key>
  <string>/tmp/bhc-dev-tunnel.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/bhc-dev-tunnel.err</string>
</dict>
</plist>
EOF

echo "[install] wrote $PLIST"
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "[install] agent bootstrapped"

# Give launchd a moment to spawn ssh + bind the port. ServerAliveInterval
# is 60s but the initial bind happens almost immediately on a healthy SSH
# auth path.
sleep 3

if lsof -i ":$LOCAL_PORT" -P 2>/dev/null | grep -q LISTEN; then
  echo "[install] tunnel is listening on localhost:$LOCAL_PORT ✓"
else
  echo "[install] WARNING: tunnel did not bind to $LOCAL_PORT within 3s."
  echo "[install] check the agent's stderr for the underlying ssh error:"
  echo "          tail /tmp/bhc-dev-tunnel.err"
  echo "[install] common causes:"
  echo "          - SSH key not loaded into ssh-agent for this user"
  echo "          - Dev droplet ($DEV_HOST) refused the key"
  echo "          - LaunchAgent can't reach the network yet (transient)"
  exit 1
fi

cat <<EOF

Next steps:
  1. Update .env.local DATABASE_URI to point at the tunnel:
       DATABASE_URI=postgres://<POSTGRES_USER>:<POSTGRES_PASSWORD>@localhost:5432/<POSTGRES_DB>

     Grab the credentials from the dev droplet's .env:
       ssh $DEV_USER@$DEV_HOST 'grep ^POSTGRES_ /opt/bhc-web/.env'

  2. Restart your dev server (npm run dev). It now reads/writes the dev
     droplet's Postgres — which is a fresh prod snapshot (max 15min lag).

  3. Verify by opening http://localhost:3000/admin in a browser. You
     should see the same content as https://dev.blackhartconsulting.com/admin.

Logs:
  Stdout: /tmp/bhc-dev-tunnel.log
  Stderr: /tmp/bhc-dev-tunnel.err

To uninstall:
  ./scripts/uninstall-dev-tunnel-agent.sh
EOF
