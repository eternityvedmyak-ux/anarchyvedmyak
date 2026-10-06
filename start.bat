@echo off
title %~nx0
cd /d "%~dp0"

echo [1/2] Запуск сервера (npm run dev)...
start "MyServer Dev" cmd /c "npm run dev"

echo [2/2] Открываем сайт в браузере через 10 секунд...
timeout /t 10 >nul
start "" http://localhost:3000

echo.
echo Сервер запущен. Закрой окно "MyServer Dev", чтобы остановить.
pause
