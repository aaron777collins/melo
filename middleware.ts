import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware for authentication
 * 
 * TODO: Implement Matrix session validation
 * - Check for valid Matrix access token
 * - Redirect to sign-in if not authenticated
 * - Allow public routes
 */

const publicRoutes = [
  "/api/uploadthing",
  "/sign-in",
  "/sign-up",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  // TODO: Check Matrix session token
  // For now, allow all requests (development mode)
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"]
};
