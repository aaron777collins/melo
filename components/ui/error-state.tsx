"use client";

/**
 * Error State Component
 * 
 * A wrapper component for handling async states (loading, error, empty, success).
 * Provides consistent patterns for displaying different states.
 */

import * as React from "react";
import { AlertCircle, Inbox, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { ErrorDisplay, type ErrorDisplayProps } from "./error-display";
import { Skeleton } from "./skeleton";

// =============================================================================
// Types
// =============================================================================

export type AsyncState = "idle" | "loading" | "error" | "empty" | "success";

export interface ErrorStateProps {
  /** Current state */
  state: AsyncState;
  /** Error to display when in error state */
  error?: Error | string | null;
  /** Whether data is empty (triggers empty state) */
  isEmpty?: boolean;
  /** Children to render when in success state */
  children: React.ReactNode;
  /** Callback for retry action */
  onRetry?: () => void;
  /** Whether currently retrying */
  isRetrying?: boolean;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  /** Custom error component */
  errorComponent?: React.ReactNode;
  /** Custom empty component */
  emptyComponent?: React.ReactNode;
  /** Props to pass to ErrorDisplay */
  errorProps?: Partial<ErrorDisplayProps>;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state title */
  emptyTitle?: string;
  /** Custom empty icon */
  emptyIcon?: React.ReactNode;
  /** Show skeleton loader instead of spinner */
  skeleton?: boolean;
  /** Number of skeleton items to show */
  skeletonCount?: number;
  /** Custom skeleton component */
  skeletonComponent?: React.ReactNode;
  /** Minimum height for the container */
  minHeight?: string;
  /** Custom className */
  className?: string;
}

// =============================================================================
// Default Components
// =============================================================================

const DefaultLoading: React.FC<{ minHeight?: string }> = ({ minHeight }) => (
  <div 
    className="flex items-center justify-center py-12"
    style={{ minHeight }}
  >
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

const DefaultSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-3 py-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    ))}
  </div>
);

const DefaultEmpty: React.FC<{
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  minHeight?: string;
}> = ({
  title = "No data",
  message = "There's nothing here yet.",
  icon,
  minHeight,
}) => (
  <div 
    className="flex flex-col items-center justify-center py-12 text-center"
    style={{ minHeight }}
  >
    {icon || <Inbox className="h-12 w-12 text-muted-foreground mb-4" />}
    <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
  </div>
);

// =============================================================================
// Component
// =============================================================================

export const ErrorState: React.FC<ErrorStateProps> = ({
  state,
  error,
  isEmpty,
  children,
  onRetry,
  isRetrying,
  loadingComponent,
  errorComponent,
  emptyComponent,
  errorProps,
  emptyMessage,
  emptyTitle,
  emptyIcon,
  skeleton = false,
  skeletonCount = 3,
  skeletonComponent,
  minHeight,
  className,
}) => {
  // Determine effective state
  const effectiveState = React.useMemo(() => {
    if (state === "loading") return "loading";
    if (state === "error" || error) return "error";
    if (state === "empty" || isEmpty) return "empty";
    return state;
  }, [state, error, isEmpty]);

  // Render appropriate component based on state
  const renderState = () => {
    switch (effectiveState) {
      case "loading":
        if (loadingComponent) return loadingComponent;
        if (skeleton) {
          return skeletonComponent || <DefaultSkeleton count={skeletonCount} />;
        }
        return <DefaultLoading minHeight={minHeight} />;

      case "error":
        if (errorComponent) return errorComponent;
        return (
          <div className="py-8 px-4">
            <ErrorDisplay
              error={error}
              onRetry={onRetry}
              isRetrying={isRetrying}
              layout="centered"
              size="lg"
              {...errorProps}
            />
          </div>
        );

      case "empty":
        if (emptyComponent) return emptyComponent;
        return (
          <DefaultEmpty
            title={emptyTitle}
            message={emptyMessage}
            icon={emptyIcon}
            minHeight={minHeight}
          />
        );

      case "idle":
      case "success":
      default:
        return children;
    }
  };

  return (
    <div className={cn("relative", className)}>
      {renderState()}
    </div>
  );
};

ErrorState.displayName = "ErrorState";

// =============================================================================
// Hook for managing async state
// =============================================================================

export interface UseAsyncStateOptions<T> {
  /** Initial data */
  initialData?: T;
  /** Async function to execute */
  asyncFn?: () => Promise<T>;
  /** Whether to execute on mount */
  executeOnMount?: boolean;
  /** Check if data is empty */
  isEmpty?: (data: T | undefined) => boolean;
}

export interface UseAsyncStateReturn<T> {
  data: T | undefined;
  error: Error | null;
  state: AsyncState;
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  execute: () => Promise<void>;
  reset: () => void;
  setData: (data: T) => void;
  setError: (error: Error | null) => void;
}

export function useAsyncState<T>(
  options: UseAsyncStateOptions<T> = {}
): UseAsyncStateReturn<T> {
  const {
    initialData,
    asyncFn,
    executeOnMount = false,
    isEmpty: isEmptyFn = (data) => data === undefined || (Array.isArray(data) && data.length === 0),
  } = options;

  const [data, setData] = React.useState<T | undefined>(initialData);
  const [error, setError] = React.useState<Error | null>(null);
  const [state, setState] = React.useState<AsyncState>("idle");

  const execute = React.useCallback(async () => {
    if (!asyncFn) return;
    
    setState("loading");
    setError(null);
    
    try {
      const result = await asyncFn();
      setData(result);
      setState(isEmptyFn(result) ? "empty" : "success");
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setState("error");
    }
  }, [asyncFn, isEmptyFn]);

  const reset = React.useCallback(() => {
    setData(initialData);
    setError(null);
    setState("idle");
  }, [initialData]);

  // Execute on mount if requested
  React.useEffect(() => {
    if (executeOnMount && asyncFn) {
      execute();
    }
  }, [executeOnMount]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data,
    error,
    state,
    isLoading: state === "loading",
    isError: state === "error",
    isEmpty: state === "empty" || isEmptyFn(data),
    execute,
    reset,
    setData,
    setError,
  };
}

// =============================================================================
// Convenience Components
// =============================================================================

/** Loading state component */
export const LoadingState: React.FC<{
  skeleton?: boolean;
  skeletonCount?: number;
  className?: string;
}> = ({ skeleton, skeletonCount, className }) => (
  <ErrorState
    state="loading"
    skeleton={skeleton}
    skeletonCount={skeletonCount}
    className={className}
  >
    {null}
  </ErrorState>
);

LoadingState.displayName = "LoadingState";

/** Empty state component */
export const EmptyState: React.FC<{
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, message, icon, action, className }) => (
  <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
    {icon || <Inbox className="h-12 w-12 text-muted-foreground mb-4" />}
    {title && <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>}
    {message && <p className="text-sm text-muted-foreground max-w-sm mb-4">{message}</p>}
    {action}
  </div>
);

EmptyState.displayName = "EmptyState";

// =============================================================================
// Exports
// =============================================================================

export { DefaultLoading, DefaultSkeleton, DefaultEmpty };
