// =============================================
// ЗАКОММЕНТИРОВАННЫЙ ИСХОДНЫЙ КОД (Neon Database)
// =============================================
// Этот код использовался для облачной базы данных Neon
// import { Pool, neonConfig } from '@neondatabase/serverless';
// import { drizzle } from 'drizzle-orm/neon-serverless';
// import ws from "ws";
// import * as schema from "@shared/schema";
// 
// neonConfig.webSocketConstructor = ws;
// 
// if (!process.env.DATABASE_URL) {
//   throw new Error(
//     "DATABASE_URL must be set. Did you forget to provision a database?",
//   );
// }
// 
// const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// export const db = drizzle({ client: pool, schema });
// 
// export async function testConnection(): Promise<boolean> {
//   try {
//     const client = await pool.connect();
//     await client.query('SELECT 1');
//     client.release();
//     console.log('✅ Database connection successful');
//     return true;
//   } catch (error) {
//     console.error('❌ Database connection failed:', error);
//     return false;
//   }
// }

// =============================================
// НОВЫЙ КОД ДЛЯ ЛОКАЛЬНОЙ РАЗРАБОТКИ
// =============================================
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../shared/schema';

// Устанавливаем DATABASE_URL по умолчанию для локальной разработки
const DEFAULT_DATABASE_URL = 'postgresql://loaddevice_user:loaddevice123@localhost:5432/loaddevice_db';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = DEFAULT_DATABASE_URL;
  console.log('⚠️  DATABASE_URL не найден в .env, используется локальная БД');
  console.log('📊  DATABASE_URL:', process.env.DATABASE_URL);
}

// КРИТИЧЕСКОЕ ПРЕДУПРЕЖДЕНИЕ: Проверка на соответствие 152-ФЗ (локализация БД)
const databaseUrl = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
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

const pool = new Pool({
  connectionString: databaseUrl,
});

export const db = drizzle(pool, { schema });

// Export pool for direct SQL queries (e.g., database export)
export { pool };

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