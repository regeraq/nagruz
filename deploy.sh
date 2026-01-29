#!/bin/bash
# Скрипт автоматического деплоя на сервере
# Используется GitHub Actions или может быть запущен вручную

set -e  # Остановка при ошибке

PROJECT_DIR="/var/www/loaddevice"
BRANCH="main"

echo "🚀 Starting deployment..."

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

# Сохранение текущего коммита
CURRENT_COMMIT=$(git rev-parse HEAD)
echo "📍 Current commit: $CURRENT_COMMIT"

# Получение последних изменений
echo "📥 Fetching latest changes..."
git fetch origin

# Проверка, есть ли изменения
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse @{u})

if [ "$LOCAL" = "$REMOTE" ]; then
    echo "✅ Already up to date. No deployment needed."
    exit 0
fi

echo "🔄 Updating code..."
git reset --hard origin/$BRANCH

# Установка зависимостей
echo "📦 Installing dependencies..."
npm install --production=false

# Сборка проекта
echo "🔨 Building project..."
npm run build

# Применение миграций БД (если есть)
echo "🗄️  Applying database migrations..."
npm run db:push || echo "⚠️  No migrations to apply or migration failed (continuing...)"

# Перезапуск приложения через PM2
echo "🔄 Restarting application..."
if pm2 list | grep -q "loaddevice"; then
    pm2 restart loaddevice
else
    pm2 start dist/index.js --name loaddevice --max-memory-restart 300M --cwd "$PROJECT_ROOT"
fi

# Сохранение конфигурации PM2
pm2 save

# Проверка статуса
echo "📊 Application status:"
pm2 status

echo "✅ Deployment completed successfully!"
echo "📍 New commit: $(git rev-parse HEAD)"


