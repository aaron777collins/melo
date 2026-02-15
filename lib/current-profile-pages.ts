import { NextApiRequest } from "next";

import { db } from "@/lib/db";

/**
 * Get current profile for Pages API routes
 * 
 * Note: With Matrix auth, we use cookies instead of Clerk
 * This is deprecated but kept for compatibility
 */
export async function currentProfilePages(req: NextApiRequest) {
  // Get Matrix session from cookie
  const sessionCookie = req.cookies?.matrix_session;
  
  if (!sessionCookie) {
    return null;
  }
  
  try {
    const session = JSON.parse(sessionCookie);
    const { userId } = session;
    
    if (!userId) {
      return null;
    }
    
    // Try to find profile in database
    const profile = await db.profile.findUnique({
      where: { matrixUserId: userId }
    });
    
    // If no profile, return a virtual profile from session
    if (!profile) {
      return {
        id: userId,
        matrixUserId: userId,
        displayName: session.displayName || userId.split(':')[0].slice(1),
        avatarUrl: session.avatarUrl || null,
        email: null,
        settings: null,
        theme: "dark",
        locale: "en",
        cachedSession: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    
    return profile;
  } catch (error) {
    console.error("[currentProfilePages] Error:", error);
    return null;
  }
}
