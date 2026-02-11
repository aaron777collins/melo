/**
 * Server-side auth utilities for API routes (pages directory)
 * 
 * TODO: Implement Matrix authentication for API routes
 */

import { NextApiRequest } from "next";

export function getAuth(req: NextApiRequest): { userId: string | null } {
  // TODO: Replace with Matrix session check from request
  // Check for session token in cookies/headers
  return { userId: null };
}
