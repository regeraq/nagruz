# РУКОВОДСТВО ПО БАЗЕ ДАННЫХ

Полное руководство по структуре, работе и управлению базой данных проекта "Нагрузочные устройства".

---

## ОБЩАЯ ИНФОРМАЦИЯ

### Технологии
- **СУБД:** PostgreSQL 14+
- **ORM:** Drizzle ORM
- **Миграции:** SQL файлы + Drizzle Kit

### Строка подключения
```
postgresql://loaddevice_user:loaddevice123@localhost:5432/loaddevice_db
```

**Формат:** `postgresql://[пользователь]:[пароль]@[хост]:[порт]/[база_данных]`

---

## СТРУКТУРА БАЗЫ ДАННЫХ

База данных состоит из **18 таблиц**, организованных по функциональным областям.

### 1. ПОЛЬЗОВАТЕЛИ И АУТЕНТИФИКАЦИЯ

#### Таблица: `users`
Хранение информации о пользователях.

**Ключевые поля:**
- `id` - уникальный идентификатор (VARCHAR, PRIMARY KEY)
- `email` - email пользователя (VARCHAR, UNIQUE, NOT NULL)
- `password_hash` - хеш пароля (TEXT)
- `first_name`, `last_name` - имя и фамилия (VARCHAR)
- `phone` - телефон (VARCHAR)
- `role` - роль: user, moderator, admin, superadmin (VARCHAR, CHECK)
- `is_email_verified`, `is_phone_verified` - статусы верификации (BOOLEAN)
- `is_blocked`, `is_deleted` - флаги блокировки и удаления (BOOLEAN)
- `created_at`, `updated_at` - временные метки (TIMESTAMPTZ)

**Индексы:**
- `users_email_idx` (UNIQUE) - быстрый поиск по email
- `users_phone_idx` - поиск по телефону
- `users_role_idx` - фильтрация по роли
- `users_is_blocked_idx`, `users_is_deleted_idx` - фильтрация по статусу

**Ограничения:**
- `role` может быть только: 'user', 'moderator', 'admin', 'superadmin'
- `email` уникален

#### Таблица: `sessions`
Хранение сессий пользователей (JWT refresh токены).

**Ключевые поля:**
- `id` - уникальный идентификатор сессии
- `user_id` - ID пользователя (FOREIGN KEY → users.id, CASCADE)
- `refresh_token` - refresh токен (TEXT, UNIQUE)
- `expires_at` - срок действия (TIMESTAMPTZ)
- `ip_address`, `user_agent` - информация о подключении

**Индексы:**
- `sessions_refresh_token_idx` (UNIQUE) - поиск по токену
- `sessions_user_id_idx` - поиск по пользователю
- `sessions_expires_at_idx` - очистка истекших сессий

#### Таблица: `login_attempts`
Логирование попыток входа (защита от brute force).

**Ключевые поля:**
- `id` - уникальный идентификатор
- `email` - email (VARCHAR)
- `ip_address` - IP адрес (VARCHAR)
- `success` - успешность попытки (BOOLEAN)
- `created_at` - время попытки (TIMESTAMPTZ)

**Индексы:**
- `login_attempts_email_idx` - поиск по email
- `login_attempts_ip_address_idx` - поиск по IP
- `login_attempts_email_ip_idx` - комбинированный поиск

---

### 2. ТОВАРЫ И ЗАКАЗЫ

#### Таблица: `products`
Хранение информации о товарах (нагрузочных устройствах).

**Ключевые поля:**
- `id` - уникальный идентификатор товара (VARCHAR, PRIMARY KEY)
- `name` - название товара (TEXT)
- `description` - описание (TEXT)
- `price` - цена (DECIMAL(12,2), CHECK >= 0)
- `currency` - валюта (VARCHAR, по умолчанию 'RUB')
- `sku` - артикул (VARCHAR, UNIQUE)
- `specifications` - характеристики (TEXT)
- `stock` - количество на складе (INTEGER, CHECK >= 0)
- `category` - категория (VARCHAR)
- `image_url` - главное изображение (TEXT, устаревшее)
- `images` - массив изображений (JSONB)
- `is_active` - активен ли товар (BOOLEAN)
- `created_at`, `updated_at` - временные метки

**Индексы:**
- `products_sku_idx` (UNIQUE) - поиск по артикулу
- `products_category_idx` - фильтрация по категории
- `products_is_active_idx` - фильтрация активных товаров

**Ограничения:**
- `price >= 0` - цена не может быть отрицательной
- `stock >= 0` - количество не может быть отрицательным

#### Таблица: `orders`
Хранение заказов пользователей.

