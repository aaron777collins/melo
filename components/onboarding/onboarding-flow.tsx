"use client";

/**
 * Onboarding Flow Component
 * 
 * Main wizard component that orchestrates the multi-step onboarding process
 * for new Melo users. Includes profile setup, server joining, and chat tutorials.
 */

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useOnboardingWizard } from "@/hooks/use-onboarding-wizard";

// Step Components
import { WelcomeStep } from "./steps/welcome-step";
import { ProfileSetupStep } from "./steps/profile-setup-step";
import { ServerJoinStep } from "./steps/server-join-step";
import { FirstChatStep } from "./steps/first-chat-step";

// =============================================================================
// Types
// =============================================================================

interface OnboardingFlowProps {
  /**
   * Whether the onboarding flow is open
   */
  isOpen?: boolean;
  /**
   * Callback when onboarding is closed/skipped
   */
  onClose?: () => void;
  /**
   * Callback when onboarding is completed
   */
  onComplete?: () => void;
  /**
   * Custom CSS class
   */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function OnboardingFlow({
  isOpen,
  onClose,
  onComplete,
  className,
}: OnboardingFlowProps) {
  const {
    // State
    currentStep,
    steps,
    isActive,
    isCompleted,
    isLoading,
    profileData,
    selectedServer,
    hasCompletedFirstChat,
    
    // Actions  
    nextStep,
    previousStep,
    goToStep,
    completeStep,
    skipStep,
    completeWizard,
    updateProfileData,
    setSelectedServer,
    markFirstChatComplete,
  } = useOnboardingWizard();

  // Use internal state if no external control is provided
  const isDialogOpen = isOpen !== undefined ? isOpen : isActive;

  // =============================================================================
  // Effects
  // =============================================================================

  /**
   * Handle external completion
   */
  useEffect(() => {
    if (isCompleted) {
      onComplete?.();
    }
  }, [isCompleted, onComplete]);

  // =============================================================================
  // Handlers
  // =============================================================================

  /**
   * Handle step navigation
   */
  const handleNext = () => {
    completeStep();
    
    if (currentStep < steps.length - 1) {
      nextStep();
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    previousStep();
  };

  const handleSkipStep = () => {
    skipStep();
  };

  const handleComplete = () => {
    completeWizard();
    onComplete?.();
  };

  const handleClose = () => {
    onClose?.();
  };

  /**
   * Step-specific handlers
   */
  const handleProfileUpdate = (data: { displayName: string; avatarUrl?: string }) => {
    updateProfileData(data);
  };

  const handleServerSelection = (server: { id: string; name: string; description?: string }) => {
    setSelectedServer(server);
  };

  const handleFirstChatComplete = () => {
    markFirstChatComplete();
    handleComplete();
  };

  // =============================================================================
  // Render Helpers
  // =============================================================================

  /**
   * Get progress percentage
   */
  const getProgress = () => {
    return ((currentStep + 1) / steps.length) * 100;
  };

  /**
   * Get current step data
   */
  const getCurrentStepData = () => {
    return steps[currentStep];
  };

  /**
   * Render current step content
   */
  const renderCurrentStep = () => {
    const stepData = getCurrentStepData();
    if (!stepData) return null;

    switch (stepData.id) {
      case "welcome":
        return (
          <WelcomeStep
            onNext={handleNext}
            onSkip={handleClose}
          />
        );

      case "profile-setup":
        return (
          <ProfileSetupStep
            profileData={profileData}
            onProfileUpdate={handleProfileUpdate}
            onNext={handleNext}
            onBack={handlePrevious}
            onSkip={stepData.isOptional ? handleSkipStep : undefined}
          />
        );

      case "server-join":
        return (
          <ServerJoinStep
            selectedServer={selectedServer}
            onServerSelect={handleServerSelection}
            onNext={handleNext}
            onBack={handlePrevious}
            onSkip={stepData.isOptional ? handleSkipStep : undefined}
          />
        );

      case "first-chat":
        return (
          <FirstChatStep
            selectedServer={selectedServer}
            onComplete={handleFirstChatComplete}
            onBack={handlePrevious}
            onSkip={stepData.isOptional ? handleSkipStep : undefined}
          />
        );

      default:
        return (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Unknown step: {stepData.id}</p>
            <Button onClick={handleNext} className="mt-4">
              Continue
            </Button>
          </div>
        );
    }
  };

  // =============================================================================
  // Loading State
  // =============================================================================

  if (isLoading) {
    return null; // Let the loading be handled by parent components
  }

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <Dialog open={isDialogOpen} onOpenChange={() => {}}>
      <DialogContent 
        className={`max-w-5xl max-h-[95vh] overflow-y-auto p-0 ${className || ""}`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-background border-b p-6 z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">Welcome to Melo</h2>
              {getCurrentStepData()?.isOptional && (
                <Badge variant="secondary" className="text-xs">
                  Optional
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                Step {currentStep + 1} of {steps.length}: {getCurrentStepData()?.title}
              </span>
              <span className="text-xs text-muted-foreground">
                {Math.round(getProgress())}% complete
              </span>
            </div>
            <Progress value={getProgress()} className="h-2" />
          </div>

          {/* Step Indicators */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                  index === currentStep
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300"
                    : step.isComplete
                    ? "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-300"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                    step.isComplete
                      ? "bg-green-500 text-white"
                      : index === currentStep
                      ? "bg-blue-500 text-white"
                      : "bg-muted-foreground text-background"
                  }`}
                >
                  {step.isComplete ? "✓" : index + 1}
                </div>
                <span>{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderCurrentStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Export with Provider Integration
// =============================================================================

/**
 * Onboarding Flow with automatic state management
 * 
 * This version automatically manages its own state using the onboarding wizard hook
 * and will show/hide based on user state.
 */
export function AutoOnboardingFlow({
  onComplete,
  className,
}: Omit<OnboardingFlowProps, "isOpen" | "onClose">) {
  const { isActive, completeWizard } = useOnboardingWizard();

  const handleComplete = () => {
    completeWizard();
    onComplete?.();
  };

  const handleClose = () => {
    completeWizard(); // Treat close as completion for auto version
  };

  return (
    <OnboardingFlow
      isOpen={isActive}
      onClose={handleClose}
      onComplete={handleComplete}
      className={className}
    />
  );
}

export default OnboardingFlow;