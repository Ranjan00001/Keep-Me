#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# Use system node (skip nvm which may have a different version)
if [ -x /usr/bin/node ]; then
  NODE=/usr/bin/node
  NPM=/usr/bin/npm
elif [ -x /usr/local/bin/node ]; then
  NODE=/usr/local/bin/node
  NPM=/usr/local/bin/npm
else
  NODE=node
  NPM=npm
fi

# Register in app menu
mkdir -p ~/.local/share/applications
ln -sf "$DIR/keep-me.desktop" ~/.local/share/applications/keep-me.desktop
update-desktop-database ~/.local/share/applications 2>/dev/null || true

# If server is already running, just open browser
if [ -f .server.pid ] && kill -0 "$(cat .server.pid)" 2>/dev/null; then
  xdg-open http://localhost:2000
  exit 0
fi
# Also check if port 2000 is already in use (stale PID or parallel launch)
if ss -tlnp 2>/dev/null | grep -q ':2000 '; then
  echo "Port 2000 already in use — opening browser..."
  xdg-open http://localhost:2000
  exit 0
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  $NPM install --no-audit --no-fund
fi

# Start server (server.js writes its own logs to .server.log)
$NODE server.js &
echo $! > .server.pid
echo "Server started (PID $(cat .server.pid))"

# Wait and open browser
sleep 1.5
xdg-open http://localhost:2000
