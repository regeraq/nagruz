/**
 * Загрузка .env ДО инициализации остальных модулей.
 *
 * В ESM все `import` вычисляются раньше любого кода модуля. Поэтому вызов
 * `dotenv.config()` в теле server/index.ts срабатывал уже ПОСЛЕ того, как
 * server/db.ts успевал прочитать `process.env.DATABASE_URL` (ещё пустой) и
 * подставить значение по умолчанию. Так как dotenv не перезаписывает уже
 * установленные переменные, настоящий DATABASE_URL из .env игнорировался.
 *
 * Этот модуль импортируется первым — тогда переменные окружения гарантированно
 * доступны всем остальным модулям.
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, "../.env"), quiet: true });

export {};
