/**
 * Rate limiting utility for HAOS v2 API endpoints
 * Implements per-user and per-IP rate limiting with different limits for authenticated vs anonymous users
 */

import { NextRequest, NextResponse } from "next/server";

export interface RateLimitConfig {
  /** Maximum requests per window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Skip rate limiting for certain conditions */
  skip?: (req: NextRequest) => boolean;
  /** Custom key generator for grouping requests */
  keyGenerator?: (req: NextRequest) => string;
  /** Custom message for rate limit exceeded */
  message?: string;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Current request count */
  count: number;
  /** Maximum requests allowed */
  limit: number;
  /** Time until reset (milliseconds) */
  resetTime: number;
  /** Remaining requests */
  remaining: number;
}

// In-memory store for rate limiting (in production, consider using Redis)
const store = new Map<string, { count: number; resetTime: number }>();

/**
 * Clean expired entries from the store
 */
function cleanExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now >= entry.resetTime) {
      store.delete(key);
    }
  }
}

/**
 * Generate a unique key for rate limiting based on IP and user
 */
function generateKey(req: NextRequest, userId?: string): string {
  const ip = getClientIP(req);
  if (userId) {
    return `user:${userId}`;
  }
  return `ip:${ip}`;
}

/**
 * Extract client IP address from request
 */
function getClientIP(req: NextRequest): string {
  // Try various headers for IP address (for proxy/CDN environments)
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // Fallback to localhost for development
  return req.ip || '127.0.0.1';
}

/**
 * Check if user is authenticated by looking for Matrix session
 */
async function isAuthenticated(req: NextRequest): Promise<string | null> {
  try {
    // Check for Matrix access token in Authorization header
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token) {
        // In a real implementation, you'd validate the token with Matrix
        // For now, we'll assume any bearer token indicates authentication
        // Extract user ID from token if possible (simplified)
        return token.substring(0, 20); // Use token prefix as user ID
      }
    }
    
    // Check for session cookie
    const cookie = req.cookies.get('matrix_session');
    if (cookie) {
      try {
        const session = JSON.parse(cookie.value);
        if (session.userId) {
          return session.userId;
        }
      } catch {
        // Invalid cookie format
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Apply rate limiting to a request
 */
export async function rateLimit(req: NextRequest, config: RateLimitConfig): Promise<RateLimitResult> {
  // Clean expired entries periodically
  if (Math.random() < 0.01) { // 1% chance to clean on each request
    cleanExpiredEntries();
  }
  
  // Check if we should skip rate limiting
  if (config.skip && config.skip(req)) {
    return {
      allowed: true,
      count: 0,
      limit: config.limit,
      resetTime: Date.now() + config.windowMs,
      remaining: config.limit,
    };
  }
  
  // Determine if user is authenticated
  const userId = await isAuthenticated(req);
  
  // Generate rate limit key
  const key = config.keyGenerator 
    ? config.keyGenerator(req) 
    : generateKey(req, userId);
  
  const now = Date.now();
  const windowStart = now;
  const windowEnd = now + config.windowMs;
  
  // Get or create entry
  let entry = store.get(key);
  
  if (!entry || now >= entry.resetTime) {
    // Create new window
    entry = {
      count: 0,
      resetTime: windowEnd,
    };
  }
  
  // Increment count
  entry.count++;
  store.set(key, entry);
  
  const remaining = Math.max(0, config.limit - entry.count);
  const allowed = entry.count <= config.limit;
  
  return {
    allowed,
    count: entry.count,
    limit: config.limit,
    resetTime: entry.resetTime,
    remaining,
  };
}

/**
 * Rate limit configurations for different endpoint types
 */
export const rateLimitConfigs = {
  // Authentication endpoints - stricter limits
  auth: {
    authenticated: { limit: 10, windowMs: 15 * 60 * 1000 }, // 10 requests per 15 minutes
    anonymous: { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 requests per 15 minutes
  },
  // General API endpoints
  api: {
    authenticated: { limit: 100, windowMs: 60 * 1000 }, // 100 requests per minute
    anonymous: { limit: 20, windowMs: 60 * 1000 }, // 20 requests per minute
  },
  // Upload endpoints - more restrictive
  upload: {
    authenticated: { limit: 10, windowMs: 60 * 1000 }, // 10 uploads per minute
    anonymous: { limit: 2, windowMs: 60 * 1000 }, // 2 uploads per minute
  },
  // Health check - more lenient
  health: {
    authenticated: { limit: 60, windowMs: 60 * 1000 }, // 60 requests per minute
    anonymous: { limit: 30, windowMs: 60 * 1000 }, // 30 requests per minute
  },
};

/**
 * Get appropriate rate limit config based on request path and authentication status
 */
export async function getRateLimitConfig(req: NextRequest): Promise<RateLimitConfig> {
  const { pathname } = req.nextUrl;
  const isAuth = await isAuthenticated(req);
  
  // Determine endpoint type
  let endpointType: keyof typeof rateLimitConfigs = 'api';
  
  if (pathname.includes('/auth/')) {
    endpointType = 'auth';
  } else if (pathname.includes('/upload')) {
    endpointType = 'upload';
  } else if (pathname.includes('/health')) {
    endpointType = 'health';
  }
  
  // Get config based on authentication status
  const config = isAuth 
    ? rateLimitConfigs[endpointType].authenticated 
    : rateLimitConfigs[endpointType].anonymous;
  
  return {
    ...config,
    message: `Rate limit exceeded. Maximum ${config.limit} requests per ${config.windowMs / 1000} seconds.`,
  };
}

/**
 * Add rate limiting headers to response
 */
export function addRateLimitHeaders(response: NextResponse, result: RateLimitResult): NextResponse {
  response.headers.set('X-RateLimit-Limit', result.limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());
  response.headers.set('X-RateLimit-Used', result.count.toString());
  
  // Add retry-after header for 429 responses
  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
    response.headers.set('Retry-After', retryAfter.toString());
  }
  
  return response;
}

/**
 * Create a 429 Too Many Requests response
 */
export function createRateLimitResponse(result: RateLimitResult, message?: string): NextResponse {
  const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
  
  const response = NextResponse.json(
    {
      error: {
        code: 'M_LIMIT_EXCEEDED',
        message: message || `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retry_after_ms: result.resetTime - Date.now(),
      },
      rateLimit: {
        limit: result.limit,
        remaining: result.remaining,
        reset: Math.ceil(result.resetTime / 1000),
        used: result.count,
      },
    },
    { status: 429 }
  );
  
  return addRateLimitHeaders(response, result);
}