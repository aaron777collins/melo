import { NextResponse } from "next/server";
import { serverMarkInviteUsed } from "@/lib/matrix/server-invites";
import { extractDomain } from "@/lib/matrix/access-control";

/**
 * Mark Invite as Used API
 * 
 * Called after successful registration to mark an invite code as used.
 * This prevents the same invite from being used again.
 * 
 * @swagger
 * /api/auth/use-invite:
 *   post:
 *     summary: Mark an invite code as used
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - inviteCode
 *               - username
 *               - homeserverUrl
 *             properties:
 *               inviteCode:
 *                 type: string
 *                 description: The invite code that was used
 *               username:
 *                 type: string
 *                 description: Username that registered
 *               homeserverUrl:
 *                 type: string
 *                 description: Homeserver URL
 *     responses:
 *       200:
 *         description: Invite marked as used
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Failed to mark invite as used
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { inviteCode, username, homeserverUrl } = body;

    if (!inviteCode || !username || !homeserverUrl) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Construct the Matrix user ID
    const homeserverDomain = extractDomain(homeserverUrl);
    const userId = `@${username}:${homeserverDomain}`;

    // Mark the invite as used
    const success = serverMarkInviteUsed(userId);

    if (!success) {
      console.warn(`[USE_INVITE] Failed to mark invite as used for ${userId}`);
      // Don't return error - registration already succeeded
      // This is best-effort cleanup
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("[USE_INVITE]", error);
    // Don't fail the request - registration already succeeded
    return NextResponse.json({ success: true });
  }
}
