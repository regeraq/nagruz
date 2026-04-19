# 🗄️ Руководство по применению миграции на хостинге

## 📋 Быстрая инструкция

### Вариант 1: Через SSH (рекомендуется)

1. **Подключитесь к серверу по SSH:**
   ```bash
   ssh deploy@YOUR_SERVER_IP
   # или
   ssh root@YOUR_SERVER_IP
   ```

2. **Перейдите в директорию проекта:**
   ```bash
   cd /var/www/loaddevice
   # или если проект в подпапке:
   cd /var/www/loaddevice/HelloWhoAreYou-1
   ```

3. **Проверьте наличие .env файла:**
   ```bash
   ls -la .env
   cat .env | grep DATABASE_URL
   ```

4. **Примените миграцию:**
   ```bash
   npm run db:push
   ```

5. **Проверьте результат:**
   ```bash
   # Подключитесь к БД и проверьте наличие таблицы
   psql -U loaddevice_user -d loaddevice_db -c "\dt commercial_proposal_files"
   ```

### Вариант 2: Через скрипт деплоя (автоматически)

Если у вас настроен автоматический деплой через `deploy.sh`, миграция применится автоматически при следующем деплое:

```bash
cd /var/www/loaddevice
./deploy.sh
```

Скрипт автоматически выполнит `npm run db:push` (строка 62 в deploy.sh).

### Вариант 3: Через PM2 (если приложение запущено)

Если приложение уже запущено через PM2:

```bash
# Остановите приложение
pm2 stop loaddevice

# Примените миграцию
cd /var/www/loaddevice/HelloWhoAreYou-1
npm run db:push

# Запустите приложение снова
pm2 start loaddevice
```

---

## 🔍 Подробная инструкция

### Шаг 1: Подготовка

**1.1. Убедитесь, что у вас есть доступ к серверу:**

- SSH доступ к серверу
- Данные для подключения к базе данных (из `.env` файла)

**1.2. Проверьте переменные окружения:**

```bash
cd /var/www/loaddevice/HelloWhoAreYou-1
cat .env | grep DATABASE_URL
```

Должна быть строка вида:
```
DATABASE_URL=postgresql://user:password@localhost:5432/database_name
```

**1.3. Проверьте подключение к базе данных:**

```bash
# Используя данные из DATABASE_URL
psql postgresql://loaddevice_user:password@localhost:5432/loaddevice_db -c "SELECT version();"
```

---

### Шаг 2: Резервное копирование (ОБЯЗАТЕЛЬНО!)

**⚠️ ВАЖНО: Перед применением миграции сделайте резервную копию базы данных!**

```bash
# Создание директории для бэкапов
mkdir -p ~/backups

# Создание резервной копии
pg_dump -U loaddevice_user loaddevice_db > ~/backups/backup_before_migration_$(date +%Y%m%d_%H%M%S).sql

# Проверка размера бэкапа
ls -lh ~/backups/backup_before_migration_*.sql
```

**Если что-то пойдет не так, вы сможете восстановить БД:**
```bash
psql -U loaddevice_user -d loaddevice_db < ~/backups/backup_before_migration_YYYYMMDD_HHMMSS.sql
```

---

### Шаг 3: Применение миграции

**3.1. Перейдите в директорию проекта:**

```bash
cd /var/www/loaddevice/HelloWhoAreYou-1
```

**3.2. Убедитесь, что зависимости установлены:**

```bash
npm install
```

**3.3. Примените миграцию:**

```bash
npm run db:push
```

**Ожидаемый вывод:**
```
> rest-express@1.0.0 db:push
> drizzle-kit push

✓ No schema changes, nothing to migrate.
```

Или если таблица еще не создана:
```
✓ Pushed schema to database
```

---

### Шаг 4: Проверка результата

**4.1. Проверьте, что таблица создана:**

```bash
psql -U loaddevice_user -d loaddevice_db -c "\dt commercial_proposal_files"
```

**Ожидаемый вывод:**
```
                    List of relations
 Schema |              Name               | Type  |     Owner      
--------+--------------------------------+-------+----------------
 public | commercial_proposal_files       | table | loaddevice_user
```

**4.2. Проверьте структуру таблицы:**

```bash
psql -U loaddevice_user -d loaddevice_db -c "\d commercial_proposal_files"
```

**Ожидаемый вывод:**
```
                                    Table "public.commercial_proposal_files"
    Column     |            Type             | Collation | Nullable |                      Default                       
---------------+-----------------------------+-----------+----------+----------------------------------------------------
 id            | character varying           |           | not null | gen_random_uuid()
 proposal_id   | character varying           |           | not null | 
 user_id       | character varying           |           |          | 
 file_name     | text                        |           | not null | 
 mime_type     | text                        |           | not null | 
 file_size     | integer                     |           | not null | 
 file_path     | text                        |           | not null | 
 uploaded_at   | timestamp without time zone |           | not null | now()
 created_at    | timestamp without time zone |           | not null | now()
Indexes:
    "commercial_proposal_files_pkey" PRIMARY KEY, btree (id)
Foreign-key constraints:
    "commercial_proposal_files_proposal_id_contact_submissions_id_fk" FOREIGN KEY (proposal_id) REFERENCES contact_submissions(id) ON DELETE CASCADE
    "commercial_proposal_files_user_id_users_id_fk" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
```

