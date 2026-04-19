import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../auth";
import { storage } from "../storage";

/**
 * SECURITY: Централизованная проверка JWT + актуального состояния пользователя.
 *
 * В отличие от «ленивой» проверки по JWT-пейлоаду, здесь мы каждый раз
 * подтягиваем пользователя из БД, чтобы:
 *   - сразу отозвать доступ у заблокированного/удалённого администратора,
 *   - получить актуальную роль (а не ту, что была на момент выдачи токена).
 */
type AuthResult =
  | { ok: true; user: any; payload: { userId: string; email: string; role: string } }
  | { ok: false; status: number; message: string };

async function resolveAuthenticatedUser(req: Request): Promise<AuthResult> {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return { ok: false, status: 401, message: "Требуется авторизация" };

  const payload = verifyAccessToken(token);
  if (!payload) return { ok: false, status: 401, message: "Недействительный или истёкший токен" };

  const user = await storage.getUserById(payload.userId);
  if (!user) return { ok: false, status: 401, message: "Пользователь не найден" };
  if (user.isBlocked) return { ok: false, status: 403, message: "Учётная запись заблокирована" };

  return { ok: true, user, payload };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await resolveAuthenticatedUser(req);
    if (!result.ok) {
      res.status(result.status).json({ success: false, message: result.message });
      return;
    }
    req.user = {
      id: result.user.id,
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
    };
    next();
  } catch (error) {
    console.error("[requireAuth] error:", error);
    res.status(500).json({ success: false, message: "Внутренняя ошибка авторизации" });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await resolveAuthenticatedUser(req);
    if (!result.ok) {
      res.status(result.status).json({ success: false, message: result.message });
      return;
    }
    if (!["admin", "superadmin"].includes(result.user.role)) {
      res.status(403).json({ success: false, message: "Доступ запрещён. Требуются права администратора" });
      return;
    }
    req.user = {
      id: result.user.id,
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
    };
    next();
  } catch (error) {
    console.error("[requireAdmin] error:", error);
    res.status(500).json({ success: false, message: "Внутренняя ошибка авторизации" });
  }
}

export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await resolveAuthenticatedUser(req);
    if (!result.ok) {
      res.status(result.status).json({ success: false, message: result.message });
      return;
    }
    if (result.user.role !== "superadmin") {
      res.status(403).json({ success: false, message: "Доступ запрещён. Требуются права суперадминистратора" });
      return;
    }
    req.user = {
      id: result.user.id,
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
    };
    next();
  } catch (error) {
    console.error("[requireSuperAdmin] error:", error);
    res.status(500).json({ success: false, message: "Внутренняя ошибка авторизации" });
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        userId?: string;
        email: string;
        role: string;
      };
    }
  }
}
