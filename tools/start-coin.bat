@echo off
REM 启动 Sìlneth 本机补齐服务（Windows）。
REM 前提：已装 Node.js 与 Claude Code CLI（命令行能跑 `claude`）。
REM 打开 http://127.0.0.1:8791/ 使用；遇到词库外的词，页面出现「补齐」按钮。
cd /d "%~dp0"
if "%SILNETH_COIN_PORT%"=="" set SILNETH_COIN_PORT=8791
echo Silneth 补齐服务启动中 -^> http://127.0.0.1:%SILNETH_COIN_PORT%/
node silneth-coin-server.js
