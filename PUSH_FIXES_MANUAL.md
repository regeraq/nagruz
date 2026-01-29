# 📤 РУЧНАЯ ЗАГРУЗКА ИСПРАВЛЕНИЙ НА GITHUB

Из-за проблем с кириллицей в пути PowerShell, выполните команды вручную через **Git Bash**:

## 🚀 Инструкция:

1. **Откройте Git Bash** (правый клик в папке проекта → "Git Bash Here")

2. **Выполните команды:**

```bash
# Перейдите в директорию проекта
cd "/c/Users/k62/Documents/Атом/сайт/HelloWhoAreYou-1 (5)/HelloWhoAreYou-1"

# Добавьте исправленные файлы
git add server/routes.ts server/csrf.ts

# Проверьте статус
git status --short | grep -E "routes|csrf"

# Создайте коммит
git commit -m "Fix: Add isBlocked check in login route and fix CSRF cookie secure flag for HTTP"

# Загрузите на GitHub
git push origin main
```

---

## ✅ После загрузки обновите сервер:

```bash
ssh root@45.9.72.103
cd /var/www/loaddevice
git pull origin main
npm run build
pm2 restart loaddevice
```

---

## 🔍 Или одной командой:

```bash
ssh root@45.9.72.103 "cd /var/www/loaddevice && git pull origin main && npm run build && pm2 restart loaddevice && pm2 logs loaddevice --lines 20"
```


