#!/bin/bash
# hermes-web-ui 升级脚本
# 用法: ./update-hermes.sh [版本号]
# 不带版本号则升级到最新版本

set -e

VERSION=${1:-latest}
NPM_GLOBAL="/Users/jluo/Library/Application Support/QClaw/npm-global/lib/node_modules"
HOMEBREW_NM="/opt/homebrew/lib/node_modules"
BACKUP_DIR="${HOMEBREW_NM}/hermes-web-ui.bak-$(date +%Y%m%d-%H%M%S)"
SRC="${NPM_GLOBAL}/hermes-web-ui"
DEST="${HOMEBREW_NM}/hermes-web-ui"
BIN_FILE="${DEST}/bin/hermes-web-ui.mjs"

echo "=== hermes-web-ui 升级脚本 ==="
echo "目标版本: $VERSION"
echo ""

# 1. 检查并停止运行中的 hermes-web-ui
echo "[1/5] 停止 hermes-web-ui..."
if pkill -f "hermes-web-ui/dist/server" 2>/dev/null; then
    sleep 2
    echo "  ✓ 已停止"
else
    echo "  ○ 未运行或已停止"
fi

# 2. 安装到 npm-global
echo "[2/5] 从 npm 安装 hermes-web-ui@$VERSION..."
npm install -g "hermes-web-ui@${VERSION}" --ignore-scripts 2>&1 | grep -v "EBADENGINE\|EBADENGINE\|npm warn" || true
echo "  ✓ 安装完成"

# 3. 备份旧版本
echo "[3/5] 备份旧版本..."
if [ -d "$DEST" ]; then
    mv "$DEST" "$BACKUP_DIR"
    echo "  ✓ 备份至 $BACKUP_DIR"
else
    echo "  ○ 无旧版本需备份"
fi

# 4. 复制新版本到 homebrew 目录
echo "[4/5] 同步到 homebrew node_modules..."
cp -R "$SRC" "$DEST"
echo "  ✓ 复制完成"

# 5. 修复 shebang（防止 npm update 后变回 /usr/bin/env node）
echo "[5/5] 修复 shebang..."
if [ -f "$BIN_FILE" ]; then
    CURRENT_SHEBANG=$(head -1 "$BIN_FILE")
    if [ "$CURRENT_SHEBANG" != "#!/opt/homebrew/bin/node" ]; then
        sed -i '' '1s|#!/usr/bin/env node|#!/opt/homebrew/bin/node|' "$BIN_FILE"
        echo "  ✓ shebang 已修复: $CURRENT_SHEBANG → #!/opt/homebrew/bin/node"
    else
        echo "  ✓ shebang 已是正确路径"
    fi
else
    echo "  ✗ 警告: bin/hermes-web-ui.mjs 不存在"
fi

# 6. 启动
echo ""
echo "=== 启动 hermes-web-ui ==="
/opt/homebrew/bin/hermes-web-ui start 8648 2>&1

# 验证
sleep 2
VER=$(python3 -c "import json; print(json.load(open('${DEST}/package.json'))['version'])" 2>/dev/null || echo "未知")
echo ""
echo "=== 升级完成 ==="
echo "版本: $VER"
echo "访问: http://localhost:8648"
echo "Token: $(cat ~/.hermes-web-ui/.token 2>/dev/null || echo '见启动日志')"
echo "备份: $BACKUP_DIR"