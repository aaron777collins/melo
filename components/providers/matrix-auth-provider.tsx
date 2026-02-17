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
import { 
  isLoginAllowedWithInvite, 
  getClientAccessControlConfig 
} from "@/lib/matrix/access-control";
import { markUserAsNew } from "@/hooks/use-onboarding";

// Rest of the import statements and existing code remain the same...

// MODIFY the login method to use isLoginAllowedWithInvite
const login = useCallback(
  async (
    username: string,
    password: string,
    homeserverUrl?: string
  ): Promise<boolean | "2fa_required"> => {
    setIsLoading(true);
    setError(null);

    // Construct full userId from username and homeserverUrl
    const config = getClientAccessControlConfig();
    const homeserver = homeserverUrl || config.allowedHomeserver || 'https://matrix.org';
    const userId = `@${username}:${new URL(homeserver).hostname}`;

    try {
      // First, check login allowed (with invite)
      const accessResult = await isLoginAllowedWithInvite(homeserver, userId);
      if (!accessResult.allowed) {
        setError(accessResult.reason || 'Login not allowed');
        return false;
      }

      // Use API route for more reliable standalone mode support
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, homeserverUrl: homeserver }),
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

// Rest of the code remains the same...