# ⚡ БЫСТРОЕ ОБНОВЛЕНИЕ ПРОЕКТА

## 📋 Обновление кода на GitHub и сервере

### 1. Загрузка изменений на GitHub (локально)

Выполните в PowerShell из корня проекта:

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

Если будет конфликт:
```powershell
git pull origin main
git push origin main
```

### 2. Обновление на сервере

**Вариант 1: Автоматический (рекомендуется)**

```bash
ssh root@45.9.72.103
bash /var/www/loaddevice/update-project.sh
```

**Вариант 2: Вручную**

```bash
ssh root@45.9.72.103

# Переход в директорию проекта
cd /var/www/loaddevice

# Автоматическое определение правильного пути
if [ -f "package.json" ]; then
    PROJECT_ROOT="/var/www/loaddevice"
elif [ -f "HelloWhoAreYou-1/package.json" ]; then
    PROJECT_ROOT="/var/www/loaddevice/HelloWhoAreYou-1"
    cd "$PROJECT_ROOT"
else
    echo "❌ ОШИБКА: package.json не найден!"
    exit 1
fi

# Обновление кода
git pull origin main
npm install
npm run build
pm2 restart loaddevice

# Проверка логов
pm2 logs loaddevice --lines 20
```

**Вариант 3: Одной командой**

```bash
ssh root@45.9.72.103 "cd /var/www/loaddevice && bash update-project.sh"
```

## ✅ Проверка успешного обновления

```bash
# Проверка статуса PM2
pm2 status

# Просмотр логов
pm2 logs loaddevice --lines 30

# Проверка сайта
curl http://localhost:5000/api/products
```

## 🔧 Устранение проблем

### Если проект не найден:

```bash
# Проверка структуры
ls -la /var/www/loaddevice/
ls -la /var/www/loaddevice/HelloWhoAreYou-1/ 2>/dev/null || echo "Подпапка не существует"

# Поиск package.json
find /var/www -name "package.json" -type f 2>/dev/null
```

### Если git pull не работает:

```bash
cd /var/www/loaddevice
# Или cd /var/www/loaddevice/HelloWhoAreYou-1 если проект там

# Проверка статуса git
git status

# Принудительное обновление
git fetch origin
git reset --hard origin/main
```

### Если сборка не работает:

```bash
# Очистка и пересборка
rm -rf node_modules dist
npm install
npm run build
pm2 restart loaddevice
```

