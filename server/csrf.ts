/**
 * CSRF Protection middleware
 * 
 * Generates and validates CSRF tokens to prevent cross-site request forgery attacks.
 * Uses simple stateless token pattern for REST APIs.
 */

import type { Request, Response, NextFunction } from 'express';
import { randomBytes, createHash } from 'crypto';

const CSRF_TOKEN_COOKIE = 'csrf-token';
const CSRF_TOKEN_HEADER = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32;

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';
// Allow override for HTTPS behind reverse proxy
const forceSecureCookie = process.env.FORCE_SECURE_COOKIES === 'true';

/**
 * Generates a secure random CSRF token
 */
function generateToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * CSRF token generation middleware
 * Generates and sets CSRF token cookie for all requests
 */
export function csrfToken(req: Request, res: Response, next: NextFunction) {
  // Generate fresh token for every request (stateless approach)
  const token = generateToken();
  
  // Determine if we should use secure cookies
  // In production, always use secure cookies (HTTPS required)
  // Can be overridden with FORCE_SECURE_COOKIES=true for staging
  const useSecureCookie = isProduction || forceSecureCookie;
  
  // Set non-httpOnly cookie so client can read it for API calls
  res.cookie(CSRF_TOKEN_COOKIE, token, {
    httpOnly: false,
    // SECURITY: secure: true in production (requires HTTPS)
    secure: useSecureCookie,
    // SECURITY: strict in production for better protection
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    // Path should be root to work across all routes
    path: '/',
  });
  
  // Store token in response locals for endpoint access
  res.locals.csrfToken = token;
  
  next();
}

/**
 * CSRF validation middleware
 * Validates CSRF token for state-changing requests (POST, PUT, PATCH, DELETE)
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF check for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Get token from header
  const tokenFromHeader = req.headers[CSRF_TOKEN_HEADER] as string;
  const tokenFromCookie = req.cookies?.[CSRF_TOKEN_COOKIE];

  if (!tokenFromHeader || !tokenFromCookie) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token missing or invalid',
    });
  }

  // Simple comparison (stateless validation)
  if (tokenFromHeader !== tokenFromCookie) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token mismatch',
    });
  }

  next();
}

/**
 * Gets CSRF token from response locals (for client-side use)
 */
export function getCsrfToken(res: Response): string | undefined {
  return res.locals.csrfToken;
}
