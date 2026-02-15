"use client";

/**
 * Reusable Error Display Component
 * 
 * A flexible error display component with multiple variants for different contexts.
 * Use this for displaying errors in a consistent way across the application.
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { 
  AlertTriangle, 
  AlertCircle, 
  XCircle, 
  Info,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

// =============================================================================
// Types
// =============================================================================

export interface ErrorDisplayProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof errorDisplayVariants> {
  /** Error object or error message string */
  error?: Error | string | null;
  /** Custom title for the error */
  title?: string;
  /** Custom description (overrides error message) */
  description?: string;
  /** Callback when retry button is clicked */
  onRetry?: () => void;
  /** Callback when dismiss button is clicked */
  onDismiss?: () => void;
  /** Whether the error is dismissible */
  dismissible?: boolean;
  /** Show technical details (stack trace in development) */
  showDetails?: boolean;
  /** Custom icon to display */
  icon?: React.ReactNode;
  /** Whether to show the retry button */
  showRetry?: boolean;
  /** Loading state for retry button */
  isRetrying?: boolean;
  /** Custom retry button text */
  retryText?: string;
  /** Custom action buttons */
  actions?: React.ReactNode;
}

// =============================================================================
// Variants
// =============================================================================

const errorDisplayVariants = cva(
  "relative rounded-lg border",
  {
    variants: {
      variant: {
        default: "border-destructive/50 bg-destructive/10 text-destructive",
        warning: "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400",
        info: "border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400",
        minimal: "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400",
        destructive: "border-red-500 bg-red-500/20 text-red-700 dark:text-red-400",
      },
      size: {
        sm: "p-3 text-sm",
        default: "p-4",
        lg: "p-6",
      },
      layout: {
        inline: "flex items-start gap-3",
        stacked: "space-y-3",
        centered: "text-center flex flex-col items-center",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      layout: "inline",
    },
  }
);

// =============================================================================
// Icon Map
// =============================================================================

const iconMap = {
  default: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  minimal: AlertCircle,
  destructive: XCircle,
};

const iconSizeMap = {
  sm: "h-4 w-4",
  default: "h-5 w-5",
  lg: "h-6 w-6",
};

// =============================================================================
// Component
// =============================================================================

const ErrorDisplay = React.forwardRef<HTMLDivElement, ErrorDisplayProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      layout = "inline",
      error,
      title,
      description,
      onRetry,
      onDismiss,
      dismissible = false,
      showDetails = false,
      icon,
      showRetry = true,
      isRetrying = false,
      retryText = "Retry",
      actions,
      children,
      ...props
    },
    ref
  ) => {
    const [detailsOpen, setDetailsOpen] = React.useState(false);
    
    // Get error message
    const errorMessage = React.useMemo(() => {
      if (description) return description;
      if (typeof error === "string") return error;
      if (error instanceof Error) return error.message;
      return "An unexpected error occurred";
    }, [error, description]);

    // Get error stack (only in development)
    const errorStack = React.useMemo(() => {
      if (process.env.NODE_ENV !== "development") return null;
      if (error instanceof Error && error.stack) return error.stack;
      return null;
    }, [error]);

    // Get appropriate icon
    const IconComponent = iconMap[variant || "default"];
    const iconSize = iconSizeMap[size || "default"];

    // Determine if we should show the error
    if (!error && !title && !description && !children) {
      return null;
    }

    return (
      <div
        ref={ref}
        role="alert"
        aria-live="polite"
        className={cn(errorDisplayVariants({ variant, size, layout }), className)}
        {...props}
      >
        {/* Icon */}
        <div className={cn("flex-shrink-0", layout === "centered" && "mb-2")}>
          {icon || <IconComponent className={iconSize} />}
        </div>

        {/* Content */}
        <div className={cn("flex-1 min-w-0", layout === "centered" && "w-full")}>
          {/* Title */}
          {title && (
            <h4 className="font-semibold leading-tight mb-1">{title}</h4>
          )}

          {/* Message */}
          <p className={cn(
            "leading-relaxed",
            size === "sm" && "text-sm",
            !title && "font-medium"
          )}>
            {errorMessage}
          </p>

          {/* Custom children */}
          {children && <div className="mt-2">{children}</div>}

          {/* Technical Details (Development Only) */}
          {showDetails && errorStack && (
            <div className="mt-3">
              <button
                onClick={() => setDetailsOpen(!detailsOpen)}
                className="flex items-center gap-1 text-xs opacity-70 hover:opacity-100 transition-opacity"
              >
                {detailsOpen ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                Technical Details
              </button>
              {detailsOpen && (
                <pre className="mt-2 p-2 text-xs font-mono bg-black/10 dark:bg-white/10 rounded overflow-x-auto max-h-40">
                  {errorStack}
                </pre>
              )}
            </div>
          )}

          {/* Actions */}
          {(onRetry || actions) && (
            <div className={cn(
              "flex flex-wrap gap-2 mt-3",
              layout === "centered" && "justify-center"
            )}>
              {onRetry && showRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  disabled={isRetrying}
                  className="h-8"
                >
                  <RefreshCw className={cn("h-3 w-3 mr-1", isRetrying && "animate-spin")} />
                  {isRetrying ? "Retrying..." : retryText}
                </Button>
              )}
              {actions}
            </div>
          )}
        </div>

        {/* Dismiss button */}
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-2 right-2 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);

ErrorDisplay.displayName = "ErrorDisplay";

// =============================================================================
// Convenience Variants
// =============================================================================

/** Inline error for form fields or small contexts */
export const InlineError = React.forwardRef<
  HTMLDivElement,
  Omit<ErrorDisplayProps, "size" | "layout">
>((props, ref) => (
  <ErrorDisplay ref={ref} size="sm" layout="inline" {...props} />
));
InlineError.displayName = "InlineError";

/** Card-style error for larger sections */
export const ErrorCard = React.forwardRef<
  HTMLDivElement,
  Omit<ErrorDisplayProps, "layout">
>((props, ref) => (
  <ErrorDisplay ref={ref} layout="stacked" {...props} />
));
ErrorCard.displayName = "ErrorCard";

/** Centered error for empty states or full-page errors */
export const CenteredError = React.forwardRef<
  HTMLDivElement,
  Omit<ErrorDisplayProps, "layout" | "size">
>((props, ref) => (
  <ErrorDisplay ref={ref} size="lg" layout="centered" {...props} />
));
CenteredError.displayName = "CenteredError";

// =============================================================================
// Full Page Error
// =============================================================================

interface FullPageErrorProps extends Omit<ErrorDisplayProps, "layout" | "size"> {
  /** Whether to show home button */
  showHomeButton?: boolean;
  /** Custom home URL */
  homeUrl?: string;
}

export const FullPageError: React.FC<FullPageErrorProps> = ({
  showHomeButton = true,
  homeUrl = "/",
  actions,
  ...props
}) => {
  const customActions = (
    <>
      {actions}
      {showHomeButton && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.href = homeUrl}
          className="h-8"
        >
          Go Home
        </Button>
      )}
    </>
  );

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <CenteredError {...props} actions={customActions} />
      </div>
    </div>
  );
};

FullPageError.displayName = "FullPageError";

// =============================================================================
// Exports
// =============================================================================

export { ErrorDisplay, errorDisplayVariants };
