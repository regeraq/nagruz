@echo off
chcp 65001 >nul
echo ========================================
echo  ПОЛНАЯ ПЕРЕЗАГРУЗКА ПРОЕКТА НА GITHUB
echo ========================================
echo.

cd /d "%~dp0"

echo Проверка статуса Git...
git status
echo.

echo Добавление всех файлов...
git add -A
echo.

echo Коммит изменений...
git commit -m "Complete project rewrite - full update"
echo.

echo Принудительная загрузка на GitHub...
echo ВНИМАНИЕ: Это перезапишет всю историю на GitHub!
git push origin main --force
echo.

echo ========================================
echo  ГОТОВО!
echo ========================================
echo Репозиторий: https://github.com/regeraq/nagruz
echo.
pause


