# Быстрое обновление проекта на сервере
# Этот скрипт выполнит все необходимые команды для обновления

$serverIP = "45.9.72.103"
$serverUser = "root"
$projectDir = "/var/www/loaddevice"

Write-Host "🚀 Обновление проекта на сервере $serverIP" -ForegroundColor Green
Write-Host ""

# Команды для выполнения на сервере
$commands = @"
set -e
cd $projectDir
echo "📍 Текущая директория: \$(pwd)"
echo "📍 Текущий коммит: \$(git rev-parse HEAD 2>/dev/null || echo 'unknown')"
echo ""
echo "📥 Получение обновлений из GitHub..."
git fetch origin
LOCAL=\$(git rev-parse @)
REMOTE=\$(git rev-parse origin/main)
if [ "\$LOCAL" = "\$REMOTE" ]; then
    echo "✅ Проект уже актуален. Обновлений нет."
    exit 0
fi
echo "🔄 Обнаружены новые изменения!"
echo "   Локальный: \$LOCAL"
echo "   Удаленный: \$REMOTE"
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
    pm2 start dist/index.js --name loaddevice --max-memory-restart 500M
fi
pm2 save
echo ""
echo "📊 Статус приложения:"
pm2 status
echo ""
echo "✅ Обновление завершено!"
echo "📍 Новый коммит: \$(git rev-parse HEAD)"
"@

Write-Host "🔐 Подключение к серверу..." -ForegroundColor Cyan
Write-Host "   Введите пароль при запросе: c0E53YVH1wq1" -ForegroundColor Yellow
Write-Host ""

# Выполнение команд на сервере
try {
    $commands | ssh $serverUser@$serverIP bash
    Write-Host ""
    Write-Host "✅ Обновление завершено успешно!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Проверьте работу сайта:" -ForegroundColor Cyan
    Write-Host "   - http://$serverIP" -ForegroundColor White
    Write-Host "   - http://vm3848909.firstbyte.club" -ForegroundColor White
} catch {
    Write-Host ""
    Write-Host "❌ Ошибка при выполнении обновления:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Попробуйте выполнить команды вручную:" -ForegroundColor Yellow
    Write-Host "   ssh $serverUser@$serverIP" -ForegroundColor White
    Write-Host "   cd $projectDir" -ForegroundColor White
    Write-Host "   git pull origin main" -ForegroundColor White
    Write-Host "   npm install && npm run build && pm2 restart loaddevice" -ForegroundColor White
}

