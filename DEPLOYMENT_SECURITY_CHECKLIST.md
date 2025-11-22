# 🚀 ЧЕКЛИСТ БЕЗОПАСНОСТИ ПЕРЕД PRODUCTION

## ✅ ОБЯЗАТЕЛЬНЫЕ ДЕЙСТВИЯ

### 1. Rate Limiting
- [ ] Установить `express-rate-limit`
- [ ] Настроить лимиты для каждого endpoint'а
- [ ] Добавить блокировку после N ошибок

### 2. CORS & Security Headers
- [ ] Установить `cors` пакет
- [ ] Установить `helmet` для security headers
- [ ] Настроить whitelist domains
- [ ] Добавить X-Frame-Options: DENY
- [ ] Добавить X-Content-Type-Options: nosniff

### 3. Input Validation
- [ ] Проверить все Zod schemas
- [ ] Добавить max length ограничения
- [ ] Добавить regex для безопасных символов
- [ ] Валидировать file extensions

### 4. Email Security
- [ ] Экранировать все user inputs в HTML
- [ ] Использовать функцию escapeHtml()
- [ ] Проверять email перед отправкой
- [ ] Маскировать email в логах

### 5. Authorization
- [ ] Добавить middleware для проверки авторизации
- [ ] Защитить GET /api/contact
- [ ] Защитить GET /api/orders
- [ ] Использовать API tokens или Sessions

### 6. Logging & Monitoring
- [ ] Логировать все POST requests с IP
- [ ] НЕ логировать чувствительные данные (PII)
- [ ] Настроить alerts при подозрительной активности
- [ ] Ротировать логи ежедневно

### 7. Database
- [ ] Мигрировать с MemStorage на PostgreSQL
- [ ] Добавить индексы на часто используемые поля
- [ ] Настроить резервные копии
- [ ] Шифровать sensitive данные

### 8. Environment Variables
- [ ] Переместить все secrets в .env
- [ ] Использовать разные keys для production/dev
- [ ] НЕ коммитить .env файл
- [ ] Регулярно ротировать API keys

## 📋 КОМАНДЫ ДЛЯ УСТАНОВКИ

```bash
# Безопасность
npm install express-rate-limit cors helmet express-mongo-sanitize

# Optional: Email verification
npm install nodemailer

# Optional: CAPTCHA
npm install hcaptcha
```

## 🔐 ПРИМЕРЫ КОНФИГУРАЦИИ

### Rate Limiting
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // 100 requests per windowMs
  message: 'Слишком много запросов, попробуйте позже'
});

app.use('/api/', limiter);
```

### CORS
```javascript
import cors from 'cors';

app.use(cors({
  origin: ['https://yourdomain.com', 'https://www.yourdomain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH'],
}));
```

### Security Headers
```javascript
import helmet from 'helmet';

app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
  }
}));
```

## 🔍 ТЕСТИРОВАНИЕ БЕЗОПАСНОСТИ

```bash
# Проверить на известные уязвимости
npm audit

# Проверить на XSS
curl -X POST http://localhost:5000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"<script>alert(1)</script>","email":"test@test.com","phone":"1234567890","company":"test","message":"test"}'

# Проверить rate limiting
for i in {1..20}; do curl http://localhost:5000/api/crypto-rates; done
```

## 📊 COMPLIANCE

- [ ] GDPR: Защита PII данных
- [ ] PCI DSS: Если принимаете платежи
- [ ] HTTPS: Только HTTPS в production
- [ ] Data Retention: Удалять старые данные

