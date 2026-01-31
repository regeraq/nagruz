# 🔧 Устранение проблем

## Ошибка 500 при скачивании файлов

### Симптомы:
```
GET /api/files/:fileId/download 500 (Internal Server Error)
```

### Возможные причины и решения:

#### 1. Таблица `commercial_proposal_files` не создана в БД

**Проверка:**
```bash
# На сервере
psql -U loaddevice_user -d loaddevice_db -c "\dt commercial_proposal_files"
```

**Решение:**
```bash
cd /var/www/loaddevice/HelloWhoAreYou-1
npm run db:push
pm2 restart loaddevice
```

#### 2. Файл не найден в базе данных

**Проверка:**
```bash
psql -U loaddevice_user -d loaddevice_db -c "SELECT id, file_name, file_size FROM commercial_proposal_files WHERE id = 'FILE_ID';"
```

**Решение:**
- Убедитесь, что файл был сохранен при создании коммерческого предложения
- Проверьте логи при создании предложения: `pm2 logs loaddevice | grep "File saved"`

#### 3. Проблема с декодированием base64

**Проверка:**
```bash
# Проверьте формат данных в БД
psql -U loaddevice_user -d loaddevice_db -c "SELECT id, LEFT(file_path, 50) as file_path_preview FROM commercial_proposal_files LIMIT 1;"
```

**Решение:**
- Данные должны начинаться с `data:` или быть чистым base64
- Если данные повреждены, нужно пересоздать файл

#### 4. Проблема с правами доступа

**Проверка:**
- Убедитесь, что пользователь авторизован
- Проверьте, что файл принадлежит пользователю или пользователь - админ
- Проверьте логи: `pm2 logs loaddevice | grep "Access denied"`

#### 5. Проблема с подключением к БД

**Проверка:**
```bash
# Проверьте DATABASE_URL
cat .env | grep DATABASE_URL

# Проверьте подключение
psql postgresql://loaddevice_user:password@localhost:5432/loaddevice_db -c "SELECT 1;"
```

**Решение:**
- Убедитесь, что PostgreSQL запущен: `sudo systemctl status postgresql`
- Проверьте правильность DATABASE_URL в `.env`

---

## Проверка логов для диагностики

### Просмотр логов приложения:
```bash
pm2 logs loaddevice --lines 100
```

### Поиск ошибок файлов:
```bash
pm2 logs loaddevice | grep -i "file\|download\|error"
```

### Проверка конкретного файла:
```bash
# В логах ищите строки с fileId
pm2 logs loaddevice | grep "FILE_ID"
```

---

## Быстрая диагностика

### Скрипт проверки:
```bash
# Создайте файл check-files.sh
cat > ~/check-files.sh << 'EOF'
#!/bin/bash
echo "=== ПРОВЕРКА СИСТЕМЫ ФАЙЛОВ ==="
echo ""

echo "1. Проверка таблицы:"
psql -U loaddevice_user -d loaddevice_db -c "\dt commercial_proposal_files" 2>&1

echo ""
echo "2. Количество файлов:"
psql -U loaddevice_user -d loaddevice_db -c "SELECT COUNT(*) FROM commercial_proposal_files;" 2>&1

echo ""
echo "3. Последние 5 файлов:"
psql -U loaddevice_user -d loaddevice_db -c "SELECT id, file_name, file_size, uploaded_at FROM commercial_proposal_files ORDER BY uploaded_at DESC LIMIT 5;" 2>&1

echo ""
echo "4. Проверка DATABASE_URL:"
cd /var/www/loaddevice/HelloWhoAreYou-1
cat .env | grep DATABASE_URL | head -1

echo ""
echo "5. Статус приложения:"
pm2 status loaddevice

echo ""
echo "=== ПРОВЕРКА ЗАВЕРШЕНА ==="
EOF

chmod +x ~/check-files.sh
~/check-files.sh
```

---

## Частые ошибки

### "relation commercial_proposal_files does not exist"
**Решение:** Примените миграцию: `npm run db:push`

### "Access denied" или 403 ошибка
**Решение:** 
- Проверьте, что пользователь авторизован
- Проверьте, что файл принадлежит пользователю
- Админы имеют доступ ко всем файлам

### "Empty base64 data"
**Решение:**
- Файл был сохранен некорректно
- Пересоздайте коммерческое предложение с файлом

### "Invalid base64 format"
**Решение:**
- Данные в БД повреждены
- Проверьте содержимое `file_path` в таблице

---

## Контакты для поддержки

Если проблема не решена:
1. Соберите логи: `pm2 logs loaddevice --lines 200 > logs.txt`
2. Проверьте статус БД: `sudo systemctl status postgresql`
3. Проверьте использование ресурсов: `free -h && df -h`

