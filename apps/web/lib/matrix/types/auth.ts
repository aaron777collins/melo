/**
 * Matrix Authentication Types
 * 
 * TypeScript types for Matrix authentication flows including login,
 * registration, and session management.
 */

// =============================================================================
// Core Credentials & Session Types
// =============================================================================

/**
 * Matrix homeserver credentials for connection
 */
export interface MatrixCredentials {
  /** Matrix homeserver URL (e.g., "https://matrix.example.com") */
  homeserverUrl: string;
  /** User's Matrix ID (e.g., "@user:example.com") */
  userId: string;
  /** Access token for authenticated requests */
  accessToken: string;
  /** Device ID for this session */
  deviceId: string;
}

/**
 * Active Matrix session information
 */
export interface MatrixSession {
  /** Unique session identifier */
  sessionId: string;
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
  /** Last activity timestamp (ISO 8601) */
  lastActiveAt: string;
  /** Whether session is currently valid */
  isValid: boolean;
  /** Optional refresh token for token renewal */
  refreshToken?: string;
  /** Token expiry timestamp (ISO 8601) if applicable */
  expiresAt?: string;
}

/**
 * Matrix user profile information
 */
export interface MatrixUser {
  /** User's Matrix ID (e.g., "@user:example.com") */
  userId: string;
  /** Display name (can be changed by user) */
  displayName: string | null;
  /** Avatar MXC URL (e.g., "mxc://example.com/abc123") */
  avatarUrl: string | null;
  /** Whether user is currently online */
  presence?: UserPresence;
  /** Custom status message */
  statusMessage?: string | null;
}

/**
 * User presence states
 */
export type UserPresence = 'online' | 'offline' | 'unavailable';

// =============================================================================
// Auth State Types
// =============================================================================

/**
 * Authentication state for the application
 */
export type AuthState = 
  | AuthStateLoading
  | AuthStateAuthenticated
  | AuthStateUnauthenticated
  | AuthStateError;

export interface AuthStateLoading {
  status: 'loading';
  message?: string;
}

export interface AuthStateAuthenticated {
  status: 'authenticated';
  session: MatrixSession;
  user: MatrixUser;
}

export interface AuthStateUnauthenticated {
  status: 'unauthenticated';
  /** Optional reason for being unauthenticated */
  reason?: 'logged_out' | 'session_expired' | 'never_logged_in';
}

export interface AuthStateError {
  status: 'error';
  error: AuthError;
}

/**
 * Authentication error details
 */
export interface AuthError {
  /** Matrix error code (e.g., "M_FORBIDDEN", "M_UNKNOWN_TOKEN") */
  code: string;
  /** Human-readable error message */
  message: string;
  /** HTTP status code if applicable */
  httpStatus?: number;
  /** Additional error details */
  details?: Record<string, unknown>;
}

// =============================================================================
// Login Types
// =============================================================================

/**
 * Supported login types
 */
export type LoginType = 'm.login.password' | 'm.login.token' | 'm.login.sso';

/**
 * Login request for password-based authentication
 */
export interface LoginRequest {
  /** Login type */
  type: LoginType;
  /** Homeserver URL to connect to */
  homeserverUrl: string;
  /** User identifier (user ID, email, or phone) */
  identifier: LoginIdentifier;
  /** Password for m.login.password */
  password?: string;
  /** Token for m.login.token */
  token?: string;
  /** Device display name */
  deviceDisplayName?: string;
  /** Existing device ID to reuse */
  deviceId?: string;
  /** Refresh token requested */
  refreshToken?: boolean;
}

/**
 * User identifier for login
 */
export type LoginIdentifier = 
  | UserIdentifier
  | ThirdPartyIdentifier
  | PhoneIdentifier;

export interface UserIdentifier {
  type: 'm.id.user';
  /** Matrix user ID (e.g., "@user:example.com" or just "user") */
  user: string;
}

export interface ThirdPartyIdentifier {
  type: 'm.id.thirdparty';
  /** Third party medium (e.g., "email") */
  medium: 'email';
  /** The email address */
  address: string;
}

export interface PhoneIdentifier {
  type: 'm.id.phone';
  /** ISO 3166-1 alpha-2 country code */
  country: string;
  /** Phone number */
  phone: string;
}

/**
 * Successful login response
 */
