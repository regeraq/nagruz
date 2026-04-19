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

Неинтерактивные варианты (без запроса сообщения коммита):

```powershell
# со своим сообщением:
.\update-github.ps1 -Message "fix: нормальная отправка писем"

# с дефолтным сообщением "Update project code":
.\update-github.ps1 -Yes
```

Скрипт автоматически:
- Проверит изменения и настройки git
- Добавит все файлы (`git add -A`)
- Создаст коммит **и проверит, что он действительно прошёл**
- Подтянет чужие изменения с GitHub (rebase) при необходимости
- Отправит изменения (`git push`)
- В конце сверит `HEAD` c `origin/main` и сообщит об успехе только если всё реально на GitHub

Если что-то пошло не так — скрипт завершится с красной ошибкой и укажет, что делать. В этом случае **ничего** не залито на GitHub.

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

### Если «обновил — а на сайте ничего не изменилось»

Это значит, что локальные правки не долетели до GitHub, а сервер честно подтягивает то, что в `origin/main`. Проверьте:

```powershell
# В папке проекта на Windows:
cd "C:\Users\k62\Documents\Атом\сайт\HelloWhoAreYou-1 (5)\HelloWhoAreYou-1"

# Локальный HEAD и то, что реально на GitHub, должны совпадать:
git rev-parse HEAD
git fetch origin
git rev-parse origin/main

# Не должно быть застрявших в индексе файлов (staged, но без коммита):
git status
```

Если `git status` показывает `Changes to be committed:` — значит прошлый запуск скрипта завершился на этапе коммита (например, окно PowerShell закрыли до ввода сообщения). Исправление:

```powershell
.\update-github.ps1 -Yes
# или:
git commit -m "Update project code"; git push origin main
```

После этого на сервере:

```bash
ssh root@45.9.72.103 "bash /var/www/loaddevice/update-project.sh"
```
