/**
 * Закрытый режим сайта («идут работы»).
 *
 * Пока режим включён, анонимный посетитель не получает ни контент, ни каталог,
 * ни возможность зарегистрироваться — только форму входа. Ранее
 * зарегистрированные пользователи и администраторы работают как обычно.
 *
 * SECURITY: проверка обязана жить на сервере. Прятать разделы только в React
 * бессмысленно — публичные API отдали бы всё содержимое прямым запросом.
 */
import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { verifyAccessToken } from "./auth";
import { getAccessTokenFromRequest } from "./authCookies";

export const SITE_ACCESS_KEYS = {
  privateMode: "site_private_mode",
  registrationEnabled: "registration_enabled",
  notice: "site_private_notice",
} as const;

export const DEFAULT_PRIVATE_NOTICE = "Сайт временно закрыт: идут технические работы.";

export type SiteAccessState = {
  privateMode: boolean;
  registrationEnabled: boolean;
  notice: string;
};

const DEFAULT_STATE: SiteAccessState = {
  privateMode: false,
  registrationEnabled: true,
  notice: DEFAULT_PRIVATE_NOTICE,
};

/**
 * Настройки читаются на каждом запросе к /api, поэтому держим их в памяти.
 * TTL намеренно короткий: переключатель в админке должен срабатывать сразу.
 */
const STATE_TTL_MS = 5_000;
let cached: { state: SiteAccessState; expiresAt: number } | null = null;

function toBool(value: unknown, fallback: boolean): boolean {
  if (value == null) return fallback;
  const s = String(value).trim().toLowerCase();
  if (s === "") return fallback;
  return s === "true" || s === "1" || s === "yes" || s === "on";
}

export function invalidateSiteAccessCache(): void {
  cached = null;
}

export async function getSiteAccessState(): Promise<SiteAccessState> {
  if (cached && cached.expiresAt > Date.now()) return cached.state;

  try {
    const rows = await storage.getSiteSettings();
    const byKey = new Map<string, string>();
    for (const row of rows || []) {
      if (row?.key) byKey.set(row.key, row.value ?? "");
    }
    const state: SiteAccessState = {
      privateMode: toBool(byKey.get(SITE_ACCESS_KEYS.privateMode), DEFAULT_STATE.privateMode),
      registrationEnabled: toBool(
        byKey.get(SITE_ACCESS_KEYS.registrationEnabled),
        DEFAULT_STATE.registrationEnabled,
      ),
      notice: (byKey.get(SITE_ACCESS_KEYS.notice) || "").trim() || DEFAULT_PRIVATE_NOTICE,
    };
    cached = { state, expiresAt: Date.now() + STATE_TTL_MS };
    return state;
  } catch (error) {
    // Падение БД не должно запирать сайт намертво — отдаём открытый режим.
    console.error("[siteAccess] не удалось прочитать настройки доступа:", error);
    return DEFAULT_STATE;
  }
}

/**
 * Пути (относительно /api), которые обязаны работать и в закрытом режиме:
 * иначе некому будет войти и снять блокировку.
 */
const ALWAYS_OPEN = new Set([
  "/health",
  "/csrf-token",
  "/site-access",
  "/auth/login",
  "/auth/logout",
  "/auth/refresh",
  "/auth/me",
  "/auth/register", // отвечает собственным 403 с понятным текстом
]);

function isOpenPath(path: string): boolean {
  // Express срезает префикс монтирования, но подстрахуемся на случай,
  // если middleware когда-нибудь повесят глобально.
  const withoutMount = path.startsWith("/api/") ? path.slice(4) : path;
  const clean = withoutMount.replace(/\/+$/, "") || "/";
  return ALWAYS_OPEN.has(clean);
}

async function hasValidSession(req: Request): Promise<boolean> {
  const token = getAccessTokenFromRequest(req);
  if (!token) return false;
  const payload = verifyAccessToken(token);
  if (!payload) return false;
  try {
    const user = await storage.getUserById(payload.userId);
    return Boolean(user) && user.isBlocked !== true;
  } catch {
    return false;
  }
}

export async function enforceSiteAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const state = await getSiteAccessState();
    if (!state.privateMode) return next();
    if (isOpenPath(req.path)) return next();
    if (await hasValidSession(req)) return next();

    res.status(403).json({
      success: false,
      code: "SITE_PRIVATE",
      message: state.notice,
    });
  } catch (error) {
    // Fail-closed: раньше при сбое чтения настроек запрос пропускался дальше,
    // и закрытый на обслуживание сайт временно становился публичным — ровно
    // противоположное тому, зачем режим включают.
    console.error("[siteAccess] ошибка проверки доступа:", error);
    if (isOpenPath(req.path)) return next();
    if (await hasValidSession(req).catch(() => false)) return next();
    res.status(503).json({
      success: false,
      code: "SITE_ACCESS_UNKNOWN",
      message: "Сервис временно недоступен, попробуйте позже",
    });
  }
}
