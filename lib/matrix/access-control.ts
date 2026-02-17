/**
 * Access Control Module for Melo
 * 
 * Implements private mode functionality to restrict logins to
 * users from a specific homeserver. This is essential for
 * self-hosted deployments that want to prevent random users
 * from logging in.
 * 
 * @module lib/matrix/access-control
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Access control configuration
 */
export interface AccessControlConfig {
  /** Enable private mode (restrict to allowed homeserver) */
  privateMode: boolean;
  /** Allowed homeserver URL (only users from this homeserver can login) */
  allowedHomeserver: string | null;
  /** Require invite for external users (future feature) */
  inviteOnly: boolean;
}

/**
 * Result of login validation
 */
export interface LoginValidationResult {
  /** Whether the login is allowed */
  allowed: boolean;
  /** Reason if login is denied */
  reason?: string;
  /** Error code for programmatic handling */
  code?: 'HOMESERVER_NOT_ALLOWED' | 'INVITE_REQUIRED';
}

// =============================================================================
// Configuration
// =============================================================================

/**
 * Get the access control configuration from environment variables
 * 
 * Environment variables:
 * - MELO_PRIVATE_MODE: "true" to enable private mode (default: true for security)
 * - MELO_ALLOWED_HOMESERVER: URL of the allowed homeserver
 * - MELO_INVITE_ONLY: "true" to require invites for external users
 * 
 * @returns The current access control configuration
 */
export function getAccessControlConfig(): AccessControlConfig {
  return {
    // Default to private mode for security
    privateMode: process.env.MELO_PRIVATE_MODE !== 'false',
    allowedHomeserver: process.env.MELO_ALLOWED_HOMESERVER || 
                       process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL || 
                       null,
    inviteOnly: process.env.MELO_INVITE_ONLY === 'true',
  };
}

/**
 * Get a client-safe version of the config (for UI display)
 * Does not include sensitive information
 */
