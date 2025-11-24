import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../auth";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: "Требуется авторизация",
      });
      return;
    }

    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Недействительный токен",
    });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: "Требуется авторизация",
      });
      return;
    }

    const payload = verifyAccessToken(token);
    
    if (!["admin", "superadmin"].includes(payload.role)) {
      res.status(403).json({
        success: false,
        message: "Доступ запрещен. Требуются права администратора",
      });
      return;
    }

    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Недействительный токен",
    });
  }
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: "Требуется авторизация",
      });
      return;
    }

    const payload = verifyAccessToken(token);
    
    if (payload.role !== "superadmin") {
      res.status(403).json({
        success: false,
        message: "Доступ запрещен. Требуются права суперадминистратора",
      });
      return;
    }

    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Недействительный токен",
    });
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
      };
    }
  }
}
