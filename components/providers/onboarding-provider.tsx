"use client";

/**
 * Onboarding Provider Component
 * 
 * Provides onboarding functionality throughout the application.
 * Automatically shows onboarding modal for new users and manages
 * the onboarding flow lifecycle.
 */

import React, { useEffect } from "react";
import { useOnboarding } from "@/hooks/use-onboarding";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { useMatrixAuth } from "@/components/providers/matrix-auth-provider";

// =============================================================================
// Types
// =============================================================================

interface OnboardingProviderProps {
  /** Child components */
  children: React.ReactNode;
  /**
   * Whether to automatically show onboarding for new users
   * @default true
   */
  autoShow?: boolean;
  /**
   * Callback when onboarding starts
   */
  onOnboardingStart?: () => void;
  /**
   * Callback when onboarding completes
   */
  onOnboardingComplete?: () => void;
  /**
   * Callback when onboarding is skipped
   */
  onOnboardingSkip?: () => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Onboarding Provider
 * 
 * Wraps the application with onboarding functionality.
 * Should be placed inside MatrixAuthProvider but outside
 * other application-specific providers.
 * 
 * @example
 * ```tsx
 * // In your root layout or main app component
 * import { OnboardingProvider } from '@/components/providers/onboarding-provider';
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <MatrixAuthProvider>
 *           <OnboardingProvider>
 *             <MatrixProvider>
 *               {children}
 *             </MatrixProvider>
 *           </OnboardingProvider>
 *         </MatrixAuthProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function OnboardingProvider({
  children,
  autoShow = true,
  onOnboardingStart,
  onOnboardingComplete,
  onOnboardingSkip,
}: OnboardingProviderProps) {
  const { user, isLoading: authLoading } = useMatrixAuth();
  const {
    shouldShowOnboarding,
    isOnboardingActive,
    isLoading: onboardingLoading,
    completeOnboarding,
    skipOnboarding,
  } = useOnboarding();

  // =============================================================================
  // Effects
  // =============================================================================

  /**
   * Track onboarding state changes for callbacks
   */
  useEffect(() => {
    if (isOnboardingActive && onOnboardingStart) {
      onOnboardingStart();
    }
  }, [isOnboardingActive, onOnboardingStart]);

  // =============================================================================
  // Handlers
  // =============================================================================

  /**
   * Handle onboarding completion
   */
  const handleComplete = () => {
    completeOnboarding();
    onOnboardingComplete?.();
  };

  /**
   * Handle onboarding skip
   */
  const handleSkip = () => {
    skipOnboarding();
    onOnboardingSkip?.();
  };

  // =============================================================================
  // Render
  // =============================================================================

  // Don't render onboarding UI if:
  // - Auth is still loading
  // - Onboarding state is still loading  
  // - User is not authenticated
  // - Auto-show is disabled
  if (authLoading || onboardingLoading || !user || !autoShow) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      
      {/* Onboarding Modal */}
      {shouldShowOnboarding && (
        <OnboardingModal
          isOpen={isOnboardingActive}
          onClose={handleSkip}
          onComplete={handleComplete}
        />
      )}
    </>
  );
}

// =============================================================================
// Hook for Accessing Onboarding from Components
// =============================================================================

/**
 * Hook to access onboarding functionality from any component
 * 
 * Note: This just re-exports the useOnboarding hook for convenience.
 * Components can use either this or import useOnboarding directly.
 * 
 * @example
 * ```tsx
 * function SettingsPage() {
 *   const { startOnboarding, hasCompletedOnboarding } = useOnboardingProvider();
 *   
 *   return (
 *     <div>
 *       {!hasCompletedOnboarding && (
 *         <Button onClick={startOnboarding}>
 *           Start Tutorial
 *         </Button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useOnboardingProvider() {
  return useOnboarding();
}

// =============================================================================
// Export Types
// =============================================================================

export type { OnboardingProviderProps };