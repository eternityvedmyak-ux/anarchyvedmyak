@echo off
cd /d "%~dp0"

if not exist node_modules (
  echo [setup] node_modules не найден, ставлю зависимости...
  call npm install
  if errorlevel 1 (
    echo [setup] ОШИБКА npm install. Проверь интернет и что Node.js установлен (node -v).
    pause
    exit /b 1
  )
)

echo [run] запуск бота...
node index.js

echo.
echo [run] бот остановлен (см. ошибку выше). Нажми любую клавишу, чтобы закрыть.
pause
