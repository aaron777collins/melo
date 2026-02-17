import { NextResponse } from "next/server";
import { serverValidateInviteCode } from "@/lib/matrix/server-invites";
import { getAccessControlConfig, extractDomain, homeserversMatch } from "@/lib/matrix/access-control";

/**
 * Invite Code Validation API
 * 
 * Validates an invite code for registration. This endpoint is UNAUTHENTICATED
 * because it's used during the sign-up flow before the user has an account.
 * 
 * @swagger
 * /api/auth/validate-invite:
 *   post:
 *     summary: Validate an invite code for registration
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
 *                 description: The invite code to validate
 *                 example: inv_1739832456789_abc123def
 *               username:
 *                 type: string
 *                 description: Desired username (localpart)
 *                 example: alice
 *               homeserverUrl:
 *                 type: string
 *                 description: Target homeserver URL
 *                 example: https://external.org
 *     responses:
 *       200:
 *         description: Validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   description: Whether the invite is valid
 *                 required:
 *                   type: boolean
 *                   description: Whether an invite is required for this homeserver
 *                 reason:
 *                   type: string
 *                   description: Reason if invalid
 *                 code:
 *                   type: string
 *                   description: Error code for programmatic handling
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { inviteCode, username, homeserverUrl } = body;

    // Validate required fields
    if (!username) {
      return NextResponse.json(
        { valid: false, reason: "Username is required", code: "MISSING_USERNAME" },
        { status: 400 }
      );
    }

    if (!homeserverUrl) {
      return NextResponse.json(
        { valid: false, reason: "Homeserver URL is required", code: "MISSING_HOMESERVER" },
        { status: 400 }
      );
    }

    // Get access control configuration
    const config = getAccessControlConfig();

    // In public mode, invites are never required
    if (config.publicMode) {
      return NextResponse.json({
        valid: true,
        required: false,
        message: "Public mode - no invite required"
      });
    }

    // Check if this is the configured homeserver
    const isConfiguredHomeserver = config.allowedHomeserver && 
      homeserversMatch(homeserverUrl, config.allowedHomeserver);

    // For configured homeserver, invites are not required
    if (isConfiguredHomeserver) {
      return NextResponse.json({
        valid: true,
        required: false,
        message: "Registration on configured homeserver - no invite required"
      });
    }

    // External homeserver - invite IS required
    if (!inviteCode) {
      return NextResponse.json({
        valid: false,
        required: true,
        reason: "Invite code is required for external homeserver registration",
        code: "INVITE_REQUIRED"
      });
    }

    // Construct the Matrix user ID
    const homeserverDomain = extractDomain(homeserverUrl);
    const userId = `@${username}:${homeserverDomain}`;

    // Validate the invite code
    const result = serverValidateInviteCode(inviteCode, userId);

    return NextResponse.json({
      valid: result.valid,
      required: true,
      reason: result.reason,
      code: result.code
    });

  } catch (error) {
    console.error("[VALIDATE_INVITE]", error);
    return NextResponse.json(
      { 
        valid: false, 
        reason: error instanceof Error ? error.message : "Validation failed",
        code: "UNKNOWN_ERROR"
      },
      { status: 500 }
    );
  }
}
