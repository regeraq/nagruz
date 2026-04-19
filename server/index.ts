//удалить что ниже
// === ДОБАВЬТЕ ЭТО В НАЧАЛО ФАЙЛА ===
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Определяем __dirname для ES модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем .env файл из корня проекта
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Проверяем загрузку переменных окружения
console.log('=== ЗАГРУЗКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ ===');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✓ установлен' : '✗ НЕ установлен!');
console.log('NODE_ENV:', process.env.NODE_ENV || 'не установлен');
console.log('PORT:', process.env.PORT || '5000 (по умолчанию)');
console.log('====================================');
// === КОНЕЦ ДОБАВЛЕНИЯ ===
//если что удалить что выше

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

// Security: Different body size limits for different content types
// Large limit for file uploads (contact forms with attachments)
app.use(express.json({
  limit: '15mb', // Increased for file uploads (base64 encoded files can be large)
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '15mb' }));

// CSRF protection: Generate tokens for GET requests
app.use(csrfToken);

// CORS configuration
// SECURITY: в spec нельзя одновременно Access-Control-Allow-Origin: * и
// Access-Control-Allow-Credentials: true. Всегда отвечаем конкретным origin.
app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;

  if (isDevelopment) {
    // В dev отражаем origin запроса (это безопасно, т.к. dev-сервер доступен только локально)
    if (requestOrigin) res.header('Access-Control-Allow-Origin', requestOrigin);
    res.header('Vary', 'Origin');
  } else {
    // В проде: same-origin или whitelist через ALLOWED_ORIGINS=https://a.ru,https://b.ru
    const allowList = (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (requestOrigin && (allowList.length === 0 || allowList.includes(requestOrigin))) {
      res.header('Access-Control-Allow-Origin', requestOrigin);
      res.header('Vary', 'Origin');
    }
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, Cache-Control');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
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

  // Content Security Policy: в dev нужен 'unsafe-eval' для Vite HMR,
  // в production он опасен и убирается.
  const scriptSrc = isDevelopment
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";

  const csp = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.resend.com",
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
        // Only log response body in development
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
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
