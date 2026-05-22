#!/usr/bin/env bash
# uninstall-dev-tunnel-agent.sh
#
# Removes the LaunchAgent installed by scripts/install-dev-tunnel-agent.sh.
# Stops the running tunnel, deletes the plist. Doesn't touch .env.local —
# revert DATABASE_URI manually if you want to go back to local SQLite.

set -euo pipefail

LABEL="com.bhc.dev-tunnel"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

if launchctl print "gui/$(id -u)/$LABEL" >/dev/null 2>&1; then
  launchctl bootout "gui/$(id -u)/$LABEL"
  echo "[uninstall] agent stopped"
else
  echo "[uninstall] agent was not running"
fi

if [[ -f "$PLIST" ]]; then
  rm "$PLIST"
  echo "[uninstall] removed $PLIST"
else
  echo "[uninstall] $PLIST did not exist"
fi

cat <<EOF

Tunnel removed. If you want to revert your dev server to local SQLite,
edit .env.local and set:
  DATABASE_URI=file:./payload.db
EOF
