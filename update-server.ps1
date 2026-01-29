# Скрипт для обновления проекта на сервере через PowerShell

$ErrorActionPreference = "Stop"

$SERVER_IP = "45.9.72.103"
$SERVER_USER = "root"
$PROJECT_DIR = "/var/www/loaddevice"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  ОБНОВЛЕНИЕ ПРОЕКТА НА СЕРВЕРЕ" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "🔗 Подключение к серверу: $SERVER_USER@$SERVER_IP" -ForegroundColor Yellow
Write-Host ""

# Команды для выполнения на сервере
$commands = @"
cd $PROJECT_DIR
echo '📁 Директория проекта: ' && pwd
echo ''
echo '🔍 Получение последних изменений с GitHub...'
git fetch origin
git reset --hard origin/main
echo ''
echo '📂 Проверка структуры проекта...'
if [ -f 'package.json' ]; then
    echo '✅ package.json найден в корне'
    PROJECT_ROOT='$PROJECT_DIR'
elif [ -f 'HelloWhoAreYou-1/package.json' ]; then
    echo '✅ package.json найден в подпапке HelloWhoAreYou-1'
    PROJECT_ROOT='$PROJECT_DIR/HelloWhoAreYou-1'
    cd `$PROJECT_ROOT
else
    echo '❌ ОШИБКА: package.json не найден!'
    exit 1
fi
echo ''
echo '📦 Установка зависимостей...'
npm install
echo ''
echo '🔨 Сборка проекта...'
npm run build
echo ''
echo '🗄️  Применение миграций БД...'
npm run db:push || echo '⚠️  Миграции не применены'
echo ''
echo '🔄 Перезапуск приложения...'
pm2 restart loaddevice || (pm2 start dist/index.js --name loaddevice --max-memory-restart 500M && pm2 save)
echo ''
echo '✅ Проверка статуса...'
pm2 status
echo ''
echo '📊 Последние логи:'
pm2 logs loaddevice --lines 20 --nostream
"@

# Выполняем команды на сервере
ssh "${SERVER_USER}@${SERVER_IP}" $commands

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  ОБНОВЛЕНИЕ ЗАВЕРШЕНО!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Проверьте сайт:" -ForegroundColor Cyan
Write-Host "   - http://$SERVER_IP" -ForegroundColor White
Write-Host "   - https://vm3848909.firstbyte.club" -ForegroundColor White
