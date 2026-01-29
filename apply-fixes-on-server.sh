#!/bin/bash
# Скрипт для применения исправлений на сервере

cd /var/www/loaddevice

echo "🔧 Применение исправлений..."

# 1. Исправляем routes.ts - добавляем проверку isBlocked
# Используем Python для более надежной замены
python3 << 'PYTHON'
import re

with open('/var/www/loaddevice/server/routes.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Проверяем, есть ли уже проверка isBlocked
if 'if (user.isBlocked)' not in content:
    # Ищем паттерн: const user = ... if (!user) ... const passwordHash
    pattern = r'(const user = await storage\.getUserByEmail\(email\);)\s+(if \(!user\) \{[^}]+\} return;)\s+(const passwordHash = user\.passwordHash \|\| user\.password;)'
    
    replacement = r'''\1
      \2

      // Check if user is blocked
      if (user.isBlocked) {
        res.status(403).json({ 
          success: false, 
          message: "Ваш аккаунт заблокирован. Обратитесь в поддержку." 
        });
        return;
      }

      \3'''
    
    new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    with open('/var/www/loaddevice/server/routes.ts', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("✅ routes.ts исправлен - добавлена проверка isBlocked")
else:
    print("✅ routes.ts уже содержит проверку isBlocked")
PYTHON

# 2. Исправляем csrf.ts
if grep -q "secure: process.env.NODE_ENV === 'production'" server/csrf.ts; then
    sed -i "s/secure: process.env.NODE_ENV === 'production'/secure: false \/\/ Changed to allow HTTP connections/" server/csrf.ts
    echo "✅ csrf.ts исправлен - secure установлен в false"
else
    echo "✅ csrf.ts уже исправлен"
fi

echo ""
echo "🔨 Пересборка проекта..."
npm run build

echo ""
echo "🔄 Перезапуск приложения..."
pm2 restart loaddevice

echo ""
echo "📊 Статус приложения:"
pm2 status

echo ""
echo "📋 Последние логи:"
pm2 logs loaddevice --lines 20 --nostream

echo ""
echo "✅ Готово! Исправления применены."


