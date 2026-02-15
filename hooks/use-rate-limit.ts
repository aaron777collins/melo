/**
 * React hook for handling API rate limits on the client side
 */

import { useState, useCallback } from 'react';
import { RateLimitResponse } from '@/lib/types/rate-limiting';

interface RateLimitState {
  isRateLimited: boolean;
  resetTime: number | null;
  remaining: number | null;
  limit: number | null;
}

interface UseRateLimitReturn {
  rateLimitState: RateLimitState;
  handleRateLimitResponse: (response: Response) => Promise<void>;
  getRemainingTime: () => number;
  isRateLimitExpired: () => boolean;
  resetRateLimit: () => void;
}

export function useRateLimit(): UseRateLimitReturn {
  const [rateLimitState, setRateLimitState] = useState<RateLimitState>({
    isRateLimited: false,
    resetTime: null,
    remaining: null,
    limit: null,
  });

  const handleRateLimitResponse = useCallback(async (response: Response) => {
    // Extract rate limit headers
    const limit = response.headers.get('X-RateLimit-Limit');
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');

    if (response.status === 429) {
      // Rate limited
      try {
        const errorData: RateLimitResponse = await response.json();
        setRateLimitState({
          isRateLimited: true,
          resetTime: errorData.rateLimit.reset * 1000, // Convert to milliseconds
          remaining: errorData.rateLimit.remaining,
          limit: errorData.rateLimit.limit,
        });
      } catch {
        // Fallback if we can't parse the response
        setRateLimitState({
          isRateLimited: true,
          resetTime: reset ? parseInt(reset) * 1000 : Date.now() + 60000,
          remaining: remaining ? parseInt(remaining) : 0,
          limit: limit ? parseInt(limit) : 100,
        });
      }
    } else if (limit && remaining && reset) {
      // Update rate limit state from headers
      setRateLimitState({
        isRateLimited: false,
        resetTime: parseInt(reset) * 1000,
        remaining: parseInt(remaining),
        limit: parseInt(limit),
      });
    }
  }, []);

  const getRemainingTime = useCallback(() => {
    if (!rateLimitState.resetTime) return 0;
    return Math.max(0, rateLimitState.resetTime - Date.now());
  }, [rateLimitState.resetTime]);

  const isRateLimitExpired = useCallback(() => {
    if (!rateLimitState.resetTime) return true;
    return Date.now() >= rateLimitState.resetTime;
  }, [rateLimitState.resetTime]);

  const resetRateLimit = useCallback(() => {
    setRateLimitState({
      isRateLimited: false,
      resetTime: null,
      remaining: null,
      limit: null,
    });
  }, []);

  return {
    rateLimitState,
    handleRateLimitResponse,
    getRemainingTime,
    isRateLimitExpired,
    resetRateLimit,
  };
}