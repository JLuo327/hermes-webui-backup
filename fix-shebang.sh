#!/bin/bash
# hermes-web-ui shebang 守护脚本
# 每次启动前自动修复 shebang，防止 npm update 后变回 /usr/bin/env node

BIN="/opt/homebrew/lib/node_modules/hermes-web-ui/bin/hermes-web-ui.mjs"
EXPECTED="#!/opt/homebrew/opt/node@24/bin/node"

# 修复 shebang（每次启动都检查）
if [ -f "$BIN" ]; then
    CURRENT=$(head -1 "$BIN")
    if [ "$CURRENT" != "$EXPECTED" ]; then
        chflags nouchg "$BIN"
        sed -i '' "1s|.*|$EXPECTED|" "$BIN"
        chflags uchg "$BIN"
        echo "[$(date)] shebang 修复: $CURRENT → $EXPECTED" >> ~/.hermes-web-ui/shebang-fix.log
    fi
fi

# 启动 hermes-web-ui
exec /opt/homebrew/bin/hermes-web-ui start 8648
