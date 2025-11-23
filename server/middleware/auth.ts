import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type JWTPayload } from "../auth";
import { storage } from "../storage";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
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
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Токен доступа не предоставлен",
      });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    if (!payload) {
      res.status(401).json({
        success: false,
        message: "Недействительный или истекший токен",
      });
      return;
    }

    // Verify user still exists and is not blocked
    const user = await storage.getUserById(payload.userId);
    
    if (!user || user.isBlocked) {
      res.status(401).json({
        success: false,
        message: "Пользователь не найден или заблокирован",
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка аутентификации",
    });
  }
}

/**
 * Middleware to check if user has required role
 */
export function authorize(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Требуется аутентификация",
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: "Недостаточно прав доступа",
      });
      return;
    }

    next();
  };
}

/**
 * Optional authentication - doesn't fail if no token
 */
export async function optionalAuthenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const payload = verifyAccessToken(token);

      if (payload) {
        const user = await storage.getUserById(payload.userId);
        
        if (user && !user.isBlocked) {
          req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
          };
        }
      }
    }

    next();
  } catch (error) {
    // Continue even if authentication fails
    next();
  }
}

