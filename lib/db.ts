// Legacy db.ts - now using Matrix client
// This file is kept for backward compatibility but redirects to Matrix client

import { getMatrixClient } from "./matrix-client";

// For backward compatibility, export the Matrix client as 'db'
export const db = {
  // Matrix client instance
  get client() {
    return getMatrixClient();
  },
  
  // Helper methods that mimic Prisma-like interface for easier migration
  profile: {
    findUnique: async ({ where }: { where: { userId: string } }) => {
      const client = getMatrixClient();
      if (!client || !client.getUserId()) return null;
      
      // In Matrix, the user profile is the client's user
      if (client.getUserId() === where.userId) {
        const profile = client.getUser(where.userId);
        return {
          id: where.userId,
          userId: where.userId,
          name: profile?.displayName || where.userId,
          imageUrl: profile?.avatarUrl || "",
          email: "", // Matrix doesn't store email in profile
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      return null;
    },
    
    create: async (data: any) => {
      // Matrix users are created through registration, not database operations
      const client = getMatrixClient();
      if (!client) return null;
      
      return {
        id: client.getUserId() || "",
        userId: client.getUserId() || "",
        name: data.name || client.getUserId() || "",
        imageUrl: data.imageUrl || "",
        email: data.email || "",
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  }
};
