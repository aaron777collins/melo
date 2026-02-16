/**
 * Job Queue Admin API
 * 
 * Provides REST endpoints for job queue management and monitoring.
 */

import { NextRequest, NextResponse } from "next/server";
import { jobQueue } from "@/lib/jobs/queue";
import { getAvailableJobTypes } from "@/lib/jobs/handlers";

/**
 * List Background Jobs
 * 
 * Retrieves a paginated list of background jobs with optional filtering by status and type.
 * Supports sorting and limiting results.
 * 
 * @swagger
 * /api/admin/jobs:
 *   get:
 *     summary: List background jobs
 *     description: Get paginated list of jobs with filtering and sorting options
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, running, completed, failed]
 *         description: Filter jobs by status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter jobs by type
 *       - $ref: '#/components/parameters/limitParam'
 *       - $ref: '#/components/parameters/offsetParam'
 *       - $ref: '#/components/parameters/orderByParam'
 *       - $ref: '#/components/parameters/orderDirParam'
 *     responses:
 *       200:
 *         description: List of jobs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BackgroundJob'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     orderBy:
 *                       type: string
 *                     orderDir:
 *                       type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/Error'
 */
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

/**
 * Create Background Job
 * 
 * Creates a new background job with the specified type and payload.
 * Jobs are executed asynchronously by worker processes.
 * 
 * @swagger
 * /api/admin/jobs:
 *   post:
 *     summary: Create new background job
 *     description: Add a new job to the background processing queue
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - payload
 *             properties:
 *               type:
 *                 type: string
 *                 description: Job type (must be a registered job handler)
 *                 example: notification
 *               payload:
 *                 type: object
 *                 description: Job-specific data
 *                 example:
 *                   userId: "@alice:example.com"
 *                   message: "Welcome to HAOS!"
 *               options:
 *                 type: object
 *                 description: Job execution options
 *                 properties:
 *                   priority:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 10
 *                     description: Job priority (higher numbers = higher priority)
 *                     example: 1
 *                   delay:
 *                     type: integer
 *                     description: Delay before execution in milliseconds
 *                     example: 5000
 *                   retries:
 *                     type: integer
 *                     description: Maximum retry attempts
 *                     example: 3
 *     responses:
 *       200:
 *         description: Job created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/BackgroundJob'
 *       400:
 *         description: Invalid job type or missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/Error'
 */
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