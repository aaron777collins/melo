"use client";

/**
 * Onboarding Wizard Provider Component
 * 
 * Provides the onboarding wizard functionality throughout the application.
 * This is separate from the tutorial-style onboarding and focuses on 
 * helping users actively set up their account.
 */

import React, { useEffect } from "react";
import { useOnboardingWizard } from "@/hooks/use-onboarding-wizard";
import { AutoOnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { useMatrixAuth } from "@/components/providers/matrix-auth-provider";

// =============================================================================
// Types
// =============================================================================

interface OnboardingWizardProviderProps {
  /** Child components */
  children: React.ReactNode;
  /**
   * Whether to automatically show wizard for new users
   * @default true
   */
  autoShow?: boolean;
  /**
   * Callback when wizard starts
   */
  onWizardStart?: () => void;
  /**
   * Callback when wizard completes
   */
  onWizardComplete?: () => void;
  /**
   * Callback when wizard is skipped
   */
  onWizardSkip?: () => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Onboarding Wizard Provider
 * 
 * Wraps the application with onboarding wizard functionality.
 * Should be placed inside MatrixAuthProvider but can coexist
 * with the regular OnboardingProvider.
 * 
 * @example
 * ```tsx
 * // In your root layout or main app component
 * import { OnboardingWizardProvider } from '@/components/providers/onboarding-wizard-provider';
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <MatrixAuthProvider>
 *           <OnboardingWizardProvider>
 *             <OnboardingProvider>
 *               <MatrixProvider>
 *                 {children}
 *               </MatrixProvider>
 *             </OnboardingProvider>
 *           </OnboardingWizardProvider>
 *         </MatrixAuthProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function OnboardingWizardProvider({
  children,
  autoShow = true,
  onWizardStart,
  onWizardComplete,
  onWizardSkip,
}: OnboardingWizardProviderProps) {
  const { user, isLoading: authLoading } = useMatrixAuth();
  const {
    isActive,
    isCompleted,
    isLoading: wizardLoading,
    completeWizard,
  } = useOnboardingWizard();

  // =============================================================================
  // Effects
  // =============================================================================

  /**
   * Track wizard state changes for callbacks
   */
  useEffect(() => {
    if (isActive && onWizardStart) {
      onWizardStart();
    }
  }, [isActive, onWizardStart]);

  /**
   * Track wizard completion for callbacks
   */
  useEffect(() => {
    if (isCompleted && onWizardComplete) {
      onWizardComplete();
    }
  }, [isCompleted, onWizardComplete]);

  // =============================================================================
  // Handlers
  // =============================================================================

  /**
   * Handle wizard completion
   */
  const handleComplete = () => {
    completeWizard();
    onWizardComplete?.();
  };

  /**
   * Handle wizard skip/close
   */
  const handleSkip = () => {
    completeWizard(); // Treat skip as completion
    onWizardSkip?.();
  };

  // =============================================================================
  // Render
  // =============================================================================

  // Don't render wizard UI if:
  // - Auth is still loading
  // - Wizard state is still loading  
  // - User is not authenticated
  // - Auto-show is disabled
  if (authLoading || wizardLoading || !user || !autoShow) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      
      {/* Onboarding Wizard */}
      <AutoOnboardingFlow onComplete={handleComplete} />
    </>
  );
}

// =============================================================================
// Hook for Accessing Wizard from Components
// =============================================================================

/**
 * Hook to access onboarding wizard functionality from any component
 * 
 * @example
 * ```tsx
 * function SettingsPage() {
 *   const { startWizard, isCompleted, resetWizard } = useOnboardingWizardProvider();
 *   
 *   return (
 *     <div>
 *       <Button onClick={startWizard}>
 *         {isCompleted ? "Restart Setup Wizard" : "Start Setup Wizard"}
 *       </Button>
 *       {isCompleted && (
 *         <Button onClick={resetWizard} variant="outline">
 *           Reset Wizard
 *         </Button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useOnboardingWizardProvider() {
  return useOnboardingWizard();
}

// =============================================================================
// Export Types
// =============================================================================

export type { OnboardingWizardProviderProps };