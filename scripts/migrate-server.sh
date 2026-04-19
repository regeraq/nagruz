#!/bin/bash
# Миграция проекта loaddevice со старого сервера на новый.
#
# Что делает:
#   1. На SOURCE — pg_dump + tar с .env/uploads/конфигами
#   2. scp оба файла на TARGET
#   3. На TARGET — pg_restore, распаковка файлов, клонирование кода, npm install,
#      npm run build, pm2 start
#
# Требования:
#   - SSH-доступ с текущей машины к обоим серверам (ключи или ssh-agent)
#   - На TARGET уже выполнены шаги §5-§6 из DEPLOYMENT_GUIDE.md
#     (установлены node/nvm/npm, postgresql, nginx, pm2; создана БД и пользователь)
#   - На TARGET в .env БУДУЩИЙ DATABASE_URL указывает на уже созданную пустую БД
#
# Запуск:
#   bash scripts/migrate-server.sh \
#     --from-host 45.9.72.103  --from-user root \
#     --to-host   NEW.IP       --to-user   deploy \
#     --project-dir /var/www/loaddevice \
#     --repo-url https://github.com/regeraq/nagruz.git \
#     --branch main
#
# Флаги см. в --help.

set -euo pipefail

# -------- Параметры по умолчанию --------
FROM_HOST=""
FROM_USER="root"
TO_HOST=""
TO_USER="deploy"
PROJECT_DIR="/var/www/loaddevice"
REPO_URL="https://github.com/regeraq/nagruz.git"
BRANCH="main"
APP_NAME="loaddevice"
ASSUME_YES="0"
SKIP_CODE="0"    # не клонировать код (если он уже есть на TARGET)
SKIP_BUILD="0"   # не запускать npm install/build на TARGET

usage() {
cat <<'USAGE'
migrate-server.sh — перенос проекта loaddevice между серверами.

ОБЯЗАТЕЛЬНЫЕ:
  --from-host HOST         IP или DNS старого сервера
  --to-host   HOST         IP или DNS нового сервера

НЕОБЯЗАТЕЛЬНЫЕ (значения по умолчанию в скобках):
  --from-user USER         пользователь SSH на SOURCE (root)
  --to-user   USER         пользователь SSH на TARGET (deploy)
  --project-dir DIR        путь к проекту на обоих серверах (/var/www/loaddevice)
  --repo-url URL           git-репозиторий (https://github.com/regeraq/nagruz.git)
  --branch NAME            ветка для клонирования (main)
  --app-name NAME          имя pm2-процесса (loaddevice)
  --skip-code              не клонировать код на TARGET (если он там уже есть)
  --skip-build             не запускать npm install/build/pm2 на TARGET
  -y, --yes                не задавать подтверждающих вопросов
  -h, --help               показать эту справку

Пример:
  bash scripts/migrate-server.sh \
      --from-host 45.9.72.103 --from-user root \
      --to-host   195.0.0.10  --to-user   deploy \
      --project-dir /var/www/loaddevice
USAGE
}

# -------- Парсинг аргументов --------
while [ $# -gt 0 ]; do
    case "$1" in
        --from-host)    FROM_HOST="$2";    shift 2;;
        --from-user)    FROM_USER="$2";    shift 2;;
        --to-host)      TO_HOST="$2";      shift 2;;
        --to-user)      TO_USER="$2";      shift 2;;
        --project-dir)  PROJECT_DIR="$2";  shift 2;;
        --repo-url)     REPO_URL="$2";     shift 2;;
        --branch)       BRANCH="$2";       shift 2;;
        --app-name)     APP_NAME="$2";     shift 2;;
        --skip-code)    SKIP_CODE="1";     shift;;
        --skip-build)   SKIP_BUILD="1";    shift;;
        -y|--yes)       ASSUME_YES="1";    shift;;
        -h|--help)      usage; exit 0;;
        *) echo "Unknown arg: $1"; usage; exit 1;;
    esac
