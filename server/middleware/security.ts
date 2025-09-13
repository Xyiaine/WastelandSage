
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// Rate limiting
export const createRateLimit = (windowMs: number, max: number, message: string) =>
  rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
  });

// Middleware to log potential proxy misconfigurations
export const logProxyMisconfig = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    const clientIP = req.ip;
    if (!clientIP || clientIP === '127.0.0.1' || clientIP === '::1') {
      console.warn('[Security] Rate limiting warning: Client IP appears as localhost/loopback. Check trust proxy configuration.');
    } else if (clientIP.startsWith('10.') || clientIP.startsWith('192.168.') || clientIP.startsWith('172.')) {
      console.warn(`[Security] Rate limiting warning: Client IP is private network address: ${clientIP}. Verify trust proxy configuration.`);
    }
  }
  next();
};

// General API rate limit
export const generalApiLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many requests from this IP, please try again later.'
);

// AI generation rate limit (more restrictive)
export const aiGenerationLimit = createRateLimit(
  60 * 1000, // 1 minute
  10, // 10 AI requests per minute
  'Too many AI generation requests, please wait before trying again.'
);

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    sanitizeObject(req.body);
  }
  if (req.query) {
    sanitizeObject(req.query);
  }
  next();
};

function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      // Remove potential XSS patterns
      obj[key] = obj[key]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}

// Security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://replit.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:", "https://api.openai.com"],
    },
  },
});
