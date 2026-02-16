"use client";

/**
 * Onboarding Wizard State Management Hook
 * 
 * Manages state for the multi-step onboarding wizard that helps new users
 * set up their profile, join servers, and learn basic chat features.
 * This is different from the tutorial-style onboarding.
 */

import { useState, useEffect, useCallback } from "react";
import { useMatrixAuth } from "@/components/providers/matrix-auth-provider";

// =============================================================================
// Types
// =============================================================================

export interface OnboardingWizardStep {
  id: string;
  title: string;
  description: string;
  isComplete: boolean;
  isOptional?: boolean;
}

export interface OnboardingWizardState {
  /** Current step index */
  currentStep: number;
  /** All steps in the wizard */
  steps: OnboardingWizardStep[];
  /** Whether wizard is active */
  isActive: boolean;
  /** Whether wizard has been completed */
  isCompleted: boolean;
  /** Whether we're still loading wizard state */
  isLoading: boolean;
  /** User's profile data during setup */
  profileData: {
    displayName: string;
    avatarUrl?: string;
  };
  /** Selected server during server joining */
  selectedServer?: {
    id: string;
    name: string;
    description?: string;
  };
  /** Whether user has completed first chat tutorial */
  hasCompletedFirstChat: boolean;
}

export interface OnboardingWizardActions {
  /** Start the onboarding wizard */
  startWizard: () => void;
  /** Go to next step */
  nextStep: () => void;
  /** Go to previous step */
  previousStep: () => void;
  /** Go to specific step */
  goToStep: (stepIndex: number) => void;
  /** Mark current step as complete */
  completeStep: () => void;
  /** Skip current step (if optional) */
  skipStep: () => void;
  /** Complete entire wizard */
  completeWizard: () => void;
  /** Update profile data */
  updateProfileData: (data: Partial<OnboardingWizardState["profileData"]>) => void;
  /** Set selected server */
  setSelectedServer: (server: OnboardingWizardState["selectedServer"]) => void;
  /** Mark first chat as completed */
  markFirstChatComplete: () => void;
  /** Reset wizard state */
  resetWizard: () => void;
}

export type UseOnboardingWizardResult = OnboardingWizardState & OnboardingWizardActions;

// =============================================================================
// Constants
// =============================================================================

const WIZARD_STORAGE_KEY = "haos-onboarding-wizard-state";
const WIZARD_VERSION = "1.0";

