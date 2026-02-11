import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Get the current user's profile from the database
 * 
 * TODO: Use Matrix session for authentication
 */
export const currentProfile = async () => {
  const { userId } = auth();

  if (!userId) return null;

  const profile = await db.profile.findUnique({
    where: { userId }
  });

  return profile;
};
