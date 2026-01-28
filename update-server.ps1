# PowerShell скрипт для обновления проекта на сервере
# Этот скрипт подключится к серверу и выполнит обновление

Write-Host "🚀 Обновление проекта на сервере" -ForegroundColor Green
Write-Host ""

$serverIP = "45.9.72.103"
$serverUser = "root"
$serverPassword = "c0E53YVH1wq1"
$projectDir = "/var/www/loaddevice"

Write-Host "📋 Данные сервера:" -ForegroundColor Cyan
Write-Host "   IP: $serverIP"
Write-Host "   Пользователь: $serverUser"
Write-Host "   Директория проекта: $projectDir"
Write-Host ""

# Проверка установки SSH
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Host "❌ SSH не найден!" -ForegroundColor Red
    Write-Host "Установите OpenSSH или используйте Git Bash" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ SSH найден" -ForegroundColor Green
Write-Host ""

# Команды для выполнения на сервере
$updateCommands = @"
cd $projectDir
echo "🚀 Начало обновления проекта..."
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
echo "🔄 Обнаружены новые изменения. Начинаю обновление..."
git reset --hard origin/main
git clean -fd
echo "📦 Установка зависимостей..."
npm install --production=false
echo "🔨 Сборка проекта..."
npm run build
echo "🗄️  Применение миграций базы данных..."
npm run db:push || echo "⚠️  Миграции применены или отсутствуют"
echo "🔄 Перезапуск приложения..."
if pm2 list | grep -q "loaddevice"; then
    pm2 restart loaddevice
else
    pm2 start dist/index.js --name loaddevice --max-memory-restart 500M
fi
pm2 save
echo ""
echo "📊 Статус приложения:"
pm2 status
echo ""
echo "✅ Обновление завершено!"
"@

Write-Host "📝 Инструкция:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Вариант 1: Автоматическое обновление (требует пароль)" -ForegroundColor Yellow
Write-Host "   Выполните команду:" -ForegroundColor White
Write-Host "   ssh $serverUser@$serverIP `"$updateCommands`"" -ForegroundColor Gray
Write-Host ""
Write-Host "Вариант 2: Ручное подключение (рекомендуется)" -ForegroundColor Yellow
Write-Host "   1. Подключитесь к серверу:" -ForegroundColor White
Write-Host "      ssh $serverUser@$serverIP" -ForegroundColor Gray
Write-Host ""
Write-Host "   2. После подключения выполните команды:" -ForegroundColor White
Write-Host "      cd $projectDir" -ForegroundColor Gray
Write-Host "      git pull origin main" -ForegroundColor Gray
Write-Host "      npm install" -ForegroundColor Gray
Write-Host "      npm run build" -ForegroundColor Gray
Write-Host "      npm run db:push" -ForegroundColor Gray
Write-Host "      pm2 restart loaddevice" -ForegroundColor Gray
Write-Host ""
Write-Host "   3. Или скопируйте и выполните скрипт update-server.sh" -ForegroundColor White
Write-Host ""

# Спрашиваем, хотит ли пользователь выполнить автоматическое обновление
$response = Read-Host "Выполнить автоматическое обновление? (y/n)"
if ($response -eq "y" -or $response -eq "Y") {
    Write-Host ""
    Write-Host "🔐 Подключение к серверу..." -ForegroundColor Cyan
    Write-Host "   Введите пароль при запросе: $serverPassword" -ForegroundColor Yellow
    Write-Host ""
    
    # Используем sshpass если доступен, иначе обычный ssh
    if (Get-Command sshpass -ErrorAction SilentlyContinue) {
        echo $updateCommands | sshpass -p $serverPassword ssh $serverUser@$serverIP bash
    } else {
        echo $updateCommands | ssh $serverUser@$serverIP bash
    }
} else {
    Write-Host ""
    Write-Host "📋 Скопируйте команды выше и выполните их вручную на сервере" -ForegroundColor Yellow
}

