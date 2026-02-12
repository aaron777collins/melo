/**
 * Matrix Session Cookie Management
 *
 * Secure cookie handling for Matrix session persistence.
 * Uses Next.js cookies() API for server-side operations.
 *
 * Security features:
 * - httpOnly: Prevents XSS access to tokens
 * - secure: HTTPS only in production
 * - sameSite: Strict CSRF protection
 * - Encrypted session data (TODO: add encryption layer)
 */

import { cookies } from 'next/headers';
import type { MatrixSession } from './types/auth';

// =============================================================================
// Configuration
// =============================================================================

/**
 * Cookie name for the Matrix session
 */
const SESSION_COOKIE_NAME = 'matrix_session';

/**
 * Cookie name for refresh token (separate for rotation)
 */
const REFRESH_TOKEN_COOKIE_NAME = 'matrix_refresh_token';

/**
 * Default session cookie max age (30 days in seconds)
 */
const DEFAULT_MAX_AGE = 30 * 24 * 60 * 60;

/**
 * Check if running in production environment
 */
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Cookie configuration options
 */
interface CookieOptions {
  /** Max age in seconds (defaults to 30 days) */
  maxAge?: number;
  /** Cookie path (defaults to '/') */
  path?: string;
}

// =============================================================================
// Session Data Types
// =============================================================================

/**
 * Minimal session data stored in cookie
 * Excludes volatile fields like lastActiveAt to reduce cookie size
 */
interface StoredSessionData {
  /** User's Matrix ID */
  userId: string;
  /** Access token for API calls */
  accessToken: string;
  /** Device ID for this client */
  deviceId: string;
  /** Homeserver URL */
  homeserverUrl: string;
  /** Session creation timestamp (ISO 8601) */
  createdAt: string;
  /** Unique session identifier */
  sessionId: string;
  /** Token expiry timestamp (ISO 8601) if applicable */
  expiresAt?: string;
}

// =============================================================================
// Cookie Operations
// =============================================================================

/**
 * Set the Matrix session cookie
 *
 * Stores the session data in an httpOnly cookie with security flags.
 * The refresh token is stored separately for independent rotation.
 *
 * Note: This function must be called from a Server Component,
 * Server Action, or Route Handler (not from client components).
 *
 * @param session - The Matrix session to store
 * @param options - Optional cookie configuration
 *
 * @example
 * ```typescript
 * // In a Server Action
 * 'use server'
 * import { setSessionCookie } from '@/lib/matrix/cookies';
 *
 * export async function handleLogin(formData: FormData) {
 *   const session = await loginWithPassword(username, password);
 *   await setSessionCookie(session);
 *   redirect('/channels');
 * }
 * ```
 */
export async function setSessionCookie(
  session: MatrixSession,
  options: CookieOptions = {}
): Promise<void> {
  const cookieStore = await cookies();

  // Calculate max age from session expiry or use default
  let maxAge = options.maxAge ?? DEFAULT_MAX_AGE;

  if (session.expiresAt) {
    const expiresMs = new Date(session.expiresAt).getTime();
    const nowMs = Date.now();
    const remainingSeconds = Math.floor((expiresMs - nowMs) / 1000);

    // Use the shorter of expiry time or default max age
    if (remainingSeconds > 0 && remainingSeconds < maxAge) {
      maxAge = remainingSeconds;
    }
  }

  // Extract minimal data for the session cookie
  // This keeps cookie size under 4KB limit
  const sessionData: StoredSessionData = {
    userId: session.userId,
    accessToken: session.accessToken,
    deviceId: session.deviceId,
    homeserverUrl: session.homeserverUrl,
    createdAt: session.createdAt,
    sessionId: session.sessionId,
    expiresAt: session.expiresAt,
  };

  // Encode session data as base64 JSON
  const encodedSession = Buffer.from(JSON.stringify(sessionData)).toString(
    'base64'
  );

  // Set the main session cookie
  cookieStore.set(SESSION_COOKIE_NAME, encodedSession, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: options.path ?? '/',
    maxAge,
  });

  // Store refresh token separately if present
  if (session.refreshToken) {
    cookieStore.set(REFRESH_TOKEN_COOKIE_NAME, session.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: options.path ?? '/',
      // Refresh tokens typically have longer lifetime
      maxAge: maxAge * 2,
    });
  }
}

/**
 * Get the Matrix session from cookie
 *
 * Retrieves and parses the session data from the httpOnly cookie.
 * Returns null if no session exists or if the session has expired.
 *
 * Note: This function must be called from a Server Component,
 * Server Action, or Route Handler (not from client components).
 *
 * @returns The stored MatrixSession or null if not found/invalid
 *
 * @example
 * ```typescript
 * // In a Server Component
 * import { getSessionCookie } from '@/lib/matrix/cookies';
 *
 * export default async function ProtectedPage() {
 *   const session = await getSessionCookie();
 *   if (!session) {
 *     redirect('/login');
 *   }
 *   return <Dashboard session={session} />;
 * }
 * ```
 */
