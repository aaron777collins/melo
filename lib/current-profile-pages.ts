import { getSessionCookie } from "@/lib/matrix/cookies";
import { validateSession } from "@/lib/matrix/auth";
import { NextApiRequest } from "next";
import { db } from "@/lib/db";

/**
 * Get the current user's profile for API routes (pages directory) using Matrix authentication
 */
export const currentProfilePages = async (req: NextApiRequest) => {
  try {
    // Get session from cookie
    const session = await getSessionCookie();
    
    if (!session) return null;

    // Validate the session is still valid
    const user = await validateSession(session.accessToken, {
      homeserverUrl: session.homeserverUrl,
      includeProfile: false // We just need user ID validation
    });

    // Get profile from database
    const profile = await db.profile.findUnique({
      where: { userId: user.userId }
    });

    return profile;
  } catch (error) {
    // Session validation failed - return null
    console.error("Session validation failed in currentProfilePages:", error);
    return null;
  }
};
