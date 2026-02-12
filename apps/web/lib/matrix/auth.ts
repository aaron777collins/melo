/**
 * Matrix Authentication Functions
 *
 * Implements login and session validation for Matrix homeserver authentication.
 */

import {
  type MatrixSession,
  type MatrixUser,
  type AuthError,
  type LoginResponse,
  type UserPresence,
} from './types/auth';

// =============================================================================
// Configuration
// =============================================================================

/**
 * Default homeserver URL if not specified
 * In production, this should come from environment variables or user input
 */
const DEFAULT_HOMESERVER_URL =
  process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL || 'https://matrix.org';

/**
 * Matrix API version prefix
 */
const API_PREFIX = '/_matrix/client/v3';

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Custom error class for Matrix authentication errors
 */
export class MatrixAuthError extends Error {
  public readonly code: string;
  public readonly httpStatus?: number;
  public readonly details?: Record<string, unknown>;

  constructor(authError: AuthError) {
    super(authError.message);
    this.name = 'MatrixAuthError';
    this.code = authError.code;
    this.httpStatus = authError.httpStatus;
    this.details = authError.details;
  }

  /**
   * Convert to AuthError object for state management
   */
  toAuthError(): AuthError {
    return {
      code: this.code,
      message: this.message,
      httpStatus: this.httpStatus,
      details: this.details,
    };
  }
}

/**
 * Parse Matrix API error response
 */
async function parseErrorResponse(
  response: Response
): Promise<MatrixAuthError> {
  let errorBody: { errcode?: string; error?: string } = {};

  try {
    errorBody = await response.json();
  } catch {
    // Response might not be JSON
  }

  return new MatrixAuthError({
    code: errorBody.errcode || 'M_UNKNOWN',
    message:
      errorBody.error || `HTTP ${response.status}: ${response.statusText}`,
    httpStatus: response.status,
    details: errorBody,
  });
}

// =============================================================================
// HTTP Utilities
// =============================================================================

/**
 * Make authenticated request to Matrix API
 */
