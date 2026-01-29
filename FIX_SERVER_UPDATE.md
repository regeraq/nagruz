# 🔧 ИСПРАВЛЕНИЕ ОБНОВЛЕНИЯ НА СЕРВЕРЕ

## ❌ Проблема:
На сервере `package.json` не найден, потому что проект находится в подпапке `HelloWhoAreYou-1`.

## ✅ Решение:

### Выполните на сервере:

```bash
ssh root@45.9.72.103
cd /var/www/loaddevice

# Проверьте структуру
ls -la

# Если есть подпапка HelloWhoAreYou-1, перейдите туда
if [ -d "HelloWhoAreYou-1" ]; then
    cd HelloWhoAreYou-1
fi

# Обновите проект
git fetch origin
git reset --hard origin/main

# Установите зависимости
npm install

# Пересоберите проект
npm run build

# Примените миграции БД
npm run db:push

# Перезапустите приложение
pm2 restart loaddevice

# Проверьте статус
pm2 status
pm2 logs loaddevice --lines 20
```

### Или одной командой:

```bash
ssh root@45.9.72.103 "cd /var/www/loaddevice && (cd HelloWhoAreYou-1 2>/dev/null || true) && git fetch origin && git reset --hard origin/main && npm install && npm run build && npm run db:push && pm2 restart loaddevice && pm2 logs loaddevice --lines 20"
```

---

## 🔍 Если структура другая:

Проверьте, где находится `package.json`:

```bash
ssh root@45.9.72.103
cd /var/www/loaddevice
find . -name "package.json" -type f
```

Затем перейдите в найденную директорию и выполните команды обновления.


