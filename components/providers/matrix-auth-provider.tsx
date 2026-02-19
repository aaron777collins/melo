"use client";

/**
 * Matrix Authentication Context Provider
 *
 * Provides authentication state and actions throughout the application.
 * Handles session validation on mount, login, logout, and registration.
 *
 * @example
 * ```tsx
 * // In your root layout
 * import { MatrixAuthProvider } from '@/components/providers/matrix-auth-provider';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <MatrixAuthProvider>{children}</MatrixAuthProvider>
 *       </body>
 *     </html>
 *   );
 * }
 *
 * // In a component
 * import { useMatrixAuth } from '@/components/providers/matrix-auth-provider';
 *
 * function Profile() {
 *   const { user, isLoading, logout } = useMatrixAuth();
 *
 *   if (isLoading) return <Spinner />;
 *   if (!user) return <LoginButton />;
 *
 *   return (
 *     <div>
 *       <p>Welcome, {user.displayName}</p>
 *       <button onClick={logout}>Logout</button>
 *     </div>
 *   );
 * }
 * ```
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { MatrixUser, MatrixSession, AuthError } from "@/lib/matrix/types/auth";
import {
  validateCurrentSession,
  loginAction,
  logoutAction,
  registerAction,
} from "@/lib/matrix/actions/auth";
import { markUserAsNew } from "@/hooks/use-onboarding";

// =============================================================================
// Types
// =============================================================================

/**
 * Authentication context state
 */
interface MatrixAuthState {
  /** Current authenticated user, or null if not logged in */
  user: MatrixUser | null;
  /** Current session data, or null if not logged in */
  session: MatrixSession | null;
  /** Whether auth state is being loaded/validated */
  isLoading: boolean;
  /** Current error message, or null if no error */
  error: string | null;
}

/**
 * Authentication context actions
 */
interface MatrixAuthActions {
  /**
   * Log in with username and password
   * @param username - Matrix user ID or localpart
   * @param password - User's password
   * @param homeserverUrl - Optional homeserver URL (defaults to env config)
   * @returns Promise resolving to true on success, "2fa_required" for 2FA, false on failure
   */
  login: (
    username: string,
    password: string,
    homeserverUrl?: string
  ) => Promise<boolean | "2fa_required">;

  /**
   * Log out the current user
   * @param allDevices - Whether to log out all devices (default: false)
   * @returns Promise resolving when logout completes
   */
  logout: (allDevices?: boolean) => Promise<void>;

  /**
   * Register a new account
   * @param username - Desired username (localpart only)
   * @param password - Password for the new account
   * @param email - Optional email for account recovery
   * @param homeserverUrl - Optional homeserver URL (defaults to env config)
   * @returns Promise resolving to true on success, false on failure
   */
  register: (
    username: string,
    password: string,
    email?: string,
    homeserverUrl?: string
  ) => Promise<boolean>;

  /**
   * Clear the current error state
   */
  clearError: () => void;

  /**
   * Refresh the current session (re-validates with server)
   * @returns Promise resolving when refresh completes
   */
  refreshSession: () => Promise<void>;

  /**
   * Complete 2FA verification and login
   * @param session - The session data from 2FA verification
   * @param user - The user data from 2FA verification
   */
  complete2FALogin: (session: any, user: any) => void;
}

/**
 * Complete auth context value
 */
type MatrixAuthContextValue = MatrixAuthState & MatrixAuthActions;

// =============================================================================
// Context
// =============================================================================

