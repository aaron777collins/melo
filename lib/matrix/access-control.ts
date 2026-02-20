/**
 * Access Control Module for Melo
 * 
 * Implements private mode functionality to restrict logins to
 * users from a specific homeserver. This is essential for
 * self-hosted deployments that want to prevent random users
 * from logging in.
 * 
 * SECURITY MODEL (Per Aaron's Requirements):
 * - Private mode is THE DEFAULT (no env var needed)
 * - Invite-only is THE DEFAULT in private mode
 * - MELO_PUBLIC_MODE=true is the ONLY way to allow randoms
 * - E2EE is mandatory and handled separately (not configurable)
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
  /** Whether private mode is active (DEFAULT: true) */
  privateMode: boolean;
  /** Whether public mode is explicitly enabled */
  publicMode: boolean;
  /** Allowed homeserver URL (only users from this homeserver can login in private mode) */
  allowedHomeserver: string | null;
  /** Whether invites are required for external users (DEFAULT: true in private mode) */
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
  code?: 'HOMESERVER_NOT_ALLOWED' | 'INVITE_REQUIRED' | 'M_FORBIDDEN';
}

// =============================================================================
// Configuration
// =============================================================================

/**
 * Get the access control configuration
 * 
 * DEFAULTS (no env vars needed):
 * - Private mode: ON
 * - Invite-only: ON (in private mode)
 * 
 * EXPLICIT OVERRIDE:
 * - MELO_PUBLIC_MODE=true → Disables private mode (allows anyone)
 * 
 * @returns The current access control configuration
 */
export function getAccessControlConfig(): AccessControlConfig {
  // PUBLIC MODE is the explicit opt-in exception
  // Only set this if you WANT randoms to join
  const publicMode = process.env.MELO_PUBLIC_MODE === 'true';
  
  // Private mode is the DEFAULT (true unless public mode explicitly enabled)
  const privateMode = !publicMode;
  
  // Invite-only is the DEFAULT in private mode
  // Cannot be disabled in private mode
  const inviteOnly = privateMode;
  
  // Allowed homeserver defaults to the configured Matrix homeserver
  const allowedHomeserver = process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL || null;
  
  return {
    privateMode,
    publicMode,
    allowedHomeserver,
    inviteOnly,
  };
}

/**
 * Get a client-safe version of the config (for UI display)
 * Does not include sensitive information
 */
