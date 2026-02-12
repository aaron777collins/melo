"use server";

/**
 * Matrix Authentication Server Actions
 *
 * Server-side actions for Matrix authentication that handle
 * cookie management securely. These are called from client
 * components via the MatrixAuthProvider.
 */

import {
  loginWithPassword,
  logout as matrixLogout,
  register as matrixRegister,
  validateSession as matrixValidateSession,
  MatrixAuthError,
} from "@/lib/matrix/auth";
import {
  setSessionCookie,
  getSessionCookie,
  clearSessionCookie,
} from "@/lib/matrix/cookies";
import type { MatrixUser, MatrixSession, AuthError } from "@/lib/matrix/types/auth";

// =============================================================================
// Types
// =============================================================================

/**
 * Result type for auth actions
 */
export type AuthActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: AuthError };

/**
 * Session validation result
 */
export interface ValidatedSession {
  session: MatrixSession;
  user: MatrixUser;
}

// =============================================================================
// Server Actions
// =============================================================================

/**
 * Server action to validate the current session from cookie
 *
 * Checks if a valid session cookie exists and validates the
 * access token with the Matrix homeserver.
 *
 * @returns The validated session and user, or null if not authenticated
 */
export async function validateCurrentSession(): Promise<
  AuthActionResult<ValidatedSession | null>
> {
  try {
    const session = await getSessionCookie();

    if (!session) {
      return { success: true, data: null };
    }

    // Validate the access token with the homeserver
    const user = await matrixValidateSession(session.accessToken, {
      homeserverUrl: session.homeserverUrl,
      includeProfile: true,
    });

    return {
      success: true,
      data: { session, user },
    };
  } catch (error) {
    // If validation fails, clear the invalid session
    await clearSessionCookie();

    if (error instanceof MatrixAuthError) {
      // For expired/invalid tokens, just return null (not an error)
      if (
        error.code === "M_UNKNOWN_TOKEN" ||
        error.code === "M_FORBIDDEN" ||
        error.httpStatus === 401
      ) {
        return { success: true, data: null };
      }

      return {
        success: false,
        error: error.toAuthError(),
      };
    }

    return {
      success: false,
      error: {
        code: "M_UNKNOWN",
        message:
          error instanceof Error ? error.message : "Failed to validate session",
      },
    };
  }
}

/**
 * Server action to log in with username and password
 *
 * @param username - Matrix user ID or localpart
 * @param password - User's password
 * @param homeserverUrl - Optional homeserver URL
 * @returns The new session and user profile
 */
export async function loginAction(
  username: string,
  password: string,
  homeserverUrl?: string
): Promise<AuthActionResult<ValidatedSession>> {
  try {
    // Perform login
    const session = await loginWithPassword(username, password, {
      homeserverUrl,
      deviceDisplayName: "HAOS Web",
      requestRefreshToken: true,
    });

    // Store session in cookie
    await setSessionCookie(session);

    // Get user profile
    const user = await matrixValidateSession(session.accessToken, {
      homeserverUrl: session.homeserverUrl,
      includeProfile: true,
    });

    return {
      success: true,
      data: { session, user },
    };
  } catch (error) {
    if (error instanceof MatrixAuthError) {
      return {
        success: false,
        error: error.toAuthError(),
      };
    }

    return {
      success: false,
      error: {
        code: "M_UNKNOWN",
        message: error instanceof Error ? error.message : "Login failed",
      },
    };
  }
}

/**
 * Server action to register a new account
 *
 * @param username - Desired username (localpart)
 * @param password - Password for the new account
 * @param email - Optional email for account recovery
 * @param homeserverUrl - Optional homeserver URL
 * @returns The new session and user profile
 */
export async function registerAction(
  username: string,
  password: string,
  email?: string,
  homeserverUrl?: string
): Promise<AuthActionResult<ValidatedSession>> {
  try {
    // Perform registration
    const session = await matrixRegister(username, password, email, {
      homeserverUrl,
      deviceDisplayName: "HAOS Web",
    });

    // Store session in cookie
    await setSessionCookie(session);

    // Get user profile (may be empty for new users)
    const user = await matrixValidateSession(session.accessToken, {
      homeserverUrl: session.homeserverUrl,
      includeProfile: true,
    });

    return {
      success: true,
      data: { session, user },
    };
  } catch (error) {
    if (error instanceof MatrixAuthError) {
      return {
        success: false,
        error: error.toAuthError(),
      };
    }

    return {
      success: false,
      error: {
        code: "M_UNKNOWN",
        message: error instanceof Error ? error.message : "Registration failed",
      },
    };
  }
}

/**
 * Server action to log out
 *
 * Invalidates the access token on the homeserver and clears cookies.
 *
 * @param allDevices - Whether to log out all devices
 * @returns Success status
 */
export async function logoutAction(
  allDevices: boolean = false
): Promise<AuthActionResult<void>> {
  try {
    const session = await getSessionCookie();

    if (session) {
      // Invalidate token on server
      try {
        await matrixLogout(session.accessToken, {
          homeserverUrl: session.homeserverUrl,
          allDevices,
        });
      } catch (error) {
        // Continue with local logout even if server logout fails
        console.warn("Server logout failed:", error);
      }
    }

    // Always clear local cookies
    await clearSessionCookie();

    return { success: true, data: undefined };
  } catch (error) {
    // Still try to clear cookies even on error
    await clearSessionCookie();

    if (error instanceof MatrixAuthError) {
      return {
        success: false,
        error: error.toAuthError(),
      };
    }

    return {
      success: false,
      error: {
        code: "M_UNKNOWN",
        message: error instanceof Error ? error.message : "Logout failed",
      },
    };
  }
}
