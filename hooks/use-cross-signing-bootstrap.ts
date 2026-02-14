/**
 * Cross-Signing Bootstrap Hook
 *
 * Manages automatic cross-signing setup during user onboarding.
 * Attempts to bootstrap cross-signing after successful crypto initialization.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getCrossSigningStatus,
  bootstrapCrossSigning,
  isCrossSigningReady,
  type CrossSigningBootstrapResult,
} from "@/lib/matrix/crypto/cross-signing";
import type { CryptoState } from "@/lib/matrix/crypto/store";

// =============================================================================
// Types
// =============================================================================

interface CrossSigningBootstrapState {
  /** Whether we've attempted bootstrap for this session */
  attempted: boolean;
  /** Whether bootstrap is currently in progress */
  bootstrapping: boolean;
  /** Bootstrap result if completed */
  result: CrossSigningBootstrapResult | null;
  /** Error if bootstrap failed */
  error: string | null;
}

interface UseCrossSigningBootstrapOptions {
  /** Whether to enable automatic bootstrap (default: true) */
  enabled?: boolean;
  /** Whether to set up secret storage during bootstrap (default: true) */
  setupSecretStorage?: boolean;
  /** Callback when bootstrap completes */
  onBootstrapComplete?: (result: CrossSigningBootstrapResult) => void;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for managing cross-signing bootstrap during user onboarding
 *
 * This hook will automatically attempt to set up cross-signing when:
 * 1. Crypto is ready (status: "ready")
 * 2. Cross-signing is not already set up
 * 3. Bootstrap hasn't been attempted for this session
 *
 * @param cryptoState - Current crypto initialization state
 * @param options - Bootstrap configuration options
 * @returns Bootstrap state and manual trigger function
 */
export function useCrossSigningBootstrap(
  cryptoState: CryptoState,
  options: UseCrossSigningBootstrapOptions = {}
) {
  const {
    enabled = true,
    setupSecretStorage = true,
    onBootstrapComplete,
  } = options;

  // State
  const [state, setState] = useState<CrossSigningBootstrapState>({
    attempted: false,
    bootstrapping: false,
    result: null,
    error: null,
  });

  // Track if we've handled this crypto session
  const cryptoSessionRef = useRef<string | null>(null);

  // Reset state when crypto restarts
  useEffect(() => {
    if (cryptoState.status === "uninitialized" || cryptoState.status === "initializing") {
      if (cryptoSessionRef.current !== null) {
        setState({
          attempted: false,
          bootstrapping: false,
          result: null,
          error: null,
        });
        cryptoSessionRef.current = null;
      }
    }
  }, [cryptoState.status]);

  // Manual bootstrap trigger
  const triggerBootstrap = useCallback(async (): Promise<CrossSigningBootstrapResult> => {
    if (state.bootstrapping) {
      throw new Error("Bootstrap already in progress");
    }

    setState(prev => ({
      ...prev,
      bootstrapping: true,
      error: null,
    }));

    try {
      console.log("[CrossSigning] Manual bootstrap triggered");
      
      const result = await bootstrapCrossSigning({
        setupSecretStorage,
      });

      setState(prev => ({
        ...prev,
        attempted: true,
        bootstrapping: false,
        result,
        error: result.success ? null : result.error || "Bootstrap failed",
      }));

      if (result.success && onBootstrapComplete) {
        onBootstrapComplete(result);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      setState(prev => ({
        ...prev,
        attempted: true,
        bootstrapping: false,
        result: { success: false, error: errorMessage },
        error: errorMessage,
      }));

      throw error;
    }
  }, [state.bootstrapping, setupSecretStorage, onBootstrapComplete]);

  // Automatic bootstrap when crypto is ready
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Only trigger when crypto becomes ready
    if (cryptoState.status !== "ready" || !(cryptoState as any).isEncryptionSupported) {
      return;
    }

    // Already attempted for this crypto session
    const sessionKey = `ready-${(cryptoState as any).isEncryptionSupported}`;
    if (cryptoSessionRef.current === sessionKey) {
      return;
    }

    // Already attempting or completed
    if (state.attempted || state.bootstrapping) {
      return;
    }

    const attemptAutoBootstrap = async () => {
      try {
        console.log("[CrossSigning] Crypto ready - checking cross-signing status");
        
        // Check if cross-signing is already set up
        const status = await getCrossSigningStatus();
        if (status.isSetUp && status.isMasterKeyTrusted) {
          console.log("[CrossSigning] Cross-signing already set up and trusted");
          setState(prev => ({
            ...prev,
            attempted: true,
            result: { success: true, alreadySetup: true },
          }));
          cryptoSessionRef.current = sessionKey;
          return;
        }

        console.log("[CrossSigning] Cross-signing not set up - attempting bootstrap");
        
        // Mark session as handled before async operation
        cryptoSessionRef.current = sessionKey;
        
        setState(prev => ({
          ...prev,
          bootstrapping: true,
          error: null,
        }));

        const result = await bootstrapCrossSigning({
          setupSecretStorage,
        });

        setState(prev => ({
          ...prev,
          attempted: true,
          bootstrapping: false,
          result,
          error: result.success ? null : result.error || "Bootstrap failed",
        }));

        if (result.success) {
          console.log("[CrossSigning] Auto-bootstrap completed successfully");
          if (onBootstrapComplete) {
            onBootstrapComplete(result);
          }
        } else {
          console.warn("[CrossSigning] Auto-bootstrap failed:", result.error);
        }

      } catch (error) {
        console.error("[CrossSigning] Auto-bootstrap error:", error);
        
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setState(prev => ({
          ...prev,
          attempted: true,
          bootstrapping: false,
          result: { success: false, error: errorMessage },
          error: errorMessage,
        }));
      }
    };

    // Slight delay to allow crypto to fully settle
    const timer = setTimeout(attemptAutoBootstrap, 1000);
    return () => clearTimeout(timer);
    
  }, [
    enabled,
    cryptoState.status,
    (cryptoState as any).isEncryptionSupported,
    state.attempted,
    state.bootstrapping,
    setupSecretStorage,
    onBootstrapComplete,
  ]);

  return {
    // State
    ...state,
    // Computed state
    isAutoBootstrapEnabled: enabled,
    canTriggerManual: cryptoState.status === "ready" && !state.bootstrapping,
    // Actions
    triggerBootstrap,
  };
}

/**
 * Simple version for fire-and-forget automatic bootstrap
 * 
 * @param cryptoState - Current crypto state
 * @param enabled - Whether to enable auto-bootstrap
 */
export function useAutoCrossSigningBootstrap(
  cryptoState: CryptoState, 
  enabled: boolean = true
) {
  return useCrossSigningBootstrap(cryptoState, {
    enabled,
    setupSecretStorage: true,
    onBootstrapComplete: (result) => {
      if (result.success && !result.alreadySetup) {
        console.log("[CrossSigning] Cross-signing bootstrap completed automatically");
        if (result.recoveryKey) {
          console.log("[CrossSigning] Recovery key generated - user should save it");
          // TODO: Show notification to user about saving recovery key
        }
      }
    },
  });
}