# 🔐 Руководство по безопасной настройке

## Обязательные переменные окружения

Перед запуском в production необходимо настроить следующие переменные окружения.

### 1. JWT_SECRET (КРИТИЧНО!)

**Требования:**
- Минимум 32 символа
- Случайная строка
- Уникальна для каждого окружения

**Генерация:**
```bash
# Linux/MacOS
openssl rand -base64 32

# PowerShell (Windows)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }) -as [byte[]])

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**⚠️ БЕЗ ЭТОЙ ПЕРЕМЕННОЙ СЕРВЕР НЕ ЗАПУСТИТСЯ В PRODUCTION!**

---

### 2. DATABASE_URL

Строка подключения к PostgreSQL:
```
DATABASE_URL=postgresql://user:password@host:port/database
```

**Рекомендации:**
- Используйте сложный пароль (16+ символов)
- Не используйте пользователя postgres
- Ограничьте доступ к БД по IP

---

### 3. Настройка администратора (опционально)

```env
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_INITIAL_PASSWORD=YourSecurePassword123!
```

**Требования к паролю:**
- Минимум 12 символов
- Смените сразу после первого входа!

Если переменные не указаны:
- Администратор не создается автоматически
- В консоль выводится инструкция по ручному созданию

---

### 4. Настройки Email (Resend)

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
OWNER_EMAIL=notifications@yourdomain.com
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

**Важно:** Для отправки на внешние email нужна верификация домена в Resend.

---

## Пример .env файла

Создайте файл `.env` в корне проекта:

```env
# База данных
DATABASE_URL=postgresql://loaddevice_user:SecurePassword123@localhost:5432/loaddevice_db

# JWT (ОБЯЗАТЕЛЬНО для production!)
JWT_SECRET=ваш-супер-секретный-ключ-минимум-32-символа

# Администратор
ADMIN_EMAIL=admin@example.com
ADMIN_INITIAL_PASSWORD=SecureAdminPassword!123

# Email
RESEND_API_KEY=re_xxxxxxxxxxxx
OWNER_EMAIL=owner@example.com

# Сервер
NODE_ENV=production
PORT=5000
```

---

## Чеклист безопасности перед деплоем

### Обязательно:
- [ ] JWT_SECRET установлен (минимум 32 символа)
- [ ] DATABASE_URL указывает на защищенную БД
- [ ] NODE_ENV=production
- [ ] HTTPS настроен (SSL сертификат)
- [ ] .env файл НЕ в git репозитории

### Рекомендуется:
- [ ] Настроен reverse proxy (nginx)
- [ ] Включен firewall
- [ ] Настроены бэкапы БД
- [ ] Мониторинг ошибок (Sentry)
- [ ] Cloudflare или WAF для защиты от DDoS

---

## Изменения в безопасности (версия текущая)

1. **initAdmin.ts**: Учетные данные админа теперь из переменных окружения
2. **auth.ts**: JWT_SECRET обязателен в production (сервер не запустится без него)
3. **csrf.ts**: Secure cookies включены в production
4. **routes.ts**: Добавлена защита от brute force на логин
5. **routes.ts**: Экспорт БД защищен белым списком таблиц

---

## Поддержка

При возникновении вопросов по безопасности:
1. Проверьте логи сервера
2. Убедитесь, что все переменные окружения установлены
3. Проверьте, что файл .env не закоммичен в git








