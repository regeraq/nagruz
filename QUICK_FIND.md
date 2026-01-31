# ⚡ Быстрый поиск проекта на сервере

## Выполните эти команды на сервере:

```bash
# 1. Проверьте, существует ли /var/www/loaddevice
ls -la /var/www/loaddevice

# 2. Если существует, перейдите туда
cd /var/www/loaddevice
ls -la

# 3. Если видите package.json - это корень проекта
# Примените миграцию:
npm run db:push

# 4. Если видите папку HelloWhoAreYou-1:
cd HelloWhoAreYou-1
npm run db:push

# 5. Перезапустите приложение
pm2 restart loaddevice
```

---

## Если /var/www/loaddevice не существует:

```bash
# Поиск проекта по PM2
pm2 list
pm2 info loaddevice

# Поиск по процессу
ps aux | grep node | grep -v grep

# Поиск по файлу package.json
find /var/www -name "package.json" 2>/dev/null
find /home -name "package.json" 2>/dev/null
find /opt -name "package.json" 2>/dev/null

# Поиск по порту 5000
netstat -tlnp | grep 5000
```

---

## После нахождения проекта:

```bash
cd /найденный/путь/к/проекту
npm run db:push
pm2 restart loaddevice
```

