"use client";

/**
 * Retry Button Component
 * 
 * A smart retry button with loading states, countdown timers,
 * exponential backoff, and attempt tracking.
 */

import * as React from "react";
import { RefreshCw, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "./button";

// =============================================================================
// Types
// =============================================================================

export interface RetryButtonProps extends Omit<ButtonProps, "onClick"> {
  /** Callback when retry is triggered */
  onRetry: () => void | Promise<void>;
  /** Whether currently retrying */
  isRetrying?: boolean;
  /** Number of retry attempts made */
  attemptCount?: number;
  /** Maximum retry attempts (0 = unlimited) */
  maxAttempts?: number;
  /** Cooldown period in seconds between retries */
  cooldownSeconds?: number;
  /** Use exponential backoff for cooldown */
  exponentialBackoff?: boolean;
  /** Base cooldown for exponential backoff (seconds) */
  baseBackoff?: number;
  /** Maximum backoff time (seconds) */
  maxBackoff?: number;
  /** Custom text when idle */
  idleText?: string;
  /** Custom text when retrying */
  retryingText?: string;
  /** Custom text when max attempts reached */
  exhaustedText?: string;
  /** Show attempt counter */
  showAttempts?: boolean;
  /** Show countdown timer */
  showCountdown?: boolean;
  /** Callback when max attempts exhausted */
  onExhausted?: () => void;
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook for managing retry logic with exponential backoff
 */
export function useRetry(options: {
  onRetry: () => void | Promise<void>;
  maxAttempts?: number;
  cooldownSeconds?: number;
  exponentialBackoff?: boolean;
  baseBackoff?: number;
  maxBackoff?: number;
  onExhausted?: () => void;
}) {
  const {
    onRetry,
    maxAttempts = 0,
    cooldownSeconds = 0,
    exponentialBackoff = false,
    baseBackoff = 1,
    maxBackoff = 60,
    onExhausted,
  } = options;

  const [isRetrying, setIsRetrying] = React.useState(false);
  const [attemptCount, setAttemptCount] = React.useState(0);
  const [countdown, setCountdown] = React.useState(0);
  const [isExhausted, setIsExhausted] = React.useState(false);

  const countdownRef = React.useRef<NodeJS.Timeout>();

  // Calculate current cooldown based on attempt count
  const calculateCooldown = React.useCallback(() => {
    if (!exponentialBackoff) return cooldownSeconds;
    const backoff = baseBackoff * Math.pow(2, attemptCount);
    return Math.min(backoff, maxBackoff);
  }, [exponentialBackoff, cooldownSeconds, baseBackoff, attemptCount, maxBackoff]);

  // Clear countdown timer
  const clearCountdown = React.useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = undefined;
    }
  }, []);

  // Start countdown timer
  const startCountdown = React.useCallback((seconds: number) => {
    setCountdown(seconds);
    clearCountdown();
    
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearCountdown();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearCountdown]);

  // Handle retry
  const retry = React.useCallback(async () => {
    // Check if on cooldown
    if (countdown > 0) return;

    // Check if exhausted
    if (maxAttempts > 0 && attemptCount >= maxAttempts) {
      setIsExhausted(true);
      onExhausted?.();
      return;
    }

    setIsRetrying(true);
    
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
      setAttemptCount((prev) => prev + 1);
      
      // Start cooldown if configured
      const cooldown = calculateCooldown();
      if (cooldown > 0) {
        startCountdown(cooldown);
      }
    }
  }, [countdown, maxAttempts, attemptCount, onRetry, calculateCooldown, startCountdown, onExhausted]);

  // Reset retry state
  const reset = React.useCallback(() => {
    clearCountdown();
    setIsRetrying(false);
    setAttemptCount(0);
    setCountdown(0);
    setIsExhausted(false);
  }, [clearCountdown]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => clearCountdown();
  }, [clearCountdown]);

  return {
    retry,
    reset,
    isRetrying,
    attemptCount,
    countdown,
    isExhausted,
    canRetry: !isRetrying && countdown === 0 && !isExhausted,
  };
}

// =============================================================================
// Component
// =============================================================================

