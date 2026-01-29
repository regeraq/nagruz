@echo off
chcp 65001 >nul
echo ==========================================
echo   ЗАГРУЗКА ИСПРАВЛЕНИЙ НА GITHUB
echo ==========================================
echo.

cd /d "%~dp0"

echo Добавление файлов...
git add server/routes.ts server/csrf.ts

echo Проверка статуса...
git status --short | findstr "routes csrf"

echo Создание коммита...
git commit -m "Fix: Add isBlocked check in login route and fix CSRF cookie secure flag for HTTP"

echo Загрузка на GitHub...
git push origin main

echo.
echo ==========================================
echo   ГОТОВО!
echo ==========================================
pause


