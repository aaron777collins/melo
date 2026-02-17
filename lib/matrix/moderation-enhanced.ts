/**
 * Enhanced Matrix Moderation Service with Improved Timed Bans
 * 
 * Improvements over the base implementation:
 * - Better race condition handling
 * - More robust expiration checking
 * - Enhanced error handling
 * - Preparation for persistent job queue integration
 * - Better validation and edge case handling
 */

import { MatrixModerationService, ModerationResult, BanUserOptions, PowerLevels } from './moderation';
import { MatrixClient } from "./matrix-sdk-exports";

/**
 * Enhanced options for ban operations
 */
export interface EnhancedBanUserOptions extends BanUserOptions {
  /** Whether to force the ban even if there are warnings */
  force?: boolean;
  /** Custom expiration behavior */
  expirationBehavior?: 'unban' | 'notify' | 'custom';
  /** Custom callback for expiration handling */
  onExpiration?: (roomId: string, userId: string) => Promise<void>;
}

/**
 * Ban expiration job data structure
 */
export interface BanExpirationJob {
  id: string;
  roomId: string;
  targetUserId: string;
  bannedBy: string;
  expiresAt: Date;
  reason?: string;
  attempts: number;
  lastAttempt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

/**
 * Enhanced Matrix Moderation Service
 */
export class EnhancedMatrixModerationService extends MatrixModerationService {
  private expirationJobs: Map<string, BanExpirationJob> = new Map();
  private isCheckingExpired = false;
  private checkExpirationInterval?: NodeJS.Timeout;
  
  constructor(client: MatrixClient, private options: {
    /** Interval for checking expired bans (default: 30 seconds) */
    expirationCheckInterval?: number;
    /** Maximum retry attempts for failed unbans (default: 3) */
    maxRetryAttempts?: number;
    /** Enable automatic expiration checking (default: true) */
    autoExpirationCheck?: boolean;
  } = {}) {
    super(client);
    
    // Set default options
    this.options = {
      expirationCheckInterval: 30000, // 30 seconds
      maxRetryAttempts: 3,
      autoExpirationCheck: true,
      ...options
    };
    
    // Start automatic expiration checking if enabled
    if (this.options.autoExpirationCheck) {
      this.startExpirationChecker();
    }
  }

  /**
   * Enhanced ban user method with better validation and scheduling
   */
  async banUser(
    roomId: string,
    userId: string,
    targetUserId: string,
    options: EnhancedBanUserOptions = {}
  ): Promise<ModerationResult> {
    try {
      // Validate duration parameter
      if (options.duration !== undefined) {
        if (typeof options.duration !== 'number') {
          return {
            success: false,
            error: "Duration must be a number (milliseconds)"
          };
        }
        
        if (options.duration < 0) {
          if (!options.force) {
            return {
              success: false,
              error: "Duration cannot be negative. Use 0 for permanent bans or set force: true to override"
            };
          }
          // Force mode: treat negative as permanent
          options.duration = 0;
        }
        
        // Validate maximum duration (prevent overflow)
        const maxDuration = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
        if (options.duration > maxDuration) {
          if (!options.force) {
            return {
              success: false,
              error: `Duration cannot exceed ${maxDuration}ms (1 year). Set force: true to override`
            };
          }
        }
      }

      // Check for existing ban before proceeding
      const existingBanInfo = await this.getBanInfo(roomId, targetUserId);
      if (existingBanInfo.isBanned && !options.force) {
        return {
          success: false,
          error: "User is already banned. Use force: true to override"
        };
      }

      // Call parent method for the actual ban
      const result = await super.banUser(roomId, userId, targetUserId, options);
      
      if (result.success && options.duration && options.duration > 0) {
        // Enhanced scheduling with job tracking
        await this.scheduleEnhancedUnban(roomId, targetUserId, userId, options.duration, options);
      }

      return result;
    } catch (error: any) {
      console.error("Enhanced ban user error:", error);
      return {
        success: false,
        error: error.message || "Failed to ban user"
      };
    }
  }

  /**
   * Enhanced ban scheduling with job tracking and persistence preparation
   */
  private async scheduleEnhancedUnban(
    roomId: string,
    targetUserId: string,
    bannedBy: string,
    duration: number,
    options: EnhancedBanUserOptions
  ): Promise<void> {
    const jobId = `${roomId}-${targetUserId}-${Date.now()}`;
    const expiresAt = new Date(Date.now() + duration);
    
    const job: BanExpirationJob = {
      id: jobId,
      roomId,
      targetUserId,
      bannedBy,
      expiresAt,
      reason: options.reason,
      attempts: 0,
      status: 'pending'
    };
    
    // Store job in memory (in production, this would go to a persistent queue)
    this.expirationJobs.set(jobId, job);
    
    // Schedule immediate timeout for this job
    setTimeout(async () => {
      await this.processExpirationJob(jobId);
    }, duration);
    
    console.log(`Enhanced: Scheduled unban job ${jobId} for ${targetUserId} in ${duration}ms`);
  }

