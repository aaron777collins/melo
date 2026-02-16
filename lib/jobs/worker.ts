/**
 * Background Job Worker
 * 
 * Processes jobs from the queue with concurrent execution and graceful shutdown.
 */

import { db } from "@/lib/db";
import { jobQueue } from "./queue";
import { jobHandlers } from "./handlers";
import { randomUUID } from "crypto";
import { hostname } from "os";

export interface WorkerConfig {
  workerId?: string;
  concurrency?: number;
  jobTypes?: string[];
  pollInterval?: number;
  heartbeatInterval?: number;
}

export class JobWorker {
  private workerId: string;
  private concurrency: number;
  private jobTypes: string[];
  private pollInterval: number;
  private heartbeatInterval: number;
  
  private isRunning = false;
  private isShuttingDown = false;
  private activeJobs = new Set<string>();
  private pollTimer?: NodeJS.Timeout;
  private heartbeatTimer?: NodeJS.Timeout;
  
  constructor(config: WorkerConfig = {}) {
    this.workerId = config.workerId || `worker-${randomUUID()}`;
    this.concurrency = config.concurrency || 1;
    this.jobTypes = config.jobTypes || [];
    this.pollInterval = config.pollInterval || 1000; // 1 second
    this.heartbeatInterval = config.heartbeatInterval || 30000; // 30 seconds
  }
  
  /**
   * Start the worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error("Worker is already running");
    }
    
    console.log(`Starting worker ${this.workerId} (PID: ${process.pid})`);
    console.log(`  Concurrency: ${this.concurrency}`);
    console.log(`  Job types: ${this.jobTypes.length > 0 ? this.jobTypes.join(", ") : "all"}`);
    
    // Register worker in database
    await this.registerWorker();
    
    this.isRunning = true;
    
    // Start job polling
    this.startPolling();
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Graceful shutdown handling
    process.on("SIGTERM", () => this.shutdown("SIGTERM"));
    process.on("SIGINT", () => this.shutdown("SIGINT"));
    
    console.log(`Worker ${this.workerId} started successfully`);
  }
  
  /**
   * Stop the worker gracefully
   */
  async shutdown(signal?: string): Promise<void> {
    if (this.isShuttingDown) {
      console.log("Shutdown already in progress...");
      return;
    }
    
    this.isShuttingDown = true;
    console.log(`Shutting down worker ${this.workerId} (signal: ${signal || "manual"})...`);
    
    // Stop accepting new jobs
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = undefined;
    }
    
    // Update worker status
    await this.updateWorkerStatus("stopping");
    
    // Wait for active jobs to complete (with timeout)
    const shutdownTimeout = 30000; // 30 seconds
    const start = Date.now();
    
    while (this.activeJobs.size > 0 && (Date.now() - start) < shutdownTimeout) {
      console.log(`Waiting for ${this.activeJobs.size} active jobs to complete...`);
      await this.sleep(1000);
    }
    
    if (this.activeJobs.size > 0) {
      console.log(`Force stopping with ${this.activeJobs.size} active jobs remaining`);
    }
    
    // Stop heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
    
    // Mark worker as stopped
    await this.updateWorkerStatus("stopped");
    
    this.isRunning = false;
    console.log(`Worker ${this.workerId} shut down`);
    
    process.exit(0);
  }
  
  /**
   * Register worker in database
   */
  private async registerWorker(): Promise<void> {
    await db.worker.upsert({
      where: { workerId: this.workerId },
      create: {
        workerId: this.workerId,
        pid: process.pid,
        hostname: hostname(),
        concurrency: this.concurrency,
        jobTypes: this.jobTypes,
        status: "active",
      },
      update: {
        pid: process.pid,
        concurrency: this.concurrency,
        jobTypes: this.jobTypes,
        status: "active",
        lastHeartbeat: new Date(),
      },
    });
  }
  
  /**
   * Update worker status
   */
  private async updateWorkerStatus(status: string): Promise<void> {
    try {
      await db.worker.update({
        where: { workerId: this.workerId },
        data: { 
          status,
          lastHeartbeat: new Date(),
        },
      });
    } catch (error) {
      console.error("Failed to update worker status:", error);
    }
  }
  
  /**
   * Start job polling loop
   */
  private startPolling(): void {
    const poll = async () => {
      if (this.isShuttingDown) return;
      
      try {
        // Only poll if we have capacity
        if (this.activeJobs.size < this.concurrency) {
          const job = await jobQueue.getNext(this.workerId, this.jobTypes);
          
          if (job) {
            this.processJob(job);
          }
        }
      } catch (error) {
        console.error("Error in job polling:", error);
      }
      
      // Schedule next poll
      if (!this.isShuttingDown) {
        this.pollTimer = setTimeout(poll, this.pollInterval);
      }
    };
    
    poll();
  }
  
  /**
   * Process a single job
   */
  private async processJob(job: any): Promise<void> {
    this.activeJobs.add(job.id);
    
    console.log(`Processing job ${job.id} (${job.type})`);
    
    try {
      const handler = jobHandlers[job.type];
      
      if (!handler) {
        throw new Error(`No handler found for job type: ${job.type}`);
      }
      
      // Update job with current worker PID
      await db.job.update({
        where: { id: job.id },
        data: { workerPid: process.pid },
      });
      
      // Execute the handler
      const result = await handler(job.payload, job);
      
      // Mark as completed
      await jobQueue.complete(job.id, result);
      
      console.log(`Job ${job.id} completed successfully`);
      
      // Update worker stats
      await this.incrementStat("jobsProcessed");
      await this.incrementStat("jobsSucceeded");
      
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      
      await jobQueue.fail(job.id, error instanceof Error ? error : new Error(String(error)));
      
      // Update worker stats
      await this.incrementStat("jobsProcessed");
      await this.incrementStat("jobsFailed");
    } finally {
      this.activeJobs.delete(job.id);
    }
  }
  
  /**
   * Start heartbeat to show worker is alive
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(async () => {
      try {
        await db.worker.update({
          where: { workerId: this.workerId },
          data: { lastHeartbeat: new Date() },
        });
      } catch (error) {
        console.error("Heartbeat failed:", error);
      }
    }, this.heartbeatInterval);
  }
  
  /**
   * Increment a worker statistic
   */
  private async incrementStat(field: "jobsProcessed" | "jobsSucceeded" | "jobsFailed"): Promise<void> {
    try {
      await db.worker.update({
        where: { workerId: this.workerId },
        data: { [field]: { increment: 1 } },
      });
    } catch (error) {
      console.error(`Failed to increment ${field}:`, error);
    }
  }
  
  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get worker status
   */
  getStatus(): {
    workerId: string;
    isRunning: boolean;
    isShuttingDown: boolean;
    activeJobs: number;
    concurrency: number;
  } {
    return {
      workerId: this.workerId,
      isRunning: this.isRunning,
      isShuttingDown: this.isShuttingDown,
      activeJobs: this.activeJobs.size,
      concurrency: this.concurrency,
    };
  }
}

/**
 * Cleanup dead workers from database
 */
export async function cleanupDeadWorkers(timeoutMinutes: number = 5): Promise<number> {
  const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);
  
  // Reset jobs that were being processed by dead workers
  await db.job.updateMany({
    where: {
      status: "processing",
      startedAt: { lt: cutoff },
    },
    data: {
      status: "pending",
      workerId: undefined,
      workerPid: undefined,
    },
  });
  
  // Mark dead workers as stopped
  const result = await db.worker.updateMany({
    where: {
      status: "active",
      lastHeartbeat: { lt: cutoff },
    },
    data: { status: "stopped" },
  });
  
  return result.count;
}