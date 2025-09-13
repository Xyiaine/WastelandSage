import express, { type Request, Response, NextFunction } from "express";
import cors from 'cors';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { securityHeaders, generalApiLimit, sanitizeInput, logProxyMisconfig } from './middleware/security';
import { errorHandler, notFoundHandler } from './middleware/error-handler';

const app = express();

// Trust proxy setting for proper rate limiting behind reverse proxy
// Configure trust proxy based on environment variable or defaults
const trustProxy = process.env.TRUST_PROXY || (process.env.NODE_ENV === 'production' ? '1' : 'false');

if (trustProxy === 'true' || trustProxy === 'false') {
  app.set('trust proxy', trustProxy === 'true');
} else if (!isNaN(Number(trustProxy))) {
  app.set('trust proxy', Number(trustProxy));
} else {
  // Handle comma-separated IPs/CIDRs
  app.set('trust proxy', trustProxy);
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Security Middleware
app.use(cors()); // Enable CORS for all origins
app.use(securityHeaders); // Set security-related HTTP headers
app.use('/api', logProxyMisconfig); // Log proxy misconfigurations
app.use('/api', generalApiLimit); // Apply rate limiting to API routes
app.use('/api', sanitizeInput); // Sanitize input for API routes

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
      if (capturedJsonResponse) {
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
  console.log(`[Security] Trust proxy configured: ${trustProxy}`);
  const server = await registerRoutes(app);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Error handling middleware (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

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