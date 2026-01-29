# ⚡ БЫСТРОЕ ОБНОВЛЕНИЕ ПРОЕКТА

Простая инструкция для обновления кода на GitHub и на сервере.

---

## 📤 ШАГ 1: Загрузка изменений на GitHub

### Вариант 1: Автоматический скрипт (рекомендуется)

Просто запустите PowerShell скрипт:

```powershell
cd "C:\Users\k62\Documents\Атом\сайт\HelloWhoAreYou-1 (5)\HelloWhoAreYou-1"
.\update-github.ps1
```

Скрипт автоматически:
- Проверит изменения
- Добавит все файлы
- Создаст коммит
- Синхронизирует с GitHub
- Отправит изменения

### Вариант 2: Вручную

```powershell
cd "C:\Users\k62\Documents\Атом\сайт\HelloWhoAreYou-1 (5)\HelloWhoAreYou-1"

# Проверка статуса
git status

# Добавление всех изменений
git add .

# Коммит
git commit -m "Обновление кода проекта"

# Отправка на GitHub
git push origin main
```

**Если будет конфликт:**
```powershell
git pull origin main
git push origin main
```

---

## 📥 ШАГ 2: Обновление на сервере

### Вариант 1: Автоматический (рекомендуется)

```bash
ssh root@45.9.72.103
bash /var/www/loaddevice/update-project.sh
```

### Вариант 2: Одной командой

```bash
ssh root@45.9.72.103 "cd /var/www/loaddevice && bash update-project.sh"
```

### Вариант 3: Вручную

```bash
ssh root@45.9.72.103

cd /var/www/loaddevice

# Автоматическое определение правильного пути
if [ -f "package.json" ]; then
    cd /var/www/loaddevice
elif [ -f "HelloWhoAreYou-1/package.json" ]; then
    cd /var/www/loaddevice/HelloWhoAreYou-1
fi

# Обновление кода
git pull origin main
npm install
npm run build
pm2 restart loaddevice

# Проверка логов
pm2 logs loaddevice --lines 20
```

---

## ✅ Проверка успешного обновления

```bash
# Проверка статуса PM2
pm2 status

# Просмотр логов
pm2 logs loaddevice --lines 30

# Проверка сайта
curl http://localhost:5000/api/products
```

---

## 🔧 Устранение проблем

### Если git pull не работает:

```bash
cd /var/www/loaddevice
git fetch origin
git reset --hard origin/main
```

### Если сборка не работает:

```bash
rm -rf node_modules dist
npm install
npm run build
pm2 restart loaddevice
```

### Если проект не найден:

```bash
# Поиск package.json
find /var/www -name "package.json" -type f 2>/dev/null
```
