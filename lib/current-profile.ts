import { validateCurrentSession } from "@/lib/matrix/actions/auth";
import { db } from "@/lib/db";

/**
 * Get the current user's profile from the database using Matrix authentication
 */
export const currentProfile = async () => {
  const result = await validateCurrentSession();

  if (!result.success || !result.data) return null;

  const { user } = result.data;

  const profile = await db.profile.findUnique({
    where: { userId: user.userId }
  });

  return profile;
};
