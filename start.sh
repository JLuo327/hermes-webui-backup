#!/bin/bash
# Hermes Web UI launcher — foreground mode for launchd
set -euo pipefail

START_TS=$(date "+%Y-%m-%d %H:%M:%S")
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export NODE_ENV=production
export PORT=8648
export UPSTREAM="http://127.0.0.1:8646"

HERMES_WEBUI="/opt/homebrew/lib/node_modules/hermes-web-ui"
SERVER="$HERMES_WEBUI/dist/server/index.js"
PKG_JSON="$HERMES_WEBUI/package.json"
BIN="$HERMES_WEBUI/bin/hermes-web-ui.mjs"
LOG_DIR="$HOME/.hermes-web-ui"
STARTUP_LOG="$LOG_DIR/startup.log"

echo "[$START_TS] WebUI start.sh invoked" >> "$STARTUP_LOG"

# Pre-flight: if npm update wiped the package, reinstall and patch
if [ ! -f "$PKG_JSON" ] || [ ! -f "$SERVER" ]; then
    echo "[$START_TS] package.json or server missing, reinstalling hermes-web-ui..." >> "$STARTUP_LOG"
    npm install -g hermes-web-ui 2>&1 >> "$STARTUP_LOG"
    echo "[$START_TS] reinstalled hermes-web-ui (no uchg needed)" >> "$STARTUP_LOG"
fi

# Clean up stale daemon PID file
rm -f "$LOG_DIR/server.pid"

# Port conflict: kill any process already on port 8648 (stale WebUI)
OLD_PID=$(lsof -ti :8648 2>/dev/null || true)
if [ -n "$OLD_PID" ]; then
    echo "[$START_TS] killing stale process on port 8648 (PID: $OLD_PID)" >> "$STARTUP_LOG"
    kill "$OLD_PID" 2>/dev/null || true
    sleep 2
fi

# Wait for upstream gateway (max 30s, non-fatal — start anyway)
GATEWAY_READY=false
for i in $(seq 1 30); do
    if curl -sf --max-time 2 "http://127.0.0.1:8646/health" > /dev/null 2>&1; then
        echo "[$START_TS] upstream gateway ready (attempt $i)" >> "$STARTUP_LOG"
        GATEWAY_READY=true
        break
    fi
    sleep 1
done
if [ "$GATEWAY_READY" = false ]; then
    echo "[$START_TS] WARNING: upstream gateway not ready after 30s, starting anyway" >> "$STARTUP_LOG"
fi

# Log rotation: keep last 5000 lines if server.log > 5MB
LOGFILE="$LOG_DIR/server.log"
if [ -f "$LOGFILE" ] && [ "$(stat -f%z "$LOGFILE" 2>/dev/null || echo 0)" -gt 5242880 ]; then
    tail -5000 "$LOGFILE" > "$LOGFILE.tmp" && mv "$LOGFILE.tmp" "$LOGFILE"
    echo "[$START_TS] log rotated" >> "$STARTUP_LOG"
fi

# Write auth token
TOKEN_FILE="$LOG_DIR/.token"
if [ ! -f "$TOKEN_FILE" ]; then
    openssl rand -hex 32 > "$TOKEN_FILE"
    chmod 600 "$TOKEN_FILE"
fi
export AUTH_TOKEN=$(cat "$TOKEN_FILE")

# Verify node binary exists
if [ ! -x "/opt/homebrew/bin/node" ]; then
    echo "[$START_TS] CRITICAL: /opt/homebrew/bin/node not found!" >> "$STARTUP_LOG"
    exit 1
fi

echo "[$START_TS] starting Node.js server on port $PORT" >> "$STARTUP_LOG"

# Foreground run — launchd manages the lifecycle
exec /opt/homebrew/bin/node "$SERVER"
