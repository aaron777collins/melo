import { NextResponse } from "next/server";
import { loginWithPassword, validateSession as matrixValidateSession, MatrixAuthError } from "@/lib/matrix/auth";
import { setSessionCookie } from "@/lib/matrix/cookies";

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

    // Perform Matrix login
    console.log("[AUTH_LOGIN] Attempting login for:", username, "to", homeserverUrl);
    
    const session = await loginWithPassword(username, password, {
      homeserverUrl: homeserverUrl || process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL,
      deviceDisplayName: "HAOS Web",
      requestRefreshToken: true,
    });

    console.log("[AUTH_LOGIN] Login successful, userId:", session.userId, "deviceId:", session.deviceId);
    console.log("[AUTH_LOGIN] Access token prefix:", session.accessToken?.substring(0, 20) + "...");

    // Store session in cookie
    await setSessionCookie(session);

    // Get user profile
    console.log("[AUTH_LOGIN] Validating session with homeserver:", session.homeserverUrl);
    const user = await matrixValidateSession(session.accessToken, {
      homeserverUrl: session.homeserverUrl,
      includeProfile: true,
    });
    
    console.log("[AUTH_LOGIN] User validated:", user.userId, user.displayName);

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
