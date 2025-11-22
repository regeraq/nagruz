import express, { type Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import cors from "cors";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

// ✅ ИСПРАВЛЕНИЕ 1: Helmet для security headers
app.use(helmet());

// ✅ ИСПРАВЛЕНИЕ 2: CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5000', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({
  limit: '30mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '30mb' }));

// ✅ ИСПРАВЛЕНИЕ 3: Безопасное логирование (без PII)
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
      // Логируем метаданные, но НЕ чувствительные данные
      const isErrorResponse = res.statusCode >= 400;
      const shouldLog = isErrorResponse || req.method === 'POST' || req.method === 'PATCH';

      if (shouldLog) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        
        // Логируем только статус и сообщение об ошибке, не весь ответ
        if (isErrorResponse && capturedJsonResponse?.message) {
          logLine += ` :: ${capturedJsonResponse.message}`;
        }

        if (logLine.length > 100) {
          logLine = logLine.slice(0, 99) + "…";
        }

        log(logLine);
      }
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error(`[ERROR] ${status}: ${message}`);
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
