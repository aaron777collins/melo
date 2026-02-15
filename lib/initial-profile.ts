import { validateCurrentSession } from "@/lib/matrix/actions/auth";
import { redirect } from "next/navigation";
import { MatrixProfile } from "@/lib/current-profile";

/**
 * Get the initial profile for the current user using Matrix auth
 * 
 * This is a Matrix-native implementation that doesn't require a database.
 * The profile is derived from the Matrix session data.
 */
export const initialProfile = async (): Promise<MatrixProfile> => {
  const result = await validateCurrentSession();

  if (!result.success || !result.data) {
    return redirect("/sign-in");
  }

  const { user } = result.data;

  // Extract localpart from Matrix ID for display name fallback
  const localpart = user.userId.startsWith('@') ? user.userId.slice(1).split(':')[0] : user.userId;
  const name = user.displayName || localpart;

  // Create a profile object from the Matrix session
  const profile: MatrixProfile = {
    id: user.userId,
    userId: user.userId,
    name: name,
    imageUrl: user.avatarUrl || null,
    email: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return profile;
};
