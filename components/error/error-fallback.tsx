"use client";

/**
 * User-Friendly Error Fallback Components
 * 
 * Provides user-friendly error displays with recovery options,
 * helpful messages, and graceful degradation strategies.
 */

import React, { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  MessageCircle, 
  Bug, 
  Clock,
  Wifi,
  WifiOff,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Shield,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

export interface ErrorFallbackProps {
  error?: Error;
  errorId?: string;
  retryCount?: number;
  onRetry?: () => void;
  onReload?: () => void;
  onGoHome?: () => void;
  level?: 'app' | 'page' | 'section' | 'component';
  name?: string;
  maxRetries?: number;
}

// =============================================================================
// Connection Status Hook
// =============================================================================

function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// =============================================================================
// Auto-retry Component
// =============================================================================

function AutoRetryCountdown({ onRetry, retryCount = 0 }: { onRetry?: () => void; retryCount?: number }) {
  const [countdown, setCountdown] = useState(5);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!onRetry || retryCount >= 3) return;

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onRetry();
          return 5;
        }
        return prev - 1;
      });
      setProgress(prev => prev - 20);
    }, 1000);

    return () => clearInterval(interval);
  }, [onRetry, retryCount]);

  if (!onRetry || retryCount >= 3) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Auto-retry in {countdown}s
        </span>
        <span>Attempt {retryCount + 1}</span>
      </div>
      <Progress value={progress} className="h-1" />
    </div>
  );
}

// =============================================================================
// Error Details Component
// =============================================================================

