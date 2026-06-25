#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

if [ -f .server.pid ]; then
  PID=$(cat .server.pid)
  kill "$PID" 2>/dev/null && echo "Server (PID $PID) stopped." || echo "Server not running."
  rm -f .server.pid
else
  echo "No server PID file found."
fi
