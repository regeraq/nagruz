# PowerShell скрипт для развертывания сайта на сервере
# Запустите этот скрипт в PowerShell

Write-Host "🚀 Развертывание сайта на сервере" -ForegroundColor Green
Write-Host ""

$serverIP = "45.9.72.103"
$serverUser = "root"
$serverPassword = "c0E53YVH1wq1"
$domain = "vm3848909.firstbyte.club"

Write-Host "📋 Данные сервера:" -ForegroundColor Cyan
Write-Host "   IP: $serverIP"
Write-Host "   Домен: $domain"
Write-Host "   Пользователь: $serverUser"
Write-Host ""

# Проверка установки SSH
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Host "❌ SSH не найден!" -ForegroundColor Red
    Write-Host "Установите OpenSSH или используйте Git Bash" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ SSH найден" -ForegroundColor Green
Write-Host ""

# Создание команды для развертывания
$deployScript = @"
#!/bin/bash
set -e
echo "🚀 Начало развертывания..."

# Обновление системы
echo "📦 Обновление системы..."
apt update && apt upgrade -y

# Установка утилит
echo "📦 Установка утилит..."
apt install -y curl wget git nano ufw

# Установка Node.js
echo "📦 Установка Node.js..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
export NVM_DIR="`$HOME/.nvm"
[ -s "`$NVM_DIR/nvm.sh" ] && \. "`$NVM_DIR/nvm.sh"
nvm install 20 && nvm use 20 && nvm alias default 20

# Установка PostgreSQL
echo "📦 Установка PostgreSQL..."
apt install -y postgresql postgresql-contrib
systemctl enable postgresql && systemctl start postgresql

# Настройка БД
echo "🗄️ Настройка базы данных..."
sudo -u postgres psql <<EOF
CREATE USER loaddevice_user WITH PASSWORD 'loaddevice123';
CREATE DATABASE loaddevice_db OWNER loaddevice_user;
GRANT ALL PRIVILEGES ON DATABASE loaddevice_db TO loaddevice_user;
\q
EOF
sed -i 's/local   all             all                                     peer/local   all             all                                     md5/' /etc/postgresql/*/main/pg_hba.conf
systemctl restart postgresql

# Установка Nginx
echo "📦 Установка Nginx..."
apt install -y nginx
systemctl enable nginx && systemctl start nginx

# Установка PM2
echo "📦 Установка PM2..."
npm install -g pm2

# Установка Certbot
echo "📦 Установка Certbot..."
apt install -y certbot python3-certbot-nginx

# Настройка swap
echo "💾 Настройка swap..."
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
sysctl vm.swappiness=10 && echo 'vm.swappiness=10' >> /etc/sysctl.conf

# Развертывание проекта
echo "📥 Развертывание проекта..."
mkdir -p /var/www/loaddevice && cd /var/www/loaddevice
git clone https://github.com/regeraq/nagruz.git . || (git pull origin main)
npm install
npm run build

# Создание .env
echo "⚙️ Создание .env..."
cat > .env <<ENVFILE
DATABASE_URL=postgresql://loaddevice_user:loaddevice123@localhost:5432/loaddevice_db
NODE_ENV=production
PORT=5000
JWT_SECRET=`$(openssl rand -base64 32)
RESEND_API_KEY=re_QoyQT5uR_Cq4WEhQ1MsA4aPND2z1Ckqgt
OWNER_EMAIL=admin@$domain
RESEND_FROM_EMAIL=onboarding@resend.dev
FRONTEND_URL=https://$domain
ENVFILE

# Миграции БД
echo "🗄️ Применение миграций..."
npm run db:push || echo "Миграции применены или отсутствуют"

# Запуск приложения
echo "🚀 Запуск приложения..."
mkdir -p logs
pm2 delete loaddevice 2>/dev/null || true
pm2 start dist/index.js --name loaddevice --max-memory-restart 500M
pm2 save
pm2 startup | grep "sudo" | bash || true

# Настройка Nginx
echo "🌐 Настройка Nginx..."
cat > /etc/nginx/sites-available/loaddevice <<NGINXCONF
server {
    listen 80;
    listen [::]:80;
    server_name $domain www.$domain;
    client_max_body_size 20M;
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host `\$host;
        proxy_set_header X-Real-IP `\$remote_addr;
        proxy_set_header X-Forwarded-For `\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `\$scheme;
        proxy_cache_bypass `\$http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
NGINXCONF
ln -sf /etc/nginx/sites-available/loaddevice /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Настройка файрвола
echo "🔥 Настройка файрвола..."
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp
ufw --force enable

echo "✅ Развертывание завершено!"
echo ""
echo "📊 Статус:"
pm2 status
echo ""
echo "🌐 Сайт доступен: http://$domain"
echo "📝 После настройки DNS выполните: sudo certbot --nginx -d $domain -d www.$domain"
"@

Write-Host "📝 Инструкция:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Подключитесь к серверу:" -ForegroundColor Yellow
Write-Host "   ssh $serverUser@$serverIP" -ForegroundColor White
Write-Host ""
Write-Host "2. После подключения выполните команды из файла POWERSHELL_DEPLOY.md" -ForegroundColor Yellow
Write-Host "   Или скопируйте и выполните скрипт deploy-all-in-one.sh" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Или выполните команды пошагово:" -ForegroundColor Yellow
Write-Host ""

# Сохранение скрипта в файл
$scriptPath = Join-Path $PSScriptRoot "deploy-script.sh"
$deployScript | Out-File -FilePath $scriptPath -Encoding UTF8

Write-Host "✅ Скрипт развертывания сохранен в: $scriptPath" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Быстрый способ:" -ForegroundColor Cyan
Write-Host "   1. Откройте PowerShell" -ForegroundColor White
Write-Host "   2. Выполните: ssh $serverUser@$serverIP" -ForegroundColor White
Write-Host "   3. Введите пароль: $serverPassword" -ForegroundColor White
Write-Host "   4. Скопируйте содержимое файла deploy-all-in-one.sh и выполните" -ForegroundColor White
Write-Host ""
Write-Host "Или следуйте пошаговой инструкции из POWERSHELL_DEPLOY.md" -ForegroundColor Yellow

