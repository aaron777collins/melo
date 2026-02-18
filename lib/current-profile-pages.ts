import { NextApiRequest } from "next";

export const currentProfilePages = async (req: NextApiRequest) => {
  // For Matrix auth in pages API routes, we would need to check tokens
  // For now, returning null since we're focusing on App Router
  // This would need proper implementation based on Matrix auth tokens
  
  // TODO: Implement Matrix token validation for Pages API routes
  // const authHeader = req.headers.authorization;
  // if (!authHeader) return null;
  
  // For now, return null to disable Pages API routes
  return null;
};
