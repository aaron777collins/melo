"use client";

/**
 * EMERGENCY FIX: Matrix Authentication Context Provider
 *
 * Fixed version that addresses catastrophic runtime failures:
 * 1. MatrixAuthProvider infinite loading loop (circuit breaker)
 * 2. Server Action failures (defensive error handling) 
 * 3. Next.js client module loading errors (safe property access)
 * 4. Build vs Runtime disconnect (graceful degradation)
 *
 * Key fixes applied:
 * - Circuit breaker pattern to prevent infinite retry loops
 * - Defensive property access for undefined objects
 * - Graceful degradation when server actions fail
 * - Timeout mechanism for session validation
 * - Comprehensive error handling with fallbacks
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
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
// Circuit Breaker Implementation
// =============================================================================

interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

class SessionValidationCircuitBreaker {
  private state: CircuitBreakerState = {
    isOpen: false,
    failureCount: 0,
    lastFailureTime: 0,
    nextAttemptTime: 0,
  };

  private readonly maxFailures = 3;
  private readonly timeoutMs = 30000; // 30 seconds
  private readonly resetTimeMs = 300000; // 5 minutes

  canAttempt(): boolean {
    if (!this.state.isOpen) {
      return true;
    }

    // Check if enough time has passed to try resetting the circuit
    const now = Date.now();
    if (now >= this.state.nextAttemptTime) {
      this.state.isOpen = false;
      this.state.failureCount = 0;
      console.log('[CircuitBreaker] Attempting to reset circuit breaker');
      return true;
    }

    return false;
  }

  recordSuccess(): void {
    this.state.failureCount = 0;
    this.state.isOpen = false;
    console.log('[CircuitBreaker] Session validation successful, circuit reset');
  }

  recordFailure(): void {
    const now = Date.now();
    this.state.failureCount++;
    this.state.lastFailureTime = now;

    if (this.state.failureCount >= this.maxFailures) {
      this.state.isOpen = true;
      this.state.nextAttemptTime = now + this.resetTimeMs;
      console.warn(
        `[CircuitBreaker] Circuit breaker opened after ${this.state.failureCount} failures. ` +
        `Next attempt in ${this.resetTimeMs / 1000} seconds.`
      );
    }
  }

  getState(): Readonly<CircuitBreakerState> {
    return { ...this.state };
  }
}

// =============================================================================
// Types (unchanged from original)
// =============================================================================

interface MatrixAuthState {
  user: MatrixUser | null;
  session: MatrixSession | null;
  isLoading: boolean;
  error: string | null;
}

interface MatrixAuthActions {
  login: (
    username: string,
    password: string,
    homeserverUrl?: string
  ) => Promise<boolean | "2fa_required">;
  logout: (allDevices?: boolean) => Promise<void>;
  register: (
    username: string,
    password: string,
    email?: string,
    homeserverUrl?: string
  ) => Promise<boolean>;
  clearError: () => void;
  refreshSession: () => Promise<void>;
  complete2FALogin: (session: any, user: any) => void;
}

type MatrixAuthContextValue = MatrixAuthState & MatrixAuthActions;

// =============================================================================
// Context
// =============================================================================

const MatrixAuthContext = createContext<MatrixAuthContextValue | null>(null);

// =============================================================================
// Hook (unchanged)
// =============================================================================

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
  children: ReactNode;
  onAuthChange?: (user: MatrixUser | null) => void;
}

// =============================================================================
// Emergency Fixed Provider Component
// =============================================================================

export function MatrixAuthProvider({
  children,
  onAuthChange,
}: MatrixAuthProviderProps): JSX.Element {
  // State
  const [user, setUser] = useState<MatrixUser | null>(null);
  const [session, setSession] = useState<MatrixSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Circuit breaker for session validation
  const circuitBreaker = useRef(new SessionValidationCircuitBreaker());

  // Store the latest onAuthChange callback in a ref to prevent infinite re-renders
  const onAuthChangeRef = useRef(onAuthChange);
  
  // Update ref on every render but don't cause re-renders
  useEffect(() => {
    onAuthChangeRef.current = onAuthChange;
  }, [onAuthChange]);
  
  // Stabilize onAuthChange callback to prevent infinite re-renders
  const stableOnAuthChange = useCallback((user: MatrixUser | null) => {
    if (onAuthChangeRef.current) {
      onAuthChangeRef.current(user);
    }
  }, []); // Empty dependency array - callback never changes

  // DEFENSIVE LOGGING: Only log state changes, not every render
  const previousState = useRef({ isLoading, hasUser: !!user });
  useEffect(() => {
    const currentState = { isLoading, hasUser: !!user };
    if (
      currentState.isLoading !== previousState.current.isLoading ||
      currentState.hasUser !== previousState.current.hasUser
    ) {
      console.log('[MatrixAuthProvider] 🎯 State change - isLoading:', isLoading, 'hasUser:', !!user);
      previousState.current = currentState;
    }
  }, [isLoading, user]);

  // =============================================================================
  // Enhanced Session Validation with Circuit Breaker
  // =============================================================================

  /**
   * Safe validateCurrentSession wrapper with circuit breaker and defensive coding
   */
  const safeValidateCurrentSession = useCallback(async (): Promise<{
    success: boolean;
    data?: { user: MatrixUser; session: MatrixSession } | null;
    error?: AuthError;
  }> => {
    // Check circuit breaker first
    if (!circuitBreaker.current.canAttempt()) {
      return {
        success: false,
        error: {
          code: 'M_RATE_LIMITED',
          message: 'Session validation temporarily unavailable (circuit breaker)',
        },
      };
    }

    try {
      // Create timeout promise to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Session validation timeout after 10 seconds'));
        }, 10000);
      });

      // Enhanced server action call with defensive error handling
      let validationResult: any;
      
      try {
        // Race validation against timeout
        validationResult = await Promise.race([
          validateCurrentSession(),
          timeoutPromise
        ]);
      } catch (serverActionError) {
        // Handle specific server action failures gracefully
        const errorMessage = serverActionError instanceof Error ? serverActionError.message : 'Unknown error';
        
        // Check for known Next.js runtime errors
        if (
          errorMessage.includes('Failed to find Server Action') ||
          errorMessage.includes('clientModules') ||
          errorMessage.includes('workers') ||
          errorMessage.includes('Cannot read properties of undefined')
        ) {
          console.warn('[MatrixAuthProvider] ⚠️ Server action runtime error detected:', errorMessage);
          console.warn('[MatrixAuthProvider] 🔧 Proceeding with degraded authentication (no persistent session)');
          
          // Record circuit breaker failure
          circuitBreaker.current.recordFailure();
          
          return {
            success: true,
            data: null, // No session available due to runtime error
          };
        }
        
        // Re-throw other errors to be handled by outer catch
        throw serverActionError;
      }

      // Defensive property access for the result
      const safeResult = validationResult || {};
      const hasValidData = safeResult.success === true && 
                          safeResult.data && 
                          typeof safeResult.data === 'object' &&
                          safeResult.data.user &&
                          safeResult.data.session;

      if (hasValidData) {
        circuitBreaker.current.recordSuccess();
        return {
          success: true,
          data: safeResult.data,
        };
      } else {
        // No valid session but not an error
        circuitBreaker.current.recordSuccess(); // This is expected behavior
        return {
          success: true,
          data: null,
        };
      }

    } catch (error) {
      circuitBreaker.current.recordFailure();
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[MatrixAuthProvider] Session validation error:', errorMessage);
      
      return {
        success: false,
        error: {
          code: 'M_UNKNOWN',
          message: errorMessage,
        },
      };
    }
  }, []);

  /**
   * Initialize auth state on mount with enhanced error handling
   */
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | undefined;

    async function initializeAuthState() {
      try {
        console.log('[MatrixAuthProvider] 🔄 Starting session validation...');
        
        const result = await safeValidateCurrentSession();
        
        if (!isMounted) return;

        if (result.success) {
          if (result.data) {
            console.log('[MatrixAuthProvider] ✅ Session validation successful');
            setUser(result.data.user);
            setSession(result.data.session);
            stableOnAuthChange(result.data.user);
          } else {
            console.log('[MatrixAuthProvider] ❌ No valid session found');
            setUser(null);
            setSession(null);
            stableOnAuthChange(null);
          }
          setError(null); // Clear any previous errors
        } else {
          console.warn('[MatrixAuthProvider] ⚠️ Session validation failed:', result.error?.message);
          setUser(null);
          setSession(null);
          stableOnAuthChange(null);
          
          // Only set error for unexpected failures, not circuit breaker
          if (result.error?.code !== 'M_RATE_LIMITED') {
            setError(result.error?.message || 'Session validation failed');
          }
        }
      } catch (error) {
        if (!isMounted) return;
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[MatrixAuthProvider] Unexpected initialization error:', errorMessage);
        
        // Even on unexpected errors, proceed with no session
        setUser(null);
        setSession(null);
        stableOnAuthChange(null);
        setError('Authentication initialization failed');
      } finally {
        if (isMounted) {
          console.log('[MatrixAuthProvider] 🎯 Session validation complete, setting isLoading to false');
          setIsLoading(false);
        }
      }
    }

    // Add a small delay to prevent race conditions during app initialization
    timeoutId = setTimeout(() => {
      if (isMounted) {
        initializeAuthState();
      }
    }, 100);

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [safeValidateCurrentSession, stableOnAuthChange]);

  // =============================================================================
  // Enhanced Actions with Circuit Breaker Integration
  // =============================================================================

  /**
   * Enhanced login action with defensive server action handling
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

        // Defensive response handling
        const result = response.ok ? await response.json() : { success: false, error: { message: 'Network error' } };

        if (result?.success) {
          // Check if 2FA is required
          if (result.requiresTwoFactor) {
            return "2fa_required";
          }
          
          // Regular successful login - defensive property access
          if (result.data?.user && result.data?.session) {
            setUser(result.data.user);
            setSession(result.data.session);
            stableOnAuthChange(result.data.user);
            circuitBreaker.current.recordSuccess(); // Reset circuit breaker on successful login
            return true;
          }
        }

        const errorMessage = result?.error?.message || "Login failed";
        setError(errorMessage);
        return false;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Login failed unexpectedly";
        setError(message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [stableOnAuthChange]
  );

  /**
   * Enhanced logout action (unchanged but documented)
   */
  const logout = useCallback(
    async (allDevices: boolean = false): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        // Use defensive server action call
        let result: any;
        try {
          result = await logoutAction(allDevices);
        } catch (serverActionError) {
          // Even if server action fails, proceed with local logout
          console.warn("Logout server action failed, proceeding with local logout:", serverActionError);
          result = { success: false };
        }

        if (!result?.success) {
          console.warn("Logout warning:", result?.error?.message || 'Unknown error');
        }

        // Always clear local state
        setUser(null);
        setSession(null);
        stableOnAuthChange(null);
        circuitBreaker.current.recordSuccess(); // Reset circuit breaker on logout
      } catch (err) {
        console.error("Logout error:", err);
        // Even on error, clear local state
        setUser(null);
        setSession(null);
        stableOnAuthChange(null);
      } finally {
        setIsLoading(false);
      }
    },
    [stableOnAuthChange]
  );

  /**
   * Enhanced register action (similar defensive patterns)
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
        let result: any;
        try {
          result = await registerAction(username, password, email, homeserverUrl);
        } catch (serverActionError) {
          const errorMessage = serverActionError instanceof Error ? serverActionError.message : 'Registration failed';
          setError(errorMessage);
          return false;
        }

        if (result?.success && result.data?.user && result.data?.session) {
          setUser(result.data.user);
          setSession(result.data.session);
          stableOnAuthChange(result.data.user);
          circuitBreaker.current.recordSuccess();
          
          // Mark user as new to trigger onboarding flow
          markUserAsNew();
          
          return true;
        } else {
          setError(result?.error?.message || 'Registration failed');
          return false;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Registration failed unexpectedly";
        setError(message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [stableOnAuthChange]
  );

  /**
   * Clear error action (unchanged)
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Enhanced refresh session with circuit breaker
   */
  const refreshSession = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    try {
      const result = await safeValidateCurrentSession();

      if (result.success) {
        if (result.data) {
          setUser(result.data.user);
          setSession(result.data.session);
          stableOnAuthChange(result.data.user);
        } else {
          setUser(null);
          setSession(null);
          stableOnAuthChange(null);
        }
        setError(null);
      } else {
        setError(result.error?.message || 'Failed to refresh session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh session");
    } finally {
      setIsLoading(false);
    }
  }, [safeValidateCurrentSession, stableOnAuthChange]);

  /**
   * Complete 2FA login action (unchanged)
   */
  const complete2FALogin = useCallback(
    (session: any, user: any) => {
      setUser(user);
      setSession(session);
      setIsLoading(false);
      stableOnAuthChange(user);
      circuitBreaker.current.recordSuccess();
    },
    [stableOnAuthChange]
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