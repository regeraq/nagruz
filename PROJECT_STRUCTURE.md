# 📁 Структура проекта

```
HelloWhoAreYou-1/
│
├── 📂 client/                    # React клиентское приложение
│   ├── index.html                # HTML шаблон
│   ├── public/                   # Статические файлы
│   │   └── favicon.png
│   └── src/                      # Исходный код клиента
│       ├── App.tsx               # Главный компонент
│       ├── main.tsx              # Точка входа
│       ├── index.css             # Глобальные стили
│       ├── components/           # React компоненты
│       │   ├── navigation.tsx    # Навигация
│       │   ├── payment-modal.tsx # Модальное окно оплаты
│       │   ├── power-gauge.tsx   # Индикатор мощности
│       │   ├── theme-toggle.tsx  # Переключатель темы
│       │   └── ui/               # UI компоненты (shadcn/ui)
│       ├── pages/                # Страницы приложения
│       │   ├── home.tsx          # Главная страница
│       │   └── not-found.tsx     # 404 страница
│       ├── hooks/                # React хуки
│       └── lib/                  # Утилиты и конфигурация
│
├── 📂 server/                     # Express сервер
│   ├── index.ts                  # Точка входа сервера
│   ├── routes.ts                 # API маршруты
│   ├── storage.ts                # Хранилище данных (MemStorage)
│   ├── vite.ts                   # Vite middleware
│   ├── security.ts               # Утилиты безопасности
│   ├── rateLimiter.ts            # Rate limiting middleware
│   └── cache.ts                  # Система кэширования
│
├── 📂 shared/                     # Общий код
│   └── schema.ts                 # Zod схемы и типы
│
├── 📂 docs/                       # Документация
│   ├── README.md                 # Индекс документации
│   ├── CODE_REVIEW_REPORT.md     # Полный анализ кода
│   ├── README_SECURITY.md        # Руководство по безопасности
│   ├── SUMMARY.md                # Резюме улучшений
│   ├── IMPLEMENTATION_GUIDE.md   # Руководство по внедрению
│   ├── START_SERVER.md           # Инструкция по запуску
│   ├── QUICK_START.md            # Быстрый старт
│   ├── design_guidelines.md      # Руководство по дизайну
│   ├── replit.md                 # Конфигурация Replit
│   └── ЗАПУСК.txt                # Простая инструкция (RU)
│
├── 📂 scripts/                    # Скрипты запуска
│   ├── start-server.bat          # Windows batch скрипт
│   └── start-server.ps1          # PowerShell скрипт
│
├── 📂 attached_assets/            # Вложения и ресурсы
│   └── (изображения и документы)
│
├── 📄 README.md                   # Главный README проекта
├── 📄 PROJECT_STRUCTURE.md       # Этот файл
│
├── 📄 package.json                # Зависимости и скрипты
├── 📄 package-lock.json           # Зафиксированные версии
├── 📄 tsconfig.json               # TypeScript конфигурация
├── 📄 vite.config.ts              # Vite конфигурация
├── 📄 tailwind.config.ts          # Tailwind CSS конфигурация
├── 📄 drizzle.config.ts           # Drizzle ORM конфигурация
├── 📄 components.json             # shadcn/ui конфигурация
├── 📄 postcss.config.js           # PostCSS конфигурация
└── 📄 .gitignore                  # Git ignore правила
```

## 🎯 Описание основных папок

### `client/`
React приложение с TypeScript. Использует:
- Vite для сборки
- React Router (wouter) для маршрутизации
- TanStack Query для управления состоянием
- shadcn/ui для UI компонентов
- Tailwind CSS для стилей

### `server/`
Express сервер с TypeScript. Включает:
- API маршруты для всех эндпоинтов
- Middleware для безопасности и rate limiting
- Систему кэширования
- Утилиты безопасности

### `shared/`
Общий код между клиентом и сервером:
- Zod схемы для валидации
- TypeScript типы
- Константы

### `docs/`
Вся документация проекта:
- Отчеты по анализу
- Руководства
- Инструкции

### `scripts/`
Скрипты для удобного запуска проекта

## 📝 Важные файлы

- **README.md** - Начните отсюда для общего обзора
- **package.json** - Все зависимости и скрипты
- **.gitignore** - Правила для Git

## 🔧 Конфигурационные файлы

- `tsconfig.json` - Настройки TypeScript
- `vite.config.ts` - Настройки Vite
- `tailwind.config.ts` - Настройки Tailwind CSS
- `drizzle.config.ts` - Настройки базы данных
- `components.json` - Настройки shadcn/ui

