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

      // Security: Validate file ID format
      if (!validateUUID(fileId)) {
        return res.status(400).json({
          success: false,
          code: "INVALID_ID",
          message: "Неверный формат ID файла",
        });
      }

      // Check access
      const { hasAccess, file } = await fileService.checkFileAccess(fileId, userId, userRole);

      if (!hasAccess || !file) {
        return res.status(403).json({
          success: false,
          code: "FORBIDDEN",
          message: "Доступ к файлу запрещен",
        });
      }

      // Additional security: Verify resource ownership (IDOR protection)
      if (!checkResourceOwnership(file.userId, userId, userRole)) {
        return res.status(403).json({
          success: false,
          code: "FORBIDDEN",
          message: "Доступ к файлу запрещен",
        });
      }

      // Get file content
      const fileContent = await fileService.getFileContent(file);

      // Parse base64 data
      let base64Data = fileContent;
      if (fileContent.startsWith("data:")) {
        const match = fileContent.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          base64Data = match[2];
        }
      }

      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data, "base64");

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
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).json({
        success: false,
        code: "INTERNAL_ERROR",
        message: "Ошибка при скачивании файла",
      });
    }
  }
);

export default router;

