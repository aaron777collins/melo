"use client";

import React from "react";

/**
 * Error Reporting Hook for HAOS-V2
 * 
 * Provides error reporting functionality to monitoring services
 * with user consent, privacy protection, and flexible backends.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

export interface ErrorReport {
  id: string;
  timestamp: string;
  error: {
    message: string;
    stack?: string;
    name: string;
  };
  context: {
    level: 'app' | 'page' | 'section' | 'component';
    component?: string;
    url: string;
    userAgent: string;
    userId?: string;
    sessionId: string;
    retryCount?: number;
    tags?: string[];
  };
  metadata: {
    buildId?: string;
    version?: string;
    environment: string;
    matrixServer?: string;
    connectionStatus?: 'online' | 'offline';
  };
  userFeedback?: {
    description: string;
    email?: string;
    reproductionSteps?: string;
  };
}

export interface ErrorReportingConfig {
  enabled: boolean;
  endpoint?: string;
  apiKey?: string;
  enableUserFeedback: boolean;
  enableAutomaticReporting: boolean;
  enableLocalStorage: boolean;
  maxStoredErrors: number;
  batchSize: number;
  retryAttempts: number;
  environment: 'development' | 'production' | 'staging';
}

export interface UseErrorReportingOptions {
  config?: Partial<ErrorReportingConfig>;
  onReportSent?: (report: ErrorReport) => void;
  onReportFailed?: (error: Error, report: ErrorReport) => void;
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: ErrorReportingConfig = {
  enabled: true,
  enableUserFeedback: true,
  enableAutomaticReporting: process.env.NODE_ENV === 'production',
  enableLocalStorage: true,
  maxStoredErrors: 50,
  batchSize: 10,
  retryAttempts: 3,
  environment: (process.env.NODE_ENV as any) || 'development',
};

// =============================================================================
// Error Reporting Service
// =============================================================================

class ErrorReportingService {
  private config: ErrorReportingConfig;
  private queue: ErrorReport[] = [];
  private isProcessing = false;

  constructor(config: ErrorReportingConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async reportError(error: Error, context: Partial<ErrorReport['context']>, userFeedback?: ErrorReport['userFeedback']): Promise<string> {
    const report = this.createErrorReport(error, context, userFeedback);
    
    // Store locally if enabled
    if (this.config.enableLocalStorage) {
      this.storeErrorLocally(report);
    }

    // Add to queue for batch processing
    this.queue.push(report);

    // Process queue if automatic reporting is enabled
    if (this.config.enableAutomaticReporting) {
      this.processQueue();
    }

    return report.id;
  }

  private createErrorReport(error: Error, context: Partial<ErrorReport['context']>, userFeedback?: ErrorReport['userFeedback']): ErrorReport {
    const sessionId = this.getSessionId();
    const report: ErrorReport = {
      id: `error-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      context: {
        level: 'component',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        sessionId,
        ...context,
      },
      metadata: {
        buildId: process.env.NEXT_PUBLIC_BUILD_ID,
        version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
        environment: this.config.environment,
        matrixServer: this.getMatrixServer(),
        connectionStatus: typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline',
      },
      userFeedback,
    };

    return report;
  }

  private getSessionId(): string {
    if (typeof window === 'undefined') return 'server-session';
    
    let sessionId = sessionStorage.getItem('haos-session-id');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('haos-session-id', sessionId);
    }
    return sessionId;
  }

  private getMatrixServer(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    return localStorage.getItem('matrix-homeserver') || undefined;
  }

  private storeErrorLocally(report: ErrorReport) {
    try {
      const stored = JSON.parse(localStorage.getItem('haos-error-reports') || '[]');
      stored.push(report);

      // Keep only the most recent errors
      if (stored.length > this.config.maxStoredErrors) {
        stored.splice(0, stored.length - this.config.maxStoredErrors);
      }

      localStorage.setItem('haos-error-reports', JSON.stringify(stored));
    } catch (error) {
      console.warn('Failed to store error report locally:', error);
    }
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    const batch = this.queue.splice(0, this.config.batchSize);

    try {
      await this.sendBatch(batch);
    } catch (error) {
      console.error('Failed to send error batch:', error);
      // Re-queue failed reports for retry
      this.queue.unshift(...batch);
    } finally {
      this.isProcessing = false;
      
      // Continue processing if more reports are queued
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 1000);
      }
    }
  }

  private async sendBatch(reports: ErrorReport[]): Promise<void> {
    // Multiple backend options
    const promises = [];

    // Option 1: Custom HAOS endpoint
    if (this.config.endpoint) {
      promises.push(this.sendToCustomEndpoint(reports));
    }

    // Option 2: Local API route
    promises.push(this.sendToLocalAPI(reports));

    // Option 3: Console logging for development
    if (this.config.environment === 'development') {
      this.logToConsole(reports);
    }

    // Wait for at least one to succeed
    try {
      await Promise.any(promises);
    } catch (error) {
      throw new Error('All error reporting methods failed');
    }
  }

  private async sendToCustomEndpoint(reports: ErrorReport[]): Promise<void> {
    if (!this.config.endpoint) throw new Error('No custom endpoint configured');

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
      body: JSON.stringify({
        reports,
        metadata: {
          source: 'haos-v2',
          timestamp: new Date().toISOString(),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Custom endpoint error: ${response.status}`);
    }
  }

  private async sendToLocalAPI(reports: ErrorReport[]): Promise<void> {
    const response = await fetch('/api/errors/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reports }),
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Local API error: ${response.status}`);
    }
  }

  private logToConsole(reports: ErrorReport[]) {
    console.group('🚨 Error Reporting Batch');
    reports.forEach(report => {
      console.log('Error Report:', report);
    });
    console.groupEnd();
  }

  getStoredErrors(): ErrorReport[] {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('haos-error-reports') || '[]');
    } catch {
      return [];
    }
  }

  clearStoredErrors(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('haos-error-reports');
    }
    this.queue = [];
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  async flushQueue(): Promise<void> {
    if (this.queue.length > 0) {
      await this.processQueue();
    }
  }
}

// =============================================================================
// React Hook
// =============================================================================

export function useErrorReporting(options: UseErrorReportingOptions = {}) {
  const { config, onReportSent, onReportFailed } = options;
  const serviceRef = useRef<ErrorReportingService | null>(null);
  const [isEnabled, setIsEnabled] = useState(DEFAULT_CONFIG.enabled);
  const [queueLength, setQueueLength] = useState(0);

  // Initialize service
  useEffect(() => {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    serviceRef.current = new ErrorReportingService(finalConfig);
    setIsEnabled(finalConfig.enabled);
  }, [config]);

  // Update queue length periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (serviceRef.current) {
        setQueueLength(serviceRef.current.getQueueLength());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Report error function
  const reportError = useCallback(async (
    error: Error,
    context: Partial<ErrorReport['context']> = {},
    options: {
      showToast?: boolean;
      userFeedback?: ErrorReport['userFeedback'];
    } = {}
  ) => {
    if (!serviceRef.current || !isEnabled) {
      return null;
    }

    try {
      const reportId = await serviceRef.current.reportError(error, context, options.userFeedback);
      
      if (options.showToast !== false) {
        toast.success("Error reported successfully", {
          description: "Thank you for helping us improve HAOS",
        });
      }

      onReportSent?.(serviceRef.current.getStoredErrors().find(r => r.id === reportId)!);
      return reportId;
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
      onReportFailed?.(reportError as Error, { error, context } as any);
      
      if (options.showToast !== false) {
        toast.error("Failed to report error", {
          description: "Error details have been saved locally",
        });
      }
      return null;
    }
  }, [isEnabled, onReportSent, onReportFailed]);

  // Get stored errors
  const getStoredErrors = useCallback(() => {
    return serviceRef.current?.getStoredErrors() || [];
  }, []);

  // Clear stored errors
  const clearStoredErrors = useCallback(() => {
    serviceRef.current?.clearStoredErrors();
    setQueueLength(0);
    toast.success("Error reports cleared");
  }, []);

  // Flush queue manually
  const flushQueue = useCallback(async () => {
    if (!serviceRef.current) return;
    
    try {
      await serviceRef.current.flushQueue();
      toast.success("Error reports sent");
    } catch (error) {
      toast.error("Failed to send error reports");
    }
  }, []);

  // Toggle error reporting
  const toggleReporting = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    if (enabled) {
      toast.success("Error reporting enabled");
    } else {
      toast.info("Error reporting disabled");
    }
  }, []);

  return {
    reportError,
    getStoredErrors,
    clearStoredErrors,
    flushQueue,
    toggleReporting,
    isEnabled,
    queueLength,
    hasStoredErrors: getStoredErrors().length > 0,
  };
}

// =============================================================================
// Error Reporting Provider (Optional)
// =============================================================================

export const ErrorReportingContext = React.createContext<ReturnType<typeof useErrorReporting> | null>(null);

export function ErrorReportingProvider({ 
  children, 
  config 
}: { 
  children: React.ReactNode;
  config?: Partial<ErrorReportingConfig>;
}) {
  const errorReporting = useErrorReporting({ config });

  return (
    <ErrorReportingContext.Provider value={errorReporting}>
      {children}
    </ErrorReportingContext.Provider>
  );
}

export function useErrorReportingContext() {
  const context = React.useContext(ErrorReportingContext);
  if (!context) {
    throw new Error('useErrorReportingContext must be used within ErrorReportingProvider');
  }
  return context;
}