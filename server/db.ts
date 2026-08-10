import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../shared/schema';

// SECURITY: раньше здесь лежал fallback с реальным логином и паролем БД.
// Захардкоженные учётные данные в репозитории — это утечка секрета, а молчаливый
// откат на локальную БД маскирует неверную конфигурацию прода.
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL не задан. Укажите его в .env или в переменных окружения.');
  console.error('   Пример: DATABASE_URL=postgresql://user:password@localhost:5432/dbname');
  process.exit(1);
}

// КРИТИЧЕСКОЕ ПРЕДУПРЕЖДЕНИЕ: Проверка на соответствие 152-ФЗ (локализация БД)
const databaseUrl = process.env.DATABASE_URL;
const foreignDatabaseDomains = [
  'aws.neon.tech',
  'amazonaws.com',
  'us-east-1',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-central-1',
  'ap-southeast-1',
  'neon.tech',
  'supabase.co',
  'herokuapp.com',
  'railway.app',
  'render.com',
  'vercel.app',
  'netlify.app',
];

const isForeignDatabase = foreignDatabaseDomains.some(domain => 
  databaseUrl.toLowerCase().includes(domain.toLowerCase())
);

if (isForeignDatabase) {
  console.error('');
  console.error('🚨 КРИТИЧЕСКОЕ ПРЕДУПРЕЖДЕНИЕ: НАРУШЕНИЕ 152-ФЗ 🚨');
  console.error('');
  console.error('⚠️  Обнаружена попытка подключения к зарубежной базе данных!');
  console.error('⚠️  Федеральный закон № 152-ФЗ "О персональных данных" требует');
  console.error('    хранения персональных данных граждан РФ на серверах,');
  console.error('    физически расположенных на территории Российской Федерации.');
  console.error('');
  console.error('📊  Текущий DATABASE_URL указывает на зарубежный сервер.');
  console.error('📊  DATABASE_URL:', databaseUrl.replace(/:[^:@]+@/, ':****@')); // Скрываем пароль
  console.error('');
  console.error('✅  РЕШЕНИЕ:');
  console.error('    1. Используйте российский хостинг для базы данных');
  console.error('    2. Рекомендуемые провайдеры: Selectel, Timeweb, REG.RU, FirstVDS, Beget');
  console.error('    3. Обновите DATABASE_URL в .env файле');
  console.error('');
  console.error('⚠️  ВНИМАНИЕ: Запуск в production с зарубежной БД может привести');
  console.error('    к штрафам от Роскомнадзора до 75 000 рублей для ИП');
  console.error('    и до 200 000 рублей для юридических лиц.');
  console.error('');
}

// RELIABILITY: без явных лимитов пул использует настройки по умолчанию и,
// главное, ждёт свободное соединение бесконечно. При недоступной БД запросы
// «висят», Express копит соединения и процесс перестаёт отвечать вообще —
// вместо того чтобы быстро вернуть 500 и остаться живым.
const pool = new Pool({
  connectionString: databaseUrl,
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// Иначе ошибка простаивающего клиента поднимается как uncaughtException
// и роняет процесс.
pool.on('error', (err) => {
  console.error('[db] неожиданная ошибка простаивающего соединения:', err.message);
});

export const db = drizzle(pool, { schema });

// Export pool for direct SQL queries (e.g., database export)
export { pool };

/** Закрывает пул при штатном завершении процесса. */
export async function closePool(): Promise<void> {
  await pool.end();
}

export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ Подключение к базе данных успешно');
    return true;
  } catch (error) {
    console.error('❌ Ошибка подключения к базе данных:', error);
    console.log('💡 Совет: Проверьте что PostgreSQL запущен и доступен');
    return false;
  }
}