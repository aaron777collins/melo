import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // For Matrix authentication, we'll check on the client side
  // This middleware will be simpler since Matrix auth is client-based
  
  // Allow public routes
  const publicRoutes = [
    "/login",
    "/register", 
    "/api/auth",
    "/_next",
    "/favicon.ico",
    "/images"
  ];

  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  // For now, allow all routes since Matrix auth is handled client-side
  // In a production app, you might want to check for Matrix tokens here
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"]
};
