import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware for authentication and security headers
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

/**
 * Apply comprehensive security headers to all responses
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy (CSP)
  const cspDirectives = [
    "default-src 'self'",
    // Allow scripts from self and inline (needed for Next.js)
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    // Allow styles from self, inline, and Google Fonts
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Allow images from self, data URLs, uploadthing, and Matrix homeservers
    "img-src 'self' data: https://uploadthing.com https://*.matrix.org https://matrix.org blob:",
    // Allow fonts from self and Google Fonts
    "font-src 'self' https://fonts.gstatic.com data:",
    // Allow connections to self, Matrix homeservers, and external APIs
    "connect-src 'self' https://*.matrix.org https://matrix.org https://tenor.googleapis.com https://uploadthing.com ws: wss:",
    // Allow media from self, Matrix homeservers, and uploadthing
    "media-src 'self' https://uploadthing.com https://*.matrix.org https://matrix.org blob:",
    // Restrict objects and embeds
    "object-src 'none'",
    "embed-src 'none'",
    // Allow frames only from same origin (prevents clickjacking)
    "frame-src 'self'",
    // Base URI restriction
    "base-uri 'self'",
    // Form action restriction
    "form-action 'self'",
    // Worker restrictions
    "worker-src 'self' blob:",
    // Manifest restrictions
    "manifest-src 'self'",
    // Upgrade insecure requests in production
    ...(process.env.NODE_ENV === 'production' ? ["upgrade-insecure-requests"] : [])
  ].join("; ");
  
  response.headers.set('Content-Security-Policy', cspDirectives);
  
  // HTTP Strict Transport Security (HSTS) - only in production with HTTPS
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  // X-Frame-Options - prevent embedding in frames (clickjacking protection)
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  
  // X-Content-Type-Options - prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Referrer-Policy - control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // X-XSS-Protection - legacy XSS protection (modern browsers use CSP)
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Permissions-Policy - control browser features
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), speaker=(self)'
  );
  
  // Cross-Origin-Embedder-Policy - control cross-origin embedding
  response.headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
  
  // Cross-Origin-Opener-Policy - control cross-origin window references
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  
  // Cross-Origin-Resource-Policy - control cross-origin resource loading
  response.headers.set('Cross-Origin-Resource-Policy', 'same-site');
  
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    const response = NextResponse.next();
    return applySecurityHeaders(response);
  }
  
  // TODO: Check Matrix session token
  // For now, allow all requests (development mode)
  const response = NextResponse.next();
  return applySecurityHeaders(response);
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"]
};

// Security headers implementation completed - p12-13-security-headers
