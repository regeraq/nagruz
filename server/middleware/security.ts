import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

/**
 * Security middleware utilities
 */

/**
 * Validate UUID format to prevent injection attacks
 */
export function validateUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const numericIdRegex = /^[0-9]{1,20}$/; // For numeric IDs (up to 20 digits)
  return uuidRegex.test(id) || numericIdRegex.test(id);
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remove < and >
    .trim()
    .slice(0, 1000); // Limit length
}

/**
 * Validate file name to prevent path traversal
 */
export function validateFileName(fileName: string): boolean {
  // Prevent path traversal
  if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
    return false;
  }
  
  // Check length
  if (fileName.length > 255) {
    return false;
  }
  
  // Check for dangerous characters
  const dangerousChars = /[<>:"|?*\x00-\x1f]/;
  if (dangerousChars.test(fileName)) {
    return false;
  }
  
  return true;
}

/**
 * Validate MIME type
 */
export function validateMimeType(mimeType: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(mimeType);
}

/**
 * Validate file size
 */
export function validateFileSize(size: number, maxSize: number): boolean {
  return size > 0 && size <= maxSize;
}

/**
 * Middleware to validate request parameters (IDs)
 */
export function validateParams(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          code: "VALIDATION_ERROR",
          message: "Неверные параметры запроса",
          errors: error.errors,
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Middleware to validate request body
 */
export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          code: "VALIDATION_ERROR",
          message: "Ошибка валидации данных",
          errors: error.errors,
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Check if user is trying to access another user's resource (IDOR protection)
 */
export function checkResourceOwnership(
  resourceUserId: string | null | undefined,
  currentUserId: string,
  currentUserRole: string
): boolean {
  // Admin can access any resource
  if (currentUserRole === "admin" || currentUserRole === "superadmin") {
    return true;
  }
  
  // User can only access their own resources
  return resourceUserId === currentUserId;
}

