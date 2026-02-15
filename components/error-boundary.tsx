"use client";

/**
 * React Error Boundary Components
 *
 * Provides error boundaries at different levels with appropriate fallback UIs
 * and error logging/reporting capabilities.
 */

import React, { Component, ReactNode, ErrorInfo } from "react";
import { AlertTriangle, RefreshCw, Home, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// =============================================================================
// Types
// =============================================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'app' | 'page' | 'section' | 'component';
  name?: string;
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
}

// =============================================================================
// Error Logging Service
// =============================================================================

class ErrorLogger {
  static log(error: Error, errorInfo: ErrorInfo, context: {
    level: string;
    name?: string;
    errorId: string;
    timestamp: string;
    userAgent: string;
    url: string;
  }) {
    // Console logging for development
    console.group(`🚨 Error Boundary Caught Error [${context.level}:${context.name || 'unnamed'}]`);
    console.error("Error ID:", context.errorId);
    console.error("Error:", error);
    console.error("Component Stack:", errorInfo.componentStack);
    console.error("Context:", context);
    console.groupEnd();

    // In production, this would send to error reporting service
    // (e.g., Sentry, Bugsnag, custom endpoint)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      // Example: Send to error reporting service
      // this.sendToErrorService(error, errorInfo, context);
    }

    // Store in localStorage for debugging (development only)
    if (process.env.NODE_ENV === 'development') {
      try {
        const errorLog = {
          ...context,
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
          errorInfo: {
            componentStack: errorInfo.componentStack,
          },
        };
        
        const existingLogs = JSON.parse(localStorage.getItem('haos-error-logs') || '[]');
        existingLogs.push(errorLog);
        
        // Keep only last 50 errors
        if (existingLogs.length > 50) {
          existingLogs.splice(0, existingLogs.length - 50);
        }
        
        localStorage.setItem('haos-error-logs', JSON.stringify(existingLogs));
      } catch (storageError) {
        console.warn('Failed to store error log:', storageError);
      }
    }
  }

  // In production, implement error service integration
  private static async sendToErrorService(error: Error, errorInfo: ErrorInfo, context: any) {
    // Example implementation:
    // try {
    //   await fetch('/api/errors', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ error, errorInfo, context }),
    //   });
    // } catch (reportingError) {
    //   console.error('Failed to report error:', reportingError);
    // }
  }
}

// =============================================================================
// Base Error Boundary
// =============================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = this.state.errorId || 'unknown';
    
    // Log the error
    ErrorLogger.log(error, errorInfo, {
      level: this.props.level || 'component',
      name: this.props.name,
      errorId,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    });

    // Call custom error handler
    this.props.onError?.(error, errorInfo, errorId);

    // Update state with error info
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined, errorId: undefined });
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Use appropriate default fallback based on level
      switch (this.props.level) {
        case 'app':
          return <AppErrorFallback error={this.state.error} onReload={this.handleReload} />;
        case 'page':
          return <PageErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
        case 'section':
          return <SectionErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
        case 'component':
        default:
          return <ComponentErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
      }
    }

    return this.props.children;
  }
}

// =============================================================================
// Fallback Components
// =============================================================================

interface ErrorFallbackProps {
  error?: Error;
  onRetry?: () => void;
  onReload?: () => void;
}

export function AppErrorFallback({ error, onReload }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 text-center border-red-200 dark:border-red-800">
        <div className="mb-4">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Application Error
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            HAOS encountered an unexpected error and needs to restart.
          </p>
        </div>

        {process.env.NODE_ENV === 'development' && error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 rounded-md text-left">
            <p className="text-sm font-mono text-red-700 dark:text-red-300 break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Button onClick={onReload} className="w-full" variant="default">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reload Application
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

export function PageErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <Card className="max-w-sm w-full p-6 text-center border-amber-200 dark:border-amber-800">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Page Error
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          This page failed to load properly.
        </p>

        {process.env.NODE_ENV === 'development' && error && (
          <div className="mb-4 p-2 bg-amber-50 dark:bg-amber-950/30 rounded text-left">
            <p className="text-xs font-mono text-amber-700 dark:text-amber-300 break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Button onClick={onRetry} variant="default" size="sm" className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button 
            onClick={() => window.history.back()} 
            variant="outline" 
            size="sm"
            className="w-full"
          >
            Go Back
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function SectionErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  return (
    <div className="p-4 border border-orange-200 dark:border-orange-800 rounded-lg bg-orange-50 dark:bg-orange-950/20">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Section Error
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            This section failed to load.
          </p>
          
          {process.env.NODE_ENV === 'development' && error && (
            <p className="text-xs font-mono text-orange-700 dark:text-orange-300 mt-2 break-all">
              {error.message}
            </p>
          )}
          
          <Button onClick={onRetry} variant="outline" size="sm" className="mt-2">
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ComponentErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  return (
    <div className="p-3 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800/50">
      <div className="flex items-center space-x-2 text-sm">
        <AlertTriangle className="h-4 w-4 text-gray-500" />
        <span className="text-gray-600 dark:text-gray-400">Component failed to load</span>
        <Button onClick={onRetry} variant="ghost" size="sm" className="ml-auto h-6 px-2 text-xs">
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
      
      {process.env.NODE_ENV === 'development' && error && (
        <p className="text-xs font-mono text-gray-500 mt-1 break-all">
          {error.message}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// Chat-Specific Error Fallbacks
// =============================================================================

export function ChatErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <Card className="max-w-sm w-full p-6 text-center">
        <MessageCircle className="h-10 w-10 text-blue-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Chat Error
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Unable to load the chat interface.
        </p>

        {process.env.NODE_ENV === 'development' && error && (
          <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-950/30 rounded text-left">
            <p className="text-xs font-mono text-blue-700 dark:text-blue-300 break-all">
              {error.message}
            </p>
          </div>
        )}

        <Button onClick={onRetry} variant="default" size="sm" className="w-full">
          <RefreshCw className="h-4 w-4 mr-2" />
          Reload Chat
        </Button>
      </Card>
    </div>
  );
}

// =============================================================================
// Convenience Wrappers
// =============================================================================

export const AppErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="app" name="application">{children}</ErrorBoundary>
);

export const PageErrorBoundary: React.FC<{ children: ReactNode; name?: string }> = ({ children, name }) => (
  <ErrorBoundary level="page" name={name || 'page'}>{children}</ErrorBoundary>
);

export const SectionErrorBoundary: React.FC<{ children: ReactNode; name?: string }> = ({ children, name }) => (
  <ErrorBoundary level="section" name={name || 'section'}>{children}</ErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{ children: ReactNode; name?: string }> = ({ children, name }) => (
  <ErrorBoundary level="component" name={name || 'component'}>{children}</ErrorBoundary>
);

export const ChatErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary 
    level="section" 
    name="chat" 
    fallback={<ChatErrorFallback onRetry={() => window.location.reload()} />}
  >
    {children}
  </ErrorBoundary>
);

// =============================================================================
// Error Log Utilities (for debugging)
// =============================================================================

export function getErrorLogs(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('haos-error-logs') || '[]');
  } catch {
    return [];
  }
}

export function clearErrorLogs(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('haos-error-logs');
  }
}