/**
 * Job Queue Admin API
 * 
 * Provides REST endpoints for job queue management and monitoring.
 */

import { NextRequest, NextResponse } from "next/server";
import { jobQueue } from "@/lib/jobs/queue";
import { getAvailableJobTypes } from "@/lib/jobs/handlers";

// GET /api/admin/jobs - List jobs with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get("status") || undefined;
    const type = searchParams.get("type") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const orderBy = (searchParams.get("orderBy") as "createdAt" | "scheduledAt" | "priority") || "createdAt";
    const orderDir = (searchParams.get("orderDir") as "asc" | "desc") || "desc";
    
    const jobs = await jobQueue.getJobs({
      status,
      type,
      limit: Math.min(limit, 100), // Cap at 100
      offset,
      orderBy,
      orderDir,
    });
    
    return NextResponse.json({
      success: true,
      data: jobs,
      pagination: {
        limit,
        offset,
        orderBy,
        orderDir,
      },
    });
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}

// POST /api/admin/jobs - Create a new job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, payload, options = {} } = body;
    
    if (!type || !payload) {
      return NextResponse.json(
        { success: false, error: "Type and payload are required" },
        { status: 400 }
      );
    }
    
    // Validate job type
    const availableTypes = getAvailableJobTypes();
    if (!availableTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: `Invalid job type: ${type}` },
        { status: 400 }
      );
    }
    
    const job = await jobQueue.add(type, payload, options);
    
    return NextResponse.json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error("Failed to create job:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create job" },
      { status: 500 }
    );
  }
}