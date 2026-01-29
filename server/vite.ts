import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // Helper function to check if request is for API
  const isApiRequest = (url: string) => url.startsWith('/api/');

  // Wrap vite middlewares to skip API routes
  app.use((req, res, next) => {
    // Skip API routes - they should be handled by Express routes, not Vite
    if (isApiRequest(req.originalUrl)) {
      return next();
    }
    // Let Vite handle other requests
    vite.middlewares(req, res, next);
  });
  
  // Catch-all for SPA routing - only for non-API routes
  app.use((req, res, next) => {
    const url = req.originalUrl;

    // Skip API routes - they should be handled by Express routes, not Vite
    if (isApiRequest(url)) {
      return next();
    }

    // Serve index.html for all non-API routes (SPA routing)
    (async () => {
      try {
        const clientTemplate = path.resolve(
          import.meta.dirname,
          "..",
          "client",
          "index.html",
        );

        // always reload the index.html file from disk incase it changes
        let template = await fs.promises.readFile(clientTemplate, "utf-8");
        template = template.replace(
          `src="/src/main.tsx"`,
          `src="/src/main.tsx?v=${nanoid()}"`,
        );
        
        // Inject CSRF token for client-side use
        const csrfToken = res.locals.csrfToken;
        if (csrfToken) {
          template = template.replace(
            '</head>',
            `<meta name="csrf-token" content="${csrfToken}"></head>`
          );
        }
        
        const page = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    })();
  });
}

export function serveStatic(app: Express) {
  // FIXED: Use process.cwd() to get project root - works correctly in production
  // import.meta.dirname in compiled code points to dist/, but we need project root
  const projectRoot = process.cwd();
  const distPath = path.resolve(projectRoot, "dist", "public");
  
  // Fallback: try relative to import.meta.dirname if process.cwd() doesn't work
  let finalDistPath = distPath;
  if (!fs.existsSync(finalDistPath)) {
    const altPath = path.resolve(import.meta.dirname, "..", "dist", "public");
    if (fs.existsSync(altPath)) {
      finalDistPath = altPath;
    }
  }

  if (!fs.existsSync(finalDistPath)) {
    // FIXED: Better error message with actual path
    const errorMsg = `Could not find the build directory: ${finalDistPath}, make sure to build the client first (npm run build)`;
    console.error(`❌ [serveStatic] ${errorMsg}`);
    console.error(`❌ [serveStatic] Current working directory: ${process.cwd()}`);
    console.error(`❌ [serveStatic] import.meta.dirname: ${import.meta.dirname}`);
    console.error(`❌ [serveStatic] Tried paths: ${distPath}, ${path.resolve(import.meta.dirname, "..", "dist", "public")}`);
    throw new Error(errorMsg);
  }
  
  console.log(`✅ [serveStatic] Serving static files from: ${finalDistPath}`);
  app.use(express.static(finalDistPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    
    // Skip API routes - they should be handled by Express routes
    if (url.startsWith('/api/')) {
      return next();
    }
    
    const indexPath = path.resolve(finalDistPath, "index.html");
    
    // FIXED: Better error handling
    if (!fs.existsSync(indexPath)) {
      console.error(`❌ [serveStatic] index.html not found at: ${indexPath}`);
      res.status(500).send(`
        <html>
          <head><title>Build Error</title></head>
          <body>
            <h1>Build Error</h1>
            <p>index.html not found at: ${indexPath}</p>
            <p>Please run: npm run build</p>
          </body>
        </html>
      `);
      return;
    }
    
    let html = await fs.promises.readFile(indexPath, "utf-8");
    
    // Inject CSRF token for client-side use
    const csrfToken = res.locals.csrfToken;
    if (csrfToken) {
      html = html.replace(
        '</head>',
        `<meta name="csrf-token" content="${csrfToken}"></head>`
      );
    }
    
    res.send(html);
  });
}
