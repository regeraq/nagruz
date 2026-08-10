#!/bin/bash
# Универсальный скрипт для обновления проекта на сервере.
# Автоматически определяет корень проекта и подгружает node/npm/pm2,
# даже если запущен через неинтерактивный SSH (ssh host "bash script.sh").

set -e

echo "=========================================="
echo "  ОБНОВЛЕНИЕ ПРОЕКТА НА СЕРВЕРЕ"
echo "=========================================="
echo ""

PROJECT_DIR="/var/www/loaddevice"

# ---------- 0. Гарантируем node/npm/pm2 в PATH ----------
# ssh host "bash script.sh" запускает bash в non-interactive non-login режиме.
# В этом режиме ~/.bashrc и /etc/profile.d/nvm.sh НЕ подгружаются,
# и команды, поставленные через nvm, не находятся.

ensure_node_in_path() {
    # 1. Расширяем PATH на стандартные системные bin-директории.
    export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"

    # 2. Пробуем подгрузить nvm из $HOME, /root и /home/*.
    local nvm_candidates=()
    [ -n "$HOME" ]       && nvm_candidates+=("$HOME/.nvm/nvm.sh")
    nvm_candidates+=("/root/.nvm/nvm.sh")
    for d in /home/*; do
        [ -s "$d/.nvm/nvm.sh" ] && nvm_candidates+=("$d/.nvm/nvm.sh")
    done

    for nvm_sh in "${nvm_candidates[@]}"; do
        if [ -s "$nvm_sh" ] && ! command -v npm >/dev/null 2>&1; then
            # shellcheck disable=SC1090
            export NVM_DIR="$(dirname "$nvm_sh")"
            . "$nvm_sh" --no-use >/dev/null 2>&1 || true
            nvm use default  >/dev/null 2>&1 \
                || nvm use --lts >/dev/null 2>&1 \
                || nvm use node  >/dev/null 2>&1 \
                || true
        fi
    done

    # 3. Фолбэк: напрямую находим самую свежую версию node внутри nvm-папок.
    if ! command -v npm >/dev/null 2>&1; then
        for versions_dir in \
            "$HOME/.nvm/versions/node" \
            "/root/.nvm/versions/node" \
            /home/*/.nvm/versions/node
        do
            [ -d "$versions_dir" ] || continue
            local latest
            latest="$(ls -1 "$versions_dir" 2>/dev/null | sort -V | tail -n1)"
            if [ -n "$latest" ] && [ -x "$versions_dir/$latest/bin/npm" ]; then
                export PATH="$versions_dir/$latest/bin:$PATH"
                break
            fi
        done
    fi

    # 4. Глобальный bin pm2 (если ставился через npm install -g без nvm).
    if [ -d "/usr/local/lib/node_modules/.bin" ]; then
        export PATH="/usr/local/lib/node_modules/.bin:$PATH"
    fi
}

ensure_node_in_path

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    echo "❌ ОШИБКА: node или npm не найдены в PATH."
    echo "   PATH=$PATH"
    echo "   Проверьте: command -v node; command -v npm; ls ~/.nvm/versions/node"
    echo "   Подсказка: в интерактивной SSH-сессии (ssh root@host без команды)"
    echo "   запустите: which node npm pm2"
    exit 1
fi

echo "ℹ️  node $(node -v) | npm $(npm -v) | $(command -v pm2 >/dev/null 2>&1 && echo "pm2 $(pm2 -v)" || echo 'pm2 not found (yet)')"
echo ""

# ---------- 1. Определение корня проекта ----------
cd "$PROJECT_DIR" || {
    echo "❌ ОШИБКА: Директория $PROJECT_DIR не существует!"
    exit 1
}

echo "🔍 Определение корня проекта..."
if [ -f "package.json" ]; then
    echo "✅ package.json найден в корне: $PROJECT_DIR"
    PROJECT_ROOT="$PROJECT_DIR"
elif [ -f "HelloWhoAreYou-1/package.json" ]; then
    echo "✅ package.json найден в подпапке: $PROJECT_DIR/HelloWhoAreYou-1"
    PROJECT_ROOT="$PROJECT_DIR/HelloWhoAreYou-1"
else
    echo "❌ ОШИБКА: package.json не найден ни в $PROJECT_DIR, ни в $PROJECT_DIR/HelloWhoAreYou-1"
    echo "💡 Проверьте структуру проекта на сервере"
    exit 1
fi

echo "📁 Рабочая директория: $PROJECT_ROOT"
cd "$PROJECT_ROOT" || exit 1
echo ""

# Запомним SHA ДО обновления — он же точка отката.
SHA_BEFORE="$(git rev-parse HEAD 2>/dev/null || echo 'unknown')"

# Откат к предыдущему коммиту, если деплой развалился на сборке/миграциях.
rollback() {
    echo ""
    echo "⏪ ОТКАТ на предыдущий рабочий коммит $SHA_BEFORE"
    if [ "$SHA_BEFORE" = "unknown" ]; then
        echo "   ⚠️  Точка отката неизвестна — откат невозможен, разбирайтесь вручную."
        return
    fi
    git reset --hard "$SHA_BEFORE"
    npm ci && npm run build || echo "   ⚠️  Не удалось пересобрать откатанную версию!"
    pm2 restart loaddevice --update-env >/dev/null 2>&1 || true
    echo "   Откат выполнен. Сайт работает на прежней версии."
}