const RetryButton = React.forwardRef<HTMLButtonElement, RetryButtonProps>(
  (
    {
      className,
      onRetry,
      isRetrying: externalIsRetrying,
      attemptCount: externalAttemptCount,
      maxAttempts = 0,
      cooldownSeconds = 0,
      exponentialBackoff = false,
      baseBackoff = 1,
      maxBackoff = 60,
      idleText = "Retry",
      retryingText = "Retrying...",
      exhaustedText = "Max attempts reached",
      showAttempts = false,
      showCountdown = true,
      onExhausted,
      disabled,
      children,
      variant = "outline",
      size = "default",
      ...props
    },
    ref
  ) => {
    const {
      retry,
      isRetrying: internalIsRetrying,
      attemptCount: internalAttemptCount,
      countdown,
      isExhausted,
      canRetry,
    } = useRetry({
      onRetry,
      maxAttempts,
      cooldownSeconds,
      exponentialBackoff,
      baseBackoff,
      maxBackoff,
      onExhausted,
    });

    // Use external state if provided, otherwise use internal state
    const isRetrying = externalIsRetrying ?? internalIsRetrying;
    const attemptCount = externalAttemptCount ?? internalAttemptCount;

    // Determine button state
    const isDisabled = disabled || isRetrying || countdown > 0 || isExhausted;

    // Get button text
    const getButtonText = () => {
      if (children) return children;
      if (isExhausted) return exhaustedText;
      if (isRetrying) return retryingText;
      if (countdown > 0 && showCountdown) return `Wait ${countdown}s`;
      return idleText;
    };

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        disabled={isDisabled}
        onClick={retry}
        className={cn(
          "relative",
          isExhausted && "opacity-50",
          className
        )}
        {...props}
      >
        {/* Icon */}
        {isRetrying ? (
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
        ) : countdown > 0 ? (
          <Clock className="h-4 w-4 mr-2" />
        ) : isExhausted ? (
          <AlertCircle className="h-4 w-4 mr-2" />
        ) : (
          <RefreshCw className="h-4 w-4 mr-2" />
        )}

        {/* Text */}
        <span>{getButtonText()}</span>

        {/* Attempt counter */}
        {showAttempts && attemptCount > 0 && maxAttempts > 0 && (
          <span className="ml-2 text-xs opacity-70">
            ({attemptCount}/{maxAttempts})
          </span>
        )}
      </Button>
    );
  }
);

RetryButton.displayName = "RetryButton";

// =============================================================================
// Convenience Variants
// =============================================================================

/** Compact retry button for tight spaces */
export const CompactRetryButton = React.forwardRef<
  HTMLButtonElement,
  Omit<RetryButtonProps, "size" | "showAttempts">
>((props, ref) => (
  <RetryButton ref={ref} size="sm" showAttempts={false} {...props} />
));
CompactRetryButton.displayName = "CompactRetryButton";

/** Icon-only retry button */
export const IconRetryButton = React.forwardRef<
  HTMLButtonElement,
  Omit<RetryButtonProps, "size" | "idleText" | "retryingText" | "showAttempts">
>((props, ref) => {
  const { isRetrying, disabled, ...rest } = props;
  
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      disabled={disabled || isRetrying}
      onClick={props.onRetry}
      aria-label={isRetrying ? "Retrying" : "Retry"}
      {...rest}
    >
      <RefreshCw className={cn("h-4 w-4", isRetrying && "animate-spin")} />
    </Button>
  );
});
IconRetryButton.displayName = "IconRetryButton";

/** Retry button with exponential backoff pre-configured */
export const BackoffRetryButton = React.forwardRef<
  HTMLButtonElement,
  Omit<RetryButtonProps, "exponentialBackoff" | "baseBackoff">
>((props, ref) => (
  <RetryButton
    ref={ref}
    exponentialBackoff
    baseBackoff={2}
    maxBackoff={30}
    showCountdown
    showAttempts
    {...props}
  />
));
BackoffRetryButton.displayName = "BackoffRetryButton";

// =============================================================================
// Exports
// =============================================================================

export { RetryButton };