---

### Шаг 5: Перезапуск приложения

После успешного применения миграции перезапустите приложение:

```bash
# Если используете PM2
pm2 restart loaddevice

# Проверка статуса
pm2 status
pm2 logs loaddevice --lines 50
```

---

## 🚨 Устранение проблем

### Проблема: "DATABASE_URL, ensure the database is provisioned"

**Причина:** Переменная окружения `DATABASE_URL` не установлена или не загружается.

**Решение:**

1. Проверьте наличие `.env` файла:
   ```bash
   ls -la .env
   ```

2. Проверьте содержимое `.env`:
   ```bash
   cat .env | grep DATABASE_URL
   ```

3. Если файла нет или переменная отсутствует, создайте/обновите `.env`:
   ```bash
   nano .env
   ```
   
   Добавьте строку:
   ```env
   DATABASE_URL=postgresql://loaddevice_user:password@localhost:5432/loaddevice_db
   ```

4. Попробуйте снова:
   ```bash
   npm run db:push
   ```

### Проблема: "permission denied" или "access denied"

**Причина:** Пользователь БД не имеет прав на создание таблиц.

**Решение:**

```bash
# Подключитесь к PostgreSQL как суперпользователь
sudo -u postgres psql

# В консоли PostgreSQL:
GRANT ALL PRIVILEGES ON DATABASE loaddevice_db TO loaddevice_user;
ALTER USER loaddevice_user CREATEDB;
\q

# Попробуйте снова
npm run db:push
```

### Проблема: "relation already exists"

**Причина:** Таблица уже существует (миграция уже была применена ранее).

**Решение:**

Это нормально! Таблица уже создана. Проверьте:
```bash
psql -U loaddevice_user -d loaddevice_db -c "\dt commercial_proposal_files"
```

Если таблица существует, миграция не нужна.

### Проблема: "connection refused" или "could not connect"

**Причина:** PostgreSQL не запущен или неправильные данные подключения.

**Решение:**

1. Проверьте статус PostgreSQL:
   ```bash
   sudo systemctl status postgresql
   ```

2. Если не запущен, запустите:
   ```bash
   sudo systemctl start postgresql
   ```

3. Проверьте правильность DATABASE_URL:
   ```bash
   psql postgresql://loaddevice_user:password@localhost:5432/loaddevice_db -c "SELECT 1;"
   ```

---

## ✅ Проверка после миграции

После успешного применения миграции проверьте:

1. **Таблица создана:**
   ```bash
   psql -U loaddevice_user -d loaddevice_db -c "\dt commercial_proposal_files"
   ```

2. **Приложение работает:**
   ```bash
   pm2 status
   curl http://localhost:5000/api/health  # если есть health endpoint
   ```

3. **Логи без ошибок:**
   ```bash
   pm2 logs loaddevice --lines 50
   ```

4. **Функциональность работает:**
   - Откройте сайт в браузере
   - Попробуйте отправить коммерческое предложение с файлом
   - Проверьте админ-панель - должны отображаться файлы

---

## 📝 Дополнительные команды

### Просмотр всех таблиц в БД:
```bash
psql -U loaddevice_user -d loaddevice_db -c "\dt"
```

### Просмотр структуры таблицы:
```bash
psql -U loaddevice_user -d loaddevice_db -c "\d commercial_proposal_files"
```

### Подсчет записей в таблице:
```bash
psql -U loaddevice_user -d loaddevice_db -c "SELECT COUNT(*) FROM commercial_proposal_files;"
```

### Просмотр последних файлов:
```bash
psql -U loaddevice_user -d loaddevice_db -c "SELECT id, file_name, file_size, uploaded_at FROM commercial_proposal_files ORDER BY uploaded_at DESC LIMIT 10;"
```

---

## 🔄 Откат миграции (если нужно)

Если нужно удалить таблицу (например, для повторного применения):

```bash
# ⚠️ ВНИМАНИЕ: Это удалит все данные в таблице!
psql -U loaddevice_user -d loaddevice_db -c "DROP TABLE IF EXISTS commercial_proposal_files CASCADE;"
```

Затем примените миграцию снова:
```bash
npm run db:push
```

---

## 📞 Поддержка

Если возникли проблемы:

1. Проверьте логи:
   ```bash
   pm2 logs loaddevice
   tail -f /var/log/nginx/error.log
   ```

2. Проверьте статус сервисов:
   ```bash
   sudo systemctl status postgresql
   pm2 status
   ```

3. Проверьте использование ресурсов:
   ```bash
   free -h
   df -h
   ```

---

**Успешного применения миграции! 🚀**





