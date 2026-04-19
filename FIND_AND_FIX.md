# 🔍 Найти проект и применить миграцию

## Шаг 1: Найдите директорию проекта

Выполните на сервере:

```bash
# Вариант 1: Проверьте основную директорию
cd /var/www/loaddevice
ls -la

# Если видите package.json - это правильная директория
# Если видите папку HelloWhoAreYou-1 - перейдите в неё:
cd HelloWhoAreYou-1

# Вариант 2: Поиск через PM2 (если приложение запущено)
pm2 list
pm2 info loaddevice | grep "cwd\|script"

# Вариант 3: Поиск по файлу
find /var/www -name "package.json" -type f 2>/dev/null

# Вариант 4: Поиск по процессу Node.js
ps aux | grep node | grep -v grep
```

---

## Шаг 2: После нахождения проекта

```bash
# Перейдите в найденную директорию
cd /var/www/loaddevice
# или
cd /var/www/loaddevice/HelloWhoAreYou-1

# Проверьте структуру
ls -la
# Должны быть: package.json, server/, client/, shared/

# Проверьте .env файл
cat .env | grep DATABASE_URL

# Примените миграцию
npm run db:push

# Перезапустите приложение
pm2 restart loaddevice
```

---

## Если проект не найден

Возможно, проект в другой директории или еще не развернут. Проверьте:

```bash
# Поиск по всему серверу
find / -name "package.json" -path "*/loaddevice*" 2>/dev/null
find / -name "package.json" -path "*nagruz*" 2>/dev/null

# Проверка домашней директории
cd ~
ls -la

# Проверка /opt
ls -la /opt
```

---

## Быстрое решение

Если проект точно в `/var/www/loaddevice`, но без подпапки:

```bash
cd /var/www/loaddevice
ls -la package.json  # проверьте наличие
npm run db:push
pm2 restart loaddevice
```





