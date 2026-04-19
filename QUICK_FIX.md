# 🚨 БЫСТРОЕ ИСПРАВЛЕНИЕ ПРОБЛЕМЫ С ВХОДОМ

## Ваш сайт: http://45.9.72.103 (HTTP, не HTTPS)

## Шаг 1: Разблокировать пользователей в базе данных

**Это самая вероятная причина проблемы!**

Подключитесь к вашей PostgreSQL базе данных и выполните:

```sql
-- Разблокировать ВСЕХ пользователей
UPDATE users SET is_blocked = false WHERE is_blocked = true;

-- Проверить результат
SELECT email, role, is_blocked FROM users;
```

**Как подключиться:**
```bash
# Если PostgreSQL на том же сервере
psql -U loaddevice_user -d loaddevice_db

# Или через SSH
ssh your-user@45.9.72.103
psql -U loaddevice_user -d loaddevice_db
```

---

## Шаг 2: Перезапустить сервер

После изменения БД перезапустите сервер:

```bash
# Если используете PM2
pm2 restart all

# Или если запускаете напрямую
# Остановите текущий процесс (Ctrl+C) и запустите снова
npm run start
```

---

## Шаг 3: Проверить переменные окружения

Убедитесь, что в `.env` файле:

```env
# Для HTTP сайта (без HTTPS) НЕ устанавливайте:
# FORCE_SECURE_COOKIES=true  ❌

# Оставьте пустым или установите:
FORCE_SECURE_COOKIES=false  ✅

# Или просто не указывайте эту переменную
```

---

## Шаг 4: Очистить кэш браузера

1. Откройте DevTools (F12)
2. Перейдите на вкладку Application/Storage
3. Очистите Cookies для `45.9.72.103`
4. Обновите страницу (Ctrl+F5)

---

## Диагностика

### Проверьте статус пользователя:

Откройте в браузере:
```
http://45.9.72.103/api/debug/user-status/rostext@gmail.com
```

Должно показать:
```json
{
  "success": true,
  "user": {
    "email": "rostext@gmail.com",
    "isBlocked": false,  ← Должно быть false!
    "role": "superadmin"
  }
}
```

Если `isBlocked: true` - выполните Шаг 1.

---

## Если не помогло

### Проверьте логи сервера:

При попытке входа должны быть строки:
```
[Login] User found: email@example.com, isBlocked: false, role: admin
```

Если видите `isBlocked: true` - пользователь заблокирован в БД.

### Проверьте CSRF токен:

В консоли браузера (F12 → Console):
```javascript
// Проверить наличие CSRF токена
document.cookie.split(';').find(c => c.includes('csrf-token'))
```

Должен вернуть что-то вроде: `csrf-token=abc123...`

---

## Важно!

После исправления **удалите** временный эндпоинт `/api/debug/user-status/:email` из `server/routes.ts` для безопасности.

---

## Контакты для помощи

Если проблема не решена:
1. Проверьте логи сервера на ошибки
2. Убедитесь, что база данных доступна
3. Проверьте, что все переменные окружения установлены








