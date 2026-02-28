// Temporary fix for ST-P2-01-D: Add fallback timeout for isLoading state
// This ensures the signup form is never stuck in loading state

"use client";

import { useEffect } from "react";
import { useMatrixAuth } from "./matrix-auth-provider";

/**
 * Safety wrapper that ensures loading state is cleared
 * This is a temporary fix for the signup form being stuck in loading state
 */
export function MatrixAuthLoadingSafety({ children }: { children: React.ReactNode }) {
  const { isLoading } = useMatrixAuth();

  useEffect(() => {
    // Safety timeout to force loading state to false if it's stuck
    const safetyTimeout = setTimeout(() => {
      if (isLoading) {
        console.warn('[MatrixAuthLoadingSafety] ⚠️ Loading state stuck, forcing page refresh...');
        // Force a page refresh to reset the auth state
        window.location.reload();
      }
    }, 15000); // 15 seconds - longer than the auth provider's own timeout

    return () => clearTimeout(safetyTimeout);
  }, [isLoading]);

  return <>{children}</>;
}