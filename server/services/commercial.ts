import { db } from "../db";
import { contactSubmissions, commercialProposalFiles } from "@shared/schema";
import { eq } from "drizzle-orm";
import { fileService } from "./files";
import type { ContactSubmission, CommercialProposalFile } from "@shared/schema";

/**
 * Service for managing commercial proposals (contact submissions)
 */
export class CommercialProposalService {
  /**
   * Get commercial proposal with files
   */
  async getProposalWithFiles(proposalId: string): Promise<{
    proposal: ContactSubmission | null;
    files: CommercialProposalFile[];
  }> {
    const [proposal] = await db
      .select()
      .from(contactSubmissions)
      .where(eq(contactSubmissions.id, proposalId))
      .limit(1);

    if (!proposal) {
      return { proposal: null, files: [] };
    }

    const files = await fileService.getFilesByProposalId(proposalId);

    return { proposal, files };
  }

  /**
   * Get all proposals with file counts
   */
  async getAllProposalsWithFileCounts(): Promise<
    Array<ContactSubmission & { fileCount: number }>
  > {
    const proposals = await db.select().from(contactSubmissions);

    const proposalsWithCounts = await Promise.all(
      proposals.map(async (proposal) => {
        const files = await fileService.getFilesByProposalId(proposal.id);
        return {
          ...proposal,
          fileCount: files.length,
        };
      })
    );

    return proposalsWithCounts;
  }

  /**
   * Check if user has access to a proposal
   */
  async checkProposalAccess(
    proposalId: string,
    userId: string,
    userRole: string
  ): Promise<{ hasAccess: boolean; proposal: ContactSubmission | null }> {
    const [proposal] = await db
      .select()
      .from(contactSubmissions)
      .where(eq(contactSubmissions.id, proposalId))
      .limit(1);

    if (!proposal) {
      return { hasAccess: false, proposal: null };
    }

    // Admin has access to all proposals
    if (userRole === "admin" || userRole === "superadmin") {
      return { hasAccess: true, proposal };
    }

    // For now, users can only access their own proposals if we add userId to contactSubmissions
    // Currently, we'll allow access if user owns any file in the proposal
    const files = await fileService.getFilesByProposalId(proposalId);
    const userOwnsFile = files.some((file) => file.userId === userId);

    return { hasAccess: userOwnsFile, proposal };
  }
}

export const commercialProposalService = new CommercialProposalService();

