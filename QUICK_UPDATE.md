# ⚡ Быстрое обновление проекта

Шпаргалка по выкладке изменений на production-сервер.

Полное руководство по развёртыванию с нуля — в
[PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md).

> Ниже `SERVER` — адрес вашего сервера в виде `пользователь@IP`,
> например `deploy@203.0.113.10`. Подставьте свой.

---

## Обновление сайта одной командой

```bash
ssh SERVER "bash /var/www/loaddevice/update-project.sh"
```

Это **основная команда** обновления production-сервера. Она безопасна:
скрипт сам сделает бэкап БД, соберёт проект, применит миграции, проверит
health check и **откатится на предыдущую версию, если что-то сломается.**

Полная последовательность из двух шагов:

```bash
# 1. Локально — отправить изменения на GitHub:
git add . && git commit -m "описание изменений" && git push origin main

# 2. Обновить сервер:
ssh SERVER "bash /var/www/loaddevice/update-project.sh"
```

---

## Шаг 1: изменения на GitHub

### Вариант A: скрипт (Windows, рекомендуется)

```powershell
cd "C:\Users\k62\Documents\Атом\сайт\HelloWhoAreYou-1 (5)\HelloWhoAreYou-1"
.\update-github.ps1
```

Без интерактивных вопросов:

```powershell
.\update-github.ps1 -Message "fix: исправлена отправка писем"
.\update-github.ps1 -Yes      # сообщение по умолчанию
```

Скрипт проверит настройки git, создаст коммит, при необходимости подтянет
чужие изменения (rebase), отправит на GitHub и **сверит `HEAD` с
`origin/main`** — сообщение об успехе появится только если всё
действительно доехало.

### Вариант B: вручную

```bash
git status
git add .
git commit -m "описание изменений"
git push origin main
```

При конфликте:

```bash
git pull --rebase origin main
git push origin main
```

### Проверка, что изменения на GitHub

Сервер забирает именно `origin/main`, поэтому хеши должны совпасть:

```bash
git rev-parse HEAD
git fetch origin && git rev-parse origin/main
```

---

## Шаг 2: обновление сервера

```bash
ssh SERVER "bash /var/www/loaddevice/update-project.sh"
```

Что делает скрипт:

| Шаг | Действие |
|---|---|
| 0 | Бэкап БД (до миграций — чтобы был откат) |
| 1 | `git fetch` + `git reset --hard origin/main` |
| 2 | `npm ci` — установка строго по `package-lock.json` |
| 3 | `npm run build` |
| 4 | `npm run db:migrate` — версионные миграции |
| 5 | `pm2 reload` — с корректным завершением текущих запросов |
| 6 | Проверка `/api/health` (до 30 секунд) |
| 7 | Статус PM2 и логи |

Если шаги 2–6 провалятся, скрипт **автоматически откатится** на предыдущий
рабочий коммит и покажет логи ошибок. Сайт не останется лежать.

### Вручную (если скрипт недоступен)

```bash
ssh SERVER
cd /var/www/loaddevice

bash scripts/backup.sh                  # сначала бэкап!
git fetch origin && git reset --hard origin/main
npm ci
npm run build
npm run db:migrate                      # НЕ db:push — он интерактивный и опасен
pm2 reload ecosystem.config.cjs --update-env

curl -s http://127.0.0.1:5000/api/health
pm2 logs loaddevice --lines 20 --nostream
```

---

## Проверка после обновления

```bash
ssh SERVER "pm2 status && curl -s http://127.0.0.1:5000/api/health"
```

Ожидается `status: online` и `{"status":"ok",...}`.

В браузере откройте сайт и проверьте изменённую функциональность.

---

## Если изменялась схема БД

Миграции генерируются **локально** и коммитятся в репозиторий:

```bash
# после правки shared/schema.ts:
npm run db:generate
git add migrations/ shared/schema.ts
git commit -m "db: описание изменения схемы"
git push origin main
```

На сервере они применятся сами (шаг 4 скрипта).

> ⚠️ **Никогда не запускайте `npm run db:push` на сервере.** Команда
> интерактивна: без TTY она либо зависает, либо получает неверный ответ и
> может переименовать или обрезать таблицу с живыми данными.
> `db:push` — только для локальной разработки.

---

## Откат

`update-project.sh` откатывается автоматически. Вручную:

```bash
ssh SERVER
cd /var/www/loaddevice
git log --oneline -10
git reset --hard <хеш_коммита>
npm ci && npm run build
pm2 reload ecosystem.config.cjs --update-env
```

> Откат кода **не откатывает миграции БД.** Если проблема в миграции —
> восстанавливайте базу: `bash scripts/restore.sh --list`, затем
> `bash scripts/restore.sh --db <файл>`.

---

## Устранение проблем

### «Обновил, а на сайте ничего не изменилось»

Почти всегда изменения не доехали до GitHub, а сервер честно забирает
`origin/main`. Проверьте:

```powershell
cd "C:\Users\k62\Documents\Атом\сайт\HelloWhoAreYou-1 (5)\HelloWhoAreYou-1"
git status                 # нет ли файлов в состоянии "Changes to be committed"
git rev-parse HEAD
git fetch origin; git rev-parse origin/main
```

Если `git status` показывает `Changes to be committed:` — прошлый запуск
скрипта прервался на этапе коммита. Исправление:

```powershell
.\update-github.ps1 -Yes
```

Второй возможный вариант — кэш браузера. Обновите страницу с `Ctrl+Shift+R`.

### Сборка падает

```bash
ssh SERVER
cd /var/www/loaddevice
rm -rf node_modules dist
npm ci
npm run build
```

Если ошибка `heap out of memory` — на сервере не хватает RAM,
настройте swap (см. §6.6 в PRODUCTION_DEPLOYMENT_GUIDE.md).

### `git pull` не работает

```bash
cd /var/www/loaddevice
git fetch origin
git reset --hard origin/main
```

> `git reset --hard` **удалит все локальные правки на сервере.** Так и
> задумано: правки должны приходить только через GitHub.

### Приложение не поднялось после обновления

```bash
ssh SERVER "pm2 logs loaddevice --err --lines 50"
```

Раздел «Устранение неполадок» (§21) в PRODUCTION_DEPLOYMENT_GUIDE.md
содержит таблицу типовых ошибок и решений.
