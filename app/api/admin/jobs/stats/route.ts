/**
 * Job Queue Statistics API
 * 
 * Provides job queue statistics and metrics.
 * Build-safe: Returns mock data during static generation.
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  safeDatabaseCall, 
  safeJobQueueCall, 
  mockJobQueueStats, 
  mockDatabaseResponses,
  isBuildTime,
  buildLog
} from "@/lib/build-guards";

// GET /api/admin/jobs/stats - Get job queue statistics
export async function GET(request: NextRequest) {
  try {
    // Build-time guard - log and return mock data immediately
    if (isBuildTime()) {
      buildLog("API route executing during build - returning mock data");
      return NextResponse.json({
        success: true,
        buildTime: true,
        data: {
          queue: mockJobQueueStats,
          jobTypes: mockDatabaseResponses.jobTypeStats,
          recentActivity: mockDatabaseResponses.recentActivity,
          workers: mockDatabaseResponses.workerStats,
          performance: {
            avgProcessingTimeSeconds: mockDatabaseResponses.avgProcessingTime,
          },
        },
      });
    }

    // Runtime execution - lazy load dependencies to avoid build-time imports
    const { jobQueue } = await import("@/lib/jobs/queue");
    const { db } = await import("@/lib/db");
    
    // Get basic job stats with safety wrapper
    const jobStats = await safeJobQueueCall(
      mockJobQueueStats,
      () => jobQueue.getStats()
    );
    
    // Get job type distribution with safety wrapper - simplified approach
    let jobTypeStats: Array<{ type: string; count: number }> = [];
    try {
      const typeGroups = await db.job.groupBy({
        by: ["type"],
        _count: { type: true },
      });
      jobTypeStats = typeGroups
        .map((stat: any) => ({
          type: stat.type,
          count: stat._count.type,
        }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.warn('Failed to fetch job type stats:', error);
      jobTypeStats = mockDatabaseResponses.jobTypeStats;
    }
    
    // Get recent job activity (last 24 hours) - simplified approach
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let recentActivity: Array<{ status: string; type: string; count: number }> = [];
    try {
      const activityGroups = await db.job.groupBy({
        by: ["status", "type"],
        _count: { status: true },
        where: {
          createdAt: { gte: last24Hours },
        },
      });
      recentActivity = activityGroups.map((stat: any) => ({
        status: stat.status,
        type: stat.type,
        count: stat._count.status,
      }));
    } catch (error) {
      console.warn('Failed to fetch recent activity:', error);
      recentActivity = mockDatabaseResponses.recentActivity;
    }
    
    // Get worker stats - separate calls for better error handling
    let activeWorkers = 0;
    let workerStats = { jobsProcessed: 0, jobsSucceeded: 0, jobsFailed: 0 };
    
    try {
      activeWorkers = await db.worker.count({
        where: { status: "active" },
      });
    } catch (error) {
      console.warn('Failed to fetch active workers count:', error);
    }
    
    try {
      const workerAggregates = await db.worker.aggregate({
        _sum: {
          jobsProcessed: true,
          jobsSucceeded: true,
          jobsFailed: true,
        },
      });
      workerStats = {
        jobsProcessed: workerAggregates._sum.jobsProcessed || 0,
        jobsSucceeded: workerAggregates._sum.jobsSucceeded || 0,
        jobsFailed: workerAggregates._sum.jobsFailed || 0,
      };
    } catch (error) {
      console.warn('Failed to fetch worker aggregates:', error);
    }
    
    // Calculate average job processing time
    let avgProcessingTime = 0;
    try {
      const result = await db.$queryRaw<[{ avg: number | null }]>`
        SELECT AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg
        FROM "Job"
        WHERE status = 'completed'
          AND started_at IS NOT NULL
          AND completed_at IS NOT NULL
          AND completed_at > NOW() - INTERVAL '24 hours'
      `;
      avgProcessingTime = result[0]?.avg || 0;
    } catch (error) {
      console.warn('Failed to fetch average processing time:', error);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        queue: jobStats,
        jobTypes: jobTypeStats,
        recentActivity: recentActivity,
        workers: {
          active: activeWorkers,
          totalProcessed: workerStats.jobsProcessed,
          totalSucceeded: workerStats.jobsSucceeded,
          totalFailed: workerStats.jobsFailed,
        },
        performance: {
          avgProcessingTimeSeconds: avgProcessingTime,
        },
      },
    });
  } catch (error) {
    console.error("Failed to fetch job stats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch job stats" },
      { status: 500 }
    );
  }
}