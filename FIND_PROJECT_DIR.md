# 🔍 Поиск директории проекта на сервере

## Быстрая проверка

Выполните эти команды на сервере, чтобы найти проект:

```bash
# 1. Проверьте стандартные директории
ls -la /var/www/
ls -la /home/
ls -la /opt/

# 2. Поиск по имени проекта
find / -name "package.json" -type f 2>/dev/null | grep -i "loaddevice\|nagruz\|hello"

# 3. Поиск по PM2 процессу
pm2 list
pm2 info loaddevice  # если процесс называется loaddevice

# 4. Поиск по порту 5000
netstat -tlnp | grep 5000
# или
ss -tlnp | grep 5000

# 5. Поиск по имени файла
find / -name "index.js" -path "*/dist/*" 2>/dev/null
```

---

## Если проект в другой директории

### Вариант 1: Проект в /var/www/loaddevice (без подпапки)

```bash
cd /var/www/loaddevice
ls -la
# Если видите package.json - это правильная директория
```

### Вариант 2: Проект в домашней директории

```bash
cd ~
ls -la
# Ищите папку с проектом
```

### Вариант 3: Проект в /opt

```bash
cd /opt
ls -la
```

---

## После нахождения проекта

Когда найдете правильную директорию:

```bash
# Перейдите в неё
cd /путь/к/проекту

# Проверьте структуру
ls -la

# Должны быть файлы:
# - package.json
# - server/
# - client/
# - shared/

# Примените миграцию
npm run db:push

# Перезапустите приложение
pm2 restart loaddevice
# или
pm2 restart all
```

---

## Если проект не найден

Возможно, проект еще не развернут. Следуйте инструкциям в `DEPLOYMENT_GUIDE.md` для развертывания.





