import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../auth";
import { getAccessTokenFromRequest } from "../authCookies";
import { storage } from "../storage";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    userId?: string; // Alias for compatibility
    email: string;
    role: string;
  };
}

/**
 * Standardized error response format
 */
export interface ErrorResponse {
  success: false;
  code: string;
  message: string;
}

/**
 * Middleware to verify JWT token and attach user to request
 */
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = getAccessTokenFromRequest(req);

    if (!token) {
      res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        message: "Токен доступа не предоставлен",
      } as ErrorResponse);
      return;
    }

    const payload = verifyAccessToken(token);

    if (!payload) {
      res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        message: "Недействительный или истекший токен",
      } as ErrorResponse);
      return;
    }

    // Verify user still exists and is not blocked
    const user = await storage.getUserById(payload.userId);
    
    if (!user || user.isBlocked) {
      res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        message: "Пользователь не найден или заблокирован",
      } as ErrorResponse);
      return;
    }

    req.user = {
      id: user.id,
      userId: user.id, // Alias for compatibility
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({
      success: false,
      code: "INTERNAL_ERROR",
      message: "Ошибка аутентификации",
    } as ErrorResponse);
  }
}

/**
 * Middleware to check if user has required role
 * Alias for authorize for compatibility
 */
export function authorize(...allowedRoles: string[]) {
  return requireRole(...allowedRoles);
}

/**
 * Role-based access control middleware
 * Usage: requireRole(["admin", "superadmin"])
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        message: "Требуется аутентификация",
      } as ErrorResponse);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        code: "FORBIDDEN",
        message: "Недостаточно прав доступа",
      } as ErrorResponse);
      return;
    }

    next();
  };
}

/**
 * Admin-only access (admin or superadmin)
 */
export const requireAdmin = requireRole("admin", "superadmin");

/**
 * Superadmin-only access
 */
export const requireSuperAdmin = requireRole("superadmin");

/**
 * Optional authentication - doesn't fail if no token
 */
export async function optionalAuthenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = getAccessTokenFromRequest(req);
    if (token) {
      const payload = verifyAccessToken(token);
      if (payload) {
        const user = await storage.getUserById(payload.userId);
        if (user && !user.isBlocked) {
          req.user = {
            id: user.id,
            userId: user.id,
            email: user.email,
            role: user.role,
          };
        }
      }
    }
    next();
  } catch {
    next();
  }
}

