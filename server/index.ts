// ВАЖНО: должен быть самым первым импортом — заполняет process.env до того,
// как остальные модули (в первую очередь ./db) прочитают свои настройки.
import "./loadEnv";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cookieParser from "cookie-parser";
import { csrfToken, csrfProtection } from "./csrf";
import { cache } from "./cache";

const app = express();
const isDevelopment = process.env.NODE_ENV === "development";

// Trust proxy for correct protocol detection (if behind reverse proxy)
// For direct HTTP access (like http://45.9.72.103), this is not needed
// but setting it won't hurt and helps if you add nginx later
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', true);
}

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

// Cookie parser for CSRF tokens
app.use(cookieParser());

// Security: Different body size limits for different content types.
// SECURITY/DoS: раньше лимит 15 MB действовал на ВСЕ маршруты, поэтому любой
// анонимный запрос мог заставить сервер разобрать 15 MB JSON. Крупный лимит
// оставлен только там, где реально загружаются base64-вложения.
//
// ВАЖНО: список должен покрывать ВСЕ маршруты, принимающие base64. При
// добавлении нового upload-эндпоинта его нужно внести сюда, иначе запрос
// будет отклоняться с 413 PayloadTooLarge.
const LARGE_BODY_ROUTES = [
  '/api/contact',            // вложения к заявке (до 15 MB)
  '/api/commercial',         // файлы коммерческих предложений (до 10 MB)
  '/api/admin/products',     // изображения товаров (base64)
  '/api/auth/avatar',        // загрузка аватара
  '/api/auth/profile',       // аватар передаётся и в общем PATCH профиля
];

const largeJson = express.json({
  limit: '15mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
});

const defaultJson = express.json({
  limit: '256kb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
});

app.use((req, res, next) => {
  const useLargeLimit = LARGE_BODY_ROUTES.some((prefix) => req.path.startsWith(prefix));
  return useLargeLimit ? largeJson(req, res, next) : defaultJson(req, res, next);
});
app.use(express.urlencoded({ extended: false, limit: '256kb' }));

// CSRF protection: Generate tokens for GET requests
app.use(csrfToken);

// CORS configuration
// SECURITY: в spec нельзя одновременно Access-Control-Allow-Origin: * и
// Access-Control-Allow-Credentials: true. Всегда отвечаем конкретным origin.
const CORS_ALLOW_LIST = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (!isDevelopment && CORS_ALLOW_LIST.length === 0) {
  console.warn(
    '[cors] ALLOWED_ORIGINS не задан — кросс-доменные запросы будут отклоняться. ' +
      'Для same-origin развёртывания это ожидаемое и безопасное поведение.',
  );
}