  /**
   * Process a specific expiration job
   */
  private async processExpirationJob(jobId: string): Promise<void> {
    const job = this.expirationJobs.get(jobId);
    if (!job || job.status !== 'pending') {
      return;
    }

    job.status = 'processing';
    job.attempts++;
    job.lastAttempt = new Date();

    try {
      // Double-check that ban is still active and expired
      const banInfo = await this.getBanInfo(job.roomId, job.targetUserId);
      if (!banInfo.isBanned) {
        // User already unbanned, mark job complete
        job.status = 'completed';
        this.expirationJobs.delete(jobId);
        return;
      }

      if (banInfo.banInfo?.expiresAt) {
        const expiresAt = new Date(banInfo.banInfo.expiresAt);
        if (expiresAt > new Date()) {
          // Ban not yet expired, reschedule
          const remainingTime = expiresAt.getTime() - Date.now();
          setTimeout(() => this.processExpirationJob(jobId), remainingTime);
          job.status = 'pending';
          return;
        }
      }

      // Execute unban
      const systemUserId = this.client.getUserId() || '@system:melo';
      const result = await this.unbanUser(job.roomId, systemUserId, job.targetUserId);
      
      if (result.success) {
        // Remove ban state
        await this.client.sendStateEvent(
          job.roomId,
          'org.melo.moderation.ban' as any,
          {},
          job.targetUserId
        );
        
        job.status = 'completed';
        this.expirationJobs.delete(jobId);
        console.log(`Enhanced: Successfully processed expiration job ${jobId}`);
      } else {
        throw new Error(result.error || 'Unban failed');
      }
    } catch (error: any) {
      console.error(`Enhanced: Error processing expiration job ${jobId}:`, error);
      
      if (job.attempts < (this.options.maxRetryAttempts || 3)) {
        // Retry with exponential backoff
        const retryDelay = Math.min(1000 * Math.pow(2, job.attempts), 30000); // Max 30s
        setTimeout(() => this.processExpirationJob(jobId), retryDelay);
        job.status = 'pending';
      } else {
        job.status = 'failed';
        console.error(`Enhanced: Job ${jobId} failed after ${job.attempts} attempts`);
      }
    }
  }

  /**
   * Enhanced expired ban checking with race condition prevention
   */
  async checkExpiredBansEnhanced(roomId: string): Promise<{
    checkedCount: number;
    unbannedCount: number;
    errors: Array<{ userId: string; error: string }>;
    skippedCount: number;
  }> {
    // Prevent concurrent execution
    if (this.isCheckingExpired) {
      console.log('Enhanced: Expiration check already in progress, skipping');
      return {
        checkedCount: 0,
        unbannedCount: 0,
        errors: [],
        skippedCount: 1
      };
    }

    this.isCheckingExpired = true;
    
    try {
      const result = await this.checkExpiredBansInternal(roomId);
      return result;
    } finally {
      this.isCheckingExpired = false;
    }
  }

