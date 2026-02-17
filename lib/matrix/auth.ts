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
  // Remove trailing slash from homeserver URL to avoid double slashes
  const normalizedUrl = homeserverUrl.replace(/\/+$/, '');
  const url = `${normalizedUrl}${API_PREFIX}${endpoint}`;

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
  // Matrix API returns snake_case, we need to handle both formats
  const response = await matrixFetch<{
    user_id: string;
    access_token: string;
    device_id: string;
    home_server?: string;
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

  // Create session object - use snake_case from API response
  const now = new Date().toISOString();
  const session: MatrixSession = {
    sessionId: `${response.device_id}-${Date.now()}`,
    userId: response.user_id,
    accessToken: response.access_token,
    deviceId: response.device_id,
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
// Registration Functions
// =============================================================================

/**
 * Registration options for creating new Matrix accounts
 */
export interface RegisterOptions {
  /** Homeserver URL to register on (defaults to env variable or matrix.org) */
  homeserverUrl?: string;
  /** Device display name shown in session list */
  deviceDisplayName?: string;
  /** Whether to inhibit the welcome message from the server */
  inhibitLogin?: boolean;
}

/**
 * Response from Matrix registration endpoint
 */
interface RegistrationResponse {
  user_id: string;
  access_token?: string;
  device_id?: string;
  home_server?: string;
}

/**
 * UIAA (User Interactive Authentication API) response
 * Returned when registration requires additional auth stages
 */
interface UiaaResponse {
  session: string;
  flows: Array<{
    stages: string[];
  }>;
  params?: Record<string, Record<string, unknown>>;
  completed?: string[];
  error?: string;
  errcode?: string;
}

/**
 * Check if a username is available for registration
 *
 * Queries the homeserver to determine if the specified username
 * can be used for a new account.
 *
 * @param username - The localpart to check (without the @user:server.com format)
 * @param homeserverUrl - Optional homeserver URL to check against
 * @returns Promise resolving to true if available, false if taken
 * @throws MatrixAuthError on server errors (not for "username taken")
 *
 * @example
 * ```typescript
 * const available = await checkUsernameAvailable('alice');
 * if (available) {
 *   console.log('Username is available!');
 * } else {
 *   console.log('Username is already taken');
 * }
 * ```
 */
export async function checkUsernameAvailable(
  username: string,
  homeserverUrl: string = DEFAULT_HOMESERVER_URL
): Promise<boolean> {
  // Strip @ prefix and server suffix if provided
  const localpart = username.startsWith('@')
    ? username.slice(1).split(':')[0]
    : username.split(':')[0];

  const url = `${homeserverUrl}${API_PREFIX}/register/available?username=${encodeURIComponent(localpart)}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      // Username is available
      const data: { available?: boolean } = await response.json();
      return data.available !== false;
    }

    // Check for "username taken" error codes
    const errorBody: { errcode?: string; error?: string } = await response.json().catch(() => ({}));

    if (
      errorBody.errcode === 'M_USER_IN_USE' ||
      errorBody.errcode === 'M_EXCLUSIVE' ||
      errorBody.errcode === 'M_INVALID_USERNAME'
    ) {
      return false;
    }

    // Other errors should be thrown
    throw new MatrixAuthError({
      code: errorBody.errcode || 'M_UNKNOWN',
      message: errorBody.error || `Failed to check username availability`,
      httpStatus: response.status,
      details: errorBody,
    });
  } catch (error) {
    if (error instanceof MatrixAuthError) {
      throw error;
    }

    throw new MatrixAuthError({
      code: 'M_UNKNOWN',
      message: `Failed to check username availability: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

/**
 * Register a new Matrix account
 *
 * Creates a new user account on the specified homeserver. The registration
 * flow may require completing User Interactive Authentication (UIAA) stages
 * depending on the homeserver's configuration.
 *
 * Note: Many public homeservers require email verification or CAPTCHA.
 * This function handles the basic "dummy" auth flow which works for
 * homeservers with open registration or development environments.
 *
 * @param username - The desired username (localpart only, e.g., "alice")
 * @param password - The password for the new account
 * @param email - Optional email address for account recovery
 * @param options - Optional registration configuration
 * @returns Promise resolving to MatrixSession on success
 * @throws MatrixAuthError on registration failure
 *
 * @example
 * ```typescript
 * try {
 *   const session = await register('newuser', 'securePassword123', 'user@example.com');
 *   console.log('Registered as:', session.userId);
 * } catch (error) {
 *   if (error instanceof MatrixAuthError) {
 *     switch (error.code) {
 *       case 'M_USER_IN_USE':
 *         console.log('Username already taken');
 *         break;
 *       case 'M_WEAK_PASSWORD':
 *         console.log('Password is too weak');
 *         break;
 *       case 'M_INVALID_USERNAME':
 *         console.log('Invalid username format');
 *         break;
 *       case 'M_REGISTRATION_DISABLED':
 *         console.log('Registration is disabled on this server');
 *         break;
 *       default:
 *         console.log('Registration failed:', error.message);
 *     }
 *   }
 * }
 * ```
 */
export async function register(
  username: string,
  password: string,
  email?: string,
  options: RegisterOptions = {}
): Promise<MatrixSession> {
  const homeserverUrl = options.homeserverUrl || DEFAULT_HOMESERVER_URL;
  const deviceDisplayName = options.deviceDisplayName || 'Melo Web';

  // Strip @ prefix and server suffix if provided
  const localpart = username.startsWith('@')
    ? username.slice(1).split(':')[0]
    : username.split(':')[0];

  // Build initial registration request
  const registerBody: Record<string, unknown> = {
    username: localpart,
    password,
    initial_device_display_name: deviceDisplayName,
    inhibit_login: options.inhibitLogin ?? false,
  };

  // First attempt - may return 401 with UIAA requirements
  const firstResponse = await attemptRegistration(homeserverUrl, registerBody);

  // If we got a direct success, return the session
  if ('userId' in firstResponse) {
    return firstResponse;
  }

  // We got a UIAA response - need to complete auth stages
  const uiaaResponse = firstResponse as UiaaResponse;

  // Find a flow we can complete
  // Look for "dummy" flow (no auth required) or "m.login.email.identity" if email provided
  const completableFlow = findCompletableFlow(uiaaResponse.flows, !!email);

  if (!completableFlow) {
    throw new MatrixAuthError({
      code: 'M_FORBIDDEN',
      message: 'Registration requires authentication stages that are not supported (e.g., CAPTCHA, email verification)',
      details: {
        availableFlows: uiaaResponse.flows,
        session: uiaaResponse.session,
      },
    });
  }

  // Complete the auth stages
  return completeRegistrationFlow(
    homeserverUrl,
    registerBody,
    uiaaResponse.session,
    completableFlow,
    email
  );
}

/**
 * Attempt a registration request
 * Returns either a MatrixSession (success) or UiaaResponse (need more auth)
 */
async function attemptRegistration(
  homeserverUrl: string,
  body: Record<string, unknown>
): Promise<MatrixSession | UiaaResponse> {
  const url = `${homeserverUrl}${API_PREFIX}/register`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  // Success - registration complete
  if (response.ok) {
    return createSessionFromRegistration(data as RegistrationResponse, homeserverUrl);
  }

  // 401 with session means UIAA flow required
  if (response.status === 401 && data.session) {
    return data as UiaaResponse;
  }

  // Handle specific error codes
  throw new MatrixAuthError({
    code: data.errcode || 'M_UNKNOWN',
    message: data.error || 'Registration failed',
    httpStatus: response.status,
    details: data,
  });
}

/**
 * Find an authentication flow we can complete
 */
function findCompletableFlow(
  flows: Array<{ stages: string[] }>,
  hasEmail: boolean = false
): string[] | null {
  // Priority order for flows we can handle
  const preferences = [
    // Empty flow = no auth needed
    (stages: string[]) => stages.length === 0,
    // Dummy auth = no actual auth needed
    (stages: string[]) => stages.length === 1 && stages[0] === 'm.login.dummy',
    // Terms only = just need to accept terms
    (stages: string[]) => stages.length === 1 && stages[0] === 'm.login.terms',
    // Email identity (if email provided)
    (stages: string[]) =>
      hasEmail &&
      stages.length === 1 &&
      stages[0] === 'm.login.email.identity',
  ];

  for (const preference of preferences) {
    const flow = flows.find((f) => preference(f.stages));
    if (flow) {
      return flow.stages;
    }
  }

  return null;
}

/**
 * Complete a UIAA registration flow
 */
async function completeRegistrationFlow(
  homeserverUrl: string,
  baseBody: Record<string, unknown>,
  session: string,
  stages: string[],
  email?: string
): Promise<MatrixSession> {
  let currentBody = { ...baseBody };

  for (const stage of stages) {
    const auth = buildAuthStage(stage, session, email);
    currentBody = {
      ...currentBody,
      auth,
    };

    const result = await attemptRegistration(homeserverUrl, currentBody);

    // If we got a session back, we're done
    if ('userId' in result) {
      return result;
    }

    // Otherwise continue with next stage
    // Update session in case it changed
    if (result.session) {
      currentBody.auth = {
        ...(currentBody.auth as Record<string, unknown>),
        session: result.session,
      };
    }
  }

  // If we completed all stages but didn't get a session, try one more time with dummy
  const finalBody = {
    ...currentBody,
    auth: {
      type: 'm.login.dummy',
      session,
    },
  };

  const finalResult = await attemptRegistration(homeserverUrl, finalBody);

  if ('userId' in finalResult) {
    return finalResult;
  }

  throw new MatrixAuthError({
    code: 'M_FORBIDDEN',
    message: 'Failed to complete registration flow',
    details: finalResult as unknown as Record<string, unknown>,
  });
}

/**
 * Build auth object for a specific UIAA stage
 */
function buildAuthStage(
  stageType: string,
  session: string,
  email?: string
): Record<string, unknown> {
  const base = {
    session,
    type: stageType,
  };

  switch (stageType) {
    case 'm.login.dummy':
      return base;

    case 'm.login.terms':
      // Accept terms of service
      return base;

    case 'm.login.email.identity':
      if (!email) {
        throw new MatrixAuthError({
          code: 'M_MISSING_PARAM',
          message: 'Email required for m.login.email.identity stage',
        });
      }
      return {
        ...base,
        threepid_creds: {
          sid: '', // Would need actual email verification flow
          client_secret: '',
        },
        threepidCreds: {
          sid: '',
          client_secret: '',
        },
      };

    default:
      // Unknown stage type - try with just the base
      return base;
  }
}

/**
 * Create a MatrixSession from registration response
 */
function createSessionFromRegistration(
  response: RegistrationResponse,
  homeserverUrl: string
): MatrixSession {
  const now = new Date().toISOString();

  // If inhibit_login was true, we won't have an access token
  if (!response.access_token || !response.device_id) {
    throw new MatrixAuthError({
      code: 'M_MISSING_TOKEN',
      message:
        'Registration successful but no access token returned. Login separately to obtain a session.',
      details: { userId: response.user_id },
    });
  }

  return {
    sessionId: `${response.device_id}-${Date.now()}`,
    userId: response.user_id,
    accessToken: response.access_token,
    deviceId: response.device_id,
    homeserverUrl,
    createdAt: now,
    lastActiveAt: now,
    isValid: true,
  };
}

// =============================================================================
// Exports
// =============================================================================

export type { MatrixSession, MatrixUser, AuthError };
