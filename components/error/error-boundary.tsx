"use client";

/**
 * Enhanced Error Boundary System for HAOS-V2
 * 
 * Provides comprehensive error boundaries with user-friendly error pages,
 * recovery options, and integration with error reporting services.
 */

import React, { Component, ReactNode, ErrorInfo } from "react";
import { AlertTriangle, RefreshCw, Home, MessageCircle, Bug, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ErrorFallbackProps } from "./error-fallback";
import { getErrorReportingManager, type ErrorContext } from "@/lib/monitoring/error-reporter";

// =============================================================================
// Types
// =============================================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
  retryCount: number;
  lastErrorTime?: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'app' | 'page' | 'section' | 'component';
  name?: string;
  maxRetries?: number;
  resetTimeWindow?: number; // milliseconds
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  onRetry?: () => void;
  enableRecovery?: boolean;
}

// =============================================================================
// Error Reporting Service
// =============================================================================

class ErrorReportingService {
  static async reportError(error: Error, errorInfo: ErrorInfo, context: {
    level: string;
    name?: string;
    errorId: string;
    timestamp: string;
    userAgent: string;
    url: string;
    userId?: string;
    sessionId?: string;
    retryCount: number;
  }) {
    try {
      // Get the error reporting manager instance
      const errorReporter = getErrorReportingManager();
      
      // Check if error reporting is enabled
      if (!errorReporter.isEnabled()) {
        console.warn('[ErrorBoundary] Error reporting disabled');
        return;
      }

      // Transform context to match ErrorContext interface
      const errorContext: Partial<ErrorContext> = {
        errorId: context.errorId,
        level: context.level as 'app' | 'page' | 'section' | 'component',
        component: context.name,
        route: typeof window !== 'undefined' ? window.location.pathname : undefined,
        userId: context.userId,
        sessionId: context.sessionId || this.generateSessionId(),
        userAgent: context.userAgent,
        retryCount: context.retryCount,
        extra: {
          componentStack: errorInfo.componentStack,
          errorBoundary: true,
        },
        tags: {
          'error.source': 'error-boundary',
          'error.boundary.level': context.level,
          'error.boundary.name': context.name || 'unnamed',
        },
      };

      // Report error through the unified service
      const reportId = await errorReporter.reportError(error, errorContext);
      
      if (reportId) {
        console.log(`[ErrorBoundary] Error reported successfully: ${reportId}`);
      } else {
        console.warn('[ErrorBoundary] Error reporting failed or was filtered');
      }

    } catch (reportingError) {
      // Fallback to legacy reporting if the new system fails
      console.error('[ErrorBoundary] Unified error reporting failed, using fallback:', reportingError);
      await this.legacyReportError(error, errorInfo, context);
    }
  }

