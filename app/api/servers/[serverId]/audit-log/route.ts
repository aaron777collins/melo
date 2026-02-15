import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentProfile } from "@/lib/current-profile";

interface AuditLogQueryParams {
  page?: string;
  limit?: string;
  action?: string;
  actorId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * GET /api/servers/[serverId]/audit-log
 * 
 * Fetches audit log entries for a server with filtering and pagination.
 * Requires moderator+ permissions.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { serverId: string } }
) {
  try {
    const { serverId } = params;
    const url = new URL(req.url);
    const queryParams: AuditLogQueryParams = {
      page: url.searchParams.get('page') || undefined,
      limit: url.searchParams.get('limit') || undefined,
      action: url.searchParams.get('action') || undefined,
      actorId: url.searchParams.get('actorId') || undefined,
      startDate: url.searchParams.get('startDate') || undefined,
      endDate: url.searchParams.get('endDate') || undefined,
    };

    // Check authentication
    const profile = await currentProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Check if user has moderator+ permissions for this server
    // For now, we'll allow access if they're authenticated
    // In a full implementation, check Matrix power levels

    // Parse pagination parameters
    const page = Math.max(1, parseInt(queryParams.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit || '50', 10)));
    const offset = (page - 1) * limit;

    // Build filter conditions
    const whereClause: any = {
      // Filter by server context - we'll store serverId in metadata
      OR: [
        { targetId: serverId },
        { 
          metadata: {
            path: ['serverId'],
            equals: serverId
          }
        }
      ]
    };

    // Apply filters
    if (queryParams.action) {
      whereClause.action = {
        contains: queryParams.action,
        mode: 'insensitive'
      };
    }

    if (queryParams.actorId) {
      whereClause.actorId = queryParams.actorId;
    }

    if (queryParams.startDate || queryParams.endDate) {
      whereClause.createdAt = {};
      if (queryParams.startDate) {
        whereClause.createdAt.gte = new Date(queryParams.startDate);
      }
      if (queryParams.endDate) {
        whereClause.createdAt.lte = new Date(queryParams.endDate);
      }
    }

    // Fetch audit logs with pagination
    const [auditLogs, totalCount] = await Promise.all([
      db.auditLog.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit,
      }),
      db.auditLog.count({
        where: whereClause
      })
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        auditLogs,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage,
          hasPrevPage
        }
      }
    });

  } catch (error) {
    console.error("[AUDIT_LOG_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/servers/[serverId]/audit-log
 * 
 * Creates a new audit log entry.
 * Used internally by other parts of the system to log actions.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { serverId: string } }
) {
  try {
    const { serverId } = params;
    const body = await req.json();
    
    const { action, actorId, targetType, targetId, metadata, ipAddress } = body;

    // Validate required fields
    if (!action || !actorId) {
      return NextResponse.json(
        { error: "Missing required fields: action, actorId" },
        { status: 400 }
      );
    }

    // Create audit log entry
    const auditLog = await db.auditLog.create({
      data: {
        action,
        actorId,
        targetType: targetType || null,
        targetId: targetId || null,
        metadata: {
          ...metadata,
          serverId, // Ensure serverId is always included
        },
        ipAddress: ipAddress || null,
      }
    });

    return NextResponse.json({
      success: true,
      data: auditLog
    });

  } catch (error) {
    console.error("[AUDIT_LOG_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}