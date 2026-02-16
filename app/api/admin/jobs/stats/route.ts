/**
 * Job Queue Statistics API
 * 
 * Provides job queue statistics and metrics.
 */

import { NextRequest, NextResponse } from "next/server";
import { jobQueue } from "@/lib/jobs/queue";
import { db } from "@/lib/db";

// GET /api/admin/jobs/stats - Get job queue statistics
export async function GET(request: NextRequest) {
  try {
    // Get basic job stats
    const jobStats = await jobQueue.getStats();
    
    // Get job type distribution
    const jobTypeStats = await db.job.groupBy({
      by: ["type"],
      _count: { type: true },
      orderBy: { _count: { type: "desc" } },
    });
    
    // Get recent job activity (last 24 hours)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivity = await db.job.groupBy({
      by: ["status", "type"],
      _count: { status: true },
      where: {
        createdAt: { gte: last24Hours },
      },
    });
    
    // Get worker stats
    const activeWorkers = await db.worker.count({
      where: { status: "active" },
    });
    
    const workerStats = await db.worker.aggregate({
      _sum: {
        jobsProcessed: true,
        jobsSucceeded: true,
        jobsFailed: true,
      },
    });
    
    // Calculate average job processing time
    const avgProcessingTime = await db.$queryRaw<[{ avg: number | null }]>`
      SELECT AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg
      FROM "Job"
      WHERE status = 'completed'
        AND started_at IS NOT NULL
        AND completed_at IS NOT NULL
        AND completed_at > NOW() - INTERVAL '24 hours'
    `;
    
    return NextResponse.json({
      success: true,
      data: {
        queue: jobStats,
        jobTypes: jobTypeStats.map(stat => ({
          type: stat.type,
          count: stat._count.type,
        })),
        recentActivity: recentActivity.map(stat => ({
          status: stat.status,
          type: stat.type,
          count: stat._count.status,
        })),
        workers: {
          active: activeWorkers,
          totalProcessed: workerStats._sum.jobsProcessed || 0,
          totalSucceeded: workerStats._sum.jobsSucceeded || 0,
          totalFailed: workerStats._sum.jobsFailed || 0,
        },
        performance: {
          avgProcessingTimeSeconds: avgProcessingTime[0]?.avg || 0,
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