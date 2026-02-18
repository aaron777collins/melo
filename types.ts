// Re-export all types from types/index.ts
export * from "@/types/index";

import { Member, Profile, Server } from "@/types/index";
import { NextApiResponse } from "next";

export type ServerWithMembersWithProfiles = Server & {
  members: (Member & { profile: Profile })[];
};

// Keeping for compatibility - Matrix doesn't use socket.io
export type NextApiResponseServerIo = NextApiResponse;
