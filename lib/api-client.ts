/**
 * Enhanced API client with rate limiting support
 */

import { RateLimitResponse } from '@/lib/types/rate-limiting';

export class RateLimitError extends Error {
  public retryAfter: number;
  public resetTime: number;
  public remaining: number;
  public limit: number;

  constructor(response: RateLimitResponse) {
    super(response.error.message);
    this.name = 'RateLimitError';
    this.retryAfter = response.error.retry_after_ms;
    this.resetTime = response.rateLimit.reset;
    this.remaining = response.rateLimit.remaining;
    this.limit = response.rateLimit.limit;
  }
}

export interface ApiRequestOptions extends RequestInit {
  /** Automatically retry after rate limit expires */
  retryOnRateLimit?: boolean;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Custom rate limit handler */
  onRateLimit?: (error: RateLimitError) => Promise<void> | void;
}

/**
 * Enhanced fetch with rate limit handling
 */
export async function apiRequest(
  url: string, 
  options: ApiRequestOptions = {}
): Promise<Response> {
  const {
    retryOnRateLimit = false,
    maxRetries = 1,
    onRateLimit,
    ...fetchOptions
  } = options;

  let attempt = 0;
  
  while (attempt <= maxRetries) {
    try {
      const response = await fetch(url, fetchOptions);
      
      if (response.status === 429) {
        const rateLimitData: RateLimitResponse = await response.clone().json();
        const error = new RateLimitError(rateLimitData);
        
        if (onRateLimit) {
          await onRateLimit(error);
        }
        
        if (retryOnRateLimit && attempt < maxRetries) {
          // Wait for the retry delay before next attempt
          const delay = Math.min(error.retryAfter, 60000); // Cap at 1 minute
          await new Promise(resolve => setTimeout(resolve, delay));
          attempt++;
          continue;
        }
        
        throw error;
      }
      
      return response;
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }
      
      if (attempt >= maxRetries) {
        throw error;
      }
      
      attempt++;
    }
  }
  
  throw new Error('Max retries exceeded');
}

/**
 * Convenience methods for common HTTP methods
 */
export const api = {
  get: (url: string, options?: ApiRequestOptions) => 
    apiRequest(url, { ...options, method: 'GET' }),
    
  post: (url: string, data?: any, options?: ApiRequestOptions) => 
    apiRequest(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }),
    
  put: (url: string, data?: any, options?: ApiRequestOptions) => 
    apiRequest(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }),
    
  patch: (url: string, data?: any, options?: ApiRequestOptions) => 
    apiRequest(url, {
      ...options,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }),
    
  delete: (url: string, options?: ApiRequestOptions) => 
    apiRequest(url, { ...options, method: 'DELETE' }),
};

/**
 * Helper to extract rate limit info from response headers
 */
export function extractRateLimitInfo(response: Response) {
  return {
    limit: parseInt(response.headers.get('X-RateLimit-Limit') || '0'),
    remaining: parseInt(response.headers.get('X-RateLimit-Remaining') || '0'),
    reset: parseInt(response.headers.get('X-RateLimit-Reset') || '0'),
    used: parseInt(response.headers.get('X-RateLimit-Used') || '0'),
  };
}