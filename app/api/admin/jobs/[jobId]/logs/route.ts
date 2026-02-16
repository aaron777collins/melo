/**
 * Job Logs API
 * 
 * Provides endpoints for job log management.
 */

import { NextRequest, NextResponse } from "next/server";
import { jobQueue } from "@/lib/jobs/queue";

// GET /api/admin/jobs/[jobId]/logs - Get job logs
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const logs = await jobQueue.getLogs(params.jobId);
    
    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error(`Failed to fetch logs for job ${params.jobId}:`, error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch job logs" },
      { status: 500 }
    );
  }
}