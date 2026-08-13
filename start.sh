#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# Detect Node.js & npm
NODE=${NODE:-node}
NPM=${NPM:-npm}

if ! command -v "$NODE" >/dev/null 2>&1; then
  echo "Error: Node.js is not installed or not in PATH." >&2
  exit 1
fi

# Register dynamically in desktop app menu only if missing or path changed
DESKTOP_ENTRY="$HOME/.local/share/applications/keep-me.desktop"
if [ ! -f "$DESKTOP_ENTRY" ] || ! grep -q "Exec=$DIR/start.sh" "$DESKTOP_ENTRY" 2>/dev/null; then
  mkdir -p ~/.local/share/applications
  cat << EOF > "$DESKTOP_ENTRY"
[Desktop Entry]
Name=Keep-Me
Comment=Multi-project task tracker
Exec=$DIR/start.sh
Icon=$DIR/icon.svg
Type=Application
Categories=Utility;
Terminal=false
StartupNotify=true
EOF
  update-desktop-database ~/.local/share/applications 2>/dev/null || true
fi

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
