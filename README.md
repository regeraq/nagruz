# Нагрузочное устройство — веб-сайт

Современный веб-сайт для продажи нагрузочных устройств (НУ-100, НУ-30) с админ-панелью, регистрацией пользователей, заказами и рассылками.

## Технологии

- **Фронтенд**: React 18 + Vite + TypeScript + Tailwind + shadcn/ui
- **Бэкенд**: Node.js 20 + Express + TypeScript
- **БД**: PostgreSQL + Drizzle ORM
- **Авторизация**: JWT (access + refresh) + CSRF, bcrypt
- **Процесс-менеджер**: PM2
- **Прокси/SSL**: nginx + Let's Encrypt
- **Email (прод)**: предполагается Unisender Go (РФ), см. [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) §13

## Быстрый старт (локально)

```bash
npm install
cp .env.example .env    # заполнить DATABASE_URL и секреты
npm run dev             # http://localhost:5000
```

Production-сборка:

```bash
npm run build
npm start
```

## Структура проекта

```
HelloWhoAreYou-1/
├── client/            # React + Vite фронтенд
│   └── src/
│       ├── components/
│       ├── pages/
│       └── lib/
├── server/            # Express + TypeScript бэкенд
│   ├── routes.ts
│   ├── auth.ts
│   ├── security.ts
│   └── services/
├── shared/            # общие схемы Drizzle/Zod
├── scripts/
│   ├── backup.sh          # резервное копирование БД+файлов
│   └── migrate-server.sh  # миграция между серверами
├── update-github.ps1      # push на GitHub (Windows)
└── update-project.sh      # обновление на сервере
```

## Документация

Всё, что нужно знать для работы с проектом:

| Файл | Что внутри |
| ---- | ---------- |
| **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** | Мастер-гайд: покупка домена и VPS в РФ, первый деплой, nginx+SSL, миграция между серверами, email-рассылки, 152-ФЗ, чек-лист с нуля до продакшна |
| **[QUICK_UPDATE.md](QUICK_UPDATE.md)** | Быстрое обновление кода: `.\update-github.ps1` → `ssh ... update-project.sh` |
| **[ADMIN_PANEL_USER_GUIDE.md](ADMIN_PANEL_USER_GUIDE.md)** | Как пользоваться админ-панелью (товары, пользователи, заказы, контент, аналитика) |
| **[DATABASE_GUIDE.md](DATABASE_GUIDE.md)** | Структура БД, миграции Drizzle, полезные SQL-запросы |
| **[SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md)** | Аудит безопасности, статус 152-ФЗ / 242-ФЗ |
| **[CHANGELOG.md](CHANGELOG.md)** | История изменений |

## Обновление кода на продакшне

```powershell
# Локально (Windows):
cd "C:\Users\k62\Documents\Атом\сайт\HelloWhoAreYou-1 (5)\HelloWhoAreYou-1"
.\update-github.ps1 -Message "что сделал"

# На сервере:
ssh root@45.9.72.103 "cd /var/www/loaddevice && git fetch origin && git reset --hard origin/main && bash update-project.sh"
```

Подробнее — в [QUICK_UPDATE.md](QUICK_UPDATE.md).

## Резервное копирование

Автоматически раз в сутки в 03:30 МСК — через cron и `scripts/backup.sh`. Подробности — в [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) §11.

Ручной запуск:

```bash
bash /var/www/loaddevice/scripts/backup.sh
ls -lh /var/backups/loaddevice/
```

## Миграция на другой сервер

Скрипт `scripts/migrate-server.sh` переносит БД, `.env`, загруженные файлы, nginx-конфиг со старого сервера на новый. Подробности — в [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) §12.

```bash
bash scripts/migrate-server.sh \
    --from-host 45.9.72.103 --from-user root \
    --to-host   NEW.IP       --to-user   deploy \
    --project-dir /var/www/loaddevice
```

## Переменные окружения

Шаблон — в `.env.example`. Минимум для запуска:

```env
DATABASE_URL=postgresql://loaddevice_user:ПАРОЛЬ@localhost:5432/loaddevice_db
NODE_ENV=production
PORT=5000

JWT_SECRET=...                # openssl rand -base64 48
JWT_REFRESH_SECRET=...        # ОТДЕЛЬНЫЙ от JWT_SECRET
CSRF_SECRET=...               # ОТДЕЛЬНЫЙ ещё один

EMAIL_PROVIDER=yandex         # yandex | resend | noop
YANDEX_POSTBOX_KEY_ID=YCAJ... # из Yandex Cloud → сервисный аккаунт → статический ключ
YANDEX_POSTBOX_SECRET=...     # секретная часть того же ключа
MAIL_FROM_EMAIL=noreply@ваш-домен.ru
MAIL_FROM_NAME=Loaddevice
OWNER_EMAIL=owner@ваш-домен.ru

FRONTEND_URL=https://ваш-домен.ru
TRUST_PROXY=true
FORCE_SECURE_COOKIES=true
```

## Скрипты npm

```bash
npm run dev      # dev-режим с hot reload
npm run build    # production build (vite + esbuild)
npm start        # запуск собранного dist/
npm run check    # TypeScript проверка
npm run db:push  # накатить схему из shared/schema.ts в БД
```

## Лицензия

MIT