export async function getSessionCookie(): Promise<MatrixSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return null;
  }

  try {
    // Decode base64 JSON
    const jsonString = Buffer.from(sessionCookie.value, 'base64').toString(
      'utf-8'
    );
    const sessionData: StoredSessionData = JSON.parse(jsonString);

    // Validate required fields
    if (
      !sessionData.userId ||
      !sessionData.accessToken ||
      !sessionData.deviceId ||
      !sessionData.homeserverUrl
    ) {
      console.warn('Invalid session cookie: missing required fields');
      return null;
    }

    // Check if session has expired
    if (sessionData.expiresAt) {
      const expiryTime = new Date(sessionData.expiresAt).getTime();
      if (Date.now() > expiryTime) {
        console.warn('Session cookie expired');
        // Auto-clear expired session
        await clearSessionCookie();
        return null;
      }
    }

    // Get refresh token if available
    const refreshTokenCookie = cookieStore.get(REFRESH_TOKEN_COOKIE_NAME);

    // Reconstruct full session object
    const session: MatrixSession = {
      sessionId: sessionData.sessionId,
      userId: sessionData.userId,
      accessToken: sessionData.accessToken,
      deviceId: sessionData.deviceId,
      homeserverUrl: sessionData.homeserverUrl,
      createdAt: sessionData.createdAt,
      lastActiveAt: new Date().toISOString(), // Update on retrieval
      isValid: true,
      refreshToken: refreshTokenCookie?.value,
      expiresAt: sessionData.expiresAt,
    };

    return session;
  } catch (error) {
    console.error('Failed to parse session cookie:', error);
    return null;
  }
}

/**
 * Clear the Matrix session cookie
 *
 * Removes both the session cookie and refresh token cookie.
 * Should be called during logout.
 *
 * Note: This function must be called from a Server Component,
 * Server Action, or Route Handler (not from client components).
 *
 * @example
 * ```typescript
 * // In a Server Action
 * 'use server'
 * import { clearSessionCookie } from '@/lib/matrix/cookies';
 * import { logout } from '@/lib/matrix/auth';
 *
 * export async function handleLogout() {
 *   const session = await getSessionCookie();
 *   if (session) {
 *     await logout(session.accessToken);
 *   }
 *   await clearSessionCookie();
 *   redirect('/login');
 * }
 * ```
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();

  // Delete session cookie
  cookieStore.delete(SESSION_COOKIE_NAME);

  // Delete refresh token cookie
  cookieStore.delete(REFRESH_TOKEN_COOKIE_NAME);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a session cookie exists (without parsing)
 *
 * Lightweight check for session presence without full validation.
 * Useful for quick authentication checks in middleware.
 *
 * @returns true if a session cookie exists
 */
export async function hasSessionCookie(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  return !!sessionCookie?.value;
}

/**
 * Update the session cookie with new token data
 *
 * Used after token refresh to update the stored access token
 * without requiring full re-authentication.
 *
 * @param newAccessToken - The new access token
 * @param newRefreshToken - Optional new refresh token
 * @param expiresAt - Optional new expiry time (ISO 8601)
 * @returns true if update succeeded, false if no session exists
 *
 * @example
 * ```typescript
 * // After refreshing tokens
 * const result = await refreshAccessToken(session.refreshToken);
 * await updateSessionTokens(result.accessToken, result.refreshToken);
 * ```
 */
export async function updateSessionTokens(
  newAccessToken: string,
  newRefreshToken?: string,
  expiresAt?: string
): Promise<boolean> {
  const currentSession = await getSessionCookie();

  if (!currentSession) {
    return false;
  }

  // Create updated session
  const updatedSession: MatrixSession = {
    ...currentSession,
    accessToken: newAccessToken,
    lastActiveAt: new Date().toISOString(),
    refreshToken: newRefreshToken ?? currentSession.refreshToken,
    expiresAt: expiresAt ?? currentSession.expiresAt,
  };

  await setSessionCookie(updatedSession);
  return true;
}

/**
 * Get session cookie configuration (for debugging/testing)
 *
 * @returns Cookie configuration info
 */
export function getSessionCookieConfig(): {
  name: string;
  refreshTokenName: string;
  maxAge: number;
  isSecure: boolean;
} {
  return {
    name: SESSION_COOKIE_NAME,
    refreshTokenName: REFRESH_TOKEN_COOKIE_NAME,
    maxAge: DEFAULT_MAX_AGE,
    isSecure: isProduction,
  };
}