  /**
   * Internal expired ban checking implementation
   */
  private async checkExpiredBansInternal(roomId: string): Promise<{
    checkedCount: number;
    unbannedCount: number;
    errors: Array<{ userId: string; error: string }>;
    skippedCount: number;
  }> {
    const result = {
      checkedCount: 0,
      unbannedCount: 0,
      errors: [] as Array<{ userId: string; error: string }>,
      skippedCount: 0
    };

    try {
      const room = this.client.getRoom(roomId);
      if (!room) {
        throw new Error(`Room ${roomId} not found`);
      }

      // Get all ban state events
      const banStates = room.currentState.events.get('org.melo.moderation.ban' as any);
      if (!banStates) {
        return result;
      }

      const systemUserId = this.client.getUserId() || '@system:melo';
      const now = new Date();
      const processedUsers = new Set<string>();

      // Check each ban for expiry
      for (const [userId, banState] of Array.from(banStates.entries())) {
        // Prevent duplicate processing in case of race conditions
        if (processedUsers.has(userId)) {
          continue;
        }
        processedUsers.add(userId);
        
        result.checkedCount++;
        
        const banData = banState.getContent();
        if (!banData.expiresAt) {
          continue; // Permanent ban
        }

        let expiresAt: Date;
        try {
          expiresAt = new Date(banData.expiresAt);
          // Validate date
          if (isNaN(expiresAt.getTime())) {
            console.warn(`Enhanced: Invalid expiration date for ${userId}: ${banData.expiresAt}`);
            continue;
          }
        } catch (error) {
          console.warn(`Enhanced: Could not parse expiration date for ${userId}: ${banData.expiresAt}`);
          continue;
        }

        if (expiresAt <= now) {
          // Ban has expired, unban the user
          try {
            // Double-check membership status
            const member = room.getMember(userId);
            if (member?.membership !== 'ban') {
              // User is no longer banned, clean up state
              await this.client.sendStateEvent(
                roomId,
                'org.melo.moderation.ban' as any,
                {},
                userId
              );
              continue;
            }

            const unbanResult = await this.unbanUser(roomId, systemUserId, userId);
            if (unbanResult.success) {
              // Remove ban state
              await this.client.sendStateEvent(
                roomId,
                'org.melo.moderation.ban' as any,
                {},
                userId
              );
              result.unbannedCount++;
              console.log(`Enhanced: Auto-unbanned expired ban: ${userId} in ${roomId}`);
              
              // Clean up any related expiration jobs
              for (const [jobId, job] of this.expirationJobs.entries()) {
                if (job.roomId === roomId && job.targetUserId === userId) {
                  job.status = 'completed';
                  this.expirationJobs.delete(jobId);
                }
              }
            } else {
              result.errors.push({ userId, error: unbanResult.error || 'Unknown error' });
            }
          } catch (error: any) {
            result.errors.push({ userId, error: error.message || 'Failed to unban' });
          }
          
          // Add small delay between operations to be nice to the server
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      if (result.unbannedCount > 0) {
        console.log(`Enhanced: Processed expired bans in ${roomId}: ${result.unbannedCount}/${result.checkedCount} unbanned`);
      }

      return result;
    } catch (error: any) {
      console.error("Enhanced: Error checking expired bans:", error);
      throw error;
    }
  }

  /**
   * Start automatic periodic expiration checking
   */
  private startExpirationChecker(): void {
    if (this.checkExpirationInterval) {
      clearInterval(this.checkExpirationInterval);
    }

    this.checkExpirationInterval = setInterval(async () => {
      // In a real implementation, this would check all rooms the bot/service monitors
      // For now, we just check jobs in memory
      await this.processInMemoryJobs();
    }, this.options.expirationCheckInterval);

    console.log(`Enhanced: Started automatic expiration checker (interval: ${this.options.expirationCheckInterval}ms)`);
  }

  /**
   * Process expiration jobs stored in memory
   */
  private async processInMemoryJobs(): Promise<void> {
    const now = new Date();
    const expiredJobs = Array.from(this.expirationJobs.values())
      .filter(job => job.status === 'pending' && job.expiresAt <= now);

    for (const job of expiredJobs) {
      await this.processExpirationJob(job.id);
    }
  }

  /**
   * Stop automatic expiration checking
   */
  stopExpirationChecker(): void {
    if (this.checkExpirationInterval) {
      clearInterval(this.checkExpirationInterval);
      this.checkExpirationInterval = undefined;
    }
    console.log('Enhanced: Stopped automatic expiration checker');
  }

  /**
   * Get statistics about the expiration system
   */
  getExpirationStats(): {
    totalJobs: number;
    pendingJobs: number;
    processingJobs: number;
    completedJobs: number;
    failedJobs: number;
    oldestJob?: Date;
    newestJob?: Date;
  } {
    const jobs = Array.from(this.expirationJobs.values());
    
    return {
      totalJobs: jobs.length,
      pendingJobs: jobs.filter(j => j.status === 'pending').length,
      processingJobs: jobs.filter(j => j.status === 'processing').length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      oldestJob: jobs.length > 0 ? new Date(Math.min(...jobs.map(j => j.expiresAt.getTime()))) : undefined,
      newestJob: jobs.length > 0 ? new Date(Math.max(...jobs.map(j => j.expiresAt.getTime()))) : undefined
    };
  }

  /**
   * Force process all expired jobs (useful for testing or manual triggering)
   */
  async forceProcessExpiredJobs(): Promise<void> {
    const now = new Date();
    const expiredJobs = Array.from(this.expirationJobs.values())
      .filter(job => job.expiresAt <= now && job.status === 'pending');

    console.log(`Enhanced: Force processing ${expiredJobs.length} expired jobs`);
    
    for (const job of expiredJobs) {
      await this.processExpirationJob(job.id);
    }
  }

  /**
   * Enhanced validation for ban parameters
   */
  validateBanOptions(options: EnhancedBanUserOptions): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (options.duration !== undefined) {
      if (typeof options.duration !== 'number') {
        errors.push('Duration must be a number');
      } else {
        if (options.duration < 0 && !options.force) {
          errors.push('Duration cannot be negative');
        }
        
        if (options.duration > 365 * 24 * 60 * 60 * 1000 && !options.force) {
          errors.push('Duration cannot exceed 1 year');
        }
      }
    }
    
    if (options.reason && typeof options.reason !== 'string') {
      errors.push('Reason must be a string');
    }
    
    if (options.expirationBehavior && !['unban', 'notify', 'custom'].includes(options.expirationBehavior)) {
      errors.push('Invalid expiration behavior');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Cleanup method for service shutdown
   */
  destroy(): void {
    this.stopExpirationChecker();
    this.expirationJobs.clear();
    console.log('Enhanced: Service destroyed');
  }
}

/**
 * Factory function to create an enhanced moderation service
 */
export function createEnhancedModerationService(
  client: MatrixClient,
  options?: ConstructorParameters<typeof EnhancedMatrixModerationService>[1]
): EnhancedMatrixModerationService {
  return new EnhancedMatrixModerationService(client, options);
}