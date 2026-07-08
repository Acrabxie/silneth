#!/bin/zsh
# 启动 Sìlneth 本机补齐服务：遇到词库外的词时，页面出现「补齐」按钮，
# 点击唤起本机 Claude 现造合法词根 → 过确定性门 → 并入词库 → 页面即时可用。
# 打开 http://127.0.0.1:8791/ 使用（补齐仅在本机此地址启用，公开站点不受影响）。
cd "$(dirname "$0")" || exit 1
PORT="${SILNETH_COIN_PORT:-8791}"
echo "Sìlneth 补齐服务启动中 → http://127.0.0.1:$PORT/"
exec node silneth-coin-server.js
