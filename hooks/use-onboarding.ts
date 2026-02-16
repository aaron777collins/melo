"use client";

/**
 * Onboarding Management Hook
 * 
 * Manages the state and logic for new user onboarding.
 * Determines when to show onboarding based on user registration status
 * and previous onboarding completion.
 */

import { useState, useEffect, useCallback } from "react";
import { useMatrixAuth } from "@/components/providers/matrix-auth-provider";

// =============================================================================
// Types
// =============================================================================

export interface OnboardingState {
  /** Whether onboarding should be shown */
  shouldShowOnboarding: boolean;
  /** Whether onboarding is currently active */
  isOnboardingActive: boolean;
  /** Whether user has completed onboarding before */
  hasCompletedOnboarding: boolean;
  /** Whether we're still checking onboarding status */
  isLoading: boolean;
}

export interface OnboardingActions {
  /** Start the onboarding process */
  startOnboarding: () => void;
  /** Mark onboarding as completed */
  completeOnboarding: () => void;
  /** Skip onboarding for this session */
  skipOnboarding: () => void;
  /** Reset onboarding state (for testing/admin purposes) */
  resetOnboarding: () => void;
  /** Check if user is a new user who just registered */
  checkIfNewUser: () => boolean;
}

export type UseOnboardingResult = OnboardingState & OnboardingActions;

// =============================================================================
// Constants
// =============================================================================

const ONBOARDING_STORAGE_KEY = "haos-onboarding-completed";
const NEW_USER_STORAGE_KEY = "haos-new-user-flag";
const ONBOARDING_VERSION = "1.0"; // Increment to reset onboarding for all users

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if user has completed onboarding
 */
function getOnboardingStatus(): { completed: boolean; version: string | null } {
  if (typeof window === "undefined") return { completed: false, version: null };
  
  try {
    const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!stored) return { completed: false, version: null };
    
    const parsed = JSON.parse(stored);
    return {
      completed: parsed.completed || false,
      version: parsed.version || null
    };
  } catch {
    return { completed: false, version: null };
  }
}

/**
 * Save onboarding completion status
 */
function saveOnboardingStatus(completed: boolean) {
  if (typeof window === "undefined") return;
  
  try {
    const data = {
      completed,
      version: ONBOARDING_VERSION,
      completedAt: new Date().toISOString()
    };
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn("Failed to save onboarding status:", error);
  }
}

/**
 * Check if user is flagged as new (just registered)
 */
function isNewUser(): boolean {
  if (typeof window === "undefined") return false;
  
  try {
    const flag = localStorage.getItem(NEW_USER_STORAGE_KEY);
    return flag === "true";
  } catch {
    return false;
  }
}

/**
 * Set new user flag
 */
function setNewUserFlag(isNew: boolean) {
  if (typeof window === "undefined") return;
  
  try {
    if (isNew) {
      localStorage.setItem(NEW_USER_STORAGE_KEY, "true");
    } else {
      localStorage.removeItem(NEW_USER_STORAGE_KEY);
    }
  } catch (error) {
    console.warn("Failed to set new user flag:", error);
  }
}

/**
 * Check if user should see onboarding based on various factors
 */