**Ключевые поля:**
- `id` - уникальный идентификатор заказа
- `user_id` - ID пользователя (FOREIGN KEY → users.id, SET NULL)
- `product_id` - ID товара (FOREIGN KEY → products.id, RESTRICT)
- `quantity` - количество (INTEGER, CHECK: 1-999)
- `total_amount` - общая сумма (DECIMAL(12,2), CHECK >= 0)
- `discount_amount` - скидка (DECIMAL(12,2))
- `final_amount` - итоговая сумма (DECIMAL(12,2), CHECK >= 0)
- `promo_code` - промокод (VARCHAR)
- `payment_method` - способ оплаты (VARCHAR)
- `payment_status` - статус оплаты (VARCHAR, CHECK)
- `customer_name`, `customer_email`, `customer_phone` - данные клиента (для истории)
- `payment_details` - детали оплаты (TEXT, JSON)
- `reserved_until` - резерв до (TIMESTAMPTZ)
- `created_at`, `updated_at` - временные метки

**Индексы:**
- `orders_user_id_idx` - заказы пользователя
- `orders_product_id_idx` - заказы по товару
- `orders_payment_status_idx` - фильтрация по статусу
- `orders_created_at_idx` - сортировка по дате

**Ограничения:**
- `quantity` от 1 до 999
- `total_amount >= 0`, `final_amount >= 0`
- `payment_status` может быть: 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'

**Важно:** Заказы создаются в транзакции, которая атомарно:
1. Проверяет наличие товара
2. Создает заказ
3. Обновляет остаток товара

#### Таблица: `favorites`
Избранное пользователей.

**Ключевые поля:**
- `id` - уникальный идентификатор
- `user_id` - ID пользователя (FOREIGN KEY → users.id, CASCADE)
- `product_id` - ID товара (FOREIGN KEY → products.id, CASCADE)
- `created_at` - дата добавления

**Индексы:**
- `favorites_user_product_unique_idx` (UNIQUE) - один товар может быть в избранном только один раз

---

### 3. ПРОМОКОДЫ

#### Таблица: `promo_codes`
Промокоды (скидки).

**Ключевые поля:**
- `id` - уникальный идентификатор
- `code` - код промокода (VARCHAR, UNIQUE)
- `discount_percent` - процент скидки (INTEGER, CHECK: 0-100)
- `expires_at` - срок действия (TIMESTAMPTZ)
- `is_active` - активен ли промокод (BOOLEAN)
- `created_at` - дата создания

**Индексы:**
- `promo_codes_code_idx` (UNIQUE) - поиск по коду
- `promo_codes_is_active_idx` - фильтрация активных
- `promo_codes_expires_at_idx` - проверка срока действия

**Ограничения:**
- `discount_percent` от 0 до 100

---

### 4. УВЕДОМЛЕНИЯ И КОНТЕНТ

#### Таблица: `notifications`
Уведомления пользователям.

**Ключевые поля:**
- `id` - уникальный идентификатор
- `user_id` - ID пользователя (FOREIGN KEY → users.id, CASCADE)
- `title` - заголовок (VARCHAR)
- `message` - сообщение (TEXT)
- `type` - тип: info, success, warning, error (VARCHAR, CHECK)
- `is_read` - прочитано ли (BOOLEAN)
- `link` - ссылка (TEXT)
- `metadata` - дополнительные данные (JSONB)
- `created_at` - дата создания

**Индексы:**
- `notifications_user_id_idx` - уведомления пользователя
- `notifications_is_read_idx` - непрочитанные уведомления
- `notifications_created_at_idx` - сортировка по дате

#### Таблица: `content_pages`
Страницы контента (статьи, страницы).

**Ключевые поля:**
- `id` - уникальный идентификатор
- `slug` - URL-путь (VARCHAR, UNIQUE)
- `title` - заголовок (VARCHAR)
- `content` - содержимое (TEXT)
- `meta_title`, `meta_description` - SEO мета-теги
- `is_published` - опубликована ли (BOOLEAN)
- `author_id` - ID автора (FOREIGN KEY → users.id, SET NULL)
- `created_at`, `updated_at` - временные метки

**Индексы:**
- `content_pages_slug_idx` (UNIQUE) - поиск по slug
- `content_pages_is_published_idx` - фильтрация опубликованных

---

### 5. НАСТРОЙКИ И ДИНАМИЧЕСКИЙ КОНТЕНТ

#### Таблица: `site_settings`
Настройки сайта (ключ-значение).