done

if [ -z "$FROM_HOST" ] || [ -z "$TO_HOST" ]; then
    echo "ERROR: --from-host and --to-host are required."
    usage
    exit 1
fi

FROM_SSH="$FROM_USER@$FROM_HOST"
TO_SSH="$TO_USER@$TO_HOST"

TS="$(date +%Y%m%d-%H%M%S)"
DUMP_REMOTE="/tmp/loaddevice-migrate-$TS.dump"
FILES_REMOTE="/tmp/loaddevice-migrate-files-$TS.tar.gz"
DUMP_LOCAL="/tmp/loaddevice-migrate-$TS.dump"
FILES_LOCAL="/tmp/loaddevice-migrate-files-$TS.tar.gz"

c_red()   { printf '\033[1;31m%s\033[0m\n' "$*"; }
c_green() { printf '\033[1;32m%s\033[0m\n' "$*"; }
c_cyan()  { printf '\033[1;36m%s\033[0m\n' "$*"; }
c_yel()   { printf '\033[1;33m%s\033[0m\n' "$*"; }

confirm() {
    [ "$ASSUME_YES" = "1" ] && return 0
    read -r -p "$1 [y/N]: " ans
    [[ "$ans" =~ ^[Yy]$ ]]
}

c_cyan "=========================================="
c_cyan "  loaddevice migration"
c_cyan "=========================================="
echo "SOURCE : $FROM_SSH : $PROJECT_DIR"
echo "TARGET : $TO_SSH : $PROJECT_DIR"
echo "Branch : $BRANCH (repo: $REPO_URL)"
echo "App    : $APP_NAME"
echo

if ! confirm "Продолжить?"; then
    echo "Отменено."
    exit 0
fi

# -------- Проверка SSH-доступа --------
c_cyan "[0] Проверка SSH-доступа..."
ssh -o BatchMode=yes -o ConnectTimeout=10 "$FROM_SSH" "echo ok" >/dev/null \
    || { c_red "Нет SSH-доступа к $FROM_SSH"; exit 1; }
ssh -o BatchMode=yes -o ConnectTimeout=10 "$TO_SSH" "echo ok" >/dev/null \
    || { c_red "Нет SSH-доступа к $TO_SSH"; exit 1; }
c_green "    OK"

# -------- 1. SOURCE: дамп БД --------
c_cyan "[1] SOURCE: pg_dump..."
# shellcheck disable=SC2087
ssh "$FROM_SSH" bash -s <<REMOTE_SRC
set -euo pipefail
PROJECT_DIR="$PROJECT_DIR"
if [ ! -f "\$PROJECT_DIR/package.json" ] && [ -f "\$PROJECT_DIR/HelloWhoAreYou-1/package.json" ]; then
    PROJECT_DIR="\$PROJECT_DIR/HelloWhoAreYou-1"
fi
cd "\$PROJECT_DIR"
DB_URL="\$(grep -E '^DATABASE_URL=' .env | head -n1 | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"\$//')"
if [ -z "\$DB_URL" ]; then echo "DATABASE_URL empty"; exit 1; fi
pg_dump "\$DB_URL" --no-owner --no-privileges --format=custom --file="$DUMP_REMOTE"
echo "Dump size: \$(du -h "$DUMP_REMOTE" | cut -f1)"
REMOTE_SRC
c_green "    OK: дамп на SOURCE $DUMP_REMOTE"

# -------- 2. SOURCE: архив файлов --------
c_cyan "[2] SOURCE: tar .env + uploads + конфиги..."
# shellcheck disable=SC2087
ssh "$FROM_SSH" bash -s <<REMOTE_TAR
set -euo pipefail
PROJECT_DIR="$PROJECT_DIR"
if [ ! -f "\$PROJECT_DIR/package.json" ] && [ -f "\$PROJECT_DIR/HelloWhoAreYou-1/package.json" ]; then
    PROJECT_DIR="\$PROJECT_DIR/HelloWhoAreYou-1"
