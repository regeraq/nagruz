#!/bin/bash
set -e

PROJECT_DIR="/var/www/loaddevice"

# Переходим в базовую директорию
cd "$PROJECT_DIR" || exit 1

# Автоматическое определение корня проекта
echo "🔍 Определение корня проекта..."
if [ -f "package.json" ]; then
    echo "✅ package.json найден в корне: $PROJECT_DIR"
    PROJECT_ROOT="$PROJECT_DIR"
elif [ -f "HelloWhoAreYou-1/package.json" ]; then
    echo "✅ package.json найден в подпапке: $PROJECT_DIR/HelloWhoAreYou-1"
    PROJECT_ROOT="$PROJECT_DIR/HelloWhoAreYou-1"
    cd "$PROJECT_ROOT" || exit 1
else
    echo "❌ ОШИБКА: package.json не найден ни в $PROJECT_DIR, ни в $PROJECT_DIR/HelloWhoAreYou-1"
    exit 1
fi

echo "📁 Рабочая директория: $PROJECT_ROOT"
cd "$PROJECT_ROOT"

echo "📍 Текущий коммит:"
git rev-parse HEAD || echo "unknown"
echo ""

echo "📥 Получение обновлений из GitHub..."
git fetch origin

LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    echo "✅ Проект уже актуален. Обновлений нет."
    exit 0
fi

echo "🔄 Обнаружены новые изменения!"
echo "   Локальный: $LOCAL"
echo "   Удаленный: $REMOTE"
echo ""

echo "📥 Обновление кода..."
git reset --hard origin/main
git clean -fd

echo ""
echo "📦 Установка зависимостей..."
npm install --production=false

echo ""
echo "🔨 Сборка проекта..."
npm run build

echo ""
echo "🗄️  Применение миграций базы данных..."
npm run db:push || echo "⚠️  Миграции применены или отсутствуют"

echo ""
echo "🔄 Перезапуск приложения..."
if pm2 list | grep -q "loaddevice"; then
    pm2 restart loaddevice
    echo "✅ Приложение перезапущено"
else
    echo "⚠️  Приложение не найдено в PM2, запускаю..."
    pm2 start dist/index.js --name loaddevice --max-memory-restart 500M --cwd "$PROJECT_ROOT"
fi

pm2 save

echo ""
echo "📊 Статус приложения:"
pm2 status

echo ""
echo "✅ Обновление завершено!"
echo "📍 Новый коммит:"
git rev-parse HEAD


