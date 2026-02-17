import { NextResponse } from "next/server";
import { validateSession as matrixValidateSession, MatrixAuthError } from "@/lib/matrix/auth";
import { setSessionCookie, getTempSessionCookie, clearTempSessionCookie } from "@/lib/matrix/cookies";
import * as OTPAuth from "otplib";
import { createClient } from "matrix-js-sdk";

interface TwoFactorData {
  enabled: boolean;
  secret?: string;
  backupCodes?: string[];
  setupComplete?: boolean;
}

/**
 * Verify 2FA Code
 * 
 * Verifies a TOTP or backup code for 2FA authentication.
 * Completes the login process if verification succeeds.
 * 
 * @swagger
 * /api/auth/verify-2fa:
 *   post:
 *     summary: Verify 2FA code
 *     description: Verify TOTP or backup code to complete 2FA authentication
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: TOTP code from authenticator app or backup code
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: 2FA verification successful
 *       400:
 *         description: Missing code or invalid session
 *       401:
 *         description: Invalid 2FA code
 *       500:
 *         description: Server error
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: { code: "M_BAD_JSON", message: "Code is required" } },
        { status: 400 }
      );
    }

    // Get temporary session from cookie (set during initial login)
    const tempSession = await getTempSessionCookie();
    if (!tempSession) {
      return NextResponse.json(
        { error: { code: "M_INVALID_REQUEST", message: "No pending 2FA session" } },
        { status: 400 }
      );
    }

    // Create Matrix client to get account data
    const client = createClient({
      baseUrl: tempSession.homeserverUrl,
      accessToken: tempSession.accessToken,
      userId: tempSession.userId,
    });

    // Get 2FA data from Matrix account data
    let accountData;
    try {
      await client.startClient({ initialSyncLimit: 0 });
      // Wait briefly for initial sync
      await new Promise(resolve => setTimeout(resolve, 100));
      accountData = client.getAccountData('im.haos.two_factor');
    } catch (error) {
      console.error("[2FA_VERIFY] Failed to get account data:", error);
      return NextResponse.json(
        { error: { code: "M_UNKNOWN", message: "Failed to retrieve 2FA settings" } },
        { status: 500 }
      );
    } finally {
      client.stopClient();
    }

    const twoFactorData = accountData?.getContent() as TwoFactorData;
    if (!twoFactorData?.enabled || !twoFactorData.secret) {
      return NextResponse.json(
        { error: { code: "M_INVALID_REQUEST", message: "2FA not enabled" } },
        { status: 400 }
      );
    }

    // Verify code (TOTP or backup code)
    const cleanCode = code.replace(/\s/g, '');
    let isValid = false;

    // Try TOTP verification first
    try {
      isValid = OTPAuth.authenticator.verify({
        token: cleanCode,
        secret: twoFactorData.secret
      });
    } catch (error) {
      console.warn("[2FA_VERIFY] TOTP verification failed:", error);
    }

    // If TOTP failed, try backup codes
    if (!isValid && twoFactorData.backupCodes) {
      isValid = twoFactorData.backupCodes.includes(cleanCode.toUpperCase());
      
      // If backup code was used, remove it from the list
      if (isValid) {
        const updatedCodes = twoFactorData.backupCodes.filter(
          backupCode => backupCode !== cleanCode.toUpperCase()
        );
        
        try {
          // Update account data to remove used backup code
          await client.startClient({ initialSyncLimit: 0 });
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const updatedData: TwoFactorData = {
            ...twoFactorData,
            backupCodes: updatedCodes
          };
          
          await client.setAccountData('im.haos.two_factor', updatedData);
        } catch (error) {
          console.error("[2FA_VERIFY] Failed to update backup codes:", error);
          // Don't fail the login for this, just log it
        } finally {
          client.stopClient();
        }
      }
    }

    if (!isValid) {
      return NextResponse.json(
        { error: { code: "M_FORBIDDEN", message: "Invalid verification code" } },
        { status: 401 }
      );
    }

    // Verification successful - complete the login
    // Move temporary session to permanent session cookie
    await setSessionCookie(tempSession);
    await clearTempSessionCookie();

    // Get user profile
    const user = await matrixValidateSession(tempSession.accessToken, {
      homeserverUrl: tempSession.homeserverUrl,
      includeProfile: true,
    });

    console.log("[2FA_VERIFY] 2FA verification successful for:", user.userId);

    return NextResponse.json({
      success: true,
      data: { session: tempSession, user }
    });

  } catch (error) {
    console.error("[2FA_VERIFY]", error);
    
    // Clear temp session on any error
    await clearTempSessionCookie();

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
          message: error instanceof Error ? error.message : "2FA verification failed" 
        } 
      },
      { status: 500 }
    );
  }
}