/**
 * Workers Management API
 * 
 * Provides endpoints for worker process management and monitoring.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cleanupDeadWorkers } from "@/lib/jobs/worker";

// GET /api/admin/workers - List workers
export async function GET(request: NextRequest) {
  try {
    const workers = await db.worker.findMany({
      orderBy: [
        { status: "asc" },
        { lastHeartbeat: "desc" },
      ],
    });
    
    return NextResponse.json({
      success: true,
      data: workers,
    });
  } catch (error) {
    console.error("Failed to fetch workers:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch workers" },
      { status: 500 }
    );
  }
}

// POST /api/admin/workers/cleanup - Cleanup dead workers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { timeoutMinutes = 5 } = body;
    
    const cleanedUp = await cleanupDeadWorkers(timeoutMinutes);
    
    return NextResponse.json({
      success: true,
      message: `Cleaned up ${cleanedUp} dead workers`,
      cleanedUp,
    });
  } catch (error) {
    console.error("Failed to cleanup dead workers:", error);
    return NextResponse.json(
      { success: false, error: "Failed to cleanup dead workers" },
      { status: 500 }
    );
  }
}