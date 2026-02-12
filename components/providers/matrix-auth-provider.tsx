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
   * @returns Promise resolving to true on success, false on failure
   */
  login: (
    username: string,
    password: string,
    homeserverUrl?: string
  ) => Promise<boolean>;

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

    async function validateSession() {
      try {
        const result = await validateCurrentSession();

        if (!isMounted) return;

        if (result.success) {
          if (result.data) {
            setUser(result.data.user);
            setSession(result.data.session);
            onAuthChange?.(result.data.user);
          } else {
            setUser(null);
            setSession(null);
            onAuthChange?.(null);
          }
        } else {
          setError(result.error.message);
          setUser(null);
          setSession(null);
          onAuthChange?.(null);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(
          err instanceof Error ? err.message : "Failed to validate session"
        );
        setUser(null);
        setSession(null);
        onAuthChange?.(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    validateSession();

    return () => {
      isMounted = false;
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
    ): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await loginAction(username, password, homeserverUrl);

        if (result.success) {
          setUser(result.data.user);
          setSession(result.data.session);
          onAuthChange?.(result.data.user);
          return true;
        } else {
          setError(result.error.message);
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
    }),
    [user, session, isLoading, error, login, logout, register, clearError, refreshSession]
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
