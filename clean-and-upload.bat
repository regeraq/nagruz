@echo off
chcp 65001 >nul
echo ==========================================
echo   ПОЛНАЯ ОЧИСТКА GITHUB И ПЕРЕЗАГРУЗКА
echo ==========================================
echo.

cd /d "%~dp0"

echo Шаг 1: Проверка статуса Git...
git status
echo.

echo Шаг 2: Удаление всех файлов из индекса Git...
git rm -rf --cached .
echo.

echo Шаг 3: Добавление всех файлов проекта...
git add -A
echo.

echo Шаг 4: Проверка, что attached_assets не добавлен...
git status | findstr "attached_assets" >nul
if %errorlevel% equ 0 (
    echo ВНИМАНИЕ: attached_assets найден в индексе!
    echo Удаляем из индекса...
    git rm -rf --cached attached_assets
) else (
    echo attached_assets правильно игнорируется
)
echo.

echo Шаг 5: Статус изменений:
git status --short
echo.

echo Шаг 6: Создание коммита...
git commit -m "Complete project rewrite - clean version without attached_assets"
echo.

echo Шаг 7: Принудительная загрузка на GitHub...
echo ВНИМАНИЕ: Это перезапишет всю историю на GitHub!
pause
git push origin main --force
echo.

echo ==========================================
echo   ГОТОВО!
echo ==========================================
echo Репозиторий: https://github.com/regeraq/nagruz
echo.
pause

