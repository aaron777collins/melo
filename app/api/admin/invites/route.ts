import { NextResponse } from "next/server";
import { getSessionCookie } from "@/lib/matrix/cookies";
import { 
  createAdminInvite, 
  listAdminInvites, 
  revokeAdminInvite,
  getAdminInvitesStatus 
} from "@/lib/matrix/admin-invites";
import { getAccessControlConfig } from "@/lib/matrix/access-control";

/**
 * Admin Invites API
 * 
 * Endpoints for managing admin invites for external users in private mode.
 * Only authenticated users can access these endpoints.
 * 
 * In a production system, you'd also want to verify the user has admin permissions.
 * For now, any authenticated user from the configured homeserver can manage invites.
 * 
 * @swagger
 * /api/admin/invites:
 *   get:
 *     summary: List all admin invites
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: includeUsed
 *         schema:
 *           type: boolean
 *         description: Include used invites
 *       - in: query
 *         name: includeExpired
 *         schema:
 *           type: boolean
 *         description: Include expired invites
 *     responses:
 *       200:
 *         description: List of invites
 *       401:
 *         description: Not authenticated
 *   post:
 *     summary: Create a new admin invite
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Matrix user ID to invite
 *               expirationDays:
 *                 type: number
 *                 description: Days until invite expires (default 30)
 *               notes:
 *                 type: string
 *                 description: Optional notes about the invite
 *     responses:
 *       200:
 *         description: Invite created
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Not authenticated
 *   delete:
 *     summary: Revoke an invite
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - inviteId
 *             properties:
 *               inviteId:
 *                 type: string
 *                 description: The invite ID to revoke
 *     responses:
 *       200:
 *         description: Invite revoked
 *       401:
 *         description: Not authenticated
 */

/**
 * GET /api/admin/invites
 * 
 * List all admin invites
 */
export async function GET(req: Request) {
  try {
    // Check authentication
    const session = await getSessionCookie();
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "M_UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    // Get access control config
    const config = getAccessControlConfig();

    // Parse query params
    const { searchParams } = new URL(req.url);
    const includeUsed = searchParams.get("includeUsed") === "true";
    const includeExpired = searchParams.get("includeExpired") === "true";
    const statusOnly = searchParams.get("status") === "true";

    // If just requesting status
    if (statusOnly) {
      const status = await getAdminInvitesStatus();
      return NextResponse.json({
        success: true,
        data: {
          ...status,
          privateMode: config.privateMode,
          inviteOnly: config.inviteOnly,
        }
      });
    }

    // Get invites
    const result = await listAdminInvites({ includeUsed, includeExpired });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "M_UNKNOWN", message: result.error || "Failed to list invites" } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        invites: result.invites || [],
        privateMode: config.privateMode,
        inviteOnly: config.inviteOnly,
      }
    });
  } catch (error) {
    console.error("[ADMIN_INVITES_GET]", error);
    return NextResponse.json(
      { success: false, error: { code: "M_UNKNOWN", message: "Failed to list invites" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/invites
 * 
 * Create a new admin invite
 */
export async function POST(req: Request) {
  try {
    // Check authentication
    const session = await getSessionCookie();
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "M_UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { userId, expirationDays, notes } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "M_BAD_JSON", message: "userId is required" } },
        { status: 400 }
      );
    }

    // Validate userId format
    if (!userId.match(/^@[^:]+:.+$/)) {
      return NextResponse.json(
        { success: false, error: { code: "M_BAD_JSON", message: "Invalid Matrix user ID format (expected @user:server.com)" } },
        { status: 400 }
      );
    }

    // Calculate expiration
    const expirationMs = expirationDays 
      ? expirationDays * 24 * 60 * 60 * 1000 
      : undefined;

    // Create invite
    const result = await createAdminInvite(userId, {
      expirationMs,
      notes,
    });

    if (!result.success && !result.invite) {
      return NextResponse.json(
        { success: false, error: { code: "M_UNKNOWN", message: result.error || "Failed to create invite" } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        invite: result.invite,
        isExisting: !!result.error, // If there's an error message but also an invite, it was existing
      }
    });
  } catch (error) {
    console.error("[ADMIN_INVITES_POST]", error);
    return NextResponse.json(
      { success: false, error: { code: "M_UNKNOWN", message: "Failed to create invite" } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/invites
 * 
 * Revoke an admin invite
 */
export async function DELETE(req: Request) {
  try {
    // Check authentication
    const session = await getSessionCookie();
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "M_UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { inviteId } = body;

    if (!inviteId) {
      return NextResponse.json(
        { success: false, error: { code: "M_BAD_JSON", message: "inviteId is required" } },
        { status: 400 }
      );
    }

    // Revoke invite
    const result = await revokeAdminInvite(inviteId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "M_NOT_FOUND", message: result.error || "Invite not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_INVITES_DELETE]", error);
    return NextResponse.json(
      { success: false, error: { code: "M_UNKNOWN", message: "Failed to revoke invite" } },
      { status: 500 }
    );
  }
}
