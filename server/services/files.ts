import { db } from "../db";
import { commercialProposalFiles, contactSubmissions } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import type { InsertCommercialProposalFile, CommercialProposalFile } from "@shared/schema";

/**
 * Service for managing commercial proposal files
 */
export class FileService {
  /**
   * Create a new file record for a commercial proposal
   */
  async createFile(
    proposalId: string,
    userId: string | null,
    fileName: string,
    mimeType: string,
    fileSize: number,
    filePath: string
  ): Promise<CommercialProposalFile> {
    const [file] = await db
      .insert(commercialProposalFiles)
      .values({
        proposalId,
        userId,
        fileName,
        mimeType,
        fileSize,
        filePath,
      })
      .returning();

    return file;
  }

  /**
   * Get all files for a commercial proposal
   */
  async getFilesByProposalId(proposalId: string): Promise<CommercialProposalFile[]> {
    return await db
      .select()
      .from(commercialProposalFiles)
      .where(eq(commercialProposalFiles.proposalId, proposalId))
      .orderBy(commercialProposalFiles.uploadedAt);
  }

  /**
   * Get files count for a proposal (for performance)
   */
  async getFilesCountByProposalId(proposalId: string): Promise<number> {
    const files = await this.getFilesByProposalId(proposalId);
    return files.length;
  }

  /**
   * Get a single file by ID
   */
  async getFileById(fileId: string): Promise<CommercialProposalFile | null> {
    const [file] = await db
      .select()
      .from(commercialProposalFiles)
      .where(eq(commercialProposalFiles.id, fileId))
      .limit(1);

    return file || null;
  }

  /**
   * Delete a file by ID
   */
  async deleteFile(fileId: string): Promise<boolean> {
    // Check if file exists first
    const file = await this.getFileById(fileId);
    if (!file) {
      return false;
    }

    await db
      .delete(commercialProposalFiles)
      .where(eq(commercialProposalFiles.id, fileId));

    return true;
  }

  /**
   * Check if user has access to a file (owner or admin)
   */
  async checkFileAccess(
    fileId: string,
    userId: string,
    userRole: string
  ): Promise<{ hasAccess: boolean; file: CommercialProposalFile | null }> {
    const file = await this.getFileById(fileId);
    
    if (!file) {
      return { hasAccess: false, file: null };
    }

    // Admin has access to all files
    if (userRole === "admin" || userRole === "superadmin") {
      return { hasAccess: true, file };
    }

    // User can access their own files
    if (file.userId === userId) {
      return { hasAccess: true, file };
    }

    // Check if user owns the proposal
    const [proposal] = await db
      .select()
      .from(contactSubmissions)
      .where(eq(contactSubmissions.id, file.proposalId))
      .limit(1);

    // Note: contactSubmissions doesn't have userId field currently
    // This would need to be added if we want to track proposal ownership
    // For now, we'll rely on file.userId

    return { hasAccess: false, file };
  }

  /**
   * Get file content as base64 or buffer
   */
  async getFileContent(file: CommercialProposalFile): Promise<string> {
    // If filePath is already base64 data, return it
    if (file.filePath.startsWith("data:")) {
      return file.filePath;
    }

    // If filePath is a file system path, read it
    // For now, we'll assume filePath contains base64 data
    // In production, you'd read from disk
    return file.filePath;
  }
}

export const fileService = new FileService();

