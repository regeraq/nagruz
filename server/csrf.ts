/**
 * CSRF Protection middleware
 * 
 * Generates and validates CSRF tokens to prevent cross-site request forgery attacks.
 * Uses simple stateless token pattern for REST APIs.
 */

import type { Request, Response, NextFunction } from 'express';
import { randomBytes, timingSafeEqual } from 'crypto';

const CSRF_TOKEN_COOKIE = 'csrf-token';
const CSRF_TOKEN_HEADER = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32;

/**
 * SECURITY: значение cookie полностью контролируется клиентом (и любым
 * поддоменом, способным «подбросить» cookie). Это значение затем попадает
 * в HTML как <meta name="csrf-token" content="...">, поэтому принимаем
 * только строго hex-строку ожидаемой длины — иначе получаем инъекцию
 * в разметку и обход двойной отправки токена.
 */
const TOKEN_PATTERN = new RegExp(`^[0-9a-f]{${CSRF_TOKEN_LENGTH * 2}}$`);

function isWellFormedToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_PATTERN.test(value);
}

/** Сравнение токенов за постоянное время. */
function tokensMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';
// Allow override for HTTPS behind reverse proxy
const forceSecureCookie = process.env.FORCE_SECURE_COOKIES === 'true';
// Detect if we're behind a proxy with HTTPS (check X-Forwarded-Proto header)
const isHttps = (req: Request): boolean => {
  // Check if request is HTTPS (direct or via proxy)
  return req.secure || 
         req.headers['x-forwarded-proto'] === 'https' ||
         req.headers['x-forwarded-ssl'] === 'on';
};

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
  // Use existing token from cookie if available, otherwise generate new one.
  // Некорректный/подброшенный токен молча заменяем на свежий.
  const existing = req.cookies?.[CSRF_TOKEN_COOKIE];
  const token: string = isWellFormedToken(existing) ? existing : generateToken();
  
  // Determine if we should use secure cookies
  // Check if request is actually HTTPS (even behind proxy)
  const actuallyHttps = isHttps(req);
  // In production, use secure cookies only if actually using HTTPS
  // Can be overridden with FORCE_SECURE_COOKIES=true
  const useSecureCookie = (isProduction && actuallyHttps) || forceSecureCookie;
  
  // Log cookie settings for debugging (only in development or if explicitly enabled)
  if (process.env.DEBUG_CSRF === 'true' || !isProduction) {
    console.log(`[CSRF] Setting cookie - secure: ${useSecureCookie}, HTTPS: ${actuallyHttps}, protocol: ${req.protocol}, x-forwarded-proto: ${req.headers['x-forwarded-proto']}, token exists: ${!!req.cookies?.[CSRF_TOKEN_COOKIE]}`);
  }
  
  // Set non-httpOnly cookie so client can read it for API calls
  // Always set cookie to ensure it's refreshed (extends expiration)
  res.cookie(CSRF_TOKEN_COOKIE, token, {
    httpOnly: false,
    // SECURITY: secure: true only if actually using HTTPS
    // For HTTP sites (like http://45.9.72.103), this will be false
    secure: useSecureCookie,
    // SECURITY: strict in production for better protection (if HTTPS)
    // For HTTP sites, use 'lax' to allow cookies to work
    sameSite: (isProduction && actuallyHttps) ? 'strict' : 'lax',
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

  // Debug logging
  if (process.env.DEBUG_CSRF === 'true' || !isProduction) {
    console.log(`[CSRF] Validation - Header: ${tokenFromHeader ? 'present' : 'missing'}, Cookie: ${tokenFromCookie ? 'present' : 'missing'}, Path: ${req.path}`);
  }

  if (!tokenFromHeader || !tokenFromCookie) {
    console.warn(`[CSRF] Token missing - Header: ${!!tokenFromHeader}, Cookie: ${!!tokenFromCookie}, Path: ${req.path}`);
    return res.status(403).json({
      success: false,
      message: 'CSRF token missing or invalid. Please refresh the page and try again.',
      code: 'CSRF_TOKEN_MISSING',
    });
  }

  // Trim whitespace from tokens before comparison
  const headerToken = tokenFromHeader.trim();
  const cookieToken = tokenFromCookie.trim();

  // SECURITY: отклоняем всё, что не является токеном нашего формата,
  // чтобы нельзя было подставить произвольную пару header==cookie.
  if (!isWellFormedToken(headerToken) || !isWellFormedToken(cookieToken)) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token malformed. Please refresh the page and try again.',
      code: 'CSRF_TOKEN_MALFORMED',
    });
  }

  if (!tokensMatch(headerToken, cookieToken)) {
    console.warn(`[CSRF] Token mismatch - Path: ${req.path}, Header length: ${headerToken.length}, Cookie length: ${cookieToken.length}`);
    if (process.env.DEBUG_CSRF === 'true') {
      console.warn(`[CSRF] Header token: ${headerToken.substring(0, 10)}..., Cookie token: ${cookieToken.substring(0, 10)}...`);
    }
    return res.status(403).json({
      success: false,
      message: 'CSRF token mismatch. Please refresh the page and try again.',
      code: 'CSRF_TOKEN_MISMATCH',
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