  private static async legacyReportError(error: Error, errorInfo: ErrorInfo, context: {
    level: string;
    name?: string;
    errorId: string;
    timestamp: string;
    userAgent: string;
    url: string;
    userId?: string;
    sessionId?: string;
    retryCount: number;
  }) {
    // Console logging for development
    console.group(`🚨 HAOS Error Boundary [${context.level}:${context.name || 'unnamed'}]`);
    console.error("Error ID:", context.errorId);
    console.error("Retry Count:", context.retryCount);
    console.error("Error:", error);
    console.error("Component Stack:", errorInfo.componentStack);
    console.error("Context:", context);
    console.groupEnd();

    // Store in localStorage for debugging
    if (typeof window !== 'undefined') {
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
        
        // Keep only last 100 errors
        if (existingLogs.length > 100) {
          existingLogs.splice(0, existingLogs.length - 100);
        }
        
        localStorage.setItem('haos-error-logs', JSON.stringify(existingLogs));
      } catch (storageError) {
        console.warn('Failed to store error log:', storageError);
      }
    }

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      try {
        await fetch('/api/errors/report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            error: {
              message: error.message,
              stack: error.stack,
              name: error.name,
            },
            errorInfo,
            context,
          }),
        }).catch(reportError => {
          console.error('Failed to report error to monitoring service:', reportError);
        });
      } catch (reportingError) {
        console.error('Error reporting failed:', reportingError);
      }
    }
  }

  private static generateSessionId(): string {
    if (typeof window === 'undefined') return 'server-session';
    
    let sessionId = sessionStorage.getItem('haos-error-boundary-session');
    if (!sessionId) {
      sessionId = `eb-session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('haos-error-boundary-session', sessionId);
    }
    return sessionId;
  }

  static getErrorLogs(): any[] {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('haos-error-logs') || '[]');
    } catch {
      return [];
    }
  }

  static clearErrorLogs(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('haos-error-logs');
    }
  }
}

// =============================================================================
// Enhanced Error Boundary Component
// =============================================================================

export class EnhancedErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `haos-error-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
      lastErrorTime: Date.now(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { level = 'component', name, maxRetries = 3 } = this.props;
    const { errorId = 'unknown', retryCount } = this.state;

    // Report the error
    ErrorReportingService.reportError(error, errorInfo, {
      level,
      name,
      errorId,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
      retryCount,
    });

    // Call custom error handler
    this.props.onError?.(error, errorInfo, errorId);

    // Update state with error info
    this.setState({ errorInfo });

    // Auto-recovery for certain error types and levels
    if (this.shouldAttemptAutoRecovery(error, retryCount, maxRetries)) {
      this.scheduleAutoRecovery();
    }
  }

  private getUserId(): string | undefined {
    // In a real implementation, get from Matrix client or auth context
    return typeof window !== 'undefined' ? localStorage.getItem('matrix_user_id') || undefined : undefined;
  }

  private getSessionId(): string | undefined {
    // In a real implementation, get from session storage or generate
    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('haos_session_id');
      if (!sessionId) {
        sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem('haos_session_id', sessionId);
      }
      return sessionId;
    }
    return undefined;
  }

  private shouldAttemptAutoRecovery(error: Error, retryCount: number, maxRetries: number): boolean {
    // Don't auto-recover for app-level errors
    if (this.props.level === 'app') return false;
    
    // Don't exceed max retries
    if (retryCount >= maxRetries) return false;
    
    // Auto-recover for network errors, but not for syntax errors
    const isNetworkError = error.message.includes('network') || 
                          error.message.includes('fetch') ||
                          error.message.includes('timeout');
    
    const isRenderError = error.message.includes('Cannot read properties') ||
                         error.message.includes('undefined') ||
                         error.name === 'ChunkLoadError';

    return isNetworkError || (isRenderError && retryCount < 1);
  }

  private scheduleAutoRecovery() {
    // Progressive delay: 1s, 3s, 6s, etc.
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000);
    
    this.resetTimeoutId = setTimeout(() => {
      this.handleRetry();
    }, delay);
  }

  private handleRetry = () => {
    const { resetTimeWindow = 30000 } = this.props;
    const now = Date.now();
    const { lastErrorTime, retryCount } = this.state;

    // Reset retry count if enough time has passed
    const newRetryCount = (lastErrorTime && (now - lastErrorTime > resetTimeWindow)) ? 0 : retryCount + 1;

    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: undefined,
      retryCount: newRetryCount,
      lastErrorTime: undefined,
    });

    // Clear any scheduled recovery
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    // Call custom retry handler
    this.props.onRetry?.();
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorProps: ErrorFallbackProps = {
        error: this.state.error,
        errorId: this.state.errorId,
        retryCount: this.state.retryCount,
        onRetry: this.handleRetry,
        onReload: this.handleReload,
        onGoHome: this.handleGoHome,
        level: this.props.level || 'component',
        name: this.props.name,
        maxRetries: this.props.maxRetries || 3,
      };

      // Import the ErrorFallback component dynamically to avoid circular imports
      const ErrorFallback = require('./error-fallback').ErrorFallback;
      return <ErrorFallback {...errorProps} />;
    }

    return this.props.children;
  }
}

// =============================================================================
// Convenience Wrappers
// =============================================================================

export const AppErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <EnhancedErrorBoundary 
    level="app" 
    name="application" 
    maxRetries={0}
    enableRecovery={false}
  >
    {children}
  </EnhancedErrorBoundary>
);

export const PageErrorBoundary: React.FC<{ 
  children: ReactNode; 
  name?: string;
  enableAutoRecovery?: boolean;
}> = ({ children, name, enableAutoRecovery = true }) => (
  <EnhancedErrorBoundary 
    level="page" 
    name={name || 'page'}
    maxRetries={enableAutoRecovery ? 2 : 0}
    enableRecovery={enableAutoRecovery}
  >
    {children}
  </EnhancedErrorBoundary>
);

export const SectionErrorBoundary: React.FC<{ 
  children: ReactNode; 
  name?: string;
  enableAutoRecovery?: boolean;
}> = ({ children, name, enableAutoRecovery = true }) => (
  <EnhancedErrorBoundary 
    level="section" 
    name={name || 'section'}
    maxRetries={enableAutoRecovery ? 3 : 0}
    enableRecovery={enableAutoRecovery}
  >
    {children}
  </EnhancedErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{ 
  children: ReactNode; 
  name?: string;
  enableAutoRecovery?: boolean;
}> = ({ children, name, enableAutoRecovery = true }) => (
  <EnhancedErrorBoundary 
    level="component" 
    name={name || 'component'}
    maxRetries={enableAutoRecovery ? 5 : 0}
    enableRecovery={enableAutoRecovery}
  >
    {children}
  </EnhancedErrorBoundary>
);

// =============================================================================
// Chat-Specific Error Boundary
// =============================================================================

export const ChatErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <EnhancedErrorBoundary 
    level="section" 
    name="chat"
    maxRetries={2}
    enableRecovery={true}
    onRetry={() => {
      // Custom chat recovery logic could go here
      console.log('Retrying chat component...');
    }}
  >
    {children}
  </EnhancedErrorBoundary>
);

// =============================================================================
// Export utilities
// =============================================================================

export { ErrorReportingService };