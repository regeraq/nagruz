/**
 * Rate limiting middleware and utilities
 * 
 * NOTE: For production, use express-rate-limit with Redis store:
 * import rateLimit from 'express-rate-limit';
 * import RedisStore from 'rate-limit-redis';
 * 
 * This is a simple in-memory implementation for development.
 */

import type { Request, Response, NextFunction } from 'express';
import { getClientIp } from './security';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum number of requests
  message?: string;
  skipSuccessfulRequests?: boolean;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store (use Redis in production)
const store: RateLimitStore = {};

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}, 5 * 60 * 1000);

/**
 * Creates a rate limiting middleware
 * @param config - Rate limit configuration
 * @returns Express middleware
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
  } = config;

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const key = `${ip}:${req.path}`;
    const now = Date.now();

    // Initialize or get existing entry
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    const entry = store[key];

    // Check if limit exceeded
    if (entry.count >= max) {
      res.status(429).json({
        success: false,
        message,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      });
      return;
    }

    // Increment counter
    entry.count++;

    // Track response status if needed
    if (skipSuccessfulRequests) {
      const originalSend = res.send;
      res.send = function (body) {
        if (res.statusCode < 400) {
          entry.count = Math.max(0, entry.count - 1);
        }
        return originalSend.call(this, body);
      };
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - entry.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

    next();
  };
}

/**
 * Rate limiters for different endpoints
 */
export const rateLimiters = {
  // Contact form: 5 requests per minute
  contact: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    message: 'Слишком много запросов. Пожалуйста, попробуйте позже.',
  }),

  // Orders: 10 requests per minute
  orders: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: 'Слишком много заказов. Пожалуйста, попробуйте позже.',
  }),

  // Promo validation: 20 requests per minute
  promo: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    message: 'Слишком много запросов на проверку промокода.',
  }),

  // Auth operations (password change, account deletion): 5 requests per minute
  auth: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    message: 'Слишком много попыток. Пожалуйста, подождите минуту.',
  }),

  // General API: 100 requests per minute
  general: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    message: 'Слишком много запросов.',
  }),
};


