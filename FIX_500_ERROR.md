# 🔧 Исправление ошибки 500 при скачивании файлов

## Быстрое решение

### Шаг 1: Примените миграцию БД (если еще не сделано)

```bash
# На сервере
ssh deploy@YOUR_SERVER_IP
cd /var/www/loaddevice/HelloWhoAreYou-1
npm run db:push
pm2 restart loaddevice
```

### Шаг 2: Проверьте, что таблица создана

```bash
psql -U loaddevice_user -d loaddevice_db -c "\dt commercial_proposal_files"
```

Должна быть таблица `commercial_proposal_files`.

### Шаг 3: Проверьте логи

```bash
pm2 logs loaddevice --lines 50
```

Ищите строки с `[Files]` - там будет детальная информация об ошибке.

---

## Детальная диагностика

### 1. Проверка таблицы в БД

```bash
# Подключитесь к БД
psql -U loaddevice_user -d loaddevice_db

# Проверьте таблицу
\dt commercial_proposal_files

# Если таблицы нет - примените миграцию
\q
cd /var/www/loaddevice/HelloWhoAreYou-1
npm run db:push
```

### 2. Проверка наличия файлов

```bash
psql -U loaddevice_user -d loaddevice_db -c "SELECT id, file_name, file_size FROM commercial_proposal_files LIMIT 5;"
```

### 3. Проверка конкретного файла (замените FILE_ID)

```bash
psql -U loaddevice_user -d loaddevice_db -c "SELECT id, file_name, file_size, LENGTH(file_path) as data_length FROM commercial_proposal_files WHERE id = 'FILE_ID';"
```

### 4. Просмотр логов с деталями

```bash
# Просмотр последних логов
pm2 logs loaddevice --lines 100

# Поиск ошибок файлов
pm2 logs loaddevice | grep -i "file\|download\|error\|500"

# Поиск конкретного fileId
pm2 logs loaddevice | grep "b663c09c-5b4e-4bc5-bf8b-4eb320a2dc92"
```

---

## Возможные причины ошибки 500

### ❌ Таблица не создана
**Симптом:** В логах: `relation commercial_proposal_files does not exist`
**Решение:** `npm run db:push`

### ❌ Файл не найден
**Симптом:** В логах: `File not found`
**Решение:** Проверьте, что файл был сохранен при создании предложения

### ❌ Проблема с base64 данными
**Симптом:** В логах: `Empty base64 data` или `Invalid base64 format`
**Решение:** Файл был сохранен некорректно, нужно пересоздать

### ❌ Проблема с правами доступа
**Симптом:** В логах: `Access denied`
**Решение:** Проверьте авторизацию и права пользователя

---

## После исправления

1. **Перезапустите приложение:**
   ```bash
   pm2 restart loaddevice
   ```

2. **Проверьте работу:**
   - Откройте админ-панель
   - Попробуйте скачать файл
   - Проверьте логи: `pm2 logs loaddevice --lines 20`

3. **Если все еще не работает:**
   - Проверьте логи на сервере
   - Убедитесь, что миграция применена
   - Проверьте, что файл существует в БД

---

**Подробная документация:** см. `TROUBLESHOOTING.md`





