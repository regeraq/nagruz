import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface LoginAttempt {
  email: string;
  ipAddress: string;
  timestamp: number;
  success: boolean;
}

// In-memory cache for login attempts (in production, use Redis)
const loginAttemptsCache = new Map<string, LoginAttempt[]>();

/**
 * Get client IP address
 */
function getClientIp(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
    (req.headers["x-real-ip"] as string) ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

/**
 * Clean old attempts from cache
 */
function cleanOldAttempts(email: string, ipAddress: string): void {
  const now = Date.now();
  const key = `${email}:${ipAddress}`;
  const attempts = loginAttemptsCache.get(key) || [];
  
  const recentAttempts = attempts.filter(
    (attempt) => now - attempt.timestamp < LOCKOUT_DURATION_MS
  );
  
  if (recentAttempts.length === 0) {
    loginAttemptsCache.delete(key);
  } else {
    loginAttemptsCache.set(key, recentAttempts);
  }
}

/**
 * Check if email/IP is locked out
 */
export function checkBruteForce(email: string, ipAddress: string): {
  isLocked: boolean;
  remainingAttempts: number;
  lockoutEndsAt?: Date;
} {
  const key = `${email}:${ipAddress}`;
  const attempts = loginAttemptsCache.get(key) || [];
  const now = Date.now();
  
  // Clean old attempts
  const recentAttempts = attempts.filter(
    (attempt) => now - attempt.timestamp < LOCKOUT_DURATION_MS
  );
  
  const failedAttempts = recentAttempts.filter((a) => !a.success);
  
  if (failedAttempts.length >= MAX_LOGIN_ATTEMPTS) {
    const oldestFailedAttempt = failedAttempts[0];
    const lockoutEndsAt = new Date(oldestFailedAttempt.timestamp + LOCKOUT_DURATION_MS);
    
    return {
      isLocked: true,
      remainingAttempts: 0,
      lockoutEndsAt,
    };
  }
  
  return {
    isLocked: false,
    remainingAttempts: MAX_LOGIN_ATTEMPTS - failedAttempts.length,
  };
}

/**
 * Record login attempt
 */
export async function recordLoginAttempt(
  email: string,
  ipAddress: string,
  success: boolean
): Promise<void> {
  const key = `${email}:${ipAddress}`;
  const attempts = loginAttemptsCache.get(key) || [];
  
  attempts.push({
    email,
    ipAddress,
    timestamp: Date.now(),
    success,
  });
  
  loginAttemptsCache.set(key, attempts);
  
  // Also store in database for persistence
  await storage.recordLoginAttempt(email, success);
  
  // Clean old attempts
  cleanOldAttempts(email, ipAddress);
}

/**
 * Middleware to check brute force protection
 */
export function bruteForceProtection(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const email = req.body.email || req.body.username || "";
  const ipAddress = getClientIp(req);
  
  if (!email) {
    return next();
  }
  
  const check = checkBruteForce(email, ipAddress);
  
  if (check.isLocked) {
    res.status(429).json({
      success: false,
      message: `Слишком много неудачных попыток входа. Попробуйте снова через ${Math.ceil(
        (check.lockoutEndsAt!.getTime() - Date.now()) / 60000
      )} минут`,
      lockoutEndsAt: check.lockoutEndsAt,
    });
    return;
  }
  
  // Attach remaining attempts to request
  (req as any).remainingAttempts = check.remainingAttempts;
  
  next();
}

