# Hermes WebUI 配置备份

> 专注关键配置，不备份运行时数据

## 包含内容

- `providers.js` - 模型 Provider 配置（包含 API Key）
- `settings.json` - WebUI 设置
- `.token` - 认证 token
- `start.sh` - 启动脚本
- `update-hermes.sh` - 更新脚本
- `fix-shebang.sh` - shebang 修复脚本
- `hermes-completion-sound.user.js` - 自定义用户脚本

## 排除（不备份）

- *.db / *.db-shm / *.db-wal - SQLite 数据库
- upload/ - 上传目录
- logs/ - 日志

## 恢复方式

```bash
git clone https://github.com/JLuo327/hermes-webui-backup.git hermes-webui-backup
cd hermes-webui-backup
cp providers.js settings.json .token ~/.hermes-web-ui/
cp start.sh update-hermes.sh fix-shebang.sh ~/.hermes-web-ui/
chmod +x ~/.hermes-web-ui/start.sh
launchctl load ~/Library/LaunchAgents/com.hermes.webui.8648.plist
```

---

*自动备份 · 2026-05-08 重新整理*
