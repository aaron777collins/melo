"use client";

/**
 * Restart Onboarding Button
 * 
 * Button component that allows users to restart the onboarding tutorial
 * from the settings page or other locations in the app.
 */

import React, { useState } from "react";
import { RefreshCw, BookOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useOnboardingWizard } from "@/hooks/use-onboarding-wizard";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

interface RestartOnboardingButtonProps {
  /** Button variant */
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon";
  /** Custom button text */
  children?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /**
   * Whether to show a confirmation dialog before restarting
   * @default false
   */
  requireConfirmation?: boolean;
  /**
   * Callback when onboarding is restarted
   */
  onRestart?: () => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Restart Onboarding Button
 * 
 * Allows users to restart the onboarding flow from anywhere in the app.
 * Commonly used in settings pages and help sections.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <RestartOnboardingButton />
 * 
 * // Custom styling
 * <RestartOnboardingButton 
 *   variant="outline" 
 *   size="sm"
 *   className="mt-4"
 * >
 *   Restart Tutorial
 * </RestartOnboardingButton>
 * 
 * // With confirmation
 * <RestartOnboardingButton 
 *   requireConfirmation 
 *   onRestart={() => console.log('Tutorial restarted')}
 * />
 * ```
 */
export function RestartOnboardingButton({
  variant = "default",
  size = "default",
  children,
  className,
  requireConfirmation = false,
  onRestart,
}: RestartOnboardingButtonProps) {
  const { startWizard, resetWizard, isCompleted: hasCompletedOnboarding } = useOnboardingWizard();
  const [isConfirming, setIsConfirming] = useState(false);

  // =============================================================================
  // Handlers
  // =============================================================================

  /**
   * Handle restart button click
   */
  const handleRestart = () => {
    if (requireConfirmation && !isConfirming) {
      setIsConfirming(true);
      return;
    }

    // Reset onboarding state and start fresh
    resetWizard();
    startWizard();

    // Show success toast
    toast.success("Tutorial restarted! 🎉", {
      description: "The onboarding guide will open in a moment.",
    });

    // Reset confirmation state
    setIsConfirming(false);

    // Call callback if provided
    onRestart?.();
  };

  /**
   * Handle confirmation cancel
   */
  const handleCancel = () => {
    setIsConfirming(false);
  };

  // =============================================================================
  // Render
  // =============================================================================

  // If confirmation is required and we're in confirmation state
  if (requireConfirmation && isConfirming) {
    return (
      <div className="flex items-center space-x-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={handleRestart}
          className="text-xs"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Confirm Restart
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="text-xs"
        >
          Cancel
        </Button>
      </div>
    );
  }

  // Default button content
  const defaultContent = (
    <>
      <BookOpen className="w-4 h-4 mr-2" />
      {hasCompletedOnboarding ? "Restart Tutorial" : "Start Tutorial"}
    </>
  );

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleRestart}
      className={className}
    >
      {children || defaultContent}
    </Button>
  );
}

// =============================================================================
// Compact Version for Tight Spaces
// =============================================================================

/**
 * Compact restart onboarding button for tight spaces
 */
export function CompactRestartOnboardingButton() {
  return (
    <RestartOnboardingButton
      variant="ghost"
      size="sm"
      className="h-8 px-2 text-xs"
    >
      <RefreshCw className="w-3 h-3 mr-1" />
      Tutorial
    </RestartOnboardingButton>
  );
}