# Нагрузочное устройство — веб-сайт

Современный веб-сайт для продажи нагрузочных устройств (НУ-100, НУ-30) с админ-панелью, регистрацией пользователей, заказами и рассылками.

## Технологии

- **Фронтенд**: React 18 + Vite + TypeScript + Tailwind + shadcn/ui
- **Бэкенд**: Node.js 20 + Express + TypeScript
- **БД**: PostgreSQL + Drizzle ORM
- **Авторизация**: JWT в HttpOnly cookies (access 15m + refresh 7d) + CSRF, bcrypt
- **Процесс-менеджер**: PM2
- **Прокси/SSL**: nginx + Let's Encrypt
- **Email (прод)**: Yandex Cloud Postbox (серверы в РФ), см. [PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md) §10

## Быстрый старт (локально)

Нужен работающий PostgreSQL и созданная пустая база (см. [DATABASE_GUIDE.md](DATABASE_GUIDE.md)).

```bash
npm ci                  # воспроизводимая установка из package-lock.json
cp .env.example .env    # заполнить DATABASE_URL и секреты
npm run db:migrate      # накатить схему (шаг обязателен, без него API падает)
npm run dev             # http://localhost:5000
```

Production-сборка:

```bash
npm run build
npm run db:migrate
npm start               # http://localhost:5000
```

Фронтенд и API обслуживает один и тот же процесс на `PORT` (по умолчанию `5000`);
отдельный dev-сервер Vite не поднимается.

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
├── migrations/        # версионные SQL-миграции Drizzle
├── deploy/
│   └── nginx.conf         # готовый конфиг nginx (HTTPS, rate limit, проксирование)
├── scripts/
│   ├── backup.sh          # резервное копирование БД+файлов
│   ├── restore.sh         # восстановление из резервной копии
│   └── migrate-server.sh  # миграция между серверами
├── ecosystem.config.cjs   # конфигурация PM2
├── update-github.ps1      # push на GitHub (Windows)
└── update-project.sh      # обновление на сервере (с откатом при сбое)
```

## Документация

Всё, что нужно знать для работы с проектом:

| Файл | Что внутри |
| ---- | ---------- |
| **[PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md)** | **Начните отсюда для публикации.** Полный путь с нуля: домен, DNS, выбор VPS, защита сервера, PostgreSQL, окружение, nginx, SSL, PM2, бэкапы, мониторинг, обновление, аварийное восстановление, устранение неполадок |
| **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** | Дополнительные детали по отдельным темам развёртывания и 152-ФЗ |
| **[QUICK_UPDATE.md](QUICK_UPDATE.md)** | Шпаргалка по обновлению: `.\update-github.ps1` → `ssh ... update-project.sh` |
| **[ADMIN_PANEL_USER_GUIDE.md](ADMIN_PANEL_USER_GUIDE.md)** | Как пользоваться админ-панелью (товары, пользователи, заказы, контент, аналитика) |
| **[DATABASE_GUIDE.md](DATABASE_GUIDE.md)** | Структура БД, миграции Drizzle, полезные SQL-запросы |
| **[SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md)** | Аудит безопасности, статус 152-ФЗ / 242-ФЗ |
| **[CHANGELOG.md](CHANGELOG.md)** | История изменений |

## Обновление кода на продакшне

```powershell
# 1. Локально (Windows) — отправить изменения на GitHub:
.\update-github.ps1 -Message "что сделал"
```

```bash
# 2. Обновить сервер одной командой:
ssh deploy@ВАШ_IP "bash /var/www/loaddevice/update-project.sh"
```

Скрипт сам делает бэкап БД, собирает проект, применяет миграции, проверяет
health check и **откатывается на предыдущую версию при любой ошибке.**

Подробнее — в [QUICK_UPDATE.md](QUICK_UPDATE.md).

### Способы обновления — какой когда

| Способ | Когда использовать |
| ------ | ------------------ |
| `update-project.sh` | **Основной.** Ручное обновление с бэкапом, health check и автооткатом |
| GitHub Actions (`.github/workflows/deploy.yml`) | Автодеплой при пуше в `main`. Сначала проверяет типы и сборку, затем деплоит по SSH. Требует секретов `SERVER_HOST`, `SERVER_USER`, `SERVER_PORT`, `SSH_PRIVATE_KEY` |
| `deploy.sh` | Запускается **на сервере**, обновляет только если в `origin` есть новые коммиты. Полезен для запуска по расписанию |

Все три пути используют `npm ci` и `npm run db:migrate` — расхождений между
ними нет. Настройка автодеплоя описана в
[PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md) §18.4.

## Резервное копирование

Автоматически раз в сутки в 03:30 МСК — через cron и `scripts/backup.sh`.
Настройка — в [PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md) §15.

```bash
# Создать копию вручную:
bash /var/www/loaddevice/scripts/backup.sh
ls -lh /var/backups/loaddevice/

