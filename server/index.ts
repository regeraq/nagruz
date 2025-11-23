import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cookieParser from "cookie-parser";
import { csrfToken, csrfProtection } from "./csrf";

const app = express();
const isDevelopment = process.env.NODE_ENV === "development";

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

// Cookie parser for CSRF tokens
app.use(cookieParser());

// Security: Different body size limits for different content types
// Large limit only for file uploads, smaller for regular API
app.use(express.json({
  limit: '1mb', // Reduced from 30mb for most endpoints
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// CSRF protection: Generate tokens for GET requests
app.use(csrfToken);

// CORS configuration (add specific origins in production)
if (isDevelopment) {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });
}

// Security headers
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
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
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port} (${isDevelopment ? 'development' : 'production'})`);
  });
})();
