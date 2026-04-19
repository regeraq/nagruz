# Полное руководство: домен, сервер, деплой, миграция, email-рассылки

Единый документ для всего, что нужно, чтобы поставить проект на продакшн в РФ, переносить его между серверами без потерь данных и подключить российский email-сервис.

Актуально на: апрель 2026. Все цены указаны с учётом открытых тарифов провайдеров на начало 2026 года; перед оплатой **всегда сверяй на сайте**, цены и акции меняются.

---

## Содержание

1. [Что представляет собой проект](#1-что-представляет-собой-проект)
2. [Требования к серверу и порядок действий](#2-требования-к-серверу-и-порядок-действий)
3. [Покупка домена в РФ](#3-покупка-домена-в-рф)
4. [Выбор и покупка VPS в РФ](#4-выбор-и-покупка-vps-в-рф)
5. [Первоначальная настройка сервера (Ubuntu 22.04)](#5-первоначальная-настройка-сервера-ubuntu-2204)
6. [Установка ПО: Node.js, PostgreSQL, nginx, pm2](#6-установка-по-nodejs-postgresql-nginx-pm2)
7. [Настройка базы данных и переменных окружения](#7-настройка-базы-данных-и-переменных-окружения)
8. [Первый деплой приложения](#8-первый-деплой-приложения)
9. [nginx и HTTPS через Let's Encrypt](#9-nginx-и-https-через-lets-encrypt)
10. [Привязка домена и DNS](#10-привязка-домена-и-dns)
11. [Резервное копирование: backup.sh + cron](#11-резервное-копирование-backupsh--cron)
12. [Миграция на новый сервер без потерь данных](#12-миграция-на-новый-сервер-без-потерь-данных)
13. [Российский email-сервис: выбор, цены, интеграция](#13-российский-email-сервис-выбор-цены-интеграция)
14. [Соответствие 152-ФЗ и 242-ФЗ](#14-соответствие-152-фз-и-242-фз)
15. [Обновление кода на продакшне](#15-обновление-кода-на-продакшне)
16. [Мониторинг, логи, типовые проблемы](#16-мониторинг-логи-типовые-проблемы)
17. [Итоговый чек-лист «с нуля до продакшна»](#17-итоговый-чек-лист-с-нуля-до-продакшна)

---

## 1. Что представляет собой проект

| Параметр               | Значение                                                                    |
| ---------------------- | --------------------------------------------------------------------------- |
| Репозиторий            | https://github.com/regeraq/nagruz                                           |
| Стек                   | Node.js 20 + Express + React (Vite) + TypeScript                            |
| База данных            | PostgreSQL 14+ (через Drizzle ORM)                                          |
| Исполнение в проде     | PM2 (процесс называется `loaddevice`)                                       |
| Порт приложения        | 5000 (за nginx reverse-proxy)                                               |
| Точка входа            | `dist/index.js` (после `npm run build`)                                     |
| Текущий сервер         | `45.9.72.103` (Ubuntu, FirstByte), проект в `/var/www/loaddevice`           |
| Email (сейчас)         | Resend (США) — **нужно заменить на российский**, см. [§13](#13-российский-email-сервис-выбор-цены-интеграция) |
| Сборка                 | `npm run build` → `vite build` + `esbuild server/index.ts`                  |

---

## 2. Требования к серверу и порядок действий

Проект «в двух словах» — небольшой сайт/витрина с админкой и регистрацией пользователей. На 10–50 одновременных посетителей хватит скромного VPS.

### Минимальные требования

| Параметр | Минимум         | Рекомендуется       | Комфортно для роста |
| -------- | --------------- | ------------------- | ------------------- |
| CPU      | 1 vCPU          | 2 vCPU              | 2–4 vCPU            |
| RAM      | 1 GB + swap 1GB | **2 GB**            | 4 GB                |
| Диск     | 15 GB SSD/NVMe  | 20–30 GB NVMe       | 40–80 GB NVMe       |
| ОС       | Ubuntu 22.04 LTS                                                             |
| Канал    | 100 Мбит/с+, без ограничений по трафику                                      |

Сборка проекта (`vite build`) довольно прожорлива по RAM — на 1 GB без свопа бывают OOM-kill. Поэтому **всегда делайте swap** (см. [§5](#5-первоначальная-настройка-сервера-ubuntu-2204)) или берите 2 GB сразу.

### Порядок действий с нуля

1. Покупка домена ([§3](#3-покупка-домена-в-рф)).
2. Покупка VPS ([§4](#4-выбор-и-покупка-vps-в-рф)).
3. Базовая настройка сервера: пользователи, SSH, firewall, swap ([§5](#5-первоначальная-настройка-сервера-ubuntu-2204)).
4. Установка Node.js, PostgreSQL, nginx, pm2 ([§6](#6-установка-по-nodejs-postgresql-nginx-pm2)).
5. Создание БД, `.env`, клонирование репо, деплой ([§7](#7-настройка-базы-данных-и-переменных-окружения), [§8](#8-первый-деплой-приложения)).
6. Прописать A-запись домена → IP, получить SSL ([§9](#9-nginx-и-https-через-lets-encrypt), [§10](#10-привязка-домена-и-dns)).
7. Включить бэкапы ([§11](#11-резервное-копирование-backupsh--cron)).
8. Подключить российский email ([§13](#13-российский-email-сервис-выбор-цены-интеграция)).
9. Пройти чек-лист 152-ФЗ ([§14](#14-соответствие-152-фз-и-242-фз)).

---

## 3. Покупка домена в РФ

Домен = адрес сайта. Российские регистраторы с самыми удобными панелями и русской поддержкой: **Beget**, **REG.RU**, **RU-CENTER** (ранее NIC.ru).

### Цены на домен `.ru` / `.рф` (апрель 2026)

| Регистратор | Регистрация (.ru) | Продление (.ru)  | Плюсы                                                             |
| ----------- | ----------------- | ---------------- | ----------------------------------------------------------------- |
| **Beget**   | от 199 ₽          | от 399 ₽         | Самая простая панель, бесплатный DNS, бесплатное продление при покупке хостинга на год |
| **REG.RU**  | от 199 ₽ (по акциям) | 399–599 ₽     | Лидер рынка, максимум доменных зон, интеграция с Яндекс.Почтой   |
| **RU-CENTER** | 299–399 ₽        | 399–599 ₽        | Первый регистратор в РФ, строгая проверка, корпоративный акцент   |

`.ru` и `.рф` стоят одинаково и подтверждают российскую привязку сайта (важно для SEO в Яндексе и выглядит доверительнее для русскоязычных клиентов).

### Как купить домен на примере REG.RU (пошагово)

1. Зайти на https://www.reg.ru.
2. В поиске ввести желаемое имя: `loaddevice.ru`, `nagruz.ru`, `atomvolt.ru` и т.п.
3. Если занято — сайт предложит свободные варианты. Выбрать один и нажать **«Купить»**.
4. Регистрация личного кабинета:
    - Для физлица: ФИО, паспорт, e-mail, телефон. Для домена `.ru` регистратор **обязан** проверить паспорт.
    - Для юрлица: ИНН, КПП, реквизиты.
5. Оплатить (карта МИР / Сбербанк / ЮKassa / ЮMoney).
6. В течение 1–24 часов домен становится активным.
7. В ЛК открыть раздел **DNS** — понадобится на [§10](#10-привязка-домена-и-dns).

> **Совет**: сразу оплачивайте минимум на 2 года. Продление домена никто не забудет, и цена будет зафиксирована.

### Как купить через Beget (самый простой вариант)

1. https://beget.com/ru/domains — ввести имя.
2. Зарегистрироваться, привязать карту.
3. Купить. Панель очень дружелюбная; бесплатная DNS-зона уже включена.
4. Раздел **«Домены и поддомены» → DNS-записи** — далее по [§10](#10-привязка-домена-и-dns).

---

## 4. Выбор и покупка VPS в РФ

Все провайдеры ниже держат ДЦ в России (соответствие 242-ФЗ) и предоставляют Ubuntu «из коробки».

### Сравнение (1–2 vCPU, 2 GB RAM, ~20–30 GB NVMe, апрель 2026)

| Провайдер        | Базовый тариф для проекта    | Цена/мес    | Плюсы                                                     | Минусы                          |
| ---------------- | ---------------------------- | ----------- | --------------------------------------------------------- | ------------------------------- |
| **Timeweb Cloud**| Cloud MSK 30 (1 vCPU, 2 GB, 30 GB NVMe) | **657 ₽** | Лучшая цена/мощность в 2026, SLA 99.98%, Tier III, почасовая тарификация, скидка 10% за год | Иногда перегружен на базовых тарифах в часы пик |
| **Beget**        | VPS-start (1 vCPU, 1 GB, 20 GB SSD) | ~250–400 ₽ | Очень простая панель, российские ДЦ, всё по-русски, ежемесячные платежи без обязательств | RAM мало — взять следующий тариф 2 GB ~500–700 ₽ |
| **Selectel**     | Standard Line (1 vCPU, 2 GB, 16 GB SSD) | 1489 ₽ | Профессиональный уровень, защита от DDoS штатно, IPv6, SLA 99.95% | Дороже конкурентов за тот же ресурс |
| **RuVDS**        | Начальный (1 vCPU, 1 GB)     | 200–400 ₽   | Самые дешёвые тарифы, много ДЦ (Москва, СПб, Екб, Крым)   | UX панели слабее                 |
| **FirstByte**    | 2 GB RAM, 20 GB SSD          | 300–700 ₽   | Недорогой, тот, что сейчас используется (45.9.72.103)     | Поменьше гарантий SLA            |
| **VK Cloud**     | Basic (1 vCPU, 2 GB, 20 GB)  | ~800–1200 ₽ | Корпоративный уровень, интеграции с VK                     | Дороже, избыточен для маленького сайта |

### Что выбрать для этого проекта

**Рекомендация: Timeweb Cloud MSK 30 за 657 ₽/мес** (или аналог на 2 GB у Beget/FirstByte). Причины:

- 2 GB RAM + NVMe — хватает и на `vite build`, и на PostgreSQL, и на nginx.
- SLA 99.98% и Tier III — аптайм как у дорогих облаков.
- Почасовая тарификация — можно поднять второй сервер для тестовой миграции на пару часов и заплатить копейки.
- ДЦ в Москве и СПб — соответствие 242-ФЗ.

### Как купить VPS на примере Timeweb Cloud (пошагово)

1. https://timeweb.cloud — зарегистрироваться.
2. Привязать карту. Минимальное пополнение баланса ~100 ₽.
3. **«Облачные серверы» → «Создать сервер»**.
4. Выбрать конфигурацию: **Cloud MSK 30** (1 vCPU, 2 GB RAM, 30 GB NVMe, Москва).
5. ОС: **Ubuntu 22.04**.
6. Авторизация: **SSH-ключ** (сгенерируй его локально — см. следующий пункт) или пароль (пароль хуже).
7. Имя сервера: `loaddevice-prod`.
8. **Создать** — через ~60 секунд сервер запущен.
9. Получить IP, root-пароль (если выбрал пароль) и команду SSH из ЛК.

### Генерация SSH-ключа (рекомендуется вместо пароля)

На своём Windows:

```powershell
# В PowerShell, один раз:
ssh-keygen -t ed25519 -C "your-email@domain.ru"
# Enter для пути (оставить по умолчанию), Enter для пустой passphrase (или введи — но потом надо будет вводить при каждом коннекте)

# Публичный ключ для вставки в панель провайдера:
Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub"
```

Полученную строку `ssh-ed25519 AAAA... email` вставь в поле «SSH-ключ» при создании сервера. Дальше заходить будет без пароля:

```powershell
ssh root@IP_АДРЕС
```

---

## 5. Первоначальная настройка сервера (Ubuntu 22.04)

Это базовая гигиена. Применять один раз на каждом новом сервере.

### 5.1. Обновление системы

```bash
ssh root@IP_АДРЕС
apt update && apt upgrade -y
apt install -y curl wget git ufw fail2ban htop nano
timedatectl set-timezone Europe/Moscow
```

### 5.2. Swap (обязательно, если RAM <= 2 GB)

```bash
# 2 ГБ swap-файл
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
# Проверка:
free -h
```

### 5.3. Firewall (UFW)

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable
ufw status verbose
```

Порт 5000 (само приложение) **не открывать** наружу — nginx будет проксировать к нему через localhost.

### 5.4. fail2ban (защита от брута SSH)

```bash
systemctl enable --now fail2ban
fail2ban-client status sshd
```

### 5.5. Пользователь для деплоя (не-root)

Работать из-под root — плохой тон. Заведём пользователя `deploy`:

```bash
adduser deploy
usermod -aG sudo deploy
# Скопируем root-ключи, чтобы сразу можно было зайти по ssh
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

Проверить, что под новым пользователем работает SSH:

```powershell
ssh deploy@IP_АДРЕС
sudo whoami   # должно вернуть "root"
```

После этого желательно запретить root-логин по SSH (`PermitRootLogin no` в `/etc/ssh/sshd_config`, потом `systemctl restart ssh`). Но удостоверься, что `deploy` работает!

---

## 6. Установка ПО: Node.js, PostgreSQL, nginx, pm2

### 6.1. Node.js 20 через nvm

`nvm` удобен тем, что версию Node легко обновить без пересборки пакетов. **Под пользователем `deploy`** (или root, как договоришься):

```bash
su - deploy
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# Перезайти в сессию, чтобы nvm подхватился:
exit
ssh deploy@IP_АДРЕС

nvm install 20
nvm alias default 20
node -v   # v20.x.x
npm -v
```

Если ssh-сессия интерактивная, но `nvm` не находится — добавь в `~/.bashrc`:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

> **Важно**: скрипт `update-project.sh` в репозитории уже умеет сам подгружать nvm при запуске через `ssh host "bash script.sh"`. Так что даже в неинтерактивной сессии всё работает.

### 6.2. PostgreSQL 14+

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
psql --version
```

### 6.3. nginx

```bash
sudo apt install -y nginx
sudo systemctl enable --now nginx
# Проверить, что отвечает:
curl http://localhost
```

### 6.4. pm2 (менеджер процессов Node)

```bash
npm install -g pm2
pm2 startup systemd -u deploy --hp /home/deploy
# Выполни команду, которую выведет pm2 (начинается с sudo)
```

### 6.5. certbot (для HTTPS)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

---

## 7. Настройка базы данных и переменных окружения

### 7.1. Создание БД и пользователя PostgreSQL

```bash
sudo -u postgres psql
```

Внутри psql:

```sql
CREATE DATABASE loaddevice_db;
CREATE USER loaddevice_user WITH ENCRYPTED PASSWORD 'ПРИДУМАЙ_СИЛЬНЫЙ_ПАРОЛЬ_20+_СИМВОЛОВ';
GRANT ALL PRIVILEGES ON DATABASE loaddevice_db TO loaddevice_user;
ALTER DATABASE loaddevice_db OWNER TO loaddevice_user;
\q
```

Сильный пароль можно сгенерировать:

```bash
openssl rand -base64 24
```

Проверка подключения:

```bash
psql "postgresql://loaddevice_user:ПАРОЛЬ@localhost:5432/loaddevice_db" -c "SELECT version();"
```

### 7.2. Клонирование репозитория

```bash
sudo mkdir -p /var/www
sudo chown deploy:deploy /var/www
cd /var/www
git clone https://github.com/regeraq/nagruz.git loaddevice
cd loaddevice
```

### 7.3. Файл `.env`

```bash
cp .env.example .env
nano .env
```

Заполни минимально:

```env
DATABASE_URL=postgresql://loaddevice_user:ПАРОЛЬ@localhost:5432/loaddevice_db
NODE_ENV=production
PORT=5000

TRUST_PROXY=true
FORCE_SECURE_COOKIES=true

# Секреты — по 48+ символов, три РАЗНЫХ значения.
# Сгенерируй: openssl rand -base64 48 — и вставь КАЖДЫЙ РАЗ ЗАНОВО.
JWT_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
JWT_REFRESH_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
CSRF_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

FRONTEND_URL=https://ваш-домен.ru

# Пока (до §13) — оставить пустым, временно можно Resend, потом заменим.
RESEND_API_KEY=
OWNER_EMAIL=owner@ваш-домен.ru
RESEND_FROM_EMAIL=noreply@ваш-домен.ru
```

Установи права только на чтение владельцем:

```bash
chmod 600 .env
```

---

## 8. Первый деплой приложения

### 8.1. Установка зависимостей и сборка

```bash
cd /var/www/loaddevice
npm install
npm run build
npm run db:push   # накатит схему из shared/schema.ts через drizzle-kit
```

### 8.2. Запуск под pm2

В репозитории есть `ecosystem.config.cjs`. Если его нет — pm2 запустит `dist/index.js` напрямую:

```bash
pm2 start ecosystem.config.cjs
# или:
pm2 start dist/index.js --name loaddevice --max-memory-restart 500M --cwd /var/www/loaddevice

pm2 save
pm2 status
pm2 logs loaddevice --lines 50
```

После `pm2 save` список процессов сохранён, и при рестарте сервера они поднимутся автоматически (благодаря `pm2 startup` из [§6.4](#6-установка-по-nodejs-postgresql-nginx-pm2)).

### 8.3. Проверка

```bash
curl http://localhost:5000/api/products
```

Должен прийти JSON со списком продуктов.

---

## 9. nginx и HTTPS через Let's Encrypt

### 9.1. Конфиг nginx

Создай `/etc/nginx/sites-available/loaddevice`:

```nginx
server {
    listen 80;
    server_name ваш-домен.ru www.ваш-домен.ru;

    # Увеличенный лимит загрузки (аватары, галереи товаров)
    client_max_body_size 10M;

    # gzip
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    gzip_min_length 1024;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
```

Активировать:

```bash
sudo ln -s /etc/nginx/sites-available/loaddevice /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 9.2. Получение SSL (после прописанной A-записи, см. [§10](#10-привязка-домена-и-dns))

```bash
sudo certbot --nginx -d ваш-домен.ru -d www.ваш-домен.ru
```

Certbot сам перепишет nginx-конфиг, добавит `listen 443 ssl`, пропишет редирект с HTTP на HTTPS. Сертификат продлевается автоматически (cron в `/etc/cron.d/certbot`).

Проверить автопродление:

```bash
sudo certbot renew --dry-run
```

---

## 10. Привязка домена и DNS

В ЛК регистратора домена (Beget / REG.RU) создать **A-запись**:

| Тип | Имя (поддомен) | Значение        | TTL   |
| --- | -------------- | --------------- | ----- |
| A   | @              | IP_ТВОЕГО_VPS   | 3600  |
| A   | www            | IP_ТВОЕГО_VPS   | 3600  |

DNS обновляются от 5 минут до 24 часов (обычно <1 часа). Проверить:

```powershell
# На Windows:
nslookup ваш-домен.ru
```

Когда `nslookup` показывает IP твоего сервера — запускай certbot ([§9.2](#92-получение-ssl-после-прописанной-a-записи-см-10)).

### MX-записи для почты

Когда подключишь российский email-сервис ([§13](#13-российский-email-сервис-выбор-цены-интеграция)), он попросит добавить **MX-, SPF-, DKIM-, DMARC-записи** — это обязательно для доставки писем. Делается в том же разделе DNS.

---

## 11. Резервное копирование: backup.sh + cron

В репозитории есть готовый скрипт `scripts/backup.sh` — он делает дамп БД, архивирует `.env`, папку `dist/` и ротирует старые бэкапы. См. также «Автоматический дамп по расписанию» ниже.

### 11.1. Установка

Скрипт уже в репо — он попадает на сервер вместе с `git pull`. Делаем исполняемым и создаём папку для бэкапов:

```bash
sudo mkdir -p /var/backups/loaddevice
sudo chown deploy:deploy /var/backups/loaddevice
chmod +x /var/www/loaddevice/scripts/backup.sh
```

### 11.2. Ручной запуск

```bash
bash /var/www/loaddevice/scripts/backup.sh
ls -lh /var/backups/loaddevice/
```

### 11.3. Автоматически — раз в сутки в 03:30 МСК

```bash
crontab -e
```

Добавить строку:

```cron
30 3 * * * /bin/bash /var/www/loaddevice/scripts/backup.sh >> /var/log/loaddevice-backup.log 2>&1
```

### 11.4. Выкачивание бэкапа к себе

**Важно: хранить бэкапы только на том же сервере — бессмысленно.** Раз в неделю забирай их к себе:

```powershell
# На Windows (PowerShell):
scp deploy@IP:/var/backups/loaddevice/loaddevice-db-*.sql.gz "C:\backups\"
```

Или автоматизируй через Windows Task Scheduler + `scp`.

---

## 12. Миграция на новый сервер без потерь данных

Пригодится, когда:

- Меняешь провайдера (например, с FirstByte на Timeweb).
- Увеличиваешь мощность (новый VPS с большей RAM/диском).
- Хочешь сделать staging-среду по образу прода.

В репозитории есть скрипт `scripts/migrate-server.sh` — запускается локально и делает всё сам. Но полезно понимать и ручной процесс.

### 12.1. Сценарий «ручной перенос» (понять, что делает скрипт)

**На новом сервере** (выполни §5–§6, не трогая §7–§8).

**На старом сервере**:

```bash
# 1. Дамп БД
cd /var/www/loaddevice
pg_dump "$DATABASE_URL" --no-owner --no-privileges --format=custom \
    -f /tmp/loaddevice-db.dump
# (или через env из .env):
export $(grep ^DATABASE_URL= .env | xargs)
pg_dump "$DATABASE_URL" --no-owner --no-privileges --format=custom \
    -f /tmp/loaddevice-db.dump

# 2. Архив файлов: .env, загруженные файлы, конфиг nginx, ecosystem
tar -czf /tmp/loaddevice-files.tar.gz \
    /var/www/loaddevice/.env \
    /var/www/loaddevice/uploads 2>/dev/null \
    /var/www/loaddevice/ecosystem.config.cjs 2>/dev/null \
    /etc/nginx/sites-available/loaddevice 2>/dev/null \
    || true
```

**Перетащить дамп и архив на новый сервер**:

```bash
# Со старого сервера (заменить IP_NEW на новый):
scp /tmp/loaddevice-db.dump  deploy@IP_NEW:/tmp/
scp /tmp/loaddevice-files.tar.gz deploy@IP_NEW:/tmp/
```

**На новом сервере**:

```bash
# 3. Распаковать конфиги/файлы
sudo tar -xzf /tmp/loaddevice-files.tar.gz -C /

# 4. Создать пустую БД (см. §7.1), затем:
pg_restore -d "postgresql://loaddevice_user:PWD@localhost:5432/loaddevice_db" \
    --no-owner --no-privileges --clean --if-exists \
    /tmp/loaddevice-db.dump

# 5. Развернуть код
cd /var/www
git clone https://github.com/regeraq/nagruz.git loaddevice
cd loaddevice
npm install
npm run build
npm run db:push   # на всякий случай, docirm schema

# 6. Запустить pm2
pm2 start ecosystem.config.cjs
pm2 save
```

**Обновить DNS**: поменять A-запись в ЛК регистратора на IP нового сервера. Дождаться обновления DNS (5 мин – 1 час).

**Выключить приложение на старом сервере** (чтобы не было двойной записи в БД):

```bash
pm2 stop loaddevice
```

Убедиться, что сайт работает на новом сервере, после чего старый VPS можно удалить.

### 12.2. Скрипт `scripts/migrate-server.sh`

Автоматизирует то же самое. Запускается **со своего Windows** (из папки проекта) и делает: дамп на источнике → `scp` → восстановление на приёмнике → `npm install` → `npm run build` → `pm2 start`.

```powershell
# Пример запуска:
bash scripts/migrate-server.sh `
    --from-host  45.9.72.103     `
    --from-user  root            `
    --to-host    NEW_IP          `
    --to-user    deploy          `
    --project-dir /var/www/loaddevice
```

Или изнутри WSL / Git Bash. Подробные флаги — внутри скрипта (`scripts/migrate-server.sh --help`).

### 12.3. Минимизация простоя (downtime)

Для строгой безостановочности:

1. На новом сервере готовишь всё, кроме DNS.
2. Делаешь **первый** дамп, накатываешь на новый.
3. Проверяешь сайт на новом IP напрямую (без DNS): `curl -H "Host: ваш-домен.ru" http://IP_NEW/`.
4. Включаешь на старом сервере режим только-чтение или просто быстро переключаешь DNS.
5. Сразу после переключения — второй дамп и «дораскатка» только изменившихся записей. Для маленького сайта обычно достаточно одного дампа — просто переключайся ночью.

---

## 13. Российский email-сервис: выбор, цены, интеграция

Сейчас код использует **Resend (США)**. Это проблема по двум причинам:

1. **152-ФЗ ст. 12** — отправка писем на email = трансграничная передача персональных данных. Для США нужно отдельное согласие пользователя и уведомление Роскомнадзора. Проще — не передавать.
2. **Санкции/блокировки** — Resend может в любой момент перестать работать с РФ-картой.

### Сравнение российских сервисов для транзакционных писем (2026)

| Сервис                  | Стартовая цена                  | Где ДЦ    | API/SMTP         | Бесплатный лимит       | Для нашего объёма (до 1–5 тыс. писем/мес) |
| ----------------------- | ------------------------------- | --------- | ---------------- | ---------------------- | --------------------------------------- |
| **Unisender Go**        | от ~500 ₽/мес (1000 писем)      | Москва    | REST API + SMTP  | 1000 писем/мес бесплатно на старте | ⭐ **оптимально**: серверы в РФ, 152-ФЗ, API похожий на SendGrid |
| **Yandex Cloud Postbox**| pay-per-use, ~10 ₽ / 1000 писем | Москва    | SMTP + AWS SES API | До 100 писем/сутки бесплатно | Самый дешёвый при больших объёмах; нужна привязка Yandex Cloud-аккаунта |
| **DashaMail**           | 1750 ₽/мес (50k писем)          | Россия    | SMTP + HTTP API  | Пробный период         | Дороговато для маленьких объёмов |
| **SendPulse (RU)**      | ~500 ₽/мес или freemium 12k/мес бесплатно | Россия | SMTP + API | 12000 писем/мес бесплатно | Хорошо для старта |
| **MailoPost**           | от 500–1500 ₽/мес               | Россия    | SMTP + API       | Пробный период         | Меньше документации, слабее API |
| **Mail.ru for Business**| Бесплатно для своего домена, но без API по подписке | Россия | SMTP | ограничения по лимитам | Не подходит — бесплатная версия имеет жёсткие дневные лимиты |

### Рекомендация

Для этого проекта **оптимум — Unisender Go**:

- Серверы в Москве, документирован как совместимый с 152-ФЗ.
- REST API аналогичен SendGrid/Resend — миграция кода ~15 строк.
- Цены: первые 1000 писем/мес бесплатно, дальше — от 500 ₽/мес за небольшие объёмы.
- Есть SMTP-шлюз, если захочешь не трогать код (но API лучше — он даёт статусы доставки).

**Запасной вариант — Yandex Cloud Postbox**, если объёмы вырастут до десятков тысяч писем в месяц.

### Пошаговая регистрация в Unisender Go

1. https://go.unisender.ru/ → **«Зарегистрироваться»**.
2. Указать домен-отправитель — `ваш-домен.ru`.
3. В ЛК открыть раздел **«Домены»** → «Проверить домен». Сервис покажет **три DNS-записи** для вставки в DNS-зону регистратора (TXT для SPF, TXT+CNAME для DKIM, TXT для DMARC).
4. В ЛК регистратора домена (Beget/REG.RU) добавить эти три записи точь-в-точь.
5. Вернуться в Unisender Go → «Проверить» — через 5–30 минут зелёные галочки у всех трёх.
6. В разделе **«API и интеграции»** → создать **API-ключ** (записать, больше не покажет).

### Интеграция Unisender Go в код

Создай файл `server/services/email-unisender.ts` (вместо/рядом с текущим Resend-сервисом):

```typescript
// Минимальная обёртка над Unisender Go Web API.
// Документация: https://godocs.unisender.ru/web-api
import { z } from "zod";

const API_URL = "https://go1.unisender.ru/ru/transactional/api/v1/email/send.json";

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.UNISENDER_GO_API_KEY;
  if (!apiKey) {
    console.warn("[email] UNISENDER_GO_API_KEY not set — email skipped");
    return;
  }

  const fromEmail  = process.env.MAIL_FROM_EMAIL || "noreply@example.ru";
  const fromName   = input.fromName || process.env.MAIL_FROM_NAME || "Loaddevice";
  const recipients = Array.isArray(input.to) ? input.to : [input.to];

  const body = {
    message: {
      recipients: recipients.map((email) => ({ email })),
      body:        { html: input.html, plaintext: input.text ?? stripHtml(input.html) },
      subject:     input.subject,
      from_email:  fromEmail,
      from_name:   fromName,
    },
  };

  const res = await fetch(API_URL, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY":    apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Unisender Go error ${res.status}: ${err}`);
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}
```

В `.env` добавляем:

```env
UNISENDER_GO_API_KEY=eyJ...
MAIL_FROM_EMAIL=noreply@ваш-домен.ru
MAIL_FROM_NAME=Loaddevice
```

Дальше в местах отправки (регистрация, сброс пароля, уведомление о заказе) использовать `sendEmail()` из этого модуля вместо Resend. Удобнее всего — сделать общий `server/services/email.ts`, который экспортирует один `sendEmail`, а внутри переключает провайдера через `process.env.EMAIL_PROVIDER` (`unisender` | `resend`).

> Если нужно — могу отдельным шагом сделать полную миграцию Resend → Unisender Go во всех endpoint-ах, с обратной совместимостью на переходный период.

---

## 14. Соответствие 152-ФЗ и 242-ФЗ

Подробный аудит — в `SECURITY_AUDIT_REPORT.md`. Кратко: чтобы не получить штраф Роскомнадзора:

| Требование                                                                 | Как выполнено                                              |
| -------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **242-ФЗ** БД с ПД граждан РФ хранится в РФ                                | Timeweb/Beget/Selectel/FirstByte — все ДЦ в Москве/СПб     |
| **152-ФЗ** Политика обработки ПД на сайте + явное согласие при регистрации | Проверь наличие `/privacy` и галочки согласия в форме      |
| **152-ФЗ ст. 12** Трансграничная передача ПД                               | Email-сервис в РФ (см. §13), платёжка — российская (ЮKassa, Robokassa) |
| **Уведомление РКН** (оператор ПД)                                          | Подать через https://rkn.gov.ru/personal-data/forms/       |
| **Доступ субъекта ПД к своим данным, удаление, отзыв согласия**            | Реализовано: `/api/auth/me`, `/api/auth/consents/:type/revoke`, удаление аккаунта в профиле |
| **Хранение дампов БД**                                                     | Локально на том же российском сервере (см. §11)            |

### Что сделать в интерфейсе сайта (если ещё не сделано)

- [ ] Страница «Политика обработки персональных данных» (`/privacy`).
- [ ] Страница «Согласие на обработку персональных данных» (`/consent`).
- [ ] Галочка «Я согласен с политикой обработки ПД» в формах регистрации, заказа, обратной связи.
- [ ] Кнопка «Удалить аккаунт» в профиле (есть).
- [ ] Кнопка «Отозвать согласие» в профиле (есть, см. `/api/auth/consents/:type/revoke`).

### Что сделать юридически

1. Зарегистрироваться как оператор ПД на https://rkn.gov.ru/personal-data/forms/ (бесплатно, 1–2 недели на рассмотрение).
2. Распечатать и подписать «Политику обработки ПД» и «Положение об обработке ПД».
3. Если сайт принимает оплату — использовать российский эквайринг (ЮKassa / Robokassa / Тинькофф).

---

## 15. Обновление кода на продакшне

Полная инструкция — в [QUICK_UPDATE.md](QUICK_UPDATE.md). Короткая версия:

```powershell
# Локально на Windows:
cd "C:\Users\k62\Documents\Атом\сайт\HelloWhoAreYou-1 (5)\HelloWhoAreYou-1"
.\update-github.ps1 -Message "что сделал"
```

```powershell
# На сервере (одной командой с Windows):
ssh root@45.9.72.103 "cd /var/www/loaddevice && git fetch origin && git reset --hard origin/main && bash update-project.sh"
```

Скрипт `update-project.sh`:

- Сам подгружает nvm / находит node/npm/pm2.
- Делает `git fetch && git reset --hard`, `npm install`, `npm run build`, `npm run db:push`, `pm2 restart`.
- В конце выводит `SHA Было/Стало` и `pm2 status`.
- Если коммит не изменился, всё равно пересобирает (на случай правки `.env`).

---

## 16. Мониторинг, логи, типовые проблемы

### Основные команды

```bash
pm2 status                       # все процессы pm2
pm2 logs loaddevice --lines 100  # последние 100 строк логов
pm2 logs loaddevice              # live-tail
pm2 monit                        # интерактивный монитор CPU/RAM
pm2 restart loaddevice           # перезапустить
pm2 reload loaddevice            # zero-downtime reload (если процессов >1)

systemctl status nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

sudo systemctl status postgresql
sudo -u postgres psql loaddevice_db

htop                             # CPU/RAM в реальном времени
df -h                            # место на диске
free -h                          # RAM + swap
```

### Типовые проблемы

| Симптом                                              | Причина                                   | Решение |
| ---------------------------------------------------- | ----------------------------------------- | ------- |
| `npm: command not found` через `ssh host "..."`      | `~/.bashrc`/nvm не подгружается в non-interactive shell | Скрипт `update-project.sh` это уже решает; для других команд — `bash -lc "..."` |
| PM2 `errored`, цикл рестартов                        | Обычно отсутствует `.env` или упал коннект к БД | `pm2 logs loaddevice --lines 200` → найти ошибку, проверить `.env` и `psql` |
| 502 Bad Gateway из nginx                             | Приложение не слушает `localhost:5000`    | `pm2 status`; `curl http://localhost:5000/api/products` |
| `vite build` убивается OOM на 1 GB VPS               | Мало RAM                                  | Добавить swap ([§5.2](#52-swap-обязательно-если-ram--2-gb)) или поднять тариф до 2 GB |
| Сайт открывается без SSL                             | Certbot не настроил / A-запись неверна    | `sudo certbot --nginx -d домен -d www.домен`; проверить `nslookup` |
| Email «уходят, но не доходят»                        | Не настроены SPF/DKIM/DMARC               | В DNS добавить записи, которые просит Unisender Go ([§13](#13-российский-email-сервис-выбор-цены-интеграция)) |
| «Обновил код — на сайте не поменялось»               | Либо не закоммитил (staged, но без push), либо не перезапустил pm2 | См. [QUICK_UPDATE.md](QUICK_UPDATE.md) раздел «Если обновил — а на сайте ничего не изменилось» |

---

## 17. Итоговый чек-лист «с нуля до продакшна»

Распечатать и идти по пунктам:

### До покупки

- [ ] Выбрано доменное имя (`nagruz.ru`, `loaddevice.ru`, `atomvolt.ru` — под что-то осмысленное).
- [ ] Выбран провайдер домена (Beget или REG.RU).
- [ ] Выбран VPS-провайдер (Timeweb Cloud — Cloud MSK 30 за 657 ₽).
- [ ] Сгенерирован SSH-ключ на рабочей машине.

### После покупки сервера

- [ ] `apt update && upgrade`, таймзона, swap, UFW, fail2ban.
- [ ] Создан пользователь `deploy`, заблокирован `root` по SSH (опционально).
- [ ] Установлены: Node 20 (nvm), PostgreSQL, nginx, pm2, certbot.
- [ ] Создана БД `loaddevice_db`, пользователь, пароль записан.

### Деплой

- [ ] `git clone` в `/var/www/loaddevice`.
- [ ] Заполнен `.env` со всеми секретами (JWT×3 разных, CSRF, DATABASE_URL).
- [ ] `npm install && npm run build && npm run db:push`.
- [ ] `pm2 start ecosystem.config.cjs`, `pm2 save`, `pm2 startup`.
- [ ] Проверка: `curl http://localhost:5000/api/products` → 200.

### Домен + SSL

- [ ] В ЛК регистратора прописаны A-записи на IP сервера.
- [ ] nginx-конфиг `/etc/nginx/sites-available/loaddevice` активирован.
- [ ] `sudo certbot --nginx -d домен -d www.домен` успешен.
- [ ] Сайт открывается по `https://домен.ru`, редирект с HTTP работает.

### Email и 152-ФЗ

- [ ] Зарегистрирован аккаунт в Unisender Go (или выбранном).
- [ ] В DNS добавлены SPF / DKIM / DMARC.
- [ ] Домен подтверждён в Unisender Go (зелёные галочки).
- [ ] `.env` содержит `UNISENDER_GO_API_KEY`, `MAIL_FROM_EMAIL`.
- [ ] Код отправки email переведён на Unisender Go.
- [ ] Отправлено тестовое письмо (регистрация/сброс пароля) — дошло.
- [ ] На сайте есть страницы `/privacy` и `/consent`.
- [ ] Подана заявка в РКН как оператор ПД.

### Бэкапы

- [ ] `scripts/backup.sh` исполняемый.
- [ ] Cron настроен на 03:30 МСК.
- [ ] Проверено: файл появляется в `/var/backups/loaddevice/` после ручного запуска.
- [ ] Налажена регулярная выгрузка на локальный диск (или в Яндекс.Диск / S3).

### Обновления

- [ ] Проверен цикл: `.\update-github.ps1` → `ssh root@IP "... bash update-project.sh"`.
- [ ] На сайте отражается новый коммит.

После прохождения всех пунктов — можно спокойно сдавать проект.
