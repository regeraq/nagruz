#!/bin/bash
# Восстановление loaddevice из резервной копии, созданной scripts/backup.sh.
#
# ВНИМАНИЕ: операция ДЕСТРУКТИВНАЯ — перезаписывает текущую базу данных.
# Скрипт требует явного подтверждения словом RESTORE.
#
# Использование:
#   # посмотреть доступные копии
#   bash scripts/restore.sh --list
#
#   # восстановить БД из конкретного дампа
#   bash scripts/restore.sh --db /var/backups/loaddevice/loaddevice-db-20260807-033000.dump
#
#   # восстановить файлы (.env, uploads, nginx-конфиг)
#   bash scripts/restore.sh --files /var/backups/loaddevice/loaddevice-files-20260807-033000.tar.gz
#
#   # восстановить самые свежие копии обоих типов
#   bash scripts/restore.sh --latest

set -euo pipefail

if [ -f /etc/loaddevice-backup.env ]; then
    # shellcheck disable=SC1091
    . /etc/loaddevice-backup.env
fi

PROJECT_DIR="${PROJECT_DIR:-/var/www/loaddevice}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/loaddevice}"

if [ ! -f "$PROJECT_DIR/package.json" ] && [ -f "$PROJECT_DIR/HelloWhoAreYou-1/package.json" ]; then
    PROJECT_DIR="$PROJECT_DIR/HelloWhoAreYou-1"
fi

usage() {
    sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
}

list_backups() {
    echo "Доступные копии в $BACKUP_DIR:"
    echo ""
    echo "--- Дампы базы данных ---"
    ls -1sh "$BACKUP_DIR"/loaddevice-db-*.dump 2>/dev/null || echo "  (нет)"
    echo ""
    echo "--- Архивы файлов ---"
    ls -1sh "$BACKUP_DIR"/loaddevice-files-*.tar.gz 2>/dev/null || echo "  (нет)"
}

confirm() {
    echo ""
    echo "⚠️  $1"
    echo -n "Введите RESTORE для подтверждения: "
    read -r answer
    if [ "$answer" != "RESTORE" ]; then
        echo "Отменено."
        exit 1
    fi
}

get_database_url() {
    local env_file="$PROJECT_DIR/.env"
    if [ ! -f "$env_file" ]; then
        echo "[restore] ERROR: $env_file не найден. Сначала восстановите файлы (--files)." >&2
        exit 1
    fi
    grep -E '^DATABASE_URL=' "$env_file" | head -n1 | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"$//'
}

restore_db() {
    local dump="$1"
    [ -f "$dump" ] || { echo "[restore] ERROR: $dump не найден" >&2; exit 1; }

    local db_url
    db_url="$(get_database_url)"
    [ -n "$db_url" ] || { echo "[restore] ERROR: DATABASE_URL пуст" >&2; exit 1; }

    confirm "Текущая база будет ПОЛНОСТЬЮ ЗАМЕНЕНА данными из $(basename "$dump")."

    # Страховочный дамп текущего состояния — на случай, если восстанавливаем
    # не ту копию. Без него ошибка оператора необратима.
    local safety="$BACKUP_DIR/pre-restore-$(date +%Y%m%d-%H%M%S).dump"
    echo "[restore] Страховочный дамп текущей БД -> $safety"
    pg_dump "$db_url" --no-owner --no-privileges --format=custom --file="$safety" \
        || echo "[restore] ⚠️  Страховочный дамп не удался (возможно, БД пуста) — продолжаем"

    echo "[restore] Останавливаем приложение, чтобы оно не писало в БД во время восстановления..."
    pm2 stop loaddevice >/dev/null 2>&1 || echo "[restore] (pm2-процесс не найден, пропускаем)"

    echo "[restore] Восстановление из $dump ..."
    # --clean --if-exists удаляет существующие объекты перед созданием;
    # без него восстановление падает на конфликтах имён.
    pg_restore \
        --clean --if-exists \
        --no-owner --no-privileges \
        --dbname="$db_url" \
        "$dump" || echo "[restore] ⚠️  pg_restore завершился с предупреждениями (обычно это нормально для --clean)"

    echo "[restore] Приводим схему к текущему коду (миграции)..."
    (cd "$PROJECT_DIR" && npm run db:migrate) || echo "[restore] ⚠️  Миграции не применились — проверьте вручную"

    echo "[restore] Запускаем приложение..."
    pm2 start ecosystem.config.cjs >/dev/null 2>&1 || pm2 restart loaddevice >/dev/null 2>&1 || true

    echo "[restore] ✅ База восстановлена. Страховочная копия: $safety"
}

restore_files() {
    local archive="$1"
    [ -f "$archive" ] || { echo "[restore] ERROR: $archive не найден" >&2; exit 1; }

    confirm "Файлы (.env, uploads, nginx-конфиг) будут перезаписаны из $(basename "$archive")."

    if [ -f "$PROJECT_DIR/.env" ]; then
        cp "$PROJECT_DIR/.env" "$PROJECT_DIR/.env.before-restore-$(date +%Y%m%d-%H%M%S)"
        echo "[restore] Текущий .env сохранён рядом с суффиксом .before-restore-*"
    fi

    echo "[restore] Распаковка архива в / ..."
    tar -xzf "$archive" -C /
    chmod 600 "$PROJECT_DIR/.env" 2>/dev/null || true

    echo "[restore] ✅ Файлы восстановлены."
    echo "[restore] Если менялся nginx-конфиг: sudo nginx -t && sudo systemctl reload nginx"
}

restore_latest() {
    local latest_db latest_files
    latest_db="$(ls -1t "$BACKUP_DIR"/loaddevice-db-*.dump 2>/dev/null | head -n1 || true)"
    latest_files="$(ls -1t "$BACKUP_DIR"/loaddevice-files-*.tar.gz 2>/dev/null | head -n1 || true)"

    [ -n "$latest_files" ] && restore_files "$latest_files"
    [ -n "$latest_db" ] && restore_db "$latest_db"

    if [ -z "$latest_db" ] && [ -z "$latest_files" ]; then
        echo "[restore] ERROR: в $BACKUP_DIR нет ни одной копии" >&2
        exit 1
    fi
}

case "${1:-}" in
    --list)   list_backups ;;
    --db)     restore_db "${2:?укажите путь к .dump}" ;;
    --files)  restore_files "${2:?укажите путь к .tar.gz}" ;;
    --latest) restore_latest ;;
    *)        usage ;;
esac
