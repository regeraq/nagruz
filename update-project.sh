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

# Запомним SHA ДО обновления, чтобы в конце показать, что реально поменялось.
SHA_BEFORE="$(git rev-parse HEAD 2>/dev/null || echo 'unknown')"

# ---------- 2. Получение последних изменений ----------
echo "🔍 Шаг 1: Получение последних изменений с GitHub..."
git fetch origin
git reset --hard origin/main
SHA_AFTER="$(git rev-parse HEAD)"
echo ""

# ---------- 3. Установка зависимостей ----------
echo "📦 Шаг 2: Установка зависимостей..."
npm install
echo ""

# ---------- 4. Сборка ----------
echo "🔨 Шаг 3: Сборка проекта..."
npm run build
echo ""

# ---------- 5. Миграции БД ----------
echo "🗄️  Шаг 4: Применение миграций БД..."
npm run db:push || echo "⚠️  Миграции не применены (возможно, нет изменений)"
echo ""

# ---------- 6. Перезапуск ----------
echo "🔄 Шаг 5: Перезапуск приложения..."

if ! command -v pm2 >/dev/null 2>&1; then
    echo "⚠️  pm2 не найден. Устанавливаю глобально..."
    npm install -g pm2
fi

if pm2 list | grep -q "loaddevice"; then
    pm2 restart loaddevice --update-env
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

# ---------- 7. Статус и сверка ----------
echo "✅ Шаг 6: Проверка статуса..."
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
