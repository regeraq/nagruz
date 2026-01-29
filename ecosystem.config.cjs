// PM2 конфигурация для загрузки переменных окружения из .env
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Определяем путь к .env файлу
const envPath = path.resolve(__dirname, '.env');

// Загружаем переменные из .env
let envVars = {};
if (fs.existsSync(envPath)) {
  envVars = dotenv.config({ path: envPath }).parsed || {};
  console.log('✅ Загружены переменные окружения из .env');
} else {
  console.warn('⚠️  Файл .env не найден');
}

// Определяем рабочую директорию проекта
let projectRoot = __dirname;
if (fs.existsSync(path.join(__dirname, 'package.json'))) {
  projectRoot = __dirname;
} else if (fs.existsSync(path.join(__dirname, 'HelloWhoAreYou-1', 'package.json'))) {
  projectRoot = path.join(__dirname, 'HelloWhoAreYou-1');
}

module.exports = {
  apps: [
    {
      name: 'loaddevice',
      script: path.join(projectRoot, 'dist', 'index.js'),
      cwd: projectRoot,
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        ...envVars, // Включаем все переменные из .env
      },
      error_file: path.join(projectRoot, 'logs', 'pm2-error.log'),
      out_file: path.join(projectRoot, 'logs', 'pm2-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git'],
    },
  ],
};
