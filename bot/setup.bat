@echo off
cd /d "%~dp0"

set /p TOKEN=Введи BOT_TOKEN из @BotFather: 
set /p OWNER=Введи свой Telegram ID (узнать у @userinfobot): 

(
echo BOT_TOKEN=%TOKEN%
echo OWNER_TELEGRAM_ID=%OWNER%
echo BOT_API_PORT=3001
echo RCON_HOST=
echo RCON_PORT=25575
echo RCON_PASSWORD=
echo RCON_BIND=
echo RCON_RECOVERY=
echo RCON_LICENSE=
echo RCON_2FA=
echo RCON_KICK=kick ^<nick^>
) > .env

echo.
echo [setup] .env создан.

if not exist node_modules (
  echo [setup] ставлю зависимости...
  call npm install
  if errorlevel 1 (
    echo [setup] ОШИБКА npm install. Проверь интернет и Node.js.
    pause
    exit /b 1
  )
)

echo.
echo [setup] ГОТОВО. Теперь запусти start-bot.bat
pause