export interface LoginResponse {
  /** User's Matrix ID */
  userId: string;
  /** Access token for API requests */
  accessToken: string;
  /** Homeserver URL used */
  homeserverUrl: string;
  /** Device ID assigned to this session */
  deviceId: string;
  /** Well-known server info if discovered */
  wellKnown?: WellKnownInfo;
  /** Refresh token if requested and supported */
  refreshToken?: string;
  /** Token expiry in milliseconds from now */
  expiresInMs?: number;
}

/**
 * Well-known server discovery info
 */
export interface WellKnownInfo {
  homeserver: {
    baseUrl: string;
  };
  identityServer?: {
    baseUrl: string;
  };
}

// =============================================================================
// Registration Types
// =============================================================================

/**
 * Registration request for new account creation
 */
export interface RegisterRequest {
  /** Homeserver URL to register on */
  homeserverUrl: string;
  /** Desired username (localpart only, without domain) */
  username: string;
  /** Password for the account */
  password: string;
  /** Device display name */
  deviceDisplayName?: string;
  /** Prevent automatic login after registration */
  inhibitLogin?: boolean;
  /** Refresh token requested */
  refreshToken?: boolean;
  /** Initial display name for the user */
  initialDisplayName?: string;
  /** Authentication data for registration flows */
  auth?: RegistrationAuth;
}

/**
 * Registration authentication stage data
 */
export interface RegistrationAuth {
  /** Session ID for multi-stage registration */
  session?: string;
  /** Type of auth stage */
  type: RegistrationAuthType;
  /** Response data for the auth stage */
  response?: string;
  /** reCAPTCHA response if applicable */
  recaptchaResponse?: string;
  /** Email verification token if applicable */
  threepidCreds?: ThreePidCredentials;
}

/**
 * Third-party ID credentials (email/phone verification)
 */
export interface ThreePidCredentials {
  /** Session ID from identity server */
  sid: string;
  /** Client secret used during verification */
  clientSecret: string;
  /** Identity server URL (if different from default) */
  idServer?: string;
  /** Access token for identity server */
  idAccessToken?: string;
}

/**
 * Types of registration auth stages
 */
export type RegistrationAuthType = 
  | 'm.login.recaptcha'
  | 'm.login.terms'
  | 'm.login.email.identity'
  | 'm.login.msisdn'
  | 'm.login.dummy';

/**
 * Successful registration response
 */
export interface RegisterResponse {
  /** Assigned Matrix user ID */
  userId: string;
  /** Access token (unless inhibitLogin was true) */
  accessToken?: string;
  /** Homeserver URL */
  homeserverUrl: string;
  /** Device ID (unless inhibitLogin was true) */
  deviceId?: string;
  /** Refresh token if requested and supported */
  refreshToken?: string;
  /** Token expiry in milliseconds */
  expiresInMs?: number;
}

/**
 * Registration flow information from server
 */
export interface RegistrationFlowInfo {
  /** Session ID for this registration attempt */
  session: string;
  /** List of possible registration flows */
  flows: RegistrationFlow[];
  /** Parameters for specific auth types */
  params?: Record<string, unknown>;
  /** Stages already completed */
  completed?: RegistrationAuthType[];
}

/**
 * A single registration flow option
 */
export interface RegistrationFlow {
  /** Ordered list of auth stages to complete */
  stages: RegistrationAuthType[];
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Type guard to check if auth state is authenticated
 */
export function isAuthenticated(state: AuthState): state is AuthStateAuthenticated {
  return state.status === 'authenticated';
}

/**
 * Type guard to check if auth state has an error
 */
export function isAuthError(state: AuthState): state is AuthStateError {
  return state.status === 'error';
}

/**
 * Type guard to check if auth state is loading
 */
export function isAuthLoading(state: AuthState): state is AuthStateLoading {
  return state.status === 'loading';
}

/**
 * Extract user ID localpart from full Matrix ID
 * @example getLocalpart("@user:example.com") => "user"
 */
export function getLocalpart(userId: string): string {
  const match = userId.match(/^@([^:]+):/);
  return match ? match[1] : userId;
}

/**
 * Extract server name from full Matrix ID
 * @example getServerName("@user:example.com") => "example.com"
 */
export function getServerName(userId: string): string {
  const match = userId.match(/:(.+)$/);
  return match ? match[1] : '';
}