**Ключевые поля:**
- `id` - уникальный идентификатор
- `key` - ключ настройки (VARCHAR, UNIQUE)
- `value` - значение (TEXT)
- `type` - тип: string, number, boolean, json (VARCHAR, CHECK)
- `description` - описание (TEXT)
- `updated_at`, `updated_by` - кто и когда обновил

**Индексы:**
- `site_settings_key_idx` (UNIQUE) - поиск по ключу

**Примеры ключей:**
- `contact_email` - email для связи
- `contact_phone` - телефон
- `contact_address` - адрес
- `seo_title` - SEO заголовок
- `seo_description` - SEO описание

#### Таблица: `site_content`
Динамический контент сайта (тексты, описания).

**Ключевые поля:**
- `id` - уникальный идентификатор
- `key` - ключ контента (VARCHAR, UNIQUE)
- `content_type` - тип: text, html, json, image_url (VARCHAR)
- `value` - значение (TEXT)
- `description` - описание (TEXT)
- `page` - страница (VARCHAR, например: 'home', 'about')
- `section` - раздел (VARCHAR, например: 'hero', 'footer')
- `is_active` - активен ли (BOOLEAN)
- `updated_at`, `updated_by` - кто и когда обновил

**Индексы:**
- `site_content_key_idx` (UNIQUE) - поиск по ключу
- `site_content_page_idx` - фильтрация по странице
- `site_content_section_idx` - фильтрация по разделу

#### Таблица: `site_contacts`
Контактная информация сайта (для футера).

**Ключевые поля:**
- `id` - уникальный идентификатор
- `type` - тип: phone, email, address, telegram, whatsapp, vk, etc. (VARCHAR)
- `label` - название (VARCHAR)
- `value` - значение (VARCHAR)
- `icon` - иконка (VARCHAR)
- `order_index` - порядок сортировки (INTEGER)
- `is_active` - активен ли (BOOLEAN)
- `is_public` - показывать в футере (BOOLEAN)
- `created_at`, `updated_at` - временные метки

**Индексы:**
- `site_contacts_type_idx` - фильтрация по типу
- `site_contacts_is_active_idx` - фильтрация активных
- `site_contacts_is_public_idx` - фильтрация для футера

---

### 6. СООТВЕТСТВИЕ 152-ФЗ

#### Таблица: `personal_data_consents`
Согласия пользователей на обработку персональных данных.

**Ключевые поля:**
- `id` - уникальный идентификатор
- `user_id` - ID пользователя (FOREIGN KEY → users.id, CASCADE)
- `consent_type` - тип согласия: registration, marketing, analytics, third_party (VARCHAR)
- `is_consented` - дано ли согласие (BOOLEAN)
- `consent_text` - текст согласия (TEXT)
- `ip_address`, `user_agent` - информация о подключении
- `consented_at` - дата согласия (TIMESTAMPTZ)
- `revoked_at` - дата отзыва (TIMESTAMPTZ)
- `created_at`, `updated_at` - временные метки

**Индексы:**
- `personal_data_consents_user_id_idx` - согласия пользователя
- `personal_data_consents_user_type_unique_idx` (UNIQUE) - один тип согласия на пользователя

#### Таблица: `privacy_policy_versions`
Версии политики конфиденциальности.

**Ключевые поля:**
- `id` - уникальный идентификатор
- `version` - версия (VARCHAR, UNIQUE)
- `content` - содержимое (TEXT)
- `is_active` - активна ли версия (BOOLEAN)
- `published_at` - дата публикации (TIMESTAMPTZ)
- `author_id` - ID автора (FOREIGN KEY → users.id, SET NULL)
- `created_at` - дата создания

**Индексы:**
- `privacy_policy_versions_version_idx` (UNIQUE) - поиск по версии
- `privacy_policy_versions_is_active_idx` - активная версия

#### Таблица: `terms_of_service_versions`
Версии условий использования.

**Структура:** Аналогична `privacy_policy_versions`

#### Таблица: `cookie_settings`
Настройки Cookie баннера.

**Ключевые поля:**
- `id` - уникальный идентификатор
- `banner_text` - текст баннера (TEXT)
- `banner_enabled` - включен ли баннер (BOOLEAN)
- `required_cookies_text` - текст о необходимых cookies (TEXT)
- `optional_cookies_text` - текст о дополнительных cookies (TEXT)
- `policy_link` - ссылка на политику (TEXT)
- `updated_at`, `updated_by` - кто и когда обновил

---

### 7. АУДИТ И БЕЗОПАСНОСТЬ

#### Таблица: `admin_audit_log`
Журнал действий администраторов.