const MatrixAuthContext = createContext<MatrixAuthContextValue | null>(null);

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to access Matrix authentication state and actions
 *
 * @throws Error if used outside of MatrixAuthProvider
 * @returns Authentication state and actions
 *
 * @example
 * ```tsx
 * function LoginForm() {
 *   const { login, isLoading, error } = useMatrixAuth();
 *   const [username, setUsername] = useState('');
 *   const [password, setPassword] = useState('');
 *
 *   const handleSubmit = async (e: FormEvent) => {
 *     e.preventDefault();
 *     const success = await login(username, password);
 *     if (success) {
 *       router.push('/channels');
 *     }
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {error && <p className="error">{error}</p>}
 *       <input value={username} onChange={e => setUsername(e.target.value)} />
 *       <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
 *       <button type="submit" disabled={isLoading}>
 *         {isLoading ? 'Loading...' : 'Login'}
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useMatrixAuth(): MatrixAuthContextValue {
  const context = useContext(MatrixAuthContext);

  if (!context) {
    throw new Error(
      "useMatrixAuth must be used within a MatrixAuthProvider. " +
        "Wrap your app with <MatrixAuthProvider> in your root layout."
    );
  }

  return context;
}

// =============================================================================
// Provider Props
// =============================================================================

interface MatrixAuthProviderProps {
  /** Child components */
  children: ReactNode;
  /**
   * Callback when authentication state changes
   * Useful for analytics or logging
   */
  onAuthChange?: (user: MatrixUser | null) => void;
}

// =============================================================================
// Provider Component
// =============================================================================

/**
 * Matrix Authentication Provider
 *
 * Wraps the application with authentication context.
 * Automatically validates session on mount.
 *
 * @param props - Provider props
 * @returns Provider component
 */
export function MatrixAuthProvider({
  children,
  onAuthChange,
}: MatrixAuthProviderProps): JSX.Element {
  // State
  const [user, setUser] = useState<MatrixUser | null>(null);
  const [session, setSession] = useState<MatrixSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // =============================================================================
  // Session Validation
  // =============================================================================

  /**
   * Validate session on mount
   */
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    async function validateSession() {
      console.log('[MatrixAuthProvider] Starting session validation...');
      setIsLoading(true);
      
      try {
        // Add timeout to prevent hanging forever
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('Session validation timed out after 10 seconds'));
          }, 10000);
        });

        const validationPromise = validateCurrentSession();
        const result = await Promise.race([validationPromise, timeoutPromise]);
        
        clearTimeout(timeoutId);
        console.log('[MatrixAuthProvider] Session validation result:', result);

        if (!isMounted) return;

        if (result.success) {
          if (result.data) {
            console.log('[MatrixAuthProvider] Valid session found, setting user:', result.data.user.userId);
            setUser(result.data.user);
            setSession(result.data.session);
            onAuthChange?.(result.data.user);
          } else {
            console.log('[MatrixAuthProvider] No session found, user not authenticated');
            setUser(null);
            setSession(null);
            onAuthChange?.(null);
          }
        } else {
          console.log('[MatrixAuthProvider] Session validation failed:', result.error);
          setUser(null);
          setSession(null);
          onAuthChange?.(null);
        }
      } catch (err) {
        console.error('[MatrixAuthProvider] Session validation error:', err);
        if (!isMounted) return;
        if (err instanceof Error && err.message.includes('timed out')) {
          console.log('[MatrixAuthProvider] Session validation timed out, proceeding without session');
          // Don't set error for timeout, just proceed without session
        }
        setUser(null);
        setSession(null);
        onAuthChange?.(null);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        if (isMounted) {
          console.log('[MatrixAuthProvider] Session validation complete, setting loading to false');
          setIsLoading(false);
        }
      }
    }

    validateSession();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [onAuthChange]);

  // =============================================================================
  // Actions
  // =============================================================================

  /**
   * Login action
   */
  const login = useCallback(
    async (
      username: string,
      password: string,
      homeserverUrl?: string
    ): Promise<boolean | "2fa_required"> => {
      setIsLoading(true);
      setError(null);

      try {
        // Use API route for more reliable standalone mode support
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, homeserverUrl }),
        });

        const result = await response.json();

        if (result.success) {
          // Check if 2FA is required
          if (result.requiresTwoFactor) {
            return "2fa_required";
          }
          
          // Regular successful login
          setUser(result.data.user);
          setSession(result.data.session);
          onAuthChange?.(result.data.user);
          return true;
        } else {
          setError(result.error?.message || "Login failed");
          return false;
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Login failed unexpectedly";
        setError(message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [onAuthChange]
  );

  /**
   * Logout action
   */
  const logout = useCallback(
    async (allDevices: boolean = false): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await logoutAction(allDevices);

        if (!result.success) {
          // Log error but continue with local logout
          console.warn("Logout warning:", result.error.message);
        }

        setUser(null);
        setSession(null);
        onAuthChange?.(null);
      } catch (err) {
        // Even on error, clear local state
        console.error("Logout error:", err);
        setUser(null);
        setSession(null);
        onAuthChange?.(null);
      } finally {
        setIsLoading(false);
      }
    },
    [onAuthChange]
  );

  /**
   * Register action
   */
  const register = useCallback(
    async (
      username: string,
      password: string,
      email?: string,
      homeserverUrl?: string
    ): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await registerAction(
          username,
          password,
          email,
          homeserverUrl
        );

        if (result.success) {
          setUser(result.data.user);
          setSession(result.data.session);
          onAuthChange?.(result.data.user);
          
          // Mark user as new to trigger onboarding flow
          markUserAsNew();
          
          return true;
        } else {
          setError(result.error.message);
          return false;
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Registration failed unexpectedly";
        setError(message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [onAuthChange]
  );

  /**
   * Clear error action
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Refresh session action
   */
  const refreshSession = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    try {
      const result = await validateCurrentSession();

      if (result.success && result.data) {
        setUser(result.data.user);
        setSession(result.data.session);
        onAuthChange?.(result.data.user);
      } else if (result.success) {
        // Session no longer valid
        setUser(null);
        setSession(null);
        onAuthChange?.(null);
      } else {
        setError(result.error.message);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh session"
      );
    } finally {
      setIsLoading(false);
    }
  }, [onAuthChange]);

  /**
   * Complete 2FA login action
   */
  const complete2FALogin = useCallback(
    (session: any, user: any) => {
      setUser(user);
      setSession(session);
      setIsLoading(false);
      onAuthChange?.(user);
    },
    [onAuthChange]
  );

  // =============================================================================
  // Context Value
  // =============================================================================

  const value = useMemo<MatrixAuthContextValue>(
    () => ({
      // State
      user,
      session,
      isLoading,
      error,
      // Actions
      login,
      logout,
      register,
      clearError,
      refreshSession,
      complete2FALogin,
    }),
    [user, session, isLoading, error, login, logout, register, clearError, refreshSession, complete2FALogin]
  );

  return (
    <MatrixAuthContext.Provider value={value}>
      {children}
    </MatrixAuthContext.Provider>
  );
}

// =============================================================================
// Exports
// =============================================================================

export type { MatrixAuthState, MatrixAuthActions, MatrixAuthContextValue };
