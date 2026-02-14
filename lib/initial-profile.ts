import { validateCurrentSession } from "@/lib/matrix/actions/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

/**
 * Get or create the initial profile for the current user using Matrix auth
 */
export const initialProfile = async () => {
  const result = await validateCurrentSession();

  if (!result.success || !result.data) {
    return redirect("/sign-in");
  }

  const { user } = result.data;

  const profile = await db.profile.findUnique({
    where: {
      userId: user.userId
    }
  });

  if (profile) return profile;

  // Extract localpart from Matrix ID for display name fallback
  const localpart = user.userId.startsWith('@') ? user.userId.slice(1).split(':')[0] : user.userId;
  const name = user.displayName || localpart;

  const newProfile = await db.profile.create({
    data: {
      userId: user.userId,
      name,
      imageUrl: user.avatarUrl || "",
      email: "" // Matrix doesn't expose email by default
    }
  });

  return newProfile;
};
