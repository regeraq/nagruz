import { Router, type Request, type Response } from "express";
import { authenticate, requireRole, type AuthRequest } from "../../middleware/auth";
import { fileService } from "../../services/files";
import { commercialProposalService } from "../../services/commercial";
import { logger } from "../../services/logger";
import { validateUUID, validateFileName, validateMimeType, validateFileSize, checkResourceOwnership } from "../../middleware/security";
import { insertContactSubmissionSchema } from "@shared/schema";
import { z } from "zod";
import { rateLimiters } from "../../rateLimiter";

const router = Router();

// File upload schema
const fileUploadSchema = z.object({
  fileName: z.string().min(1, "Имя файла обязательно"),
  mimeType: z.string().min(1, "MIME-тип обязателен"),
  fileSize: z.number().int().min(1, "Размер файла должен быть больше 0"),
  fileData: z.string().min(1, "Данные файла обязательны"), // base64 encoded
});

/**
 * POST /api/commercial/:id/files
 * Upload a file to a commercial proposal
 */
router.post(
  "/:id/files",
  authenticate,
  requireRole("user", "admin", "superadmin"),
  rateLimiters.general,
  async (req: AuthRequest, res: Response) => {
    try {
      const proposalId = req.params.id;
      const userId = req.user!.id;

      // Security: Validate proposal ID format
      if (!validateUUID(proposalId)) {
        return res.status(400).json({
          success: false,
          code: "INVALID_ID",
          message: "Неверный формат ID предложения",
        });
      }

      // Validate proposal exists and user has access
      const { hasAccess, proposal } = await commercialProposalService.checkProposalAccess(
        proposalId,
        userId,
        req.user!.role
      );

      if (!hasAccess || !proposal) {
        return res.status(404).json({
          success: false,
          code: "NOT_FOUND",
          message: "Коммерческое предложение не найдено",
        });
      }

      // Validate file data
      const validatedData = fileUploadSchema.parse(req.body);

      // Security: Validate file name
      if (!validateFileName(validatedData.fileName)) {
        return res.status(400).json({
          success: false,
          code: "INVALID_FILE_NAME",
          message: "Недопустимое имя файла",
        });
      }

      // Validate file size (10MB max)
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      if (!validateFileSize(validatedData.fileSize, MAX_FILE_SIZE)) {
        return res.status(413).json({
          success: false,
          code: "FILE_TOO_LARGE",
          message: `Размер файла превышает максимально допустимый (10 МБ)`,
        });
      }

      // Validate MIME type
      const ALLOWED_MIME_TYPES = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];

      if (!validateMimeType(validatedData.mimeType, ALLOWED_MIME_TYPES)) {
        return res.status(400).json({
          success: false,
          code: "INVALID_FILE_TYPE",
          message: "Недопустимый формат файла. Разрешены: PDF, DOC, DOCX, XLS, XLSX",
        });
      }

      // Store file (for now, we'll store base64 data in filePath)
      // In production, you'd save to disk and store the path
      const file = await fileService.createFile(
        proposalId,
        userId,
        validatedData.fileName,
        validatedData.mimeType,
        validatedData.fileSize,
        validatedData.fileData // Store base64 data
      );

      logger.logFileOperation("upload", {
        fileId: file.id,
        fileName: file.fileName,
        proposalId,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
      }, userId, req.user!.email);

      console.log(`📎 [Files] File uploaded: ${file.fileName} (${file.id}) for proposal ${proposalId} by user ${userId}`);

      res.status(201).json({
        success: true,
        file: {
          id: file.id,
          fileName: file.fileName,
          mimeType: file.mimeType,
          fileSize: file.fileSize,
          uploadedAt: file.uploadedAt,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          code: "VALIDATION_ERROR",
          message: "Ошибка валидации данных",
          errors: error.errors,
        });
      }

      console.error("Error uploading file:", error);
      res.status(500).json({
        success: false,
        code: "INTERNAL_ERROR",
        message: "Ошибка при загрузке файла",
      });
    }
  }
);

/**
 * GET /api/commercial/:id/files
 * Get all files for a commercial proposal
 */
router.get(
  "/:id/files",
  authenticate,
  requireRole("user", "admin", "superadmin"),
  rateLimiters.general,
  async (req: AuthRequest, res: Response) => {
    try {
      const proposalId = req.params.id;
      const userId = req.user!.id;

      // Security: Validate proposal ID format
      if (!validateUUID(proposalId)) {
        return res.status(400).json({
          success: false,
          code: "INVALID_ID",
          message: "Неверный формат ID предложения",
        });
      }

      // Validate proposal exists and user has access
      const { hasAccess, proposal } = await commercialProposalService.checkProposalAccess(
        proposalId,
        userId,
        req.user!.role
      );

      if (!hasAccess || !proposal) {
        return res.status(404).json({
          success: false,
          code: "NOT_FOUND",
          message: "Коммерческое предложение не найдено",
        });
      }

      const files = await fileService.getFilesByProposalId(proposalId);

      res.json({
        success: true,
        files: files.map((file) => ({
          id: file.id,
          fileName: file.fileName,
          mimeType: file.mimeType,
          fileSize: file.fileSize,
          uploadedAt: file.uploadedAt,
        })),
      });
    } catch (error) {
      console.error("Error fetching files:", error);
      res.status(500).json({
        success: false,
        code: "INTERNAL_ERROR",
        message: "Ошибка при получении файлов",
      });
    }
  }
);

/**
 * DELETE /api/commercial/:id/files/:fileId
 * Delete a file from a commercial proposal (admin only)
 */
router.delete(
  "/:id/files/:fileId",
  authenticate,
  requireRole("admin", "superadmin"),
  rateLimiters.general,
  async (req: AuthRequest, res: Response) => {
    try {
      const proposalId = req.params.id;
      const fileId = req.params.fileId;

      // Security: Validate IDs format
      if (!validateUUID(proposalId) || !validateUUID(fileId)) {
        return res.status(400).json({
          success: false,
          code: "INVALID_ID",
          message: "Неверный формат ID",
        });
      }

      // Verify file exists and belongs to proposal
      const file = await fileService.getFileById(fileId);
      if (!file || file.proposalId !== proposalId) {
        return res.status(404).json({
          success: false,
          code: "NOT_FOUND",
          message: "Файл не найден",
        });
      }

      // Additional security: Verify proposal exists (prevent IDOR)
      const { hasAccess, proposal } = await commercialProposalService.checkProposalAccess(
        proposalId,
        req.user!.id,
        req.user!.role
      );

      if (!hasAccess || !proposal) {
        return res.status(403).json({
          success: false,
          code: "FORBIDDEN",
          message: "Доступ запрещен",
        });
      }

      await fileService.deleteFile(fileId);

      logger.logFileOperation("delete", {
        fileId,
        fileName: file.fileName,
        proposalId,
      }, req.user!.id, req.user!.email);

      logger.logAdminAction("File deleted", {
        fileId,
        fileName: file.fileName,
        proposalId,
      }, req.user!.id, req.user!.email);

      console.log(`🗑️ [Files] File deleted: ${file.fileName} (${fileId}) from proposal ${proposalId} by admin ${req.user!.email}`);

      res.json({
        success: true,
        message: "Файл удален",
      });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({
        success: false,
        code: "INTERNAL_ERROR",
        message: "Ошибка при удалении файла",
      });
    }
  }
);

export default router;

