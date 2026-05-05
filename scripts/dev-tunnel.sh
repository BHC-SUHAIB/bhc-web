#!/usr/bin/env bash
# Open an SSH tunnel from local 5432 → dev droplet's Postgres so `npm run dev`
# (with DATABASE_URI=postgres://localhost:5432/bhc) reads/writes the SAME
# data as https://dev.blackhartconsulting.com.
#
# Usage:
#   ./scripts/dev-tunnel.sh                   # foreground, ctrl-c to close
#   ./scripts/dev-tunnel.sh & NPM_PID=$!      # background; kill with $NPM_PID
#
# Or use the npm script: `npm run dev:tunnel` (foreground).
#
# Connection: localhost:5432 → 127.0.0.1:5432 on the dev droplet (which
# Docker binds to bhc-postgres). The dev droplet's firewall doesn't expose
# Postgres publicly — only this SSH tunnel can reach it.

set -euo pipefail
DEV_HOST="${DEV_HOST:-68.183.144.201}"
DEV_USER="${DEV_USER:-deploy}"
LOCAL_PORT="${LOCAL_PORT:-5432}"

# Refuse to start if local Postgres is already running on the same port.
if lsof -i ":$LOCAL_PORT" -P 2>/dev/null | grep -q LISTEN; then
  echo "[tunnel] port $LOCAL_PORT is already in use locally — close it first."
  echo "  Common culprits: a local Postgres container or pg_ctl process."
  lsof -i ":$LOCAL_PORT" -P 2>/dev/null | head -3
  exit 1
fi

echo "[tunnel] connecting localhost:$LOCAL_PORT → $DEV_USER@$DEV_HOST:5432"
echo "[tunnel] keep this terminal open while developing locally."
echo "[tunnel] ctrl-c to close."
echo ""

# -N: don't run a remote command (just forward)
# -T: don't allocate a TTY
# -o ServerAliveInterval=60: keep tunnel alive across NAT timeouts
exec ssh -N -T \
  -o ServerAliveInterval=60 \
  -o ServerAliveCountMax=3 \
  -o ExitOnForwardFailure=yes \
  -L "$LOCAL_PORT:127.0.0.1:5432" \
  "$DEV_USER@$DEV_HOST"
