import { Router, type Request, type Response } from "express";
import { authenticate, requireRole, type AuthRequest } from "../../middleware/auth";
import { fileService } from "../../services/files";
import { logger } from "../../services/logger";
import { validateUUID, checkResourceOwnership } from "../../middleware/security";
import { rateLimiters } from "../../rateLimiter";

const router = Router();

/**
 * GET /api/files/:fileId/download
 * Download a file (owner or admin only)
 */
router.get(
  "/:fileId/download",
  authenticate,
  requireRole("user", "admin", "superadmin"),
  rateLimiters.general,
  async (req: AuthRequest, res: Response) => {
    try {
      const fileId = req.params.fileId;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      console.log(`📥 [Files] Download request: fileId=${fileId}, userId=${userId}, role=${userRole}`);

      // Security: Validate file ID format
      if (!validateUUID(fileId)) {
        console.warn(`⚠️ [Files] Invalid file ID format: ${fileId}`);
        return res.status(400).json({
          success: false,
          code: "INVALID_ID",
          message: "Неверный формат ID файла",
        });
      }

      // Check access
      const { hasAccess, file } = await fileService.checkFileAccess(fileId, userId, userRole);

      if (!file) {
        console.warn(`⚠️ [Files] File not found: ${fileId}`);
        return res.status(404).json({
          success: false,
          code: "NOT_FOUND",
          message: "Файл не найден",
        });
      }

      if (!hasAccess) {
        console.warn(`⚠️ [Files] Access denied: fileId=${fileId}, userId=${userId}, fileUserId=${file.userId}`);
        return res.status(403).json({
          success: false,
          code: "FORBIDDEN",
          message: "Доступ к файлу запрещен",
        });
      }

      // Additional security: Verify resource ownership (IDOR protection)
      if (!checkResourceOwnership(file.userId, userId, userRole)) {
        console.warn(`⚠️ [Files] Resource ownership check failed: fileId=${fileId}, userId=${userId}, fileUserId=${file.userId}`);
        return res.status(403).json({
          success: false,
          code: "FORBIDDEN",
          message: "Доступ к файлу запрещен",
        });
      }

      console.log(`✅ [Files] Access granted: fileId=${fileId}, fileName=${file.fileName}, filePath length=${file.filePath?.length || 0}`);

      // Get file content
      const fileContent = await fileService.getFileContent(file);
      
      if (!fileContent) {
        console.error(`❌ [Files] File content is null or empty for file ${fileId}`);
        return res.status(500).json({
          success: false,
          code: "FILE_DATA_MISSING",
          message: "Данные файла отсутствуют",
        });
      }

      console.log(`📦 [Files] File content retrieved: length=${fileContent.length}, startsWith data:=${fileContent.startsWith("data:")}`);

      // Parse base64 data
      let base64Data = fileContent;
      
      // Handle different formats of stored data
      if (fileContent.startsWith("data:")) {
        // Full data URL: data:mime/type;base64,base64data
        const match = fileContent.match(/^data:([^;]+);base64,(.+)$/);
        if (match && match[2]) {
          base64Data = match[2];
          console.log(`✅ [Files] Extracted base64 from data URL, length=${base64Data.length}`);
        } else {
          console.error(`❌ [Files] Failed to parse data URL for file ${fileId}`);
          return res.status(500).json({
            success: false,
            code: "PARSE_ERROR",
            message: "Ошибка парсинга данных файла",
          });
        }
      } else if (fileContent.includes(",")) {
        // Data URL without "data:" prefix: mime/type;base64,base64data
        const parts = fileContent.split(",");
        if (parts.length > 1) {
          base64Data = parts[parts.length - 1];
          console.log(`✅ [Files] Extracted base64 from comma-separated format, length=${base64Data.length}`);
        }
      }
      // Otherwise assume it's already pure base64

      // Validate base64 data
      if (!base64Data || base64Data.length === 0) {
        console.error(`❌ [Files] Empty base64 data for file ${fileId}, original length=${fileContent.length}`);
        return res.status(500).json({
          success: false,
          code: "FILE_DATA_MISSING",
          message: "Данные файла отсутствуют",
        });
      }

      // Validate base64 format (basic check)
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(base64Data)) {
        console.error(`❌ [Files] Invalid base64 format for file ${fileId}`);
        return res.status(500).json({
          success: false,
          code: "INVALID_BASE64",
          message: "Неверный формат данных файла",
        });
      }

      // Convert base64 to buffer with error handling
      let buffer: Buffer;
      try {
        buffer = Buffer.from(base64Data, "base64");
        
        // Validate buffer
        if (!buffer || buffer.length === 0) {
          throw new Error("Empty buffer after decoding");
        }
        
        console.log(`✅ [Files] Buffer created: size=${buffer.length} bytes, expected=${file.fileSize}`);
        
        // Check if sizes match (with some tolerance for base64 padding)
        const sizeDiff = Math.abs(buffer.length - file.fileSize);
        if (sizeDiff > 100) { // Allow 100 bytes difference for padding/encoding differences
          console.warn(`⚠️ [Files] Size mismatch: buffer=${buffer.length}, expected=${file.fileSize}, diff=${sizeDiff}`);
        }
      } catch (decodeError: any) {
        console.error(`❌ [Files] Error decoding base64 for file ${fileId}:`, decodeError.message);
        console.error(`   Base64 length: ${base64Data.length}, first 100 chars: ${base64Data.substring(0, 100)}`);
        return res.status(500).json({
          success: false,
          code: "DECODE_ERROR",
          message: "Ошибка декодирования файла",
        });
      }

      // Set headers
      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.fileName)}"`);
      res.setHeader("Content-Length", buffer.length);

      logger.logFileOperation("download", {
        fileId,
        fileName: file.fileName,
        proposalId: file.proposalId,
        fileSize: file.fileSize,
      }, userId, req.user!.email);

      console.log(`📥 [Files] File downloaded: ${file.fileName} (${fileId}) by user ${userId}`);

      // Send file
      res.send(buffer);
    } catch (error: any) {
      console.error("❌ [Files] Error downloading file:", error);
      console.error("   File ID:", req.params.fileId);
      console.error("   User ID:", req.user?.id);
      console.error("   Error message:", error?.message);
      console.error("   Error code:", error?.code);
      console.error("   Error stack:", error?.stack);
      
      // Check if it's a database table missing error
      if (error?.message?.includes("does not exist") || error?.code === '42P01') {
        console.error("   ⚠️  Database table missing! Run migration: npm run db:push");
        if (!res.headersSent) {
          return res.status(503).json({
            success: false,
            code: "DATABASE_MIGRATION_REQUIRED",
            message: "Требуется применение миграции базы данных. Обратитесь к администратору.",
          });
        }
      }
      
      // Don't send response if already sent
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          code: "INTERNAL_ERROR",
          message: "Ошибка при скачивании файла",
          ...(process.env.NODE_ENV === "development" && { 
            error: error.message,
            code: error.code,
          }),
        });
      }
    }
  }
);

export default router;

