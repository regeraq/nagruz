# ⚡ Быстрое применение миграции на хостинге

## 🎯 Самый простой способ

### 1. Подключитесь к серверу:
```bash
ssh deploy@YOUR_SERVER_IP
```

### 2. Перейдите в проект:
```bash
cd /var/www/loaddevice/HelloWhoAreYou-1
```

### 3. Примените миграцию:
```bash
npm run db:push
```

### 4. Перезапустите приложение:
```bash
pm2 restart loaddevice
```

**Готово! ✅**

---

## 🔍 Если что-то пошло не так

### Проверьте DATABASE_URL:
```bash
cat .env | grep DATABASE_URL
```

### Проверьте, что PostgreSQL запущен:
```bash
sudo systemctl status postgresql
```

### Проверьте, что таблица создана:
```bash
psql -U loaddevice_user -d loaddevice_db -c "\dt commercial_proposal_files"
```

---

**Подробная инструкция:** см. `HOSTING_MIGRATION_GUIDE.md`





