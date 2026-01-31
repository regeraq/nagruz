/**
 * Centralized logging service
 * Logs admin actions, file operations, and other important events
 */

interface LogEntry {
  timestamp: Date;
  level: "info" | "warn" | "error";
  category: string;
  message: string;
  metadata?: Record<string, any>;
  userId?: string;
  userEmail?: string;
}

class LoggerService {
  /**
   * Log admin action
   */
  logAdminAction(
    action: string,
    details: Record<string, any>,
    userId?: string,
    userEmail?: string
  ) {
    this.log({
      level: "info",
      category: "admin_action",
      message: action,
      metadata: details,
      userId,
      userEmail,
    });
  }

  /**
   * Log file operation
   */
  logFileOperation(
    operation: "upload" | "download" | "delete",
    details: Record<string, any>,
    userId?: string,
    userEmail?: string
  ) {
    this.log({
      level: "info",
      category: "file_operation",
      message: `File ${operation}`,
      metadata: details,
      userId,
      userEmail,
    });
  }

  /**
   * Log commercial proposal status change
   */
  logProposalStatusChange(
    proposalId: string,
    oldStatus: string | null,
    newStatus: string,
    userId?: string,
    userEmail?: string
  ) {
    this.log({
      level: "info",
      category: "proposal_status",
      message: `Proposal ${proposalId} status changed`,
      metadata: {
        proposalId,
        oldStatus,
        newStatus,
      },
      userId,
      userEmail,
    });
  }

  /**
   * Internal log method
   */
  private log(entry: LogEntry) {
    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.category}]`;
    const userInfo = entry.userEmail ? ` (user: ${entry.userEmail})` : entry.userId ? ` (userId: ${entry.userId})` : "";
    const message = `${prefix}${userInfo}: ${entry.message}`;

    if (entry.metadata) {
      console.log(message, entry.metadata);
    } else {
      console.log(message);
    }

    // In production, you might want to:
    // - Send to logging service (e.g., Winston, Pino)
    // - Store in database
    // - Send to external logging service (e.g., Sentry, LogRocket)
  }
}

export const logger = new LoggerService();

