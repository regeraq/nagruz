#!/bin/bash
# Резервное копирование проекта loaddevice.
# Делает дамп PostgreSQL + архивирует критические файлы, хранит N последних копий.
#
# Запуск вручную:
#   bash /var/www/loaddevice/scripts/backup.sh
#
# Автоматически через cron (раз в сутки в 03:30 МСК):
#   30 3 * * * /bin/bash /var/www/loaddevice/scripts/backup.sh >> /var/log/loaddevice-backup.log 2>&1
#
# Настраивается через переменные окружения (можно положить в /etc/loaddevice-backup.env):
#   PROJECT_DIR    = /var/www/loaddevice
#   BACKUP_DIR     = /var/backups/loaddevice
#   KEEP_DAYS      = 14          (хранить бэкапы за последние N дней)
#   KEEP_MIN       = 7           (минимум файлов каждого типа, даже если они старше KEEP_DAYS)

set -euo pipefail

# -------- Подгружаем настройки --------
if [ -f /etc/loaddevice-backup.env ]; then
    # shellcheck disable=SC1091
    . /etc/loaddevice-backup.env
fi

PROJECT_DIR="${PROJECT_DIR:-/var/www/loaddevice}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/loaddevice}"
KEEP_DAYS="${KEEP_DAYS:-14}"
KEEP_MIN="${KEEP_MIN:-7}"

# Найти корень проекта (если проект внутри подпапки)
if [ ! -f "$PROJECT_DIR/package.json" ] && [ -f "$PROJECT_DIR/HelloWhoAreYou-1/package.json" ]; then
    PROJECT_DIR="$PROJECT_DIR/HelloWhoAreYou-1"
fi

if [ ! -f "$PROJECT_DIR/package.json" ]; then
    echo "[backup] ERROR: $PROJECT_DIR/package.json not found"
    exit 1
fi

# Читаем DATABASE_URL из .env проекта
ENV_FILE="$PROJECT_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "[backup] ERROR: $ENV_FILE not found"
    exit 1
fi

DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -n1 | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"$//')"
if [ -z "$DATABASE_URL" ]; then
    echo "[backup] ERROR: DATABASE_URL is empty in $ENV_FILE"
    exit 1
fi

mkdir -p "$BACKUP_DIR"
TS="$(date +%Y%m%d-%H%M%S)"

echo "=========================================="
echo "  BACKUP loaddevice @ $TS"
echo "=========================================="

# -------- 1. Дамп PostgreSQL --------
DB_FILE="$BACKUP_DIR/loaddevice-db-$TS.dump"
echo "[backup] pg_dump -> $DB_FILE"
pg_dump "$DATABASE_URL" \
    --no-owner \
    --no-privileges \
    --format=custom \
    --file="$DB_FILE"
DB_SIZE="$(du -h "$DB_FILE" | cut -f1)"
echo "[backup] DB dump size: $DB_SIZE"

# -------- 2. Архив файлов --------
FILES_FILE="$BACKUP_DIR/loaddevice-files-$TS.tar.gz"
echo "[backup] tar -> $FILES_FILE"
tar -czf "$FILES_FILE" \
    --ignore-failed-read \
    -C / \
    "${PROJECT_DIR#/}/.env" \
    "${PROJECT_DIR#/}/uploads" 2>/dev/null || true

# nginx и pm2 конфиги (если есть)
NGINX_CONF="/etc/nginx/sites-available/loaddevice"
if [ -f "$NGINX_CONF" ]; then
    tar -rzf "$FILES_FILE" -C / "${NGINX_CONF#/}" 2>/dev/null || true
fi

FILES_SIZE="$(du -h "$FILES_FILE" 2>/dev/null | cut -f1 || echo '0')"
echo "[backup] Files archive size: $FILES_SIZE"

# -------- 3. Ротация старых бэкапов --------
# Удаляем всё, что старше KEEP_DAYS, но оставляем минимум KEEP_MIN свежих каждого типа.
rotate() {
    local pattern="$1"
    local total
    total="$(find "$BACKUP_DIR" -maxdepth 1 -name "$pattern" | wc -l)"
    if [ "$total" -le "$KEEP_MIN" ]; then
        echo "[backup] Rotate skip ($pattern): only $total files, keeping all."
        return
    fi
    # Кандидаты на удаление — старше KEEP_DAYS дней:
    mapfile -t old < <(find "$BACKUP_DIR" -maxdepth 1 -name "$pattern" -mtime +"$KEEP_DAYS" | sort)
    # Оставляем минимум KEEP_MIN — значит можем удалить (total - KEEP_MIN) штук максимум:
    local max_delete=$((total - KEEP_MIN))
    local deleted=0
    for f in "${old[@]}"; do
        [ "$deleted" -ge "$max_delete" ] && break
        rm -f -- "$f"
        echo "[backup] Rotated: $(basename "$f")"
        deleted=$((deleted + 1))
    done
}
rotate "loaddevice-db-*.dump"
rotate "loaddevice-files-*.tar.gz"

# -------- 4. Итог --------
echo ""
echo "[backup] Current backups:"
ls -1sh "$BACKUP_DIR" | tail -n +2
TOTAL_USED="$(du -sh "$BACKUP_DIR" | cut -f1)"
echo ""
echo "[backup] Total backup folder size: $TOTAL_USED"
echo "[backup] DONE at $(date +'%Y-%m-%d %H:%M:%S %Z')"