export function getClientAccessControlConfig(): Pick<AccessControlConfig, 'privateMode' | 'allowedHomeserver'> {
  return {
    privateMode: process.env.NEXT_PUBLIC_MELO_PRIVATE_MODE !== 'false',
    allowedHomeserver: process.env.NEXT_PUBLIC_MELO_ALLOWED_HOMESERVER || 
                       process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL || 
                       null,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Extract the homeserver domain from a Matrix user ID
 * 
 * @param userId - Matrix user ID in format @user:homeserver.com
 * @returns The homeserver domain, or empty string if invalid
 * 
 * @example
 * getHomeserverFromUserId("@alice:matrix.org") // "matrix.org"
 * getHomeserverFromUserId("alice") // ""
 */
export function getHomeserverFromUserId(userId: string): string {
  const match = userId.match(/@[^:]+:(.+)/);
  return match ? match[1] : '';
}

/**
 * Normalize a homeserver URL for comparison
 * 
 * Removes trailing slashes and converts to lowercase for consistent comparison.
 * 
 * @param url - The homeserver URL to normalize
 * @returns Normalized URL
 */
export function normalizeHomeserverUrl(url: string): string {
  return url.replace(/\/+$/, '').toLowerCase();
}

/**
 * Extract domain from a homeserver URL
 * 
 * @param url - Full homeserver URL (e.g., "https://matrix.example.com")
 * @returns Domain without protocol (e.g., "matrix.example.com")
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase();
  } catch {
    // If not a valid URL, try to extract domain directly
    return url.replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
  }
}

/**
 * Check if two homeserver URLs match
 * 
 * Handles various URL formats and normalizes for comparison.
 * 
 * @param url1 - First homeserver URL
 * @param url2 - Second homeserver URL
 * @returns True if the URLs refer to the same homeserver
 */
export function homeserversMatch(url1: string, url2: string): boolean {
  // Normalize both URLs
  const normalized1 = normalizeHomeserverUrl(url1);
  const normalized2 = normalizeHomeserverUrl(url2);
  
  // Direct comparison
  if (normalized1 === normalized2) {
    return true;
  }
  
  // Domain comparison (handles http vs https differences)
  const domain1 = extractDomain(url1);
  const domain2 = extractDomain(url2);
  
  return domain1 === domain2;
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate if a login attempt should be allowed based on access control settings
 * 
 * This should be called BEFORE attempting Matrix authentication to reject
 * unauthorized homeservers early.
 * 
 * @param homeserverUrl - The homeserver URL the user is trying to log in with
 * @returns Validation result with allowed status and reason if denied
 * 
 * @example
 * ```typescript
 * const result = isLoginAllowed("https://matrix.org");
 * if (!result.allowed) {
 *   return NextResponse.json(
 *     { error: result.reason },
 *     { status: 403 }
 *   );
 * }
 * ```
 */
export function isLoginAllowed(homeserverUrl: string): LoginValidationResult {
  const config = getAccessControlConfig();
  
  // If private mode is disabled, allow all logins
  if (!config.privateMode) {
    return { allowed: true };
  }
  
  // If no allowed homeserver is configured, allow all
  // (private mode is effectively disabled)
  if (!config.allowedHomeserver) {
    console.warn(
      '[AccessControl] Private mode enabled but no MELO_ALLOWED_HOMESERVER configured. ' +
      'This means all homeservers are allowed, which may not be intended.'
    );
    return { allowed: true };
  }
  
  // Check if the homeserver matches the allowed one
  if (!homeserversMatch(homeserverUrl, config.allowedHomeserver)) {
    return {
      allowed: false,
      reason: 'This is a private server. Only accounts from the configured homeserver are allowed to login.',
      code: 'HOMESERVER_NOT_ALLOWED',
    };
  }
  
  return { allowed: true };
}

/**
 * Validate if a user is allowed to access the application
 * 
 * Validates based on the user's Matrix ID and the configured access control.
 * This can be used for additional validation after login.
 * 
 * @param userId - The Matrix user ID (e.g., "@alice:matrix.org")
 * @returns Validation result with allowed status and reason if denied
 */
export function isUserAllowed(userId: string): LoginValidationResult {
  const config = getAccessControlConfig();
  
  // If private mode is disabled, allow all users
  if (!config.privateMode) {
    return { allowed: true };
  }
  
  // If no allowed homeserver is configured, allow all
  if (!config.allowedHomeserver) {
    return { allowed: true };
  }
  
  // Extract homeserver from user ID
  const userHomeserver = getHomeserverFromUserId(userId);
  if (!userHomeserver) {
    return {
      allowed: false,
      reason: 'Invalid Matrix user ID format.',
      code: 'HOMESERVER_NOT_ALLOWED',
    };
  }
  
  // Extract domain from allowed homeserver
  const allowedDomain = extractDomain(config.allowedHomeserver);
  
  // Check if user's homeserver matches allowed domain
  if (userHomeserver.toLowerCase() !== allowedDomain) {
    return {
      allowed: false,
      reason: 'Your account is from a homeserver that is not allowed on this server.',
      code: 'HOMESERVER_NOT_ALLOWED',
    };
  }
  
  return { allowed: true };
}

// =============================================================================
// Admin/Invite Functions (Placeholder for future implementation)
// =============================================================================

/**
 * Check if a user is allowed via an admin invite
 * 
 * TODO: Implement invite system in Phase E
 * 
 * @param userId - The Matrix user ID to check
 * @returns Whether the user has a valid invite
 */
export async function hasValidInvite(userId: string): Promise<boolean> {
  // Placeholder for invite system
  // Will be implemented in Phase E: Admin Invite System
  return false;
}

/**
 * Check if access control is properly configured
 * 
 * Returns diagnostic information about the current configuration.
 */
export function getAccessControlStatus(): {
  isConfigured: boolean;
  privateMode: boolean;
  allowedHomeserver: string | null;
  warnings: string[];
} {
  const config = getAccessControlConfig();
  const warnings: string[] = [];
  
  if (config.privateMode && !config.allowedHomeserver) {
    warnings.push(
      'Private mode is enabled but no allowed homeserver is configured. ' +
      'Set MELO_ALLOWED_HOMESERVER to restrict access.'
    );
  }
  
  return {
    isConfigured: config.privateMode && !!config.allowedHomeserver,
    privateMode: config.privateMode,
    allowedHomeserver: config.allowedHomeserver,
    warnings,
  };
}