**Ключевые поля:**
- `id` - уникальный идентификатор
- `admin_id` - ID администратора (FOREIGN KEY → users.id, SET NULL)
- `action` - действие: create, update, delete, block, unblock, send_notification, etc. (VARCHAR)
- `entity_type` - тип сущности: user, product, order, promo_code, etc. (VARCHAR)
- `entity_id` - ID сущности (VARCHAR)
- `details` - детали действия (JSONB)
- `ip_address`, `user_agent` - информация о подключении
- `created_at` - дата действия (TIMESTAMPTZ)

**Индексы:**
- `admin_audit_log_admin_id_idx` - действия администратора
- `admin_audit_log_entity_type_idx` - фильтрация по типу сущности
- `admin_audit_log_created_at_idx` - сортировка по дате
- `admin_audit_log_admin_entity_idx` - комбинированный поиск

#### Таблица: `contact_submissions`
Заявки с формы контактов.

**Ключевые поля:**
- `id` - уникальный идентификатор
- `name` - имя (TEXT)
- `phone` - телефон (VARCHAR)
- `email` - email (VARCHAR)
- `company` - компания (TEXT)
- `message` - сообщение (TEXT)
- `file_name`, `file_data` - прикрепленный файл (TEXT, base64)
- `created_at` - дата создания

**Индексы:**
- `contact_submissions_email_idx` - поиск по email
- `contact_submissions_created_at_idx` - сортировка по дате

---

## СВЯЗИ МЕЖДУ ТАБЛИЦАМИ (FOREIGN KEYS)

### CASCADE (каскадное удаление)
При удалении родительской записи удаляются дочерние:
- `sessions.user_id` → `users.id`
- `favorites.user_id` → `users.id`
- `favorites.product_id` → `products.id`
- `notifications.user_id` → `users.id`
- `personal_data_consents.user_id` → `users.id`
- `orders.product_id` → `products.id` (но RESTRICT для защиты)

### SET NULL (установка NULL)
При удалении родительской записи дочернее поле становится NULL:
- `orders.user_id` → `users.id`
- `content_pages.author_id` → `users.id`
- `admin_audit_log.admin_id` → `users.id`

### RESTRICT (запрет удаления)
Нельзя удалить родительскую запись, если есть дочерние:
- `orders.product_id` → `products.id`

---

## ИНДЕКСЫ

Всего в базе данных создано **более 40 индексов** для оптимизации запросов:

### Уникальные индексы (UNIQUE)
- `users.email`
- `products.sku`
- `promo_codes.code`
- `content_pages.slug`
- `site_settings.key`
- `site_content.key`
- `sessions.refresh_token`
- И другие

### Обычные индексы
- По внешним ключам (`user_id`, `product_id`, etc.)
- По часто фильтруемым полям (`is_active`, `role`, `payment_status`)
- По датам (`created_at`, `expires_at`)
- Комбинированные индексы

---

## ОГРАНИЧЕНИЯ (CONSTRAINTS)

### CHECK constraints
- `products.price >= 0`
- `products.stock >= 0`
- `promo_codes.discount_percent >= 0 AND <= 100`
- `orders.quantity > 0 AND <= 999`
- `orders.total_amount >= 0 AND final_amount >= 0`
- `users.role IN ('user', 'moderator', 'admin', 'superadmin')`
- `notifications.type IN ('info', 'success', 'warning', 'error')`
- `site_settings.type IN ('string', 'number', 'boolean', 'json')`

### UNIQUE constraints
- `users.email`
- `products.sku`
- `promo_codes.code`
- `content_pages.slug`
- `site_settings.key`
- `site_content.key`
- И другие

---

## ТРАНЗАКЦИИ

### Использование транзакций

Критические операции выполняются в транзакциях для обеспечения атомарности:

**Создание заказа (`createOrder`):**
```typescript
await db.transaction(async (tx) => {
  // 1. Проверка наличия товара
  const product = await tx.select()...;
  
  // 2. Создание заказа
  const order = await tx.insert(orders).values(...).returning();
  
  // 3. Обновление остатка товара
  await tx.update(products).set({ stock: ... }).where(...);
});
```

Если любая операция в транзакции завершится ошибкой, все изменения откатятся (ROLLBACK).

---

## МИГРАЦИИ

### Файл миграции
`migrations/001_initial_schema.sql`

### Применение миграций

**Через psql (рекомендуется для первого применения):**
```bash
psql -U postgres -d loaddevice_db -f migrations/001_initial_schema.sql
```

**Через Drizzle Kit:**
```bash
npm run db:push
```

**Важно:** При первом применении миграции необходимо выполнить от имени пользователя `postgres` для выдачи прав пользователю `loaddevice_user`.

