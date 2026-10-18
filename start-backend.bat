@echo off
cd /d "%~dp0"
title ReallyWorld - backend (PHP)
echo ================================================
echo   ReallyWorld - backend (PHP)
echo   URL:  http://localhost:8080
echo   Admin: ваш секретный путь (см. ADMIN_DIR в app\config.php)
echo   Stop: close this window
echo ================================================
echo.
echo  ВНИМАНИЕ: это режим для теста. .htaccess тут НЕ действует.
echo  Для боевого режима используйте Apache из XAMPP.
echo.

set PHP=php
where php >nul 2>nul || set PHP=C:\xampp\php\php.exe

REM Открываем install.php если БД ещё не настроена, иначе главную
set START_URL=http://localhost:8080
if not exist "app\data\shop.sqlite" set START_URL=http://localhost:8080/app/install.php
if exist "app\data\shop.sqlite" for %%A in ("app\data\shop.sqlite") do if %%~zA LSS 4096 set START_URL=http://localhost:8080/app/install.php

if "%START_URL%"=="http://localhost:8080/app/install.php" (
  echo  ПЕРВЫЙ ЗАПУСК: открою установщик /app/install.php
  echo  Создайте логин и пароль администратора - и сайт заработает.
  echo.
)

start "" /min cmd /c "ping -n 3 127.0.0.1 >nul & explorer %START_URL%"
"%PHP%" -S 0.0.0.0:8080 -t "%~dp0"