function shouldShowOnboardingFlow(
  isAuthenticated: boolean,
  isNewUser: boolean,
  hasCompleted: boolean,
  versionMatches: boolean
): boolean {
  // Must be authenticated
  if (!isAuthenticated) return false;
  
  // If version doesn't match, should show onboarding again
  if (!versionMatches) return true;
  
  // If user has completed onboarding, don't show
  if (hasCompleted) return false;
  
  // Show for new users
  if (isNewUser) return true;
  
  // Default: don't show for existing users who haven't completed
  // (they probably dismissed it before)
  return false;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for managing new user onboarding flow
 * 
 * @example
 * ```tsx
 * function App() {
 *   const {
 *     shouldShowOnboarding,
 *     isOnboardingActive,
 *     startOnboarding,
 *     completeOnboarding,
 *     skipOnboarding
 *   } = useOnboarding();
 *   
 *   return (
 *     <>
 *       {shouldShowOnboarding && (
 *         <OnboardingModal
 *           isOpen={isOnboardingActive}
 *           onClose={skipOnboarding}
 *           onComplete={completeOnboarding}
 *         />
 *       )}
 *       <MainApp />
 *     </>
 *   );
 * }
 * ```
 */
export function useOnboarding(): UseOnboardingResult {
  const { user, session } = useMatrixAuth();
  
  // State
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingStatus, setOnboardingStatus] = useState({
    completed: false,
    version: null as string | null
  });

  // Check authentication status
  const isAuthenticated = !!user && !!session;

  // Check if onboarding version matches current version
  const versionMatches = onboardingStatus.version === ONBOARDING_VERSION;
  
  // Determine if onboarding should be shown
  const shouldShowOnboarding = shouldShowOnboardingFlow(
    isAuthenticated,
    isNewUser(),
    onboardingStatus.completed,
    versionMatches
  );

  // =============================================================================
  // Effects
  // =============================================================================

  /**
   * Initialize onboarding state on mount
   */
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    // Get stored onboarding status
    const status = getOnboardingStatus();
    setOnboardingStatus(status);

    // If user should see onboarding, activate it after a short delay
    if (shouldShowOnboardingFlow(isAuthenticated, isNewUser(), status.completed, status.version === ONBOARDING_VERSION)) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        setIsOnboardingActive(true);
      }, 500);

      setIsLoading(false);
      
      return () => clearTimeout(timer);
    }

    setIsLoading(false);
  }, [isAuthenticated]);

  // =============================================================================
  // Actions
  // =============================================================================

  /**
   * Start the onboarding process manually
   */
  const startOnboarding = useCallback(() => {
    setIsOnboardingActive(true);
  }, []);

  /**
   * Mark onboarding as completed
   */
  const completeOnboarding = useCallback(() => {
    setIsOnboardingActive(false);
    saveOnboardingStatus(true);
    setOnboardingStatus({ completed: true, version: ONBOARDING_VERSION });
    
    // Clear new user flag since they've completed onboarding
    setNewUserFlag(false);
    
    // Optional: Track completion for analytics
    if (typeof window !== "undefined" && "gtag" in window) {
      // @ts-ignore
      window.gtag?.("event", "onboarding_completed", {
        event_category: "user_engagement",
        event_label: "new_user_onboarding"
      });
    }
  }, []);

  /**
   * Skip onboarding for this session
   */
  const skipOnboarding = useCallback(() => {
    setIsOnboardingActive(false);
    
    // Don't mark as completed, but clear new user flag
    // so it doesn't automatically show again this session
    setNewUserFlag(false);
    
    // Optional: Track skip for analytics
    if (typeof window !== "undefined" && "gtag" in window) {
      // @ts-ignore
      window.gtag?.("event", "onboarding_skipped", {
        event_category: "user_engagement",
        event_label: "new_user_onboarding"
      });
    }
  }, []);

  /**
   * Reset onboarding state (for testing/admin purposes)
   */
  const resetOnboarding = useCallback(() => {
    if (typeof window === "undefined") return;
    
    try {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      setOnboardingStatus({ completed: false, version: null });
      setNewUserFlag(true);
      setIsOnboardingActive(false);
    } catch (error) {
      console.warn("Failed to reset onboarding:", error);
    }
  }, []);

  /**
   * Check if user is a new user who just registered
   */
  const checkIfNewUser = useCallback((): boolean => {
    return isNewUser();
  }, []);

  // =============================================================================
  // Return Value
  // =============================================================================

  return {
    // State
    shouldShowOnboarding,
    isOnboardingActive,
    hasCompletedOnboarding: onboardingStatus.completed,
    isLoading,
    
    // Actions
    startOnboarding,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
    checkIfNewUser,
  };
}

// =============================================================================
// Utility Functions for Integration
// =============================================================================

/**
 * Mark a user as new (to be called after successful registration)
 * This should be called from the registration flow.
 */
export function markUserAsNew() {
  setNewUserFlag(true);
}

/**
 * Check if onboarding should be reset due to version change
 */
export function checkOnboardingVersionUpdate(): boolean {
  const { version } = getOnboardingStatus();
  return version !== ONBOARDING_VERSION;
}