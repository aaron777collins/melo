/**
 * Cleanup Job Handlers
 * 
 * Handles system cleanup jobs like old files, expired invites, logs, etc.
 */

import { db } from "@/lib/db";
import { promises as fs } from "fs";
import path from "path";

export interface CleanupOldFilesPayload {
  directory: string;
  olderThanDays: number;
  extensions?: string[];
  dryRun?: boolean;
}

export interface CleanupExpiredInvitesPayload {
  dryRun?: boolean;
}

export interface CleanupAuditLogsPayload {
  olderThanDays: number;
  dryRun?: boolean;
}

export interface CleanupJobLogsPayload {
  olderThanDays: number;
  dryRun?: boolean;
}

class CleanupHandler {
  /**
   * Clean up old files from filesystem
   */
  async cleanupOldFiles(payload: CleanupOldFilesPayload): Promise<{
    success: boolean;
    filesDeleted: number;
    spaceFreed: number;
    errors: string[];
  }> {
    const { directory, olderThanDays, extensions, dryRun = false } = payload;
    
    console.log(`Cleaning up old files in ${directory} (older than ${olderThanDays} days, dry run: ${dryRun})`);
    
    let filesDeleted = 0;
    let spaceFreed = 0;
    const errors: string[] = [];
    
    try {
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      
      await this.processDirectory(directory, cutoffDate, extensions, dryRun, (filePath, size) => {
        filesDeleted++;
        spaceFreed += size;
        console.log(`${dryRun ? "Would delete" : "Deleted"}: ${filePath} (${size} bytes)`);
      }, (error) => {
        errors.push(error);
        console.error("Cleanup error:", error);
      });
      
      console.log(`File cleanup completed: ${filesDeleted} files, ${spaceFreed} bytes freed`);
      
      return {
        success: true,
        filesDeleted,
        spaceFreed,
        errors,
      };
    } catch (error) {
      console.error(`Failed to cleanup files in ${directory}:`, error);
      throw error;
    }
  }
  
  /**
   * Clean up expired invite codes
   */
  async cleanupExpiredInvites(payload: CleanupExpiredInvitesPayload): Promise<{
    success: boolean;
    invitesDeleted: number;
  }> {
    const { dryRun = false } = payload;
    
    console.log(`Cleaning up expired invites (dry run: ${dryRun})`);
    
    try {
      const now = new Date();
      
      // Find expired invites
      const expiredInvites = await db.inviteCode.findMany({
        where: {
          expiresAt: { lt: now }
        }
      });
      
      console.log(`Found ${expiredInvites.length} expired invites`);
      
      if (!dryRun && expiredInvites.length > 0) {
        const result = await db.inviteCode.deleteMany({
          where: {
            expiresAt: { lt: now }
          }
        });
        
        console.log(`Deleted ${result.count} expired invites`);
        
        return {
          success: true,
          invitesDeleted: result.count,
        };
      }
      
      return {
        success: true,
        invitesDeleted: dryRun ? 0 : expiredInvites.length,
      };
    } catch (error) {
      console.error("Failed to cleanup expired invites:", error);
      throw error;
    }
  }
  
  /**
   * Clean up old audit logs
   */
  async cleanupAuditLogs(payload: CleanupAuditLogsPayload): Promise<{
    success: boolean;
    logsDeleted: number;
  }> {
    const { olderThanDays, dryRun = false } = payload;
    
    console.log(`Cleaning up audit logs older than ${olderThanDays} days (dry run: ${dryRun})`);
    
    try {
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      
      // Count old logs
      const oldLogsCount = await db.auditLog.count({
        where: {
          createdAt: { lt: cutoffDate }
        }
      });
      
      console.log(`Found ${oldLogsCount} old audit logs`);
      
      if (!dryRun && oldLogsCount > 0) {
        const result = await db.auditLog.deleteMany({
          where: {
            createdAt: { lt: cutoffDate }
          }
        });
        
        console.log(`Deleted ${result.count} audit logs`);
        
        return {
          success: true,
          logsDeleted: result.count,
        };
      }
      
      return {
        success: true,
        logsDeleted: dryRun ? 0 : oldLogsCount,
      };
    } catch (error) {
      console.error("Failed to cleanup audit logs:", error);
      throw error;
    }
  }
  
  /**
   * Clean up old job logs
   */
  async cleanupJobLogs(payload: CleanupJobLogsPayload): Promise<{
    success: boolean;
    logsDeleted: number;
  }> {
    const { olderThanDays, dryRun = false } = payload;
    
    console.log(`Cleaning up job logs older than ${olderThanDays} days (dry run: ${dryRun})`);
    
    try {
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      
      // Count old job logs
      const oldLogsCount = await db.jobLog.count({
        where: {
          createdAt: { lt: cutoffDate }
        }
      });
      
      console.log(`Found ${oldLogsCount} old job logs`);
      
      if (!dryRun && oldLogsCount > 0) {
        const result = await db.jobLog.deleteMany({
          where: {
            createdAt: { lt: cutoffDate }
          }
        });
        
        console.log(`Deleted ${result.count} job logs`);
        
        return {
          success: true,
          logsDeleted: result.count,
        };
      }
      
      return {
        success: true,
        logsDeleted: dryRun ? 0 : oldLogsCount,
      };
    } catch (error) {
      console.error("Failed to cleanup job logs:", error);
      throw error;
    }
  }
  
  /**
   * Recursively process directory for file cleanup
   */
  private async processDirectory(
    directory: string,
    cutoffDate: Date,
    extensions: string[] | undefined,
    dryRun: boolean,
    onDelete: (filePath: string, size: number) => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        try {
          if (entry.isDirectory()) {
            await this.processDirectory(fullPath, cutoffDate, extensions, dryRun, onDelete, onError);
          } else if (entry.isFile()) {
            const stats = await fs.stat(fullPath);
            
            // Check if file is old enough
            if (stats.mtime < cutoffDate) {
              // Check extension filter if specified
              if (extensions && extensions.length > 0) {
                const ext = path.extname(fullPath).toLowerCase();
                if (!extensions.includes(ext)) {
                  continue;
                }
              }
              
              // Delete file (or simulate in dry run)
              if (!dryRun) {
                await fs.unlink(fullPath);
              }
              
              onDelete(fullPath, stats.size);
            }
          }
        } catch (error) {
          onError(`Error processing ${fullPath}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } catch (error) {
      onError(`Error reading directory ${directory}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export const cleanupHandler = new CleanupHandler();