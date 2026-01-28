# 🚀 ПОШАГОВОЕ РАЗВЕРТЫВАНИЕ ЧЕРЕЗ POWERSHELL

## 📋 Данные сервера:
- **IP:** 45.9.72.103
- **Домен:** vm3848909.firstbyte.club
- **Пользователь:** root
- **Пароль:** c0E53YVH1wq1
- **Resend API:** re_QoyQT5uR_Cq4WEhQ1MsA4aPND2z1Ckqgt

---

## ШАГ 1: Подключение к серверу

Откройте PowerShell на вашем компьютере и выполните:

```powershell
ssh root@45.9.72.103
```

**При первом подключении:**
- Введите `yes` когда спросит про fingerprint
- Введите пароль: ` `

---

## ШАГ 2: Обновление системы

После подключения к серверу выполните:

```bash
apt update && apt upgrade -y
```

**Ожидаемое время:** 2-5 минут

---

## ШАГ 3: Установка базовых утилит

```bash
apt install -y curl wget git nano ufw
```

---

## ШАГ 4: Установка Node.js через NVM

```bash
# Установка NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Загрузка NVM в текущую сессию
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Установка Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Проверка установки
node --version
npm --version
```

**Ожидаемый результат:** Node.js v20.x.x и npm v10.x.x

---

## ШАГ 5: Установка PostgreSQL

```bash
# Установка PostgreSQL
apt install -y postgresql postgresql-contrib

# Запуск и автозапуск
systemctl enable postgresql
systemctl start postgresql

# Проверка статуса
systemctl status postgresql
```

**Нажмите `q` чтобы выйти из статуса**

---

## ШАГ 6: Настройка базы данных

```bash
# Создание пользователя и базы данных
sudo -u postgres psql <<EOF
CREATE USER loaddevice_user WITH PASSWORD 'loaddevice123';
CREATE DATABASE loaddevice_db OWNER loaddevice_user;
GRANT ALL PRIVILEGES ON DATABASE loaddevice_db TO loaddevice_user;
\q
EOF
```

**Настройка аутентификации:**

```bash
# Изменение метода аутентификации с peer на md5
sed -i 's/local   all             all                                     peer/local   all             all                                     md5/' /etc/postgresql/*/main/pg_hba.conf

# Перезапуск PostgreSQL
systemctl restart postgresql

# Проверка подключения
sudo -u postgres psql -d loaddevice_db -U loaddevice_user -c "SELECT version();"
```

---

## ШАГ 7: Установка Nginx

```bash
# Установка Nginx
apt install -y nginx

# Запуск и автозапуск
systemctl enable nginx
systemctl start nginx

# Проверка статуса
systemctl status nginx
```

**Нажмите `q` чтобы выйти**

**Проверка работы:** Откройте в браузере `http://45.9.72.103` - должна быть страница Nginx

---

## ШАГ 8: Установка PM2

```bash
# Установка PM2 глобально
npm install -g pm2

# Проверка установки
pm2 --version
```

---

## ШАГ 9: Установка Certbot (для HTTPS)

```bash
apt install -y certbot python3-certbot-nginx

# Проверка установки
certbot --version
```

---

## ШАГ 10: Настройка swap файла

```bash
# Создание swap файла 2GB
fallocate -l 2G /swapfile

# Установка прав доступа
chmod 600 /swapfile

# Форматирование как swap
mkswap /swapfile

# Активация swap
swapon /swapfile

# Автозагрузка при перезапуске
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Оптимизация параметров
sysctl vm.swappiness=10
echo 'vm.swappiness=10' >> /etc/sysctl.conf

# Проверка
free -h
```

**Должно показать:** ~2GB swap в использовании

---

## ШАГ 11: Развертывание проекта

```bash
# Создание директории проекта
mkdir -p /var/www/loaddevice
cd /var/www/loaddevice

# Клонирование репозитория
git clone https://github.com/regeraq/nagruz.git .

# Переход в директорию проекта
cd /var/www/loaddevice

# Установка зависимостей
npm install
```

**Ожидаемое время:** 3-5 минут

---

## ШАГ 12: Сборка проекта

```bash
# Сборка проекта
npm run build
```

**Ожидаемое время:** 1-2 минуты

**Проверка:** Должна быть создана папка `dist/` с файлами

---

## ШАГ 13: Создание файла .env

```bash
# Создание .env файла
nano .env
```

**Вставьте следующее содержимое:**

```env
DATABASE_URL=postgresql://loaddevice_user:loaddevice123@localhost:5432/loaddevice_db
NODE_ENV=production
PORT=5000
JWT_SECRET=ваш-случайный-секретный-ключ-минимум-32-символа
RESEND_API_KEY=re_QoyQT5uR_Cq4WEhQ1MsA4aPND2z1Ckqgt
OWNER_EMAIL=admin@vm3848909.firstbyte.club
RESEND_FROM_EMAIL=onboarding@resend.dev
FRONTEND_URL=https://vm3848909.firstbyte.club
```

**Для генерации JWT_SECRET выполните:**

```bash
openssl rand -base64 32
```

**Скопируйте результат и вставьте в .env вместо `ваш-случайный-секретный-ключ-минимум-32-символа`**

**Сохранение в nano:**
- Нажмите `Ctrl+O` (сохранить)
- Нажмите `Enter` (подтвердить имя файла)
- Нажмите `Ctrl+X` (выйти)

**Или создайте файл одной командой:**

```bash
cat > .env <<ENVFILE
DATABASE_URL=postgresql://loaddevice_user:loaddevice123@localhost:5432/loaddevice_db
NODE_ENV=production
PORT=5000
JWT_SECRET=$(openssl rand -base64 32)
RESEND_API_KEY=re_QoyQT5uR_Cq4WEhQ1MsA4aPND2z1Ckqgt
OWNER_EMAIL=admin@vm3848909.firstbyte.club
RESEND_FROM_EMAIL=onboarding@resend.dev
FRONTEND_URL=https://vm3848909.firstbyte.club
ENVFILE
```