---

## РЕЗЕРВНОЕ КОПИРОВАНИЕ

### Экспорт через админ-панель

1. Войдите в админ-панель
2. Перейдите на вкладку "Настройки"
3. Нажмите "Экспортировать базу данных"
4. Файл `database_export_YYYY-MM-DD.json` будет скачан

### Экспорт через pg_dump (командная строка)

```bash
pg_dump -U loaddevice_user -h localhost -d loaddevice_db > backup.sql
```

**С сжатием:**
```bash
pg_dump -U loaddevice_user -h localhost -d loaddevice_db | gzip > backup.sql.gz
```

### Восстановление из резервной копии

**Из SQL файла:**
```bash
psql -U loaddevice_user -h localhost -d loaddevice_db < backup.sql
```

**Из сжатого файла:**
```bash
gunzip < backup.sql.gz | psql -U loaddevice_user -h localhost -d loaddevice_db
```

---

## ПРОИЗВОДИТЕЛЬНОСТЬ

### Оптимизация

1. **Индексы:** Все часто используемые поля проиндексированы
2. **Кэширование:** Продукты кэшируются в памяти (5 минут TTL)
3. **Транзакции:** Критические операции атомарны
4. **Подготовленные запросы:** Drizzle ORM использует prepared statements

### Рекомендации для production

1. **Connection Pooling:** Настроено в `db.ts` (используется Pool из pg)
2. **Индексы:** Все необходимые индексы созданы
3. **Партиционирование:** Для больших таблиц (orders, notifications) можно использовать партиционирование по дате
4. **Репликация:** Для чтения можно использовать read replicas
5. **Архивация:** Старые данные можно архивировать

---

## БЕЗОПАСНОСТЬ

### Защита данных

1. **Пароли:** Хранятся в захешированном виде (bcryptjs)
2. **Подготовленные запросы:** Защита от SQL-инъекций
3. **Ограничения:** CHECK и UNIQUE constraints обеспечивают целостность данных
4. **Каскадные действия:** Правильно настроены для удаления зависимых данных
5. **Аудит:** Все действия администраторов логируются

### Рекомендации

1. Регулярно делайте резервные копии
2. Ограничьте доступ к базе данных (firewall)
3. Используйте сильные пароли для пользователей БД
4. Регулярно обновляйте PostgreSQL
5. Мониторьте логи и аудит

---

## РАБОТА С БАЗОЙ ДАННЫХ

### Подключение

**Через psql:**
```bash
psql -U loaddevice_user -h localhost -d loaddevice_db
```

**Через код (Drizzle ORM):**
```typescript
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

// Получить пользователя
const user = await db.select().from(users).where(eq(users.email, "user@example.com"));
```

### Полезные SQL запросы

**Просмотр всех таблиц:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**Просмотр структуры таблицы:**
```sql
\d users
```

**Количество записей в таблице:**
```sql
SELECT COUNT(*) FROM users;
```

**Просмотр индексов:**
```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

**Просмотр ограничений:**
```sql
SELECT constraint_name, table_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
ORDER BY table_name, constraint_type;
```

---

## РАСШИРЕНИЕ БАЗЫ ДАННЫХ

### Добавление новой таблицы

1. Обновите схему в `shared/schema.ts`
2. Создайте миграцию SQL или используйте Drizzle Kit
3. Примените миграцию
4. Обновите интерфейс `IStorage` в `server/storage.ts`
5. Реализуйте методы в `DrizzleStorage`

### Добавление нового поля

1. Обновите схему в `shared/schema.ts`
2. Создайте миграцию:
   ```sql
   ALTER TABLE table_name ADD COLUMN column_name TYPE;
   ```
3. Примените миграцию
4. Обновите методы в `storage.ts`

---

## СООТВЕТСТВИЕ 152-ФЗ

База данных полностью соответствует требованиям 152-ФЗ "О персональных данных":

✅ Хранение согласий пользователей
✅ Версионирование политик
✅ Возможность отзыва согласия
✅ История согласий
✅ Связь согласий с пользователями
✅ Хранение IP-адреса и User-Agent

---

## ЗАКЛЮЧЕНИЕ

База данных спроектирована для:
- ✅ Высокой производительности (индексы, оптимизация)
- ✅ Масштабируемости (правильная структура, индексы)
- ✅ Безопасности (ограничения, транзакции)
- ✅ Целостности данных (FOREIGN KEY, CHECK, UNIQUE)
- ✅ Соответствия 152-ФЗ (таблицы для согласий и политик)

**Дата последнего обновления:** 2025-01-XX

