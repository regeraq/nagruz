# 🔄 СИНХРОНИЗАЦИЯ СТРУКТУРЫ ПРОЕКТА

## 📋 Текущая ситуация:
- **На GitHub:** Файлы проекта находятся в **корне** репозитория
- **Локально:** Файлы проекта находятся в подпапке `HelloWhoAreYou-1`
- **На сервере:** Нужно обновить структуру

---

## ✅ РЕШЕНИЕ: Обновить сервер под структуру GitHub

На GitHub файлы в корне, поэтому на сервере нужно работать из корня `/var/www/loaddevice`, а не из подпапки.

### Выполните на сервере:

```bash
ssh root@45.9.72.103
cd /var/www/loaddevice

# Получите последние изменения
git fetch origin
git reset --hard origin/main

# Проверьте структуру - файлы должны быть в корне
ls -la | head -20

# Если есть подпапка HelloWhoAreYou-1, удалите её (она больше не нужна)
if [ -d "HelloWhoAreYou-1" ]; then
    echo "Удаляем старую подпапку HelloWhoAreYou-1..."
    rm -rf HelloWhoAreYou-1
fi

# Проверьте, что package.json в корне
if [ ! -f "package.json" ]; then
    echo "ОШИБКА: package.json не найден в корне!"
    find . -name "package.json" -type f
    exit 1
fi

# Установите зависимости
npm install

# Пересоберите проект
npm run build

# Примените миграции БД
npm run db:push

# Обновите PM2 конфигурацию (если нужно)
pm2 delete loaddevice
pm2 start dist/index.js --name loaddevice --max-memory-restart 500M --cwd /var/www/loaddevice
pm2 save

# Проверьте статус
pm2 status
pm2 logs loaddevice --lines 20
```

---

## 🔄 Или одной командой:

```bash
ssh root@45.9.72.103 "cd /var/www/loaddevice && git fetch origin && git reset --hard origin/main && rm -rf HelloWhoAreYou-1 2>/dev/null || true && npm install && npm run build && npm run db:push && pm2 delete loaddevice 2>/dev/null || true && pm2 start dist/index.js --name loaddevice --max-memory-restart 500M --cwd /var/www/loaddevice && pm2 save && pm2 logs loaddevice --lines 20"
```

---

## ✅ После обновления проверьте:

1. **Структура проекта:**
   ```bash
   ls -la /var/www/loaddevice | head -20
   ```

2. **package.json в корне:**
   ```bash
   cat /var/www/loaddevice/package.json | head -10
   ```

3. **Работа сайта:**
   - http://45.9.72.103
   - https://vm3848909.firstbyte.club

---

## 📝 Примечания:

- ✅ На GitHub файлы в корне репозитория
- ✅ На сервере файлы тоже должны быть в корне `/var/www/loaddevice`
- ✅ Подпапка `HelloWhoAreYou-1` больше не нужна на сервере
- ⚠️ `attached_assets` все еще на GitHub (большие файлы), но он в `.gitignore`, так что новые файлы не будут загружаться