---

## ШАГ 14: Применение миграций базы данных

```bash
# Применение миграций
npm run db:push
```

**Ожидаемый результат:** Сообщение об успешном применении миграций

---

## ШАГ 15: Запуск приложения через PM2

```bash
# Создание директории для логов
mkdir -p logs

# Запуск приложения
pm2 start dist/index.js --name loaddevice --max-memory-restart 500M

# Сохранение конфигурации PM2
pm2 save

# Настройка автозапуска
pm2 startup
```

**PM2 выведет команду с `sudo` - скопируйте и выполните её!**

**Пример команды (ваша может отличаться):**
```bash
sudo env PATH=$PATH:/root/.nvm/versions/node/v20.x.x/bin /root/.nvm/versions/node/v20.x.x/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root
```

**Проверка статуса:**

```bash
pm2 status
```

**Должно показать:** `loaddevice` в статусе `online`

**Просмотр логов:**

```bash
pm2 logs loaddevice
```

**Нажмите `Ctrl+C` чтобы выйти из логов**

---

## ШАГ 16: Настройка Nginx

```bash
# Создание конфигурационного файла
nano /etc/nginx/sites-available/loaddevice
```

**Вставьте следующее содержимое:**

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name vm3848909.firstbyte.club www.vm3848909.firstbyte.club;

    client_max_body_size 20M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

**Сохранение:** `Ctrl+O`, `Enter`, `Ctrl+X`

**Или создайте файл одной командой:**

```bash
cat > /etc/nginx/sites-available/loaddevice <<NGINXCONF
server {
    listen 80;
    listen [::]:80;
    server_name vm3848909.firstbyte.club www.vm3848909.firstbyte.club;

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
NGINXCONF
```

**Активация сайта:**

```bash
# Создание символической ссылки
ln -sf /etc/nginx/sites-available/loaddevice /etc/nginx/sites-enabled/

# Удаление дефолтной конфигурации
rm -f /etc/nginx/sites-enabled/default

# Проверка конфигурации на ошибки
nginx -t
```

**Ожидаемый результат:** `nginx: configuration file /etc/nginx/nginx.conf test is successful`

**Перезагрузка Nginx:**

```bash
systemctl reload nginx
```

---

## ШАГ 17: Настройка файрвола

```bash
# Разрешение SSH (ВАЖНО!)
ufw allow 22/tcp

# Разрешение HTTP
ufw allow 80/tcp

# Разрешение HTTPS
ufw allow 443/tcp

# Включение файрвола
ufw --force enable

# Проверка статуса
ufw status verbose
```

---

## ШАГ 18: Проверка работы

```bash
# Проверка статуса PM2
pm2 status

# Проверка статуса Nginx
systemctl status nginx

# Проверка статуса PostgreSQL
systemctl status postgresql

# Проверка работы приложения
curl http://localhost:5000
```

**Нажмите `q` чтобы выйти из статусов**

---

## ШАГ 19: Настройка DNS (если нужно)

Если домен еще не настроен, настройте DNS записи у вашего регистратора:

- **A запись:** `vm3848909.firstbyte.club` → `45.9.72.103`
- **A запись:** `www.vm3848909.firstbyte.club` → `45.9.72.103`

---

## ШАГ 20: Получение SSL сертификата (после настройки DNS)

**ВАЖНО:** Выполните только после настройки DNS записей!

```bash
# Получение SSL сертификата
sudo certbot --nginx -d vm3848909.firstbyte.club -d www.vm3848909.firstbyte.club
```

**Во время выполнения:**
- Введите email для уведомлений
- Согласитесь с условиями (A)
- Выберите, делиться ли email (Y/N)

**После получения сертификата сайт будет доступен по HTTPS!**

---

## ✅ ПРОВЕРКА РАБОТЫ САЙТА

1. **По IP адресу:** http://45.9.72.103
2. **По домену:** http://vm3848909.firstbyte.club
3. **По HTTPS (после настройки SSL):** https://vm3848909.firstbyte.club

---

## 🔧 ПОЛЕЗНЫЕ КОМАНДЫ

### Просмотр логов приложения:
```bash
pm2 logs loaddevice
```

### Перезапуск приложения:
```bash
pm2 restart loaddevice
```

### Просмотр статуса всех сервисов:
```bash
pm2 status
systemctl status nginx
systemctl status postgresql
```

### Обновление кода (после изменений на GitHub):
```bash
cd /var/www/loaddevice
git pull origin main
npm install
npm run build
pm2 restart loaddevice
```

---

## 🆘 УСТРАНЕНИЕ ПРОБЛЕМ

### Сайт не открывается:
```bash
# Проверка статуса PM2
pm2 status
pm2 logs loaddevice

# Проверка статуса Nginx
systemctl status nginx
nginx -t

# Проверка портов
netstat -tlnp | grep 5000
netstat -tlnp | grep 80
```

### Ошибки базы данных:
```bash
# Проверка статуса PostgreSQL
systemctl status postgresql

# Проверка подключения
sudo -u postgres psql -d loaddevice_db -U loaddevice_user
```

### Ошибки при сборке:
```bash
# Очистка и пересборка
cd /var/www/loaddevice
rm -rf node_modules dist
npm install
npm run build
```

---

## 🎉 ГОТОВО!

Ваш сайт развернут и должен быть доступен!

**Следующие шаги:**
1. Настройте DNS записи для домена
2. Получите SSL сертификат через Certbot
3. Настройте автоматический деплой (см. `AUTO_DEPLOY_SETUP.md`)

