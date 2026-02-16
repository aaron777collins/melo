/**
 * Job Handlers Registry
 * 
 * Registers all available job handlers for different job types.
 */

import { emailHandler } from "./email";
import { fileProcessingHandler } from "./file-processing";
import { notificationHandler } from "./notification";
import { cleanupHandler } from "./cleanup";
import { matrixHandler } from "./matrix";

export type JobHandler<T = any> = (
  payload: T,
  job: any
) => Promise<any>;

export const jobHandlers: Record<string, JobHandler> = {
  // Email operations
  "email:send": emailHandler.sendEmail,
  "email:batch": emailHandler.sendBatchEmails,
  "email:digest": emailHandler.sendDigest,
  
  // File operations
  "file:process-upload": fileProcessingHandler.processUpload,
  "file:generate-thumbnails": fileProcessingHandler.generateThumbnails,
  "file:compress-media": fileProcessingHandler.compressMedia,
  "file:virus-scan": fileProcessingHandler.virusScan,
  
  // Notification operations
  "notification:push": notificationHandler.sendPushNotification,
  "notification:batch": notificationHandler.sendBatchNotifications,
  "notification:digest": notificationHandler.sendDigestNotification,
  
  // Matrix operations
  "matrix:room-cleanup": matrixHandler.cleanupRoom,
  "matrix:user-export": matrixHandler.exportUserData,
  "matrix:sync-profile": matrixHandler.syncProfile,
  
  // System cleanup
  "cleanup:old-files": cleanupHandler.cleanupOldFiles,
  "cleanup:expired-invites": cleanupHandler.cleanupExpiredInvites,
  "cleanup:audit-logs": cleanupHandler.cleanupAuditLogs,
  "cleanup:job-logs": cleanupHandler.cleanupJobLogs,
};

// Register a new job handler
export function registerJobHandler(type: string, handler: JobHandler): void {
  jobHandlers[type] = handler;
}

// Get all available job types
export function getAvailableJobTypes(): string[] {
  return Object.keys(jobHandlers);
}