"use client";

/**
 * Login Form Component
 * 
 * Provides login and registration forms with integrated onboarding trigger.
 * This component serves as a wrapper around the auth pages and ensures
 * that onboarding is properly triggered for new users.
 */

import React, { useEffect } from "react";
import { useMatrixAuth } from "@/components/providers/matrix-auth-provider";
import { useOnboardingWizard } from "@/hooks/use-onboarding-wizard";
import { markUserAsNew } from "@/hooks/use-onboarding";

// =============================================================================
// Types
// =============================================================================

interface LoginFormProps {
  /**
   * Called when registration succeeds
   */
  onRegistrationSuccess?: () => void;
  /**
   * Called when login succeeds  
   */
  onLoginSuccess?: () => void;
  /**
   * Whether to auto-trigger onboarding for new users
   * @default true
   */
  enableOnboarding?: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Login Form Component
 * 
 * This component provides hooks and utilities for integrating onboarding
 * with authentication flows. It doesn't render UI itself, but provides
 * functions and state management for auth pages to use.
 * 
 * @example
 * ```tsx
 * // In a sign-up page
 * import { useLoginFormIntegration } from '@/components/auth/login-form';
 * 
 * function SignUpPage() {
 *   const { handleRegistrationSuccess } = useLoginFormIntegration({
 *     onRegistrationSuccess: () => router.push('/channels/@me')
 *   });
 *   
 *   const handleSubmit = async (formData) => {
 *     const success = await register(formData);
 *     if (success) {
 *       handleRegistrationSuccess();
 *     }
 *   };
 *   
 *   // ... rest of component
 * }
 * ```
 */
export function LoginForm({
  onRegistrationSuccess,
  onLoginSuccess,
  enableOnboarding = true,
}: LoginFormProps) {
  const { user } = useMatrixAuth();
  const { startWizard } = useOnboardingWizard();

  // =============================================================================
  // Effects
  // =============================================================================

  /**
   * Handle successful registration by triggering onboarding
   */
  useEffect(() => {
    if (user && enableOnboarding) {
      // Check if this is a new user who just registered
      const isNewUser = typeof window !== "undefined" 
        ? localStorage.getItem("melo-new-user-flag") === "true"
        : false;
      
      if (isNewUser) {
        // Small delay to ensure UI is ready
        setTimeout(() => {
          startWizard();
        }, 500);
      }
    }
  }, [user, enableOnboarding, startWizard]);

  // This component doesn't render anything - it's just for integration
  return null;
}

// =============================================================================
// Integration Hook
// =============================================================================

/**
 * Hook for integrating login form with onboarding
 * 
 * Provides utilities for auth components to properly trigger onboarding
 * and handle authentication success states.
 */
export function useLoginFormIntegration({
  onRegistrationSuccess,
  onLoginSuccess,
  enableOnboarding = true,
}: LoginFormProps = {}) {
  const { user } = useMatrixAuth();
  const { startWizard, isActive: isWizardActive } = useOnboardingWizard();

  /**
   * Handle successful registration
   * This should be called after a user successfully registers
   */
  const handleRegistrationSuccess = () => {
    // Mark user as new to trigger onboarding
    markUserAsNew();
    
    if (enableOnboarding) {
      // Start wizard after a short delay
      setTimeout(() => {
        startWizard();
      }, 500);
    }
    
    // Call external callback
    onRegistrationSuccess?.();
  };

  /**
   * Handle successful login
   * This should be called after a user successfully logs in
   */
  const handleLoginSuccess = () => {
    // Don't trigger onboarding for existing users logging in
    onLoginSuccess?.();
  };

  /**
   * Check if user is new and should see onboarding
   */
  const isNewUser = () => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("melo-new-user-flag") === "true";
  };

  return {
    handleRegistrationSuccess,
    handleLoginSuccess,
    isNewUser,
    isWizardActive,
    user,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Trigger onboarding wizard manually
 * Can be called from settings or help pages
 */
export function triggerOnboardingWizard() {
  const event = new CustomEvent("melo:start-onboarding-wizard");
  window.dispatchEvent(event);
}

/**
 * Check if onboarding should be shown for current user
 */
export function shouldShowOnboarding(): boolean {
  if (typeof window === "undefined") return false;
  
  const isNewUser = localStorage.getItem("melo-new-user-flag") === "true";
  const hasCompletedWizard = localStorage.getItem("melo-onboarding-wizard-state");
  
  return isNewUser && !hasCompletedWizard;
}

export default LoginForm;