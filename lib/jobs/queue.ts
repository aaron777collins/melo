/**
 * Background Job Queue System
 * 
 * Handles async operations like email sending, file processing, notifications, etc.
 * Uses PostgreSQL as the job store with retry logic and worker management.
 */

import { db } from "@/lib/db";
import { Job, JobLog, Worker } from "@prisma/client";
import { randomUUID } from "crypto";
import { hostname } from "os";

export interface JobPayload {
  [key: string]: any;
}

export interface JobOptions {
  priority?: number;
  maxAttempts?: number;
  scheduledAt?: Date;
  tags?: string[];
  createdBy?: string;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class JobQueue {
  private static instance: JobQueue | null = null;
  
  private constructor() {}
  
  static getInstance(): JobQueue {
    if (!JobQueue.instance) {
      JobQueue.instance = new JobQueue();
    }
    return JobQueue.instance;
  }
  
  /**
   * Add a job to the queue
   */
  async add<T extends JobPayload>(
    type: string,
    payload: T,
    options: JobOptions = {}
  ): Promise<Job> {
    const job = await db.job.create({
      data: {
        id: randomUUID(),
        type,
        payload: payload as any,
        priority: options.priority ?? 0,
        maxAttempts: options.maxAttempts ?? 3,
        scheduledAt: options.scheduledAt ?? new Date(),
        tags: options.tags ?? [],
        createdBy: options.createdBy,
      },
    });
    
    await this.log(job.id, "info", `Job created: ${type}`, { payload });
    
    return job;
  }
  
  /**
   * Get next job to process
   */
  async getNext(
    workerId: string,
    jobTypes: string[] = []
  ): Promise<Job | null> {
    const whereClause: any = {
      status: "pending",
      scheduledAt: { lte: new Date() },
    };
    
    if (jobTypes.length > 0) {
      whereClause.type = { in: jobTypes };
    }
    
    // Use transaction to atomically claim a job
    const job = await db.$transaction(async (tx) => {
      const nextJob = await tx.job.findFirst({
        where: whereClause,
        orderBy: [
          { priority: "desc" },
          { scheduledAt: "asc" },
          { createdAt: "asc" },
        ],
      });
      
      if (!nextJob) return null;
      
      // Claim the job
      const claimedJob = await tx.job.update({
        where: { id: nextJob.id },
        data: {
          status: "processing",
          workerId,
          startedAt: new Date(),
          attempts: { increment: 1 },
        },
      });
      
      return claimedJob;
    });
    
    if (job) {
      await this.log(job.id, "info", `Job claimed by worker ${workerId}`);
    }
    
    return job;
  }
  
  /**
   * Mark job as completed
   */
  async complete(jobId: string, result?: any): Promise<void> {
    await db.job.update({
      where: { id: jobId },
      data: {
        status: "completed",
        result: result as any,
        completedAt: new Date(),
      },
    });
    
    await this.log(jobId, "info", "Job completed successfully", { result });
  }
  
  /**
   * Mark job as failed with retry logic
   */
  async fail(jobId: string, error: string | Error, metadata?: any): Promise<void> {
    const errorMessage = typeof error === "string" ? error : error.message;
    const errorStack = typeof error === "object" ? error.stack : undefined;
    
    const job = await db.job.findUnique({ where: { id: jobId } });
    if (!job) throw new Error(`Job ${jobId} not found`);
    
    const shouldRetry = job.attempts < job.maxAttempts;
    
    if (shouldRetry) {
      // Exponential backoff: 2^attempts seconds (min 1 second, max 1 hour)
      const backoffSeconds = Math.min(Math.max(Math.pow(2, job.attempts), 1), 3600);
      const retryAt = new Date(Date.now() + backoffSeconds * 1000);
      
      await db.job.update({
        where: { id: jobId },
        data: {
          status: "pending",
          error: {
            message: errorMessage,
            stack: errorStack,
            attempt: job.attempts,
            metadata,
          } as any,
          retryAt,
          workerId: undefined,
          workerPid: undefined,
        },
      });
      
      await this.log(jobId, "warn", 
        `Job failed (attempt ${job.attempts}/${job.maxAttempts}), retrying at ${retryAt.toISOString()}`,
        { error: errorMessage, backoffSeconds }
      );
    } else {
      await db.job.update({
        where: { id: jobId },
        data: {
          status: "failed",
          error: {
            message: errorMessage,
            stack: errorStack,
            attempt: job.attempts,
            metadata,
          } as any,
          completedAt: new Date(),
        },
      });
      
      await this.log(jobId, "error", 
        `Job failed permanently after ${job.attempts} attempts`,
        { error: errorMessage }
      );
    }
  }
  
  /**
   * Cancel a job
   */
  async cancel(jobId: string, reason?: string): Promise<void> {
    await db.job.update({
      where: { id: jobId },
      data: {
        status: "cancelled",
        completedAt: new Date(),
      },
    });
    
    await this.log(jobId, "info", `Job cancelled: ${reason || "No reason provided"}`);
  }
  
  /**
   * Get job statistics
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
    total: number;
  }> {
    const stats = await db.job.groupBy({
      by: ["status"],
      _count: { status: true },
    });
    
    const result = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      total: 0,
    };
    
    stats.forEach(stat => {
      result[stat.status as keyof typeof result] = stat._count.status;
      result.total += stat._count.status;
    });
    
    return result;
  }
  
  /**
   * Get jobs with filtering and pagination
   */
  async getJobs(options: {
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
    orderBy?: "createdAt" | "scheduledAt" | "priority";
    orderDir?: "asc" | "desc";
  } = {}): Promise<Job[]> {
    const {
      status,
      type,
      limit = 50,
      offset = 0,
      orderBy = "createdAt",
      orderDir = "desc",
    } = options;
    
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    
    return db.job.findMany({
      where,
      orderBy: { [orderBy]: orderDir },
      take: limit,
      skip: offset,
    });
  }
  
  /**
   * Clean up old completed/failed jobs
   */
  async cleanup(olderThanDays: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    const result = await db.job.deleteMany({
      where: {
        status: { in: ["completed", "failed", "cancelled"] },
        completedAt: { lt: cutoff },
      },
    });
    
    return result.count;
  }
  
  /**
   * Log a message for a job
   */
  async log(
    jobId: string,
    level: "info" | "warn" | "error" | "debug",
    message: string,
    metadata?: any
  ): Promise<void> {
    await db.jobLog.create({
      data: {
        jobId,
        level,
        message,
        metadata: metadata as any,
      },
    });
  }
  
  /**
   * Get logs for a job
   */
  async getLogs(jobId: string): Promise<JobLog[]> {
    return db.jobLog.findMany({
      where: { jobId },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const jobQueue = JobQueue.getInstance();