# ---------- 2. Проверка обязательных условий ----------
if [ ! -f ".env" ]; then
    echo "❌ ОШИБКА: файл .env не найден в $PROJECT_ROOT"
    echo "   Без него приложение не запустится (нет DATABASE_URL и секретов)."
    exit 1
fi

# Бэкап БД ПЕРЕД миграциями: если миграция испортит данные, откат кода не поможет.
if [ -f "scripts/backup.sh" ]; then
    echo "💾 Шаг 0: Резервная копия БД перед миграциями..."
    bash scripts/backup.sh >/dev/null 2>&1 \
        && echo "   ✅ Бэкап создан" \
        || echo "   ⚠️  Бэкап не удался — продолжаем, но риск выше"
    echo ""
fi

# ---------- 3. Получение последних изменений ----------
echo "🔍 Шаг 1: Получение последних изменений с GitHub..."
git fetch origin
git reset --hard origin/main
SHA_AFTER="$(git rev-parse HEAD)"
echo ""

# ---------- 4. Установка зависимостей ----------
# npm ci, а не npm install: устанавливает ровно то, что в package-lock.json.
# npm install мог подтянуть новые минорные версии и сломать прод «сам по себе».
echo "📦 Шаг 2: Установка зависимостей (npm ci)..."
if ! npm ci; then
    echo "❌ npm ci не выполнился."
    rollback
    exit 1
fi
echo ""

# ---------- 5. Сборка ----------
echo "🔨 Шаг 3: Сборка проекта..."
if ! npm run build; then
    echo "❌ Сборка упала — старая версия продолжает работать."
    rollback
    exit 1
fi
echo ""

# ---------- 6. Миграции БД ----------
# Только db:migrate: db:push интерактивен и в неинтерактивной сессии зависает.
echo "🗄️  Шаг 4: Применение миграций БД..."
if ! npm run db:migrate; then
    echo "❌ Миграции не применились — схема БД несовместима с кодом."
    rollback
    exit 1
fi
echo ""

# ---------- 6. Перезапуск ----------
echo "🔄 Шаг 5: Перезапуск приложения..."

if ! command -v pm2 >/dev/null 2>&1; then
    echo "⚠️  pm2 не найден. Устанавливаю глобально..."
    npm install -g pm2
fi

if pm2 list | grep -q "loaddevice"; then
    # reload вместо restart: посылает SIGTERM и даёт приложению корректно
    # завершить запросы в полёте (см. graceful shutdown в server/index.ts).
    pm2 reload ecosystem.config.cjs --update-env || pm2 restart loaddevice --update-env
    pm2 save
else
    echo "ℹ️  PM2-процесс loaddevice не найден, запускаем заново..."
    if [ -f "ecosystem.config.cjs" ]; then
        pm2 start ecosystem.config.cjs
    else
        pm2 start dist/index.js --name loaddevice --max-memory-restart 500M --cwd "$PROJECT_ROOT"
    fi
    pm2 save
fi
echo ""

# ---------- 8. Health check ----------
# Без этой проверки скрипт рапортует «успех», даже если приложение упало
# сразу после старта (например, из-за отсутствующей переменной окружения).
echo "🩺 Шаг 6: Проверка работоспособности..."
APP_PORT="$(grep -E '^PORT=' .env 2>/dev/null | head -n1 | cut -d'=' -f2- | tr -d '"'"'"' ' || true)"
APP_PORT="${APP_PORT:-5000}"
HEALTH_URL="http://127.0.0.1:${APP_PORT}/api/health"

HEALTHY=0
for i in $(seq 1 15); do
    if curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null 2>&1; then
        HEALTHY=1
        echo "   ✅ Приложение отвечает на $HEALTH_URL (попытка $i)"
        break
    fi
    sleep 2
done

if [ "$HEALTHY" -ne 1 ]; then
    echo "   ❌ Приложение НЕ отвечает на $HEALTH_URL после 30 секунд."
    echo "   Логи ошибок:"
    pm2 logs loaddevice --lines 40 --nostream --err || true
    rollback
    exit 1
fi
echo ""

# ---------- 9. Статус и сверка ----------
echo "✅ Шаг 7: Статус процессов..."
pm2 status
echo ""

echo "=========================================="
echo "  ОБНОВЛЕНИЕ ЗАВЕРШЕНО!"
echo "=========================================="
echo ""
echo "📌 Было:   $SHA_BEFORE"
echo "📌 Стало:  $SHA_AFTER"
if [ "$SHA_BEFORE" = "$SHA_AFTER" ]; then
    echo "ℹ️  Код в git не изменился (но приложение всё равно пересобрано и перезапущено)."
else
    echo "🧾 Последний коммит:"
    git log -1 --pretty=format:"   %h  %s  (%an, %ar)"
    echo ""
fi
echo ""
echo "📊 Последние логи:"
pm2 logs loaddevice --lines 20 --nostream
