import { db } from "../db";
import { commercialProposalFiles, contactSubmissions } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import type { CommercialProposalFile } from "@shared/schema";
import {
  storeCommercialFile,
  readStoredFile,
  deleteStoredFile,
  isStoredFilePath,
} from "./fileStorage";

/**
 * Service for managing commercial proposal files.
 * Новые файлы пишутся на диск (uploads/commercial/), в БД — только путь.
 * Старые записи с data: URL читаются как раньше.
 */
export class FileService {
  /**
   * @param fileDataOrPath — data URL / pure base64 (будет сохранён на диск)
   *   или уже готовый относительный путь uploads/...
   */
  async createFile(
    proposalId: string,
    userId: string | null,
    fileName: string,
    mimeType: string,
    fileSize: number,
    fileDataOrPath: string,
  ): Promise<CommercialProposalFile> {
    let storedPath = fileDataOrPath;
    let storedSize = fileSize;

    if (!isStoredFilePath(fileDataOrPath)) {
      const saved = await storeCommercialFile(fileName, fileDataOrPath);
      storedPath = saved.relativePath;
      storedSize = saved.sizeBytes;
    }

    const [file] = await db
      .insert(commercialProposalFiles)
      .values({
        proposalId,
        userId,
        fileName,
        mimeType,
        fileSize: storedSize,
        filePath: storedPath,
      })
      .returning();

    return file;
  }

  async getFilesByProposalId(proposalId: string): Promise<CommercialProposalFile[]> {
    return await db
      .select()
      .from(commercialProposalFiles)
      .where(eq(commercialProposalFiles.proposalId, proposalId))
      .orderBy(desc(commercialProposalFiles.uploadedAt));
  }

  async getFilesCountByProposalId(proposalId: string): Promise<number> {
    const files = await this.getFilesByProposalId(proposalId);
    return files.length;
  }

  async getFileById(fileId: string): Promise<CommercialProposalFile | null> {
    try {
      const [file] = await db
        .select()
        .from(commercialProposalFiles)
        .where(eq(commercialProposalFiles.id, fileId))
        .limit(1);

      return file || null;
    } catch (error: any) {
      if (error?.code === "42P01" || error?.message?.includes("does not exist") || error?.message?.includes("не существует")) {
        console.error("❌ [FileService] Table 'commercial_proposal_files' missing — run npm run db:migrate");
        throw new Error("Database table 'commercial_proposal_files' does not exist. Please run migration: npm run db:migrate");
      }
      throw error;
    }
  }

  async deleteFile(fileId: string): Promise<boolean> {
    const file = await this.getFileById(fileId);
    if (!file) return false;

    if (isStoredFilePath(file.filePath)) {
      await deleteStoredFile(file.filePath);
    }

    await db.delete(commercialProposalFiles).where(eq(commercialProposalFiles.id, fileId));
    return true;
  }

  async checkFileAccess(
    fileId: string,
    userId: string,
    userRole: string,
  ): Promise<{ hasAccess: boolean; file: CommercialProposalFile | null }> {
    const file = await this.getFileById(fileId);

    if (!file) {
      return { hasAccess: false, file: null };
    }

    if (userRole === "admin" || userRole === "superadmin") {
      return { hasAccess: true, file };
    }

    if (file.userId === userId) {
      return { hasAccess: true, file };
    }

    // contactSubmissions не имеет userId — опираемся на file.userId
    await db
      .select()
      .from(contactSubmissions)
      .where(eq(contactSubmissions.id, file.proposalId))
      .limit(1);

    return { hasAccess: false, file };
  }

  /**
   * Возвращает data URL для отдачи клиенту (совместимо со старым download).
   */
  async getFileContent(file: CommercialProposalFile): Promise<string> {
    if (file.filePath.startsWith("data:")) {
      return file.filePath;
    }

    if (isStoredFilePath(file.filePath)) {
      const buffer = await readStoredFile(file.filePath);
      const mime = file.mimeType || "application/octet-stream";
      return `data:${mime};base64,${buffer.toString("base64")}`;
    }

    // Legacy: pure base64 без префикса
    return file.filePath;
  }
}

export const fileService = new FileService();
