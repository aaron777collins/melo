import { getAuth } from "@/lib/auth-server";
import { NextApiRequest } from "next";
import { db } from "@/lib/db";

/**
 * Get the current user's profile for API routes (pages directory)
 * 
 * TODO: Use Matrix session for authentication
 */
export const currentProfilePages = async (req: NextApiRequest) => {
  const { userId } = getAuth(req);

  if (!userId) return null;

  const profile = await db.profile.findUnique({
    where: { userId }
  });

  return profile;
};
