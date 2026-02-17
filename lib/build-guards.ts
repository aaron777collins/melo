/**
 * Build-time guards and utilities
 * 
 * Detects when code is running during build vs runtime and provides
 * appropriate mocks/guards to prevent database access during builds.
 */

/**
 * Detects if code is running during Next.js build process
 */
export function isBuildTime(): boolean {
  // Multiple signals that we're in build context
  return (
    // Next.js sets this during build
    process.env.NEXT_PHASE === 'phase-production-build' ||
    // Webpack build context
    process.env.NODE_ENV === 'production' && !process.env.RUNTIME ||
    // No runtime globals available (indicating build context)
    typeof window === 'undefined' && !global.fetch ||
    // Vercel build detection
    process.env.VERCEL_ENV === 'production' && !process.env.VERCEL_URL
  );
}

/**
 * Detects if we're in static generation context
 */
export function isStaticGeneration(): boolean {
  return (
    process.env.NEXT_PHASE === 'phase-production-build' ||
    // ISR or static export context
    process.env.__NEXT_PRIVATE_STANDBY_HOSTNAME !== undefined ||
    // Build-time prerendering
    typeof window === 'undefined' && process.env.NODE_ENV === 'production'
  );
}

/**
 * Mock job queue stats for build time
 */
export const mockJobQueueStats = {
  pending: 0,
  processing: 0,
  completed: 0,
  failed: 0,
  cancelled: 0,
  total: 0,
};

/**
 * Mock database responses for build time
 */
export const mockDatabaseResponses = {
  jobTypeStats: [],
  recentActivity: [],
  workerStats: {
    active: 0,
    totalProcessed: 0,
    totalSucceeded: 0,
    totalFailed: 0,
  },
  avgProcessingTime: 0,
};

/**
 * Safe database call wrapper that returns mocks during build time
 */
export async function safeDatabaseCall<T>(
  buildTimeMock: T,
  runtimeCall: () => Promise<T>
): Promise<T> {
  if (isBuildTime() || isStaticGeneration()) {
    return buildTimeMock;
  }
  
  try {
    return await runtimeCall();
  } catch (error) {
    console.warn('Database call failed, returning mock data:', error);
    return buildTimeMock;
  }
}

/**
 * Safe job queue call wrapper
 */
export async function safeJobQueueCall<T>(
  buildTimeMock: T,
  runtimeCall: () => Promise<T>
): Promise<T> {
  if (isBuildTime() || isStaticGeneration()) {
    return buildTimeMock;
  }
  
  try {
    return await runtimeCall();
  } catch (error) {
    console.warn('Job queue call failed, returning mock data:', error);
    return buildTimeMock;
  }
}

/**
 * Build-time safe console logging
 */
export function buildLog(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  if (isBuildTime()) {
    const prefix = '[BUILD]';
    switch (level) {
      case 'warn':
        console.warn(prefix, message);
        break;
      case 'error':
        console.error(prefix, message);
        break;
      default:
        console.log(prefix, message);
    }
  }
}