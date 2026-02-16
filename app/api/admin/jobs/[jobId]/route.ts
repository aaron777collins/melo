/**
 * Individual Job Management API
 * 
 * Provides endpoints for managing specific jobs.
 */

import { NextRequest, NextResponse } from "next/server";
import { jobQueue } from "@/lib/jobs/queue";
import { db } from "@/lib/db";

// GET /api/admin/jobs/[jobId] - Get job details
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const job = await db.job.findUnique({
      where: { id: params.jobId },
    });
    
    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error(`Failed to fetch job ${params.jobId}:`, error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch job" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/jobs/[jobId] - Cancel job
export async function DELETE(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const reason = searchParams.get("reason") || "Cancelled by admin";
    
    await jobQueue.cancel(params.jobId, reason);
    
    return NextResponse.json({
      success: true,
      message: "Job cancelled successfully",
    });
  } catch (error) {
    console.error(`Failed to cancel job ${params.jobId}:`, error);
    return NextResponse.json(
      { success: false, error: "Failed to cancel job" },
      { status: 500 }
    );
  }
}

// POST /api/admin/jobs/[jobId]/retry - Retry failed job
export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const job = await db.job.findUnique({
      where: { id: params.jobId },
    });
    
    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 }
      );
    }
    
    if (job.status !== "failed") {
      return NextResponse.json(
        { success: false, error: "Only failed jobs can be retried" },
        { status: 400 }
      );
    }
    
    // Reset job to pending state
    await db.job.update({
      where: { id: params.jobId },
      data: {
        status: "pending",
        error: undefined,
        retryAt: undefined,
        scheduledAt: new Date(),
        workerId: undefined,
        workerPid: undefined,
        startedAt: undefined,
        completedAt: undefined,
      },
    });
    
    await jobQueue.log(params.jobId, "info", "Job manually retried by admin");
    
    return NextResponse.json({
      success: true,
      message: "Job queued for retry",
    });
  } catch (error) {
    console.error(`Failed to retry job ${params.jobId}:`, error);
    return NextResponse.json(
      { success: false, error: "Failed to retry job" },
      { status: 500 }
    );
  }
}