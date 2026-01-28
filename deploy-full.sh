#!/bin/bash
# Полный скрипт автоматического развертывания проекта на сервере
# Запустите этот скрипт на сервере после подключения

set -e  # Остановка при ошибке

echo "🚀 Начало развертывания проекта..."
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Переменные
PROJECT_DIR="/var/www/loaddevice"
GITHUB_REPO="https://github.com/regeraq/nagruz.git"
DOMAIN="vm3848909.firstbyte.club"
RESEND_API="re_QoyQT5uR_Cq4WEhQ1MsA4aPND2z1Ckqgt"

echo -e "${GREEN}=== ШАГ 1: Обновление системы ===${NC}"
apt update
apt upgrade -y

echo -e "${GREEN}=== ШАГ 2: Установка необходимого ПО ===${NC}"

# Установка базовых утилит
apt install -y curl wget git nano ufw

# Установка Node.js через NVM
if ! command -v node &> /dev/null; then
    echo "Установка Node.js..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install 20
    nvm use 20
    nvm alias default 20
fi

# Установка PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "Установка PostgreSQL..."
    apt install -y postgresql postgresql-contrib
    systemctl enable postgresql
    systemctl start postgresql
fi

# Установка Nginx
if ! command -v nginx &> /dev/null; then
    echo "Установка Nginx..."
    apt install -y nginx
    systemctl enable nginx
    systemctl start nginx
fi

# Установка PM2
if ! command -v pm2 &> /dev/null; then
    echo "Установка PM2..."
    npm install -g pm2
fi

# Установка Certbot
if ! command -v certbot &> /dev/null; then
    echo "Установка Certbot..."
    apt install -y certbot python3-certbot-nginx
fi

echo -e "${GREEN}=== ШАГ 3: Настройка swap файла ===${NC}"
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    echo "Swap файл создан"
else
    echo "Swap файл уже существует"
fi

echo -e "${GREEN}=== ШАГ 4: Настройка базы данных ===${NC}"
# Создание пользователя и базы данных
sudo -u postgres psql <<EOF
-- Создание пользователя (если не существует)
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'loaddevice_user') THEN
    CREATE USER loaddevice_user WITH PASSWORD 'loaddevice123';
  END IF;
END
\$\$;

-- Создание базы данных (если не существует)
SELECT 'CREATE DATABASE loaddevice_db OWNER loaddevice_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'loaddevice_db')\gexec

-- Предоставление прав
GRANT ALL PRIVILEGES ON DATABASE loaddevice_db TO loaddevice_user;
\q
EOF

