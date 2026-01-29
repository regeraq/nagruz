# 🔧 ИСПРАВЛЕНИЕ ПРОБЛЕМЫ С ЛОГИНОМ

## ❌ Проблема:
Не могу зайти в админ аккаунт - выдает сообщение "Ваш аккаунт заблокирован".

## ✅ Исправления:

### 1. Добавлена проверка `isBlocked` в роут логина
В файле `server/routes.ts` добавлена проверка перед проверкой пароля:

```typescript
// Check if user is blocked
if (user.isBlocked) {
  res.status(403).json({ 
    success: false, 
    message: "Ваш аккаунт заблокирован. Обратитесь в поддержку." 
  });
  return;
}
```

### 2. Исправлена настройка CSRF cookie
В файле `server/csrf.ts` изменен флаг `secure`:

```typescript
secure: false, // Changed from process.env.NODE_ENV === 'production' to allow HTTP
```

Это позволяет CSRF токенам работать по HTTP (без HTTPS).

---

## 🔄 Обновление на сервере:

После загрузки изменений на GitHub, обновите сервер:

```bash
ssh root@45.9.72.103
cd /var/www/loaddevice
git pull origin main
npm run build
pm2 restart loaddevice
```

### Или одной командой:

```bash
ssh root@45.9.72.103 "cd /var/www/loaddevice && git pull origin main && npm run build && pm2 restart loaddevice && pm2 logs loaddevice --lines 20"
```

---

## 🔍 Если проблема сохраняется:

### Проверьте статус пользователя в БД:

```bash
ssh root@45.9.72.103
sudo -u postgres psql -d loaddevice_db -c "SELECT email, role, is_blocked FROM users WHERE email = 'rostext@gmail.com';"
```

### Разблокируйте аккаунт (если нужно):

```bash
sudo -u postgres psql -d loaddevice_db -c "UPDATE users SET is_blocked = false WHERE email = 'rostext@gmail.com';"
pm2 restart loaddevice
```

---

## ✅ После исправления:

1. Проверьте логи PM2:
   ```bash
   pm2 logs loaddevice --lines 30
   ```

2. Попробуйте войти в админ аккаунт:
   - Email: `rostext@gmail.com`
   - Password: `125607`

3. Если все еще не работает, проверьте:
   - CSRF токены в браузере (DevTools → Application → Cookies)
   - Логи сервера на наличие ошибок


