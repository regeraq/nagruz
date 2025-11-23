# 🚀 Руководство по Внедрению Улучшений

## Шаги по внедрению исправлений

### 1. Установка дополнительных зависимостей (опционально, для production)

Для production рекомендуется использовать Redis для rate limiting и кэширования:

```bash
npm install express-rate-limit ioredis
npm install --save-dev @types/express-rate-limit
```

### 2. Замена файлов

#### Вариант A: Постепенное внедрение (рекомендуется)

1. Скопируйте содержимое `server/security.ts` в проект
2. Скопируйте содержимое `server/rateLimiter.ts` в проект  
3. Скопируйте содержимое `server/cache.ts` в проект
4. Примените изменения из `server/index.FIXED.ts` к `server/index.ts`
5. Примените изменения из `server/routes.FIXED.ts` к `server/routes.ts`

#### Вариант B: Прямая замена (для тестирования)

```bash
# Создайте резервные копии
cp server/index.ts server/index.backup.ts
cp server/routes.ts server/routes.backup.ts

# Замените файлы
cp server/index.FIXED.ts server/index.ts
cp server/routes.FIXED.ts server/routes.ts
```

### 3. Исправление клиентского кода

В файле `client/src/components/payment-modal.tsx`:

**Найдите (строка ~197):**
```typescript
setTimeout(() => {
  createOrderMutation.mutate(orderData);
}, 1500);
```

**Замените на:**
```typescript
createOrderMutation.mutate(orderData);
```

### 4. Исправление обработчика скролла

В файле `client/src/pages/home.tsx`:

**Найдите (строка ~100):**
```typescript
return () => window.removeEventListener("scroll", handleScroll);
```

**Замените на:**
```typescript
return () => {
  window.removeEventListener("scroll", handleScroll);
};
```

### 5. Настройка переменных окружения

Добавьте в `.env` файл (если еще не добавлено):

```env
NODE_ENV=production
PORT=5000
RESEND_API_KEY=your_key_here
OWNER_EMAIL=owner@example.com
DATABASE_URL=your_database_url
```

### 6. Для production с Redis

Если используете Redis для rate limiting:

1. Установите Redis:
```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis

# Docker
docker run -d -p 6379:6379 redis:alpine
```

2. Обновите `server/rateLimiter.ts`:
```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export const rateLimiters = {
  contact: rateLimit({
    store: new RedisStore({
      client: redis,
      prefix: 'rl:contact:',
    }),
    windowMs: 60 * 1000,
    max: 5,
    message: 'Слишком много запросов. Пожалуйста, попробуйте позже.',
  }),
  // ... остальные лимитеры
};
```

3. Обновите `server/cache.ts` для использования Redis:
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export const cache = {
  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    await redis.setex(key, Math.floor(ttlMs / 1000), JSON.stringify(value));
  },
  
  async get<T>(key: string): Promise<T | undefined> {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : undefined;
  },
  
  async delete(key: string): Promise<void> {
    await redis.del(key);
  },
};
```

## Тестирование

### 1. Проверка rate limiting

```bash
# Установите Apache Bench или используйте curl
# Тест контактной формы (должен вернуть 429 после 5 запросов)
for i in {1..10}; do
  curl -X POST http://localhost:5000/api/contact \
    -H "Content-Type: application/json" \
    -d '{"name":"Test","email":"test@test.com","phone":"1234567890","company":"Test","message":"Test message"}'
  echo ""
done
```

### 2. Проверка кэширования

```bash
# Первый запрос - должен быть медленным (внешний API)
time curl http://localhost:5000/api/crypto-rates

# Второй запрос - должен быть быстрым (из кэша)
time curl http://localhost:5000/api/crypto-rates
```

### 3. Проверка XSS защиты

Попробуйте отправить форму с HTML в сообщении:
```json
{
  "name": "<script>alert('XSS')</script>",
  "email": "test@test.com",
  "phone": "1234567890",
  "company": "Test",
  "message": "<img src=x onerror=alert(1)>"
}
```

HTML должен быть экранирован в email.

## Мониторинг

### Логирование

Все ошибки теперь логируются с полной информацией на сервере, но безопасными сообщениями для клиента.

### Метрики

Для production рекомендуется добавить:
- Prometheus для метрик
- Sentry для отслеживания ошибок
- Winston/Pino для структурированного логирования

## Откат изменений

Если что-то пошло не так:

```bash
# Восстановите резервные копии
cp server/index.backup.ts server/index.ts
cp server/routes.backup.ts server/routes.ts
```

## Дополнительные рекомендации

1. **HTTPS**: Обязательно используйте HTTPS в production
2. **Helmet**: Добавьте `helmet` middleware для дополнительной безопасности
3. **CORS**: Настройте конкретные домены вместо `*` в production
4. **Database**: Перейдите с MemStorage на реальную БД (PostgreSQL)
5. **Queue**: Используйте очередь задач (Bull/BullMQ) для отправки email
6. **Monitoring**: Настройте мониторинг и алерты


