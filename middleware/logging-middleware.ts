/**
 * Next.js Logging Middleware
 * Integrates request logging with Next.js middleware system
 */

import { NextRequest, NextResponse } from 'next/server';
import { requestLogger } from '../lib/logging/request-logger';
import { generateCorrelationId } from '../lib/logging/logger';
import { RequestContext, ResponseContext, RequestTiming } from '../lib/logging/types';

/**
 * Extract request context from Next.js request
 */
function extractRequestContext(request: NextRequest): RequestContext {
  const url = new URL(request.url);
  
  // Get client IP with fallbacks
  const ip = request.ip 
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || request.headers.get('cf-connecting-ip')
    || 'unknown';

  // Convert headers to record
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  // Parse query parameters
  const query: Record<string, string | string[]> = {};
  url.searchParams.forEach((value, key) => {
    const existing = query[key];
    if (existing) {
      query[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      query[key] = value;
    }
  });

  return {
    method: request.method,
    url: request.url,
    path: url.pathname,
    query: Object.keys(query).length > 0 ? query : undefined,
    headers,
    userAgent: request.headers.get('user-agent') || undefined,
    ip,
    // These will be populated by auth middleware if available
    userId: request.headers.get('x-user-id') || undefined,
    sessionId: request.headers.get('x-session-id') || undefined,
  };
}

/**
 * Extract response context from Next.js response
 */
function extractResponseContext(response: NextResponse): ResponseContext {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    statusCode: response.status,
    statusText: response.statusText,
    headers,
    // Note: Next.js middleware can't easily determine response size
    // This would need to be calculated at the application level
  };
}

/**
 * Create timing object for request measurement
 */
function createTiming(startTime: number, endTime: number): RequestTiming {
  const duration = endTime - startTime;
  return {
    startTime,
    endTime,
    duration,
    durationFormatted: formatDuration(duration),
  };
}

/**
 * Format duration in milliseconds to human readable string
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Main logging middleware function for Next.js
 * 
 * @param request - Next.js request object
 * @returns Modified response with logging
 */
export async function loggingMiddleware(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  // Generate or extract correlation ID
  const existingCorrelationId = request.headers.get('x-correlation-id');
  const correlationId = existingCorrelationId || generateCorrelationId();
  
  // Extract request context
  const requestContext = extractRequestContext(request);
  
  // Add correlation ID to request context
  if (!existingCorrelationId) {
    requestContext.headers = {
      ...requestContext.headers,
      'x-correlation-id': correlationId,
    };
  }

  // Log the incoming request
  requestLogger.logRequest(requestContext);

  try {
    // Continue to next middleware/handler
    const response = NextResponse.next();
    
    // Add correlation ID to response headers for client tracing
    response.headers.set('x-correlation-id', correlationId);
    
    // Add request ID header for debugging
    response.headers.set('x-request-id', correlationId);

    // Log the response (note: this logs the middleware response, not the final app response)
    const endTime = Date.now();
    const timing = createTiming(startTime, endTime);
    const responseContext = extractResponseContext(response);
    
    requestLogger.logResponse(requestContext, responseContext, timing);

    return response;
  } catch (error) {
    // Log any errors that occur in middleware
    const endTime = Date.now();
    const timing = createTiming(startTime, endTime);
    
    requestLogger.logError(requestContext, error as Error, timing);
    
    // Re-throw the error to maintain normal error handling
    throw error;
  }
}

/**
 * Enhanced logging middleware that includes performance monitoring
 */
export async function enhancedLoggingMiddleware(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now();
  const timestamp = Date.now();
  
  // Generate or extract correlation ID
  const existingCorrelationId = request.headers.get('x-correlation-id');
  const correlationId = existingCorrelationId || generateCorrelationId();
  
  // Extract request context
  const requestContext = extractRequestContext(request);
  
  // Add correlation ID to request context
  if (!existingCorrelationId) {
    requestContext.headers = {
      ...requestContext.headers,
      'x-correlation-id': correlationId,
    };
  }

  // Enhanced performance tracking
  const performanceStart = {
    timestamp,
    navigationStart: startTime,
    requestStart: startTime,
  };

  try {
    // Log request with enhanced timing
    requestLogger.logRequest({
      ...requestContext,
      headers: {
        ...requestContext.headers,
        'x-performance-start': startTime.toString(),
      },
    });

    // Continue processing
    const response = NextResponse.next();
    
    // Enhanced response headers
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    response.headers.set('x-correlation-id', correlationId);
    response.headers.set('x-request-id', correlationId);
    response.headers.set('x-processing-time', `${processingTime.toFixed(2)}ms`);
    response.headers.set('x-timestamp', new Date().toISOString());
    
    // Log response with performance metrics
    const responseContext = extractResponseContext(response);
    const timing = createTiming(timestamp, Date.now());
    
    // Add performance metadata
    requestLogger.logResponse(
      requestContext, 
      {
        ...responseContext,
        headers: {
          ...responseContext.headers,
          'x-processing-time': `${processingTime.toFixed(2)}ms`,
        },
      },
      timing
    );

    return response;
  } catch (error) {
    // Enhanced error logging with performance data
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    const timing = createTiming(timestamp, Date.now());
    
    // Log error with performance context
    requestLogger.logError(
      {
        ...requestContext,
        headers: {
          ...requestContext.headers,
          'x-processing-time': `${processingTime.toFixed(2)}ms`,
          'x-error-timestamp': new Date().toISOString(),
        },
      },
      error as Error,
      timing
    );
    
    throw error;
  }
}

/**
 * Conditional logging middleware that only logs based on configuration
 */
export async function conditionalLoggingMiddleware(
  request: NextRequest,
  options: {
    skipPaths?: string[];
    skipMethods?: string[];
    onlyErrors?: boolean;
    logLevel?: 'basic' | 'enhanced';
  } = {}
): Promise<NextResponse> {
  const {
    skipPaths = [],
    skipMethods = [],
    onlyErrors = false,
    logLevel = 'basic',
  } = options;

  // Skip logging for specified paths
  if (skipPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Skip logging for specified methods
  if (skipMethods.includes(request.method)) {
    return NextResponse.next();
  }

  // Use enhanced or basic logging based on configuration
  if (logLevel === 'enhanced') {
    return enhancedLoggingMiddleware(request);
  } else {
    return loggingMiddleware(request);
  }
}

/**
 * Utility function to create custom logging middleware with specific configuration
 */
export function createLoggingMiddleware(options: {
  skipPaths?: string[];
  skipMethods?: string[];
  onlyErrors?: boolean;
  logLevel?: 'basic' | 'enhanced';
  customLogger?: typeof requestLogger;
} = {}) {
  return async (request: NextRequest): Promise<NextResponse> => {
    return conditionalLoggingMiddleware(request, options);
  };
}

/**
 * Development logging middleware with verbose output
 */
export async function devLoggingMiddleware(request: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.next();
  }

  console.log(`🔄 [${new Date().toISOString()}] ${request.method} ${request.nextUrl.pathname}`);
  
  const startTime = Date.now();
  
  try {
    const response = await enhancedLoggingMiddleware(request);
    const duration = Date.now() - startTime;
    
    console.log(`✅ [${new Date().toISOString()}] ${request.method} ${request.nextUrl.pathname} - ${response.status} (${duration}ms)`);
    
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.log(`❌ [${new Date().toISOString()}] ${request.method} ${request.nextUrl.pathname} - ERROR (${duration}ms)`, error);
    
    throw error;
  }
}