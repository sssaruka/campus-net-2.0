@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 校园网 2.0 本地服务器
echo.
echo   校园网 2.0 本地服务器启动中...
echo   浏览器将自动打开 http://localhost:8000
echo   服务器运行期间请保持本窗口开启（最小化即可）
echo   关闭本窗口或按 Ctrl+C 即停止服务器
echo.
start "" http://localhost:8000
python -m http.server 8000
echo.
echo   服务器已停止。
pause
