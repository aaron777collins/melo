import { Member, Profile, Server } from "@/types";
import { NextApiResponse } from "next";

export type ServerWithMembersWithProfiles = Server & {
  members: (Member & { profile: Profile })[];
};

// Keeping for compatibility - Matrix doesn't use socket.io
export type NextApiResponseServerIo = NextApiResponse;