# Восстановиться из копии:
bash /var/www/loaddevice/scripts/restore.sh --list
bash /var/www/loaddevice/scripts/restore.sh --db /var/backups/loaddevice/loaddevice-db-ГГГГММДД-ЧЧММСС.dump
```

> Бэкапы обязательно копируйте вне сервера — копия на том же диске
> не поможет при отказе машины. См. §15.4 руководства.

## Миграция на другой сервер

Скрипт `scripts/migrate-server.sh` переносит БД, `.env`, загруженные файлы и
nginx-конфиг со старого сервера на новый. Пошаговый порядок с переключением
DNS — в [PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md) §19.4.

```bash
bash scripts/migrate-server.sh \
    --from-host СТАРЫЙ.IP --from-user deploy \
    --to-host   НОВЫЙ.IP  --to-user   deploy \
    --project-dir /var/www/loaddevice
```

## Проверка работоспособности

```bash
curl -s http://localhost:5000/api/health
# {"status":"ok","uptime":42,"db":{"status":"ok","latencyMs":1}}
```

Эндпоинт отдаёт `200` только если приложение работает **и** доступна БД,
иначе `503`. Используется в мониторинге, nginx и при деплое.

## Переменные окружения

Шаблон — в `.env.example`. Минимум для запуска:

```env
DATABASE_URL=postgresql://loaddevice_user:ПАРОЛЬ@localhost:5432/loaddevice_db
NODE_ENV=production
PORT=5000

JWT_SECRET=...                # openssl rand -base64 48
JWT_REFRESH_SECRET=...        # ОТДЕЛЬНЫЙ от JWT_SECRET
CSRF_SECRET=...               # ОТДЕЛЬНЫЙ ещё один

ADMIN_EMAIL=admin@ваш-домен.ru # без этих двух админ не будет создан
ADMIN_INITIAL_PASSWORD=...     # и войти в админку будет нельзя

EMAIL_PROVIDER=yandex         # yandex | resend | noop
YANDEX_POSTBOX_KEY_ID=YCAJ... # из Yandex Cloud → сервисный аккаунт → статический ключ
YANDEX_POSTBOX_SECRET=...     # секретная часть того же ключа
MAIL_FROM_EMAIL=noreply@ваш-домен.ru
MAIL_FROM_NAME=Loaddevice
OWNER_EMAIL=owner@ваш-домен.ru

FRONTEND_URL=https://ваш-домен.ru
TRUST_PROXY=true              # ОБЯЗАТЕЛЬНО true за nginx
FORCE_SECURE_COOKIES=true     # ОБЯЗАТЕЛЬНО true при HTTPS
```

При старте приложение проверяет конфигурацию (`server/preflight.ts`):
предупреждает о рискованных настройках и **не запускается** при
критических — например, если секрет оставлен как заглушка из
`.env.example` или если все три секрета совпадают.

## Скрипты npm

```bash
npm run dev          # dev-режим с hot reload
npm run build        # production build (vite + esbuild)
npm start            # запуск собранного dist/
npm run check        # TypeScript проверка
npm run db:generate  # сгенерировать SQL-миграцию из shared/schema.ts
npm run db:migrate   # применить миграции из migrations/ (используется в деплое)
npm run db:push      # ТОЛЬКО локально: прямая синхронизация схемы без миграции
```

### Про миграции

Рабочий процесс изменения схемы: правим `shared/schema.ts` → `npm run db:generate`
→ коммитим полученный файл в `migrations/` → на сервере применяется `npm run db:migrate`.

`db:push` **интерактивен**: при расхождении схем он задаёт вопросы про
переименование и усечение таблиц. В CI/CD и скриптах деплоя его использовать
нельзя — сессия без TTY зависнет, а неверный ответ может переименовать таблицу
с данными. Поэтому все скрипты деплоя используют `db:migrate`.

## Лицензия

MIT