async function matrixFetch<T>(
  homeserverUrl: string,
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string
): Promise<T> {
  const url = `${homeserverUrl}${API_PREFIX}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return response.json();
}

// =============================================================================
// Login Functions
// =============================================================================

/**
 * Login options for password authentication
 */
export interface LoginOptions {
  /** Homeserver URL to connect to (defaults to env variable or matrix.org) */
  homeserverUrl?: string;
  /** Device display name shown in session list */
  deviceDisplayName?: string;
  /** Existing device ID to reuse */
  deviceId?: string;
  /** Whether to request a refresh token */
  requestRefreshToken?: boolean;
}

/**
 * Authenticate with Matrix homeserver using password
 *
 * @param username - Matrix user ID (@user:server.com) or just localpart (user)
 * @param password - User's password
 * @param options - Optional login configuration
 * @returns Promise resolving to MatrixSession on success
 * @throws MatrixAuthError on authentication failure
 *
 * @example
 * ```typescript
 * try {
 *   const session = await loginWithPassword('@alice:matrix.org', 'secret123');
 *   console.log('Logged in as:', session.userId);
 * } catch (error) {
 *   if (error instanceof MatrixAuthError) {
 *     if (error.code === 'M_FORBIDDEN') {
 *       console.log('Invalid username or password');
 *     }
 *   }
 * }
 * ```
 */
export async function loginWithPassword(
  username: string,
  password: string,
  options: LoginOptions = {}
): Promise<MatrixSession> {
  const homeserverUrl = options.homeserverUrl || DEFAULT_HOMESERVER_URL;

  // Normalize username to proper identifier format
  const identifier = username.startsWith('@')
    ? { type: 'm.id.user' as const, user: username }
    : { type: 'm.id.user' as const, user: username };

  // Build login request body
  const loginBody: Record<string, unknown> = {
    type: 'm.login.password',
    identifier,
    password,
  };

  // Optional fields
  if (options.deviceDisplayName) {
    loginBody.initial_device_display_name = options.deviceDisplayName;
  }
  if (options.deviceId) {
    loginBody.device_id = options.deviceId;
  }
  if (options.requestRefreshToken) {
    loginBody.refresh_token = true;
  }

  // Make login request
  const response = await matrixFetch<LoginResponse & {
    refresh_token?: string;
    expires_in_ms?: number;
    well_known?: {
      'm.homeserver': { base_url: string };
      'm.identity_server'?: { base_url: string };
    };
  }>(homeserverUrl, '/login', {
    method: 'POST',
    body: JSON.stringify(loginBody),
  });

  // Create session object
  const now = new Date().toISOString();
  const session: MatrixSession = {
    sessionId: `${response.deviceId}-${Date.now()}`,
    userId: response.userId,
    accessToken: response.accessToken,
    deviceId: response.deviceId,
    homeserverUrl: response.well_known?.['m.homeserver']?.base_url || homeserverUrl,
    createdAt: now,
    lastActiveAt: now,
    isValid: true,
    refreshToken: response.refresh_token,
    expiresAt: response.expires_in_ms
      ? new Date(Date.now() + response.expires_in_ms).toISOString()
      : undefined,
  };

  return session;
}

// =============================================================================
// Session Validation Functions
// =============================================================================

/**
 * Validate options for session check
 */
export interface ValidateOptions {
  /** Homeserver URL to validate against */
  homeserverUrl?: string;
  /** Include full profile data (display name, avatar) */
  includeProfile?: boolean;
}

/**
 * Validate an access token and get user information
 *
 * Checks if the access token is valid and returns the associated user data.
 * This is useful for:
 * - Resuming sessions from stored tokens
 * - Verifying session validity periodically
 * - Getting current user information
 *
 * @param accessToken - The access token to validate
 * @param options - Optional validation configuration
 * @returns Promise resolving to MatrixUser on success
 * @throws MatrixAuthError on invalid/expired token
 *
 * @example
 * ```typescript
 * try {
 *   const user = await validateSession(storedToken, {
 *     homeserverUrl: 'https://matrix.example.com',
 *     includeProfile: true
 *   });
 *   console.log('Session valid for:', user.displayName);
 * } catch (error) {
 *   if (error instanceof MatrixAuthError && error.code === 'M_UNKNOWN_TOKEN') {
 *     console.log('Session expired, please log in again');
 *   }
 * }
 * ```
 */
export async function validateSession(
  accessToken: string,
  options: ValidateOptions = {}
): Promise<MatrixUser> {
  const homeserverUrl = options.homeserverUrl || DEFAULT_HOMESERVER_URL;
  const includeProfile = options.includeProfile ?? true;

  // First, check token validity with whoami endpoint
  const whoami = await matrixFetch<{
    user_id: string;
    device_id?: string;
    is_guest?: boolean;
  }>(homeserverUrl, '/account/whoami', {}, accessToken);

  const userId = whoami.user_id;

  // Build base user object
  let user: MatrixUser = {
    userId,
    displayName: null,
    avatarUrl: null,
  };

  // Optionally fetch full profile
  if (includeProfile) {
    try {
      const profile = await matrixFetch<{
        displayname?: string;
        avatar_url?: string;
      }>(
        homeserverUrl,
        `/profile/${encodeURIComponent(userId)}`,
        {},
        accessToken
      );

      user = {
        ...user,
        displayName: profile.displayname || null,
        avatarUrl: profile.avatar_url || null,
      };
    } catch (error) {
      // Profile fetch is optional - if it fails, continue with basic info
      // Some users might not have a profile set yet
      console.warn('Failed to fetch user profile:', error);
    }
  }

  // Optionally fetch presence
  try {
    const presence = await matrixFetch<{
      presence: string;
      status_msg?: string;
      last_active_ago?: number;
    }>(
      homeserverUrl,
      `/presence/${encodeURIComponent(userId)}/status`,
      {},
      accessToken
    );

    user = {
      ...user,
      presence: mapPresence(presence.presence),
      statusMessage: presence.status_msg || null,
    };
  } catch {
    // Presence fetch is optional - server might not support it
    // or user might have presence disabled
  }

  return user;
}

/**
 * Map Matrix presence string to UserPresence type
 */
function mapPresence(presence: string): UserPresence {
  switch (presence) {
    case 'online':
      return 'online';
    case 'unavailable':
      return 'unavailable';
    case 'offline':
    default:
      return 'offline';
  }
}

// =============================================================================
// Logout Function
// =============================================================================

/**
 * Logout options
 */
export interface LogoutOptions {
  /** Homeserver URL */
  homeserverUrl?: string;
  /** Logout all devices (not just current) */
  allDevices?: boolean;
}

/**
 * Logout from Matrix session
 *
 * Invalidates the access token on the server side.
 *
 * @param accessToken - Current access token to invalidate
 * @param options - Optional logout configuration
 * @throws MatrixAuthError on server error
 *
 * @example
 * ```typescript
 * await logout(session.accessToken, { allDevices: false });
 * // Clear local session storage after successful logout
 * ```
 */
export async function logout(
  accessToken: string,
  options: LogoutOptions = {}
): Promise<void> {
  const homeserverUrl = options.homeserverUrl || DEFAULT_HOMESERVER_URL;
  const endpoint = options.allDevices ? '/logout/all' : '/logout';

  await matrixFetch<Record<string, never>>(
    homeserverUrl,
    endpoint,
    { method: 'POST' },
    accessToken
  );
}

// =============================================================================
// Token Refresh Function
// =============================================================================

/**
 * Refresh an access token using a refresh token
 *
 * @param refreshToken - The refresh token from login
 * @param homeserverUrl - Homeserver URL
 * @returns New access token and optional new refresh token
 * @throws MatrixAuthError if refresh token is invalid
 */
export async function refreshAccessToken(
  refreshToken: string,
  homeserverUrl: string = DEFAULT_HOMESERVER_URL
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresInMs?: number;
}> {
  const response = await matrixFetch<{
    access_token: string;
    refresh_token?: string;
    expires_in_ms?: number;
  }>(homeserverUrl, '/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresInMs: response.expires_in_ms,
  };
}

// =============================================================================
// Server Discovery
// =============================================================================

/**
 * Discover Matrix server information from domain
 *
 * Uses .well-known discovery to find the actual homeserver URL
 * for a given domain.
 *
 * @param domain - Domain to discover (e.g., "example.com")
 * @returns Discovered homeserver URL
 * @throws MatrixAuthError if discovery fails
 */
export async function discoverHomeserver(domain: string): Promise<string> {
  const wellKnownUrl = `https://${domain}/.well-known/matrix/client`;

  try {
    const response = await fetch(wellKnownUrl);

    if (!response.ok) {
      throw new MatrixAuthError({
        code: 'M_NOT_FOUND',
        message: `No .well-known found for ${domain}`,
        httpStatus: response.status,
      });
    }

    const data = await response.json();
    const baseUrl = data['m.homeserver']?.base_url;

    if (!baseUrl) {
      throw new MatrixAuthError({
        code: 'M_NOT_FOUND',
        message: `Invalid .well-known response for ${domain}`,
      });
    }

    // Remove trailing slash if present
    return baseUrl.replace(/\/$/, '');
  } catch (error) {
    if (error instanceof MatrixAuthError) {
      throw error;
    }

    throw new MatrixAuthError({
      code: 'M_NOT_FOUND',
      message: `Failed to discover homeserver for ${domain}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

// =============================================================================
// Exports
// =============================================================================

export type { MatrixSession, MatrixUser, AuthError };
