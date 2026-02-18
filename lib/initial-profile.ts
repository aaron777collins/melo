import { getMatrixClient } from "@/lib/matrix-client";
import { redirect } from "next/navigation";

export const initialProfile = async () => {
  const client = getMatrixClient();

  // If no Matrix client or not logged in, redirect to login
  if (!client || !client.getUserId()) {
    return redirect("/login");
  }

  const userId = client.getUserId();
  if (!userId) {
    return redirect("/login");
  }

  // Get user profile from Matrix client
  const user = client.getUser(userId);
  
  // In Matrix, we don't need to create a profile in database - it exists in Matrix
  const profile = {
    id: userId,
    userId: userId,
    name: user?.displayName || userId.replace(/@|:.*/g, ''), // Extract username from Matrix ID
    imageUrl: user?.avatarUrl || "",
    email: "", // Matrix doesn't store email in profile
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return profile;
};