function ErrorDetails({ error, errorId }: { error?: Error; errorId?: string }) {
  const [showDetails, setShowDetails] = useState(false);

  const copyErrorInfo = async () => {
    if (!error && !errorId) return;
    
    const errorInfo = {
      id: errorId,
      message: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorInfo, null, 2));
      toast.success("Error details copied to clipboard");
    } catch (err) {
      toast.error("Failed to copy error details");
    }
  };

  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowDetails(!showDetails)}
        className="w-full justify-between text-xs"
      >
        <span>Error Details</span>
        {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </Button>
      
      {showDetails && (
        <div className="space-y-3 p-3 bg-muted/50 rounded-md">
          {errorId && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Error ID</label>
              <code className="block text-xs bg-background p-2 rounded border font-mono">
                {errorId}
              </code>
            </div>
          )}
          
          {error && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Error Message</label>
              <code className="block text-xs bg-background p-2 rounded border font-mono">
                {error.message}
              </code>
            </div>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={copyErrorInfo}
            className="w-full"
          >
            <Copy className="h-3 w-3 mr-2" />
            Copy Error Info
          </Button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Error Fallback Component
// =============================================================================

export function ErrorFallback({
  error,
  errorId,
  retryCount = 0,
  onRetry,
  onReload,
  onGoHome,
  level = 'component',
  name,
  maxRetries = 3
}: ErrorFallbackProps) {
  const isOnline = useConnectionStatus();

  // Determine error type and recovery suggestions
  const getErrorContext = () => {
    if (!error) return { type: 'unknown', title: 'Something went wrong', description: 'An unexpected error occurred.' };

    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return {
        type: 'network',
        title: 'Connection Problem',
        description: 'Unable to connect to the server. Please check your internet connection.',
        icon: isOnline ? Wifi : WifiOff,
        suggestions: [
          'Check your internet connection',
          'Try refreshing the page',
          'Contact support if the problem persists'
        ]
      };
    }
    
    if (message.includes('chunkloa') || message.includes('loading chunk')) {
      return {
        type: 'chunk',
        title: 'Loading Error',
        description: 'Failed to load application resources. This usually resolves with a refresh.',
        icon: RefreshCw,
        suggestions: [
          'Refresh the page to reload resources',
          'Clear your browser cache if problems persist',
          'Update your browser to the latest version'
        ]
      };
    }
    
    if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
      return {
        type: 'permission',
        title: 'Access Error',
        description: 'You don\'t have permission to access this feature.',
        icon: Shield,
        suggestions: [
          'Log out and log back in',
          'Contact an administrator for access',
          'Verify your account permissions'
        ]
      };
    }

    return {
      type: 'unknown',
      title: 'Unexpected Error',
      description: 'Something unexpected happened. We\'re working to fix this.',
      icon: AlertTriangle,
      suggestions: [
        'Try the action again',
        'Refresh the page if the problem persists',
        'Contact support if you keep seeing this error'
      ]
    };
  };

  const errorContext = getErrorContext();
  const IconComponent = errorContext.icon as React.ComponentType<{ className?: string }>;

  // Level-specific styling and actions
  const getLevelConfig = () => {
    switch (level) {
      case 'app':
        return {
          containerClass: 'min-h-screen bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 flex items-center justify-center p-4',
          cardClass: 'max-w-md w-full p-6 border-red-200 dark:border-red-800',
          showAutoRetry: false,
          primaryAction: { label: 'Reload Application', action: onReload, icon: RefreshCw },
          secondaryAction: { label: 'Go Home', action: onGoHome, icon: Home }
        };
      case 'page':
        return {
          containerClass: 'flex-1 flex items-center justify-center p-8',
          cardClass: 'max-w-sm w-full p-6 border-amber-200 dark:border-amber-800',
          showAutoRetry: true,
          primaryAction: { label: 'Try Again', action: onRetry, icon: RefreshCw },
          secondaryAction: { label: 'Go Back', action: () => window.history.back(), icon: Home }
        };
      case 'section':
        return {
          containerClass: 'p-4 border border-orange-200 dark:border-orange-800 rounded-lg bg-orange-50 dark:bg-orange-950/20',
          cardClass: 'p-0 border-0 bg-transparent shadow-none',
          showAutoRetry: true,
          primaryAction: { label: 'Retry', action: onRetry, icon: RefreshCw },
          secondaryAction: null
        };
      case 'component':
      default:
        return {
          containerClass: 'p-3 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800/50',
          cardClass: 'p-0 border-0 bg-transparent shadow-none',
          showAutoRetry: false,
          primaryAction: { label: 'Retry', action: onRetry, icon: RefreshCw },
          secondaryAction: null
        };
    }
  };

  const config = getLevelConfig();

  return (
    <div className={config.containerClass}>
      <Card className={config.cardClass}>
        <div className="text-center space-y-4">
          {/* Icon and Title */}
          <div>
            <IconComponent className={`mx-auto mb-4 ${
              level === 'app' ? 'h-12 w-12' : 
              level === 'page' ? 'h-10 w-10' : 
              level === 'section' ? 'h-8 w-8' : 'h-6 w-6'
            } ${
              errorContext.type === 'network' ? 'text-blue-500' :
              errorContext.type === 'permission' ? 'text-yellow-500' :
              errorContext.type === 'chunk' ? 'text-purple-500' :
              'text-red-500'
            }`} />
            
            <h1 className={`font-bold text-foreground mb-2 ${
              level === 'app' ? 'text-2xl' : 
              level === 'page' ? 'text-xl' : 
              level === 'section' ? 'text-lg' : 'text-base'
            }`}>
              {errorContext.title}
            </h1>
            
            <p className="text-muted-foreground mb-4">
              {errorContext.description}
            </p>
          </div>

          {/* Connection Status */}
          {errorContext.type === 'network' && (
            <div className={`flex items-center justify-center gap-2 text-sm ${
              isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              {isOnline ? 'Internet Connected' : 'No Internet Connection'}
            </div>
          )}

          {/* Error-specific suggestions */}
          {errorContext.suggestions && errorContext.suggestions.length > 0 && (
            <div className="text-left space-y-2">
              <h3 className="font-medium text-sm">Try these solutions:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                {errorContext.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-xs mt-1">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Auto-retry countdown */}
          {config.showAutoRetry && retryCount < maxRetries && (
            <AutoRetryCountdown onRetry={onRetry} retryCount={retryCount} />
          )}

          {/* Action buttons */}
          <div className="space-y-2">
            {config.primaryAction && (
              <Button
                onClick={config.primaryAction.action}
                className="w-full"
                disabled={!config.primaryAction.action}
              >
                <config.primaryAction.icon className="h-4 w-4 mr-2" />
                {config.primaryAction.label}
                {retryCount > 0 && ` (${retryCount + 1})`}
              </Button>
            )}
            
            {config.secondaryAction && (
              <Button
                onClick={config.secondaryAction.action}
                variant="outline"
                className="w-full"
                disabled={!config.secondaryAction.action}
              >
                <config.secondaryAction.icon className="h-4 w-4 mr-2" />
                {config.secondaryAction.label}
              </Button>
            )}
          </div>

          {/* Error details */}
          {(error || errorId) && (level === 'app' || level === 'page') && (
            <ErrorDetails error={error} errorId={errorId} />
          )}

          {/* Support link for app-level errors */}
          {level === 'app' && (
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">
                Need help? Contact support with the error details above.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open('https://github.com/your-repo/issues', '_blank')}
                className="text-xs"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Report Issue
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// =============================================================================
// Specialized Error Fallbacks
// =============================================================================

export function ChatErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <Card className="max-w-sm w-full p-6 text-center border-blue-200 dark:border-blue-800">
        <MessageCircle className="h-10 w-10 text-blue-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Chat Unavailable</h2>
        <p className="text-muted-foreground mb-4">
          The chat interface failed to load. This might be a temporary network issue.
        </p>

        {process.env.NODE_ENV === 'development' && error && (
          <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-950/30 rounded text-left">
            <p className="text-xs font-mono text-blue-700 dark:text-blue-300 break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Button onClick={onRetry} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reload Chat
          </Button>
          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="w-full"
          >
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function MatrixErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <Card className="max-w-sm w-full p-6 text-center border-purple-200 dark:border-purple-800">
        <Shield className="h-10 w-10 text-purple-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Matrix Connection Error</h2>
        <p className="text-muted-foreground mb-4">
          Unable to connect to the Matrix homeserver. Please check your connection and try again.
        </p>

        <div className="space-y-2">
          <Button onClick={onRetry} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reconnect
          </Button>
          <Button
            onClick={() => window.location.href = '/auth/sign-in'}
            variant="outline"
            className="w-full"
          >
            Sign In Again
          </Button>
        </div>
      </Card>
    </div>
  );
}