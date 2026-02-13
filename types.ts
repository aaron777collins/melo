import { Member, Profile, Server } from "@prisma/client";

/**
 * Legacy types for Prisma-based components.
 * These are used by the server sidebar components that still reference
 * the old Prisma data model. Eventually these should be migrated to 
 * use Matrix data types instead.
 */

export type ServerWithMembersWithProfiles = Server & {
  members: (Member & { profile: Profile })[];
};