export function getClientAccessControlConfig(): Pick<AccessControlConfig, 'privateMode' | 'allowedHomeserver' | 'inviteOnly'> {
  const config = getAccessControlConfig();
  return {
    privateMode: config.privateMode,
    allowedHomeserver: config.allowedHomeserver,
    inviteOnly: config.inviteOnly,
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
 * DEFAULT BEHAVIOR (no env vars):
 * - Private mode is ON
 * - Only users from the configured homeserver can login
 * - External users need an invitation
 * 
 * @param homeserverUrl - The homeserver URL the user is trying to log in with
 * @returns Validation result with allowed status and reason if denied
 * 
 * @example
 * ```typescript
 * const result = isLoginAllowed("https://matrix.org");
 * if (!result.allowed) {
 *   return NextResponse.json(
 *     { error: { code: result.code, message: result.reason } },
 *     { status: 403 }
 *   );
 * }
 * ```
 */
export function isLoginAllowed(homeserverUrl: string): LoginValidationResult {
  const config = getAccessControlConfig();
  
  // PUBLIC MODE: Allow anyone (chaos mode - explicit opt-in only)
  if (config.publicMode) {
    return { allowed: true };
  }
  
  // PRIVATE MODE (DEFAULT): Only configured homeserver allowed
  if (!config.allowedHomeserver) {
    // No homeserver configured but private mode on
    // This is a configuration issue - log warning but allow local homeserver concept
    console.warn(
      '[AccessControl] Private mode is active but NEXT_PUBLIC_MATRIX_HOMESERVER_URL is not configured. ' +
      'Configure your homeserver URL for proper access control.'
    );
    // In this case, we can't validate - allow but warn
    return { allowed: true };
  }
  
  // Check if the homeserver matches the allowed one
  const matches = homeserversMatch(homeserverUrl, config.allowedHomeserver);
  
  // Debug logging for access control
  console.log('[ACCESS_CONTROL] Homeserver comparison:', {
    requestedHomeserver: homeserverUrl,
    configuredHomeserver: config.allowedHomeserver,
    matches,
    privateMode: config.privateMode,
    publicMode: config.publicMode
  });
  
  if (!matches) {
    return {
      allowed: false,
      reason: 'This is a private server. External accounts require an invitation from a server administrator.',
      code: 'M_FORBIDDEN',
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
  
  // PUBLIC MODE: Allow all users
  if (config.publicMode) {
    return { allowed: true };
  }
  
  // PRIVATE MODE: Validate homeserver
  if (!config.allowedHomeserver) {
    return { allowed: true };
  }
  
  // Extract homeserver from user ID
  const userHomeserver = getHomeserverFromUserId(userId);
  if (!userHomeserver) {
    return {
      allowed: false,
      reason: 'Invalid Matrix user ID format.',
      code: 'M_FORBIDDEN',
    };
  }
  
  // Extract domain from allowed homeserver
  const allowedDomain = extractDomain(config.allowedHomeserver);
  
  // Check if user's homeserver matches allowed domain
  if (userHomeserver.toLowerCase() !== allowedDomain) {
    return {
      allowed: false,
      reason: 'Your account is from an external homeserver. Contact an administrator for an invitation.',
      code: 'M_FORBIDDEN',
    };
  }
  
  return { allowed: true };
}

// =============================================================================
// Admin/Invite Functions (To be implemented in Phase E)
// =============================================================================

/**
 * Check if a user is allowed via an admin invite (client-side, requires Matrix client)
 * 
 * In private mode (DEFAULT), external users can only access the server
 * if they have been invited by an administrator.
 * 
 * NOTE: This requires a logged-in Matrix client to access account data.
 * For pre-login checks, use hasValidInviteServerSide() instead.
 * 
 * @param userId - The Matrix user ID to check
 * @returns Whether the user has a valid invite
 */
export async function hasValidInvite(userId: string): Promise<boolean> {
  // Dynamic import to avoid circular dependencies
  const { checkUserHasValidInvite } = await import('./admin-invites');
  return checkUserHasValidInvite(userId);
}

/**
 * Check if a user has a valid invite (server-side, no Matrix client required)
 * 
 * This uses file-based storage and can be called during login flow
 * BEFORE the user is authenticated.
 * 
 * @param userId - The Matrix user ID to check
 * @returns Whether the user has a valid invite
 */
export function hasValidInviteServerSide(userId: string): boolean {
  // Dynamic require to avoid bundling fs in client code
  const { serverCheckHasValidInvite } = require('./server-invites');
  return serverCheckHasValidInvite(userId);
}

/**
 * Mark an invite as used (server-side)
 * 
 * Called after successful login with an invite.
 * 
 * @param userId - The Matrix user ID that used the invite
 * @returns Whether the operation succeeded
 */
export function markInviteUsedServerSide(userId: string): boolean {
  // Dynamic require to avoid bundling fs in client code
  const { serverMarkInviteUsed } = require('./server-invites');
  return serverMarkInviteUsed(userId);
}

/**
 * Validate login with invite check
 * 
 * Combines homeserver check with invite validation for external users.
 * Uses server-side storage that doesn't require Matrix authentication.
 * 
 * @param homeserverUrl - The homeserver URL
 * @param userId - The user ID (if known)
 * @returns Validation result
 */
export function isLoginAllowedWithInvite(
  homeserverUrl: string,
  userId?: string
): LoginValidationResult {
  const config = getAccessControlConfig();
  
  // First check homeserver
  const homeserverResult = isLoginAllowed(homeserverUrl);
  
  // If allowed by homeserver (same homeserver), we're good
  if (homeserverResult.allowed) {
    return homeserverResult;
  }
  
  // External user - check if they have an invite
  if (userId && config.inviteOnly) {
    const hasInvite = hasValidInviteServerSide(userId);
    if (hasInvite) {
      console.log(`[AccessControl] External user ${userId} has valid invite`);
      return { allowed: true };
    }
    
    // No invite - return invite-specific error
    return {
      allowed: false,
      reason: 'This is a private server. You need an invitation from an administrator to access with an external account.',
      code: 'INVITE_REQUIRED',
    };
  }
  
  // Not allowed
  return homeserverResult;
}

// =============================================================================
// Diagnostic Functions
// =============================================================================

/**
 * Check if access control is properly configured
 * 
 * Returns diagnostic information about the current configuration.
 */
export function getAccessControlStatus(): {
  isConfigured: boolean;
  mode: 'private' | 'public';
  privateMode: boolean;
  publicMode: boolean;
  inviteOnly: boolean;
  allowedHomeserver: string | null;
  warnings: string[];
} {
  const config = getAccessControlConfig();
  const warnings: string[] = [];
  
  if (config.privateMode && !config.allowedHomeserver) {
    warnings.push(
      'Private mode is active but NEXT_PUBLIC_MATRIX_HOMESERVER_URL is not set. ' +
      'Access control cannot properly validate homeservers.'
    );
  }
  
  if (config.publicMode) {
    warnings.push(
      'PUBLIC MODE is enabled (MELO_PUBLIC_MODE=true). ' +
      'Anyone from any homeserver can login. Only use this for public instances.'
    );
  }
  
  return {
    isConfigured: config.privateMode && !!config.allowedHomeserver,
    mode: config.publicMode ? 'public' : 'private',
    privateMode: config.privateMode,
    publicMode: config.publicMode,
    inviteOnly: config.inviteOnly,
    allowedHomeserver: config.allowedHomeserver,
    warnings,
  };
}
