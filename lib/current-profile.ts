import { validateCurrentSession } from "@/lib/matrix/actions/auth";

/**
 * Matrix Profile type (replacing Prisma Profile)
 */
export interface MatrixProfile {
  id: string;
  userId: string;
  name: string;
  imageUrl: string | null;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get the current user's profile from the Matrix session
 * 
 * This is a Matrix-native implementation that doesn't require a database.
 * Profile data is derived from the Matrix session.
 */
export const currentProfile = async (): Promise<MatrixProfile | null> => {
  const result = await validateCurrentSession();

  if (!result.success || !result.data) return null;

  const { user } = result.data;

  // Create a profile object from the Matrix session
  // In Matrix, the user ID is the primary identifier
  const profile: MatrixProfile = {
    id: user.userId,
    userId: user.userId,
    name: user.displayName || user.userId.split(":")[0].replace("@", ""),
    imageUrl: user.avatarUrl || null,
    email: null, // Matrix doesn't expose email by default
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return profile;
};

/**
 * Get profile by user ID (for other users)
 */
export const getProfileByUserId = async (userId: string): Promise<MatrixProfile | null> => {
  // For now, just return a basic profile structure
  // In a full implementation, you'd fetch this from the Matrix server
  const profile: MatrixProfile = {
    id: userId,
    userId: userId,
    name: userId.split(":")[0].replace("@", ""),
    imageUrl: null,
    email: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return profile;
};
