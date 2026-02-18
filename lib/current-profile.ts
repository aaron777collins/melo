import { getMatrixClient } from "@/lib/matrix-client";

export const currentProfile = async () => {
  const client = getMatrixClient();
  
  if (!client || !client.getUserId()) {
    return null;
  }

  const userId = client.getUserId();
  if (!userId) return null;
  
  // Get user profile from Matrix client
  const user = client.getUser(userId);
  
  return {
    id: userId,
    userId: userId,
    name: user?.displayName || userId.replace(/@|:.*/g, ''), // Extract username from Matrix ID
    imageUrl: user?.avatarUrl || "",
    email: "", // Matrix doesn't store email in profile
    createdAt: new Date(), // We can't get exact creation date from Matrix
    updatedAt: new Date()
  };
};