// Default steps configuration
const DEFAULT_STEPS: OnboardingWizardStep[] = [
  {
    id: "welcome",
    title: "Welcome to HAOS",
    description: "Learn about HAOS and Matrix",
    isComplete: false,
  },
  {
    id: "profile-setup",
    title: "Set up your profile",
    description: "Add your name and avatar",
    isComplete: false,
  },
  {
    id: "server-join",
    title: "Join a server",
    description: "Find and join your first community",
    isComplete: false,
    isOptional: true,
  },
  {
    id: "first-chat",
    title: "Send your first message",
    description: "Learn the basics of chatting",
    isComplete: false,
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Load wizard state from localStorage
 */
function loadWizardState(): Partial<OnboardingWizardState> | null {
  if (typeof window === "undefined") return null;
  
  try {
    const stored = localStorage.getItem(WIZARD_STORAGE_KEY);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    
    // Check version compatibility
    if (parsed.version !== WIZARD_VERSION) {
      return null; // Reset if version mismatch
    }
    
    return parsed.state;
  } catch {
    return null;
  }
}

/**
 * Save wizard state to localStorage
 */
function saveWizardState(state: Partial<OnboardingWizardState>) {
  if (typeof window === "undefined") return;
  
  try {
    const data = {
      version: WIZARD_VERSION,
      state,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn("Failed to save onboarding wizard state:", error);
  }
}

/**
 * Check if user should see the wizard
 */
function shouldShowWizard(isAuthenticated: boolean, isCompleted: boolean): boolean {
  return isAuthenticated && !isCompleted;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for managing the onboarding wizard flow
 * 
 * @example
 * ```tsx
 * function OnboardingWizard() {
 *   const {
 *     currentStep,
 *     steps,
 *     isActive,
 *     nextStep,
 *     completeStep,
 *     profileData,
 *     updateProfileData
 *   } = useOnboardingWizard();
 *   
 *   if (!isActive) return null;
 *   
 *   const currentStepData = steps[currentStep];
 *   
 *   return (
 *     <Dialog open={isActive}>
 *       <DialogContent>
 *         <h2>{currentStepData.title}</h2>
 *         <p>{currentStepData.description}</p>
 *         {currentStep === 1 && (
 *           <ProfileSetupForm
 *             data={profileData}
 *             onChange={updateProfileData}
 *             onComplete={completeStep}
 *           />
 *         )}
 *         <Button onClick={nextStep}>Next</Button>
 *       </DialogContent>
 *     </Dialog>
 *   );
 * }
 * ```
 */
export function useOnboardingWizard(): UseOnboardingWizardResult {
  const { user, session } = useMatrixAuth();
  const isAuthenticated = !!user && !!session;

  // =============================================================================
  // State
  // =============================================================================

  const [state, setState] = useState<OnboardingWizardState>({
    currentStep: 0,
    steps: DEFAULT_STEPS,
    isActive: false,
    isCompleted: false,
    isLoading: true,
    profileData: {
      displayName: user?.displayName || "",
    },
    hasCompletedFirstChat: false,
  });

  // =============================================================================
  // Effects
  // =============================================================================

  /**
   * Initialize wizard state on mount
   */
  useEffect(() => {
    if (!isAuthenticated) {
      setState(prev => ({ ...prev, isLoading: false, isActive: false }));
      return;
    }

    // Load saved state
    const savedState = loadWizardState();
    if (savedState) {
      setState(prev => ({
        ...prev,
        ...savedState,
        isLoading: false,
        // Update profile data with current user data if available
        profileData: {
          ...prev.profileData,
          displayName: user?.displayName || prev.profileData.displayName,
          ...savedState.profileData,
        },
      }));
    } else {
      // First time - check if should auto-start wizard
      const newUserFlag = typeof window !== "undefined" 
        ? localStorage.getItem("haos-new-user-flag") === "true"
        : false;
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        isActive: newUserFlag,
        profileData: {
          displayName: user?.displayName || "",
        },
      }));
    }
  }, [isAuthenticated, user?.displayName]);

  /**
   * Auto-save state changes
   */
  useEffect(() => {
    if (!state.isLoading && isAuthenticated) {
      saveWizardState({
        currentStep: state.currentStep,
        isCompleted: state.isCompleted,
        profileData: state.profileData,
        selectedServer: state.selectedServer,
        hasCompletedFirstChat: state.hasCompletedFirstChat,
        steps: state.steps,
      });
    }
  }, [
    state.currentStep,
    state.isCompleted,
    state.profileData,
    state.selectedServer,
    state.hasCompletedFirstChat,
    state.steps,
    state.isLoading,
    isAuthenticated,
  ]);

  // =============================================================================
  // Actions
  // =============================================================================

  const startWizard = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: true,
      currentStep: 0,
      isCompleted: false,
    }));
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => {
      if (prev.currentStep < prev.steps.length - 1) {
        return { ...prev, currentStep: prev.currentStep + 1 };
      }
      return prev;
    });
  }, []);

  const previousStep = useCallback(() => {
    setState(prev => {
      if (prev.currentStep > 0) {
        return { ...prev, currentStep: prev.currentStep - 1 };
      }
      return prev;
    });
  }, []);

  const goToStep = useCallback((stepIndex: number) => {
    setState(prev => {
      if (stepIndex >= 0 && stepIndex < prev.steps.length) {
        return { ...prev, currentStep: stepIndex };
      }
      return prev;
    });
  }, []);

  const completeStep = useCallback(() => {
    setState(prev => {
      const newSteps = [...prev.steps];
      newSteps[prev.currentStep] = {
        ...newSteps[prev.currentStep],
        isComplete: true,
      };
      
      return { ...prev, steps: newSteps };
    });
  }, []);

  const skipStep = useCallback(() => {
    setState(prev => {
      const currentStepData = prev.steps[prev.currentStep];
      if (currentStepData?.isOptional) {
        // Mark as complete and move to next
        const newSteps = [...prev.steps];
        newSteps[prev.currentStep] = {
          ...newSteps[prev.currentStep],
          isComplete: true,
        };
        
        const nextStepIndex = prev.currentStep < prev.steps.length - 1 
          ? prev.currentStep + 1 
          : prev.currentStep;
        
        return { 
          ...prev, 
          steps: newSteps,
          currentStep: nextStepIndex,
        };
      }
      return prev;
    });
  }, []);

  const completeWizard = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: false,
      isCompleted: true,
    }));
    
    // Clear new user flag
    if (typeof window !== "undefined") {
      localStorage.removeItem("haos-new-user-flag");
    }
  }, []);

  const updateProfileData = useCallback((data: Partial<OnboardingWizardState["profileData"]>) => {
    setState(prev => ({
      ...prev,
      profileData: { ...prev.profileData, ...data },
    }));
  }, []);

  const setSelectedServer = useCallback((server: OnboardingWizardState["selectedServer"]) => {
    setState(prev => ({ ...prev, selectedServer: server }));
  }, []);

  const markFirstChatComplete = useCallback(() => {
    setState(prev => ({ ...prev, hasCompletedFirstChat: true }));
  }, []);

  const resetWizard = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: 0,
      steps: DEFAULT_STEPS,
      isActive: false,
      isCompleted: false,
      profileData: {
        displayName: user?.displayName || "",
      },
      selectedServer: undefined,
      hasCompletedFirstChat: false,
    }));
    
    // Clear saved state
    if (typeof window !== "undefined") {
      localStorage.removeItem(WIZARD_STORAGE_KEY);
    }
  }, [user?.displayName]);

  // =============================================================================
  // Return Value
  // =============================================================================

  return {
    // State
    currentStep: state.currentStep,
    steps: state.steps,
    isActive: state.isActive,
    isCompleted: state.isCompleted,
    isLoading: state.isLoading,
    profileData: state.profileData,
    selectedServer: state.selectedServer,
    hasCompletedFirstChat: state.hasCompletedFirstChat,
    
    // Actions
    startWizard,
    nextStep,
    previousStep,
    goToStep,
    completeStep,
    skipStep,
    completeWizard,
    updateProfileData,
    setSelectedServer,
    markFirstChatComplete,
    resetWizard,
  };
}