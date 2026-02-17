import { NextResponse } from "next/server";
import { loginWithPassword, validateSession as matrixValidateSession, MatrixAuthError } from "@/lib/matrix/auth";
import { setSessionCookie, setTempSessionCookie } from "@/lib/matrix/cookies";
import { createClient } from "@/lib/matrix/matrix-sdk-exports";
import { isLoginAllowedWithInvite, getAccessControlConfig, markInviteUsedServerSide, extractDomain } from "@/lib/matrix/access-control";

/**
 * Matrix Authentication Login
 * 
 * Authenticates a user with Matrix homeserver credentials and establishes a session.
 * Returns user information and sets HTTP-only session cookies.
 * 
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with Matrix credentials
 *     description: Authenticate user with Matrix homeserver and create session
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Matrix username (without @ or homeserver)
 *                 example: alice
 *               password:
 *                 type: string
 *                 description: Matrix account password
 *                 example: secure_password123
 *               homeserverUrl:
 *                 type: string
 *                 format: uri
 *                 description: Matrix homeserver URL (optional, uses default if not provided)
 *                 example: https://matrix.example.com
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             description: HTTP-only session cookie
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     session:
 *                       $ref: '#/components/schemas/MatrixSession'
 *                     user:
 *                       $ref: '#/components/schemas/MatrixUser'
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: M_BAD_JSON
 *                     message:
 *                       type: string
 *                       example: Username and password are required
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Login failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password, homeserverUrl } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: { code: "M_BAD_JSON", message: "Username and password are required" } },
        { status: 400 }
      );
    }

    // Get the target homeserver URL
    const targetHomeserver = homeserverUrl || process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL;

    // Construct the full Matrix user ID for access control check
    // The username might already be a full user ID (@user:server.com) or just localpart
    let userId: string;
    if (username.startsWith('@') && username.includes(':')) {
      // Already a full Matrix user ID
      userId = username;
    } else {
      // Localpart only - construct full user ID from homeserver
      const domain = extractDomain(targetHomeserver);
      userId = `@${username}:${domain}`;
    }

    // Access Control Check - BEFORE Matrix authentication
    // This checks both homeserver AND invite status for external users
    const accessCheck = isLoginAllowedWithInvite(targetHomeserver, userId);
    if (!accessCheck.allowed) {
      console.log("[AUTH_LOGIN] Access denied:", accessCheck.code, "for user:", userId, "homeserver:", targetHomeserver);
      const config = getAccessControlConfig();
      return NextResponse.json(
        { 
          success: false,
          error: { 
            code: accessCheck.code || "M_FORBIDDEN", 
            message: accessCheck.reason || "Access denied",
            privateMode: config.privateMode,
            allowedHomeserver: config.allowedHomeserver,
            inviteRequired: accessCheck.code === 'INVITE_REQUIRED',
          } 
        },
        { status: 403 }
      );
    }
    
    // Track if this is an external user with invite (we'll mark it used after success)
    const config = getAccessControlConfig();
    const isExternalUser = config.allowedHomeserver && 
      extractDomain(targetHomeserver) !== extractDomain(config.allowedHomeserver);

    // Perform Matrix login
    console.log("[AUTH_LOGIN] Attempting login for:", username, "to", targetHomeserver);
    
    const session = await loginWithPassword(username, password, {
      homeserverUrl: homeserverUrl || process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL,
      deviceDisplayName: "Melo Web",
      requestRefreshToken: true,
    });

    console.log("[AUTH_LOGIN] Login successful, userId:", session.userId, "deviceId:", session.deviceId);
    console.log("[AUTH_LOGIN] Access token prefix:", session.accessToken?.substring(0, 20) + "...");

    // Check if user has 2FA enabled
    let twoFactorEnabled = false;
    try {
      const client = createClient({
        baseUrl: session.homeserverUrl,
        accessToken: session.accessToken,
        userId: session.userId,
      });

      await client.startClient({ initialSyncLimit: 0 });
      // Wait briefly for initial sync to get account data
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Use type assertion for custom account data key
      const accountData = client.getAccountData('im.melo.two_factor' as any);
      const twoFactorData = accountData?.getContent();
      twoFactorEnabled = twoFactorData?.enabled === true && twoFactorData?.secret;
      
      client.stopClient();
      
      console.log("[AUTH_LOGIN] 2FA status:", twoFactorEnabled ? "enabled" : "disabled");
    } catch (error) {
      console.warn("[AUTH_LOGIN] Failed to check 2FA status:", error);
      // Continue with regular login flow if we can't check 2FA
    }

    // If 2FA is enabled, store temporary session and require verification
    if (twoFactorEnabled) {
      await setTempSessionCookie(session);
      
      return NextResponse.json({
        success: true,
        requiresTwoFactor: true,
        message: "Two-factor authentication required"
      });
    }

    // Regular login flow - store session in cookie
    await setSessionCookie(session);

    // Get user profile
    console.log("[AUTH_LOGIN] Validating session with homeserver:", session.homeserverUrl);
    const user = await matrixValidateSession(session.accessToken, {
      homeserverUrl: session.homeserverUrl,
      includeProfile: true,
    });
    
    console.log("[AUTH_LOGIN] User validated:", user.userId, user.displayName);

    // Mark invite as used if this was an external user login
    if (isExternalUser) {
      const inviteMarked = markInviteUsedServerSide(session.userId);
      if (inviteMarked) {
        console.log("[AUTH_LOGIN] Invite marked as used for external user:", session.userId);
      }
    }

    return NextResponse.json({
      success: true,
      data: { session, user }
    });

  } catch (error) {
    console.error("[AUTH_LOGIN]", error);

    if (error instanceof MatrixAuthError) {
      return NextResponse.json(
        { 
          success: false,
          error: error.toAuthError() 
        },
        { status: error.httpStatus || 500 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: { 
          code: "M_UNKNOWN", 
          message: error instanceof Error ? error.message : "Login failed" 
        } 
      },
      { status: 500 }
    );
  }
}