fi
tar -czf "$FILES_REMOTE" \
    --ignore-failed-read \
    -C / \
    "\${PROJECT_DIR#/}/.env" \
    "\${PROJECT_DIR#/}/uploads" 2>/dev/null || true

if [ -f /etc/nginx/sites-available/loaddevice ]; then
    tar -rzf "$FILES_REMOTE" -C / "etc/nginx/sites-available/loaddevice" 2>/dev/null || true
fi
echo "Files size: \$(du -h "$FILES_REMOTE" 2>/dev/null | cut -f1 || echo '0')"
REMOTE_TAR
c_green "    OK"

# -------- 3. Перекачиваем на локальную машину + дальше на TARGET --------
c_cyan "[3] Перекачиваем дампы SOURCE -> локально -> TARGET..."
scp "$FROM_SSH:$DUMP_REMOTE"  "$DUMP_LOCAL"
scp "$FROM_SSH:$FILES_REMOTE" "$FILES_LOCAL"
scp "$DUMP_LOCAL"  "$TO_SSH:$DUMP_REMOTE"
scp "$FILES_LOCAL" "$TO_SSH:$FILES_REMOTE"
c_green "    OK"

# -------- 4. TARGET: клонирование кода (если нужно) --------
if [ "$SKIP_CODE" = "0" ]; then
    c_cyan "[4] TARGET: git clone $REPO_URL -> $PROJECT_DIR..."
    # shellcheck disable=SC2087
    ssh "$TO_SSH" bash -s <<REMOTE_CLONE
set -euo pipefail
PROJECT_DIR="$PROJECT_DIR"
if [ -d "\$PROJECT_DIR/.git" ]; then
    echo "Репозиторий уже есть, делаем pull..."
    cd "\$PROJECT_DIR"
    git fetch origin
    git checkout "$BRANCH"
    git reset --hard "origin/$BRANCH"
else
    sudo mkdir -p "\$(dirname "\$PROJECT_DIR")"
    sudo chown "$TO_USER:$TO_USER" "\$(dirname "\$PROJECT_DIR")" 2>/dev/null || true
    git clone --branch "$BRANCH" "$REPO_URL" "\$PROJECT_DIR"
fi
REMOTE_CLONE
    c_green "    OK"
else
    c_yel  "[4] TARGET: пропускаем git clone (--skip-code)."
fi

# -------- 5. TARGET: распаковка файлов --------
c_cyan "[5] TARGET: распаковка .env/uploads/nginx..."
# shellcheck disable=SC2087
ssh "$TO_SSH" bash -s <<REMOTE_UNPACK
set -euo pipefail
sudo tar -xzf "$FILES_REMOTE" -C / 2>&1 | head -n 30
# Исправим права на .env
if [ -f "$PROJECT_DIR/.env" ]; then
    sudo chown "$TO_USER:$TO_USER" "$PROJECT_DIR/.env"
    sudo chmod 600 "$PROJECT_DIR/.env"
fi
# Если есть вложенная папка HelloWhoAreYou-1 — тоже проставим права
if [ -f "$PROJECT_DIR/HelloWhoAreYou-1/.env" ]; then
    sudo chown "$TO_USER:$TO_USER" "$PROJECT_DIR/HelloWhoAreYou-1/.env"
    sudo chmod 600 "$PROJECT_DIR/HelloWhoAreYou-1/.env"
fi
REMOTE_UNPACK
c_green "    OK"

# -------- 6. TARGET: pg_restore --------
c_cyan "[6] TARGET: pg_restore в пустую БД..."
# shellcheck disable=SC2087
ssh "$TO_SSH" bash -s <<REMOTE_RESTORE
set -euo pipefail
PROJECT_DIR="$PROJECT_DIR"
if [ ! -f "\$PROJECT_DIR/package.json" ] && [ -f "\$PROJECT_DIR/HelloWhoAreYou-1/package.json" ]; then
    PROJECT_DIR="\$PROJECT_DIR/HelloWhoAreYou-1"
