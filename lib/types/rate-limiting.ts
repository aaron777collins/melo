/**
 * Type definitions for rate limiting system
 */

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'X-RateLimit-Used': string;
  'Retry-After'?: string;
}

export interface RateLimitError {
  code: 'M_LIMIT_EXCEEDED';
  message: string;
  retry_after_ms: number;
}

export interface RateLimitResponse {
  error: RateLimitError;
  rateLimit: {
    limit: number;
    remaining: number;
    reset: number;
    used: number;
  };
}

export interface RateLimitStore {
  get(key: string): { count: number; resetTime: number } | undefined;
  set(key: string, value: { count: number; resetTime: number }): void;
  delete(key: string): boolean;
  clear(): void;
  size: number;
}

export type RateLimitEndpointType = 'auth' | 'api' | 'upload' | 'health';

export interface RateLimitMetrics {
  totalRequests: number;
  blockedRequests: number;
  uniqueIPs: number;
  uniqueUsers: number;
  topEndpoints: Array<{
    path: string;
    count: number;
  }>;
}