# Настройка pg_hba.conf для md5 аутентификации
sed -i 's/local   all             all                                     peer/local   all             all                                     md5/' /etc/postgresql/*/main/pg_hba.conf
systemctl restart postgresql

echo -e "${GREEN}=== ШАГ 5: Развертывание кода проекта ===${NC}"
# Создание директории проекта
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# Клонирование репозитория
if [ ! -d ".git" ]; then
    git clone $GITHUB_REPO .
else
    git pull origin main
fi

# Установка зависимостей
echo "Установка зависимостей..."
npm install

# Сборка проекта
echo "Сборка проекта..."
npm run build

echo -e "${GREEN}=== ШАГ 6: Настройка переменных окружения ===${NC}"
# Создание .env файла
cat > .env <<EOF
# База данных
DATABASE_URL=postgresql://loaddevice_user:loaddevice123@localhost:5432/loaddevice_db

# Node.js окружение
NODE_ENV=production
PORT=5000

# JWT секретный ключ (сгенерирован автоматически)
JWT_SECRET=$(openssl rand -base64 32)

# Email настройки (Resend)
RESEND_API_KEY=$RESEND_API
OWNER_EMAIL=admin@$DOMAIN
RESEND_FROM_EMAIL=onboarding@resend.dev

# URL фронтенда
FRONTEND_URL=https://$DOMAIN
EOF

echo "Файл .env создан"

# Применение миграций БД
echo "Применение миграций базы данных..."
npm run db:push || echo "Миграции применены или отсутствуют"

echo -e "${GREEN}=== ШАГ 7: Запуск приложения ===${NC}"
# Создание директории для логов
mkdir -p logs

# Запуск через PM2
pm2 delete loaddevice 2>/dev/null || true
pm2 start dist/index.js --name loaddevice --max-memory-restart 500M
pm2 save
pm2 startup systemd -u $USER --hp $HOME | grep "sudo" | bash || true

echo -e "${GREEN}=== ШАГ 8: Настройка Nginx ===${NC}"
# Создание конфигурации Nginx
cat > /etc/nginx/sites-available/loaddevice <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    client_max_body_size 20M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# Активация сайта
ln -sf /etc/nginx/sites-available/loaddevice /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Проверка конфигурации
nginx -t

# Перезагрузка Nginx
systemctl reload nginx

echo -e "${GREEN}=== ШАГ 9: Настройка файрвола ===${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo -e "${GREEN}=== ШАГ 10: Настройка автоматического деплоя ===${NC}"
# Создание скрипта деплоя
cat > deploy.sh <<'DEPLOYSCRIPT'
#!/bin/bash
set -e
cd /var/www/loaddevice
git fetch origin
git reset --hard origin/main
npm install --production=false
npm run build
npm run db:push || true
pm2 restart loaddevice
pm2 status
DEPLOYSCRIPT

chmod +x deploy.sh

# Генерация SSH ключа для GitHub Actions
if [ ! -f ~/.ssh/github_actions_deploy ]; then
    ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy -N ""
    cat ~/.ssh/github_actions_deploy.pub >> ~/.ssh/authorized_keys
    chmod 600 ~/.ssh/github_actions_deploy
    echo -e "${YELLOW}=== SSH КЛЮЧ ДЛЯ GITHUB ACTIONS ===${NC}"
    echo "Приватный ключ (добавьте в GitHub Secrets как SSH_PRIVATE_KEY):"
    cat ~/.ssh/github_actions_deploy
    echo ""
fi

echo -e "${GREEN}=== ШАГ 11: Инициализация админ-пользователя ===${NC}"
# Запуск скрипта инициализации админа (если есть)
cd $PROJECT_DIR
node -e "
const { db } = require('./dist/server/db.js');
const { users } = require('./dist/shared/schema.js');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    const adminEmail = 'admin@$DOMAIN';
    const adminPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    // Проверка существования админа
    const existing = await db.select().from(users).where(users.email.eq(adminEmail)).limit(1);
    
    if (existing.length === 0) {
      await db.insert(users).values({
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        name: 'Администратор'
      });
      console.log('Админ-пользователь создан:');
      console.log('Email: ' + adminEmail);
      console.log('Password: admin123');
      console.log('⚠️  СМЕНИТЕ ПАРОЛЬ ПОСЛЕ ПЕРВОГО ВХОДА!');
    } else {
      console.log('Админ-пользователь уже существует');
    }
  } catch (error) {
    console.log('Ошибка создания админа (возможно, уже существует):', error.message);
  }
  process.exit(0);
})();
" || echo "Админ-пользователь будет создан при первом запуске"

echo ""
echo -e "${GREEN}=== ✅ РАЗВЕРТЫВАНИЕ ЗАВЕРШЕНО! ===${NC}"
echo ""
echo "📊 Статус сервисов:"
pm2 status
echo ""
echo "🌐 Сайт доступен по адресу: http://$DOMAIN"
echo ""
echo "📝 Следующие шаги:"
echo "1. Настройте DNS записи для домена $DOMAIN"
echo "2. После настройки DNS выполните: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo "3. Добавьте SSH ключ в GitHub Secrets для автоматического деплоя"
echo ""
echo "🔑 Данные для входа в админ-панель:"
echo "   Email: admin@$DOMAIN"
echo "   Password: admin123"
echo "   ⚠️  ОБЯЗАТЕЛЬНО СМЕНИТЕ ПАРОЛЬ!"
echo ""