fi
DB_URL="\$(grep -E '^DATABASE_URL=' "\$PROJECT_DIR/.env" | head -n1 | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"\$//')"
if [ -z "\$DB_URL" ]; then echo "DATABASE_URL empty on TARGET"; exit 1; fi

# --clean --if-exists = заранее DROP'ает объекты перед восстановлением.
pg_restore \
    --dbname="\$DB_URL" \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    "$DUMP_REMOTE" 2>&1 | tail -n 30 || true
echo "pg_restore done."
REMOTE_RESTORE
c_green "    OK"

# -------- 7. TARGET: npm install + build + pm2 --------
if [ "$SKIP_BUILD" = "0" ]; then
    c_cyan "[7] TARGET: npm install, npm run build, pm2 (re)start..."
    # shellcheck disable=SC2087
    ssh "$TO_SSH" bash -s <<REMOTE_BUILD
set -euo pipefail

# Подгружаем nvm в неинтерактивной сессии:
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:\$PATH"
export NVM_DIR="\${NVM_DIR:-\$HOME/.nvm}"
if [ -s "\$NVM_DIR/nvm.sh" ]; then
    . "\$NVM_DIR/nvm.sh" --no-use
    nvm use default >/dev/null 2>&1 || nvm use --lts >/dev/null 2>&1 || true
fi
command -v npm >/dev/null || { echo "npm not found on TARGET"; exit 1; }

PROJECT_DIR="$PROJECT_DIR"
if [ ! -f "\$PROJECT_DIR/package.json" ] && [ -f "\$PROJECT_DIR/HelloWhoAreYou-1/package.json" ]; then
    PROJECT_DIR="\$PROJECT_DIR/HelloWhoAreYou-1"
fi
cd "\$PROJECT_DIR"

npm install
npm run build
npm run db:push || true   # migrations (на случай если в дампе нет новых таблиц из кода)

if ! command -v pm2 >/dev/null; then
    npm install -g pm2
fi

if pm2 list | grep -q "$APP_NAME"; then
    pm2 restart "$APP_NAME" --update-env
else
    if [ -f ecosystem.config.cjs ]; then
        pm2 start ecosystem.config.cjs
    else
        pm2 start dist/index.js --name "$APP_NAME" --cwd "\$PROJECT_DIR"
    fi
    pm2 save
fi
pm2 status
REMOTE_BUILD
    c_green "    OK"
else
    c_yel  "[7] TARGET: пропущено (--skip-build). Сборку и pm2 запусти вручную."
fi

# -------- 8. Чистим временные файлы --------
c_cyan "[8] Очистка временных файлов..."
ssh "$FROM_SSH" "rm -f $DUMP_REMOTE $FILES_REMOTE" || true
ssh "$TO_SSH"   "rm -f $DUMP_REMOTE $FILES_REMOTE" || true
rm -f "$DUMP_LOCAL" "$FILES_LOCAL" || true
c_green "    OK"

echo
c_green "=========================================="
c_green "  МИГРАЦИЯ ЗАВЕРШЕНА."
c_green "=========================================="
cat <<SUMMARY

Следующие шаги:
  1. Убедись, что сайт работает на новом сервере:
       curl -I http://$TO_HOST
       curl http://$TO_HOST/api/products   # через HTTP, напрямую по IP
  2. На TARGET настрой nginx-конфиг, получи SSL:
       sudo nginx -t && sudo systemctl reload nginx
       sudo certbot --nginx -d твой-домен.ru -d www.твой-домен.ru
  3. В ЛК регистратора домена поменяй A-запись на IP TARGET ($TO_HOST).
  4. Подожди 5-30 мин, проверь https://твой-домен.ru.
  5. Остановить приложение на SOURCE, чтобы не было двойной записи:
       ssh $FROM_SSH "pm2 stop $APP_NAME"

SUMMARY
