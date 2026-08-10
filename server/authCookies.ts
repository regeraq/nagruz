import type { Request, Response } from "express";
import { createHash } from "crypto";

const isProduction = process.env.NODE_ENV === "production";
const forceSecureCookie = process.env.FORCE_SECURE_COOKIES === "true";

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";

function useSecure(req: Request): boolean {
  if (forceSecureCookie) return true;
  if (!isProduction) return false;
  const proto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim();
  return req.secure || proto === "https";
}

function cookieBase(req: Request) {
  return {
    httpOnly: true as const,
    secure: useSecure(req),
    sameSite: "lax" as const,
    path: "/",
  };
}

/** Access: короткий срок — кража через XSS из JS больше невозможна (HttpOnly). */
export function setAccessCookie(req: Request, res: Response, token: string): void {
  res.cookie(ACCESS_COOKIE, token, {
    ...cookieBase(req),
    maxAge: 15 * 60 * 1000, // 15 минут
  });
}

/** Refresh: длинный срок, HttpOnly. Path=/ чтобы /api/auth/refresh и logout видели cookie. */
export function setRefreshCookie(req: Request, res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    ...cookieBase(req),
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
  });
}

export function clearAuthCookies(req: Request, res: Response): void {
  const base = cookieBase(req);
  res.clearCookie(ACCESS_COOKIE, { path: base.path });
  res.clearCookie(REFRESH_COOKIE, { path: base.path });
}

export function getAccessTokenFromRequest(req: Request): string | undefined {
  const fromCookie = req.cookies?.[ACCESS_COOKIE];
  if (typeof fromCookie === "string" && fromCookie.length > 0) return fromCookie;

  // Переходный период: старые клиенты с Bearer в localStorage.
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7).trim();
    if (token) return token;
  }
  return undefined;
}

export function getRefreshTokenFromRequest(req: Request): string | undefined {
  const fromCookie = req.cookies?.[REFRESH_COOKIE];
  if (typeof fromCookie === "string" && fromCookie.length > 0) return fromCookie;
  return undefined;
}

/** Хэш refresh-токена для безопасного хранения/поиска в БД (если понадобится). */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