app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;

  // SECURITY: отражать произвольный Origin вместе с Allow-Credentials нельзя.
  // Раньше в production при пустом ALLOWED_ORIGINS отражался ЛЮБОЙ origin —
  // сторонний сайт мог прочитать /api/csrf-token с cookie пользователя
  // и тем самым полностью обойти защиту от CSRF.
  const originAllowed = isDevelopment
    ? Boolean(requestOrigin)
    : Boolean(requestOrigin && CORS_ALLOW_LIST.includes(requestOrigin));

  if (originAllowed && requestOrigin) {
    res.header('Access-Control-Allow-Origin', requestOrigin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  res.header('Vary', 'Origin');

  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, Cache-Control');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});

// SECURITY: CSRF-проверка применяется ко ВСЕМ изменяющим /api-запросам.
// Раньше `csrfProtection` висел точечно всего на 5 маршрутах, а десятки
// остальных (смена пароля, удаление аккаунта, весь /api/admin/*) были
// полностью открыты для cross-site запросов.
app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  return csrfProtection(req, res, next);
});

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // SECURITY: X-XSS-Protection в современных браузерах отключён и может
  // создавать XS-Leak. Правильное значение по OWASP — 0.
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self)');

  // Content Security Policy.
  // dev: Vite HMR требует 'unsafe-eval' и inline-скриптов.
  // prod: сборка Vite отдаёт только внешние <script type="module">, поэтому
  // 'unsafe-inline'/'unsafe-eval' убраны — это основная защита от XSS.
  const scriptSrc = isDevelopment
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self'";

  // Шрифты самохостятся из /fonts (см. client/public/fonts) — без Google Fonts,
  // чтобы IP посетителей не уходили в США (152-ФЗ).
  const csp = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    // Resend вызывается только с сервера; в браузере connect к нему не нужен.
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
  res.setHeader('Content-Security-Policy', csp);

  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse && isDevelopment) {
        // COMPLIANCE (152-ФЗ): в dev-логи попадали тела ответов целиком —
        // вместе с email, телефонами и токенами. Логируем только состав
        // ответа, без значений.
        logLine += ` :: {${Object.keys(capturedJsonResponse).join(",")}}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Проверяем конфигурацию до того, как начнём принимать трафик.
  const { runPreflightChecks } = await import("./preflight");
  runPreflightChecks();

  // Clear cache on server startup to ensure fresh data
  console.log("🧹 [Server] Clearing cache on startup");
  cache.clear();

  // Initialize admin account
  try {
    const { initAdminAccount } = await import("./initAdmin");
    await initAdminAccount();
  } catch (error) {
    console.error("Failed to initialize admin account:", error);
  }

  const server = await registerRoutes(app);

  // FIXED: Error handler - no stack trace leakage in production
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    
    // Log full error details on server
    console.error("Error:", {
      message: err.message,
      stack: err.stack,
      status,
      timestamp: new Date().toISOString(),
    });

    // Send safe error message to client
    // In production, don't expose internal error details
    const message = isDevelopment 
      ? err.message || "Internal Server Error"
      : status === 500 
        ? "Internal Server Error" 
        : err.message || "An error occurred";

    res.status(status).json({ 
      success: false,
      message,
      // Only include error details in development
      ...(isDevelopment && { error: err.message, stack: err.stack }),
    });
    
    // FIXED: Don't throw error after sending response
    // This was causing unhandled promise rejections
  });

  // Inject CSRF token into HTML for client-side use
  app.use((req, res, next) => {
    // Store original render if needed
    next();
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (isDevelopment) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  
  // Listen on all interfaces to allow access from other devices on the network
  const isWindows = process.platform === 'win32';
  const host = '0.0.0.0'; // Listen on all network interfaces
  
  // COMPLIANCE (152-ФЗ ст.5 ч.7): ПДн не должны храниться дольше необходимого.
  // Истёкшие сессии (с IP и User-Agent) и старые записи о попытках входа
  // (с email) раньше накапливались в БД бессрочно.
  const LOGIN_ATTEMPT_RETENTION_DAYS = parseInt(process.env.LOGIN_ATTEMPT_RETENTION_DAYS || '90', 10);
  const purgeExpiredPersonalData = async () => {
    try {
      const { storage } = await import('./storage');
      const removed = await storage.purgeExpiredData(LOGIN_ATTEMPT_RETENTION_DAYS);
      if (removed.sessions || removed.loginAttempts) {
        log(`[retention] удалено: сессий ${removed.sessions}, попыток входа ${removed.loginAttempts}`);
      }
    } catch (error) {
      console.error('[retention] не удалось очистить устаревшие данные:', error);
    }
  };
  void purgeExpiredPersonalData();
  setInterval(purgeExpiredPersonalData, 24 * 60 * 60 * 1000).unref();

  // RELIABILITY: без обработки SIGTERM `pm2 reload` убивает процесс мгновенно,
  // обрывая запросы в полёте (в том числе незавершённые записи в БД) и оставляя
  // соединения PostgreSQL висеть до таймаута.
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log(`получен ${signal} — завершаем работу`);

    // Аварийный выход, если что-то не отпускает event loop.
    const forceExit = setTimeout(() => {
      console.error('[shutdown] не удалось закрыться штатно за 10 с — выходим принудительно');
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    server.close(async () => {
      try {
        const { closePool } = await import('./db');
        await closePool();
        log('соединения закрыты, выходим');
      } catch (error) {
        console.error('[shutdown] ошибка при закрытии пула БД:', error);
      } finally {
        clearTimeout(forceExit);
        process.exit(0);
      }
    });
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  // Иначе необработанное отклонение промиса в Node 20+ роняет процесс целиком.
  process.on('unhandledRejection', (reason) => {
    console.error('[process] unhandledRejection:', reason);
  });

  server.listen({
    port,
    host,
    ...(isWindows ? {} : { reusePort: true }),
  }, () => {
    log(`serving on port ${port} (${isDevelopment ? 'development' : 'production'})`);
    log(`🌐 Server accessible at:`);
    log(`   - http://localhost:${port}`);
    log(`   - http://127.0.0.1:${port}`);
    log(`   - http://<your-local-ip>:${port} (for other devices on your network)`);
    log(`   To find your local IP, run: ipconfig (Windows) or ifconfig (Mac/Linux)`);
  });
})();
