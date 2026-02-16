import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit, getRateLimitConfig, addRateLimitHeaders, createRateLimitResponse } from "./lib/rate-limiting";
import { loggingMiddleware } from "./middleware/logging-middleware";
import { generateCorrelationId } from "./lib/logging/logger";

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const startTime = Date.now();
  
  // Generate correlation ID for request tracing
  const correlationId = request.headers.get('x-correlation-id') || generateCorrelationId();
  
  // Create a new request with correlation ID
  const requestWithCorrelation = new Request(request.url, {
    method: request.method,
    headers: {
      ...Object.fromEntries(request.headers.entries()),
      'x-correlation-id': correlationId,
    },
    body: request.body,
  });
  
  try {
    // Apply logging middleware first for all requests
    await loggingMiddleware(request);
    
    // Apply rate limiting to API routes
    if (pathname.startsWith('/api/')) {
      try {
        const config = await getRateLimitConfig(request);
        const result = await rateLimit(request, config);
        
        if (!result.allowed) {
          // Rate limit exceeded - return 429 response with logging headers
          const rateLimitResponse = createRateLimitResponse(result, config.message);
          rateLimitResponse.headers.set('x-correlation-id', correlationId);
          rateLimitResponse.headers.set('x-processing-time', `${Date.now() - startTime}ms`);
          return applySecurityHeaders(rateLimitResponse);
        }
        
        // Rate limit passed - continue with request and add headers
        const response = NextResponse.next();
        addRateLimitHeaders(response, result);
        response.headers.set('x-correlation-id', correlationId);
        response.headers.set('x-processing-time', `${Date.now() - startTime}ms`);
        return applySecurityHeaders(response);
      } catch (error) {
        console.error('[RATE_LIMIT]', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          correlationId,
          path: pathname,
          method: request.method,
        });
        // If rate limiting fails, continue without it (fail open)
        const response = NextResponse.next();
        response.headers.set('x-correlation-id', correlationId);
        response.headers.set('x-processing-time', `${Date.now() - startTime}ms`);
        return applySecurityHeaders(response);
      }
    }
    
    // Allow public routes
    if (publicRoutes.some(route => pathname.startsWith(route))) {
      const response = NextResponse.next();
      response.headers.set('x-correlation-id', correlationId);
      response.headers.set('x-processing-time', `${Date.now() - startTime}ms`);
      return applySecurityHeaders(response);
    }
    
    // TODO: Check Matrix session token
    // For now, allow all requests (development mode)
    const response = NextResponse.next();
    response.headers.set('x-correlation-id', correlationId);
    response.headers.set('x-processing-time', `${Date.now() - startTime}ms`);
    return applySecurityHeaders(response);
  } catch (error) {
    // Log middleware errors with correlation context
    console.error('[MIDDLEWARE_ERROR]', {
      error: error instanceof Error ? error.message : 'Unknown middleware error',
      correlationId,
      path: pathname,
      method: request.method,
      processingTime: `${Date.now() - startTime}ms`,
    });
    
    // Return error response with correlation headers
    const errorResponse = NextResponse.next();
    errorResponse.headers.set('x-correlation-id', correlationId);
    errorResponse.headers.set('x-processing-time', `${Date.now() - startTime}ms`);
    errorResponse.headers.set('x-error', 'middleware-error');
    return applySecurityHeaders(errorResponse);
  }
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"]
};

// Security headers implementation completed - p12-13-security-headers
// API rate limiting implementation completed - p12-1-rate-limiting
// Logging infrastructure implementation completed - p12-6-logging-infrastructure
