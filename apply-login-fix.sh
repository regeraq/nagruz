#!/bin/bash
# Скрипт для применения исправлений логина на сервере

cd /var/www/loaddevice

# Применяем исправления напрямую в файлах на сервере

# 1. Исправляем server/routes.ts - добавляем проверку isBlocked
sed -i '/const user = await storage.getUserByEmail(email);/,/const passwordHash = user.passwordHash || user.password;/ {
  /const user = await storage.getUserByEmail(email);/a\
\
      // Check if user is blocked\
      if (user.isBlocked) {\
        res.status(403).json({ \
          success: false, \
          message: "Ваш аккаунт заблокирован. Обратитесь в поддержку." \
        });\
        return;\
      }
}' server/routes.ts

# 2. Исправляем server/csrf.ts - меняем secure на false
sed -i 's/secure: process.env.NODE_ENV === '\''production'\''/secure: false/' server/csrf.ts

# Пересобираем проект
npm run build

# Перезапускаем приложение
pm2 restart loaddevice

echo "✅ Исправления применены!"


