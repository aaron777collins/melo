"use client";

/**
 * Enhanced Error Reporting Provider for HAOS-V2
 * 
 * Initializes and provides the unified error reporting service
 * with environment-based configuration and Sentry integration.
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  initializeErrorReporting,
  type ErrorReportingManager,
  type ErrorReportingConfig 
} from "@/lib/monitoring/error-reporter";

interface ErrorReportingContextValue {
  manager: ErrorReportingManager | null;
  isInitialized: boolean;
  isEnabled: boolean;
  error: Error | null;
}

const ErrorReportingContext = createContext<ErrorReportingContextValue>({
  manager: null,
  isInitialized: false,
  isEnabled: false,
  error: null,
});

export interface EnhancedErrorReportingProviderProps {
  children: React.ReactNode;
  config?: Partial<ErrorReportingConfig>;
  fallbackToConsole?: boolean;
}

export function EnhancedErrorReportingProvider({
  children,
  config,
  fallbackToConsole = true,
}: EnhancedErrorReportingProviderProps) {
  const [manager, setManager] = useState<ErrorReportingManager | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initializeService = async () => {
      try {
        // Configure error reporting based on environment
        const defaultConfig: Partial<ErrorReportingConfig> = {
          enabled: process.env.NODE_ENV === 'production' || !!process.env.NEXT_PUBLIC_ENABLE_ERROR_REPORTING,
          environment: (process.env.NODE_ENV as any) || 'development',
          enableUserFeedback: true,
          enableAutomaticReporting: process.env.NODE_ENV === 'production',
          
          services: {
            // Sentry configuration (if DSN is provided)
            ...(process.env.NEXT_PUBLIC_SENTRY_DSN && {
              sentry: {
                dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
                environment: process.env.NODE_ENV || 'development',
                sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
                enableTracing: process.env.NODE_ENV === 'production',
              },
            }),
            
            // Console logging (enabled in development)
            console: {
              enabled: process.env.NODE_ENV === 'development' || fallbackToConsole,
              verboseMode: process.env.NODE_ENV === 'development',
            },
            
            // Local storage (always enabled for offline scenarios)
            localStorage: {
              enabled: true,
              maxEntries: process.env.NODE_ENV === 'production' ? 50 : 100,
            },
            
            // Custom endpoint (if configured)
            ...(process.env.NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT && {
              customEndpoint: {
                url: process.env.NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT,
                apiKey: process.env.NEXT_PUBLIC_ERROR_REPORTING_API_KEY,
              },
            }),
          },

          // Sampling and filtering
          sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
          beforeSend: (context) => {
            // Filter out non-actionable errors
            if (context.error.message.includes('Script error') ||
                context.error.message.includes('Network Error') ||
                context.error.message.includes('ChunkLoadError')) {
              return null;
            }

            // Add HAOS-specific context
            return {
              ...context,
              tags: {
                ...context.tags,
                'haos.version': process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
                'haos.deployment': process.env.VERCEL_ENV || 'local',
              },
              extra: {
                ...context.extra,
                buildId: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
                deploymentUrl: process.env.VERCEL_URL,
              },
            };
          },

          // User feedback configuration
          feedbackOptions: {
            showDialog: true,
            dialogTitle: 'Something went wrong',
            dialogMessage: 'Help us improve HAOS by sharing what happened.',
            collectUserInfo: true,
            allowScreenshot: false, // Privacy consideration
          },
        };

        // Merge with provided config
        const finalConfig = { ...defaultConfig, ...config };

        // Initialize the error reporting manager
        const errorManager = await initializeErrorReporting(finalConfig);

        if (isMounted) {
          setManager(errorManager);
          setIsEnabled(errorManager.isEnabled());
          setIsInitialized(true);
          
          console.log('[ErrorReportingProvider] Service initialized', {
            enabled: errorManager.isEnabled(),
            environment: finalConfig.environment,
            services: Object.keys(finalConfig.services || {}),
          });
        }

      } catch (initError) {
        console.error('[ErrorReportingProvider] Failed to initialize error reporting:', initError);
        
        if (isMounted) {
          setError(initError as Error);
          setIsInitialized(true); // Still mark as initialized to prevent retry loops
        }
      }
    };

    initializeService();

    return () => {
      isMounted = false;
    };
  }, [config, fallbackToConsole]);

  // Provide global error handler for unhandled errors
  useEffect(() => {
    if (!manager || !isEnabled) return;

    const handleUnhandledError = (event: ErrorEvent) => {
      manager.reportError(
        new Error(event.message),
        {
          level: 'app',
          component: 'global-error-handler',
          extra: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            source: 'window.onerror',
          },
        }
      ).catch(console.error);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      
      manager.reportError(error, {
        level: 'app',
        component: 'global-promise-handler',
        extra: {
          source: 'unhandledrejection',
          reason: event.reason,
        },
      }).catch(console.error);
    };

    // Register global error handlers
    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [manager, isEnabled]);

  const contextValue: ErrorReportingContextValue = {
    manager,
    isInitialized,
    isEnabled,
    error,
  };

  return (
    <ErrorReportingContext.Provider value={contextValue}>
      {children}
    </ErrorReportingContext.Provider>
  );
}

/**
 * Hook to access the error reporting manager
 */
export function useEnhancedErrorReporting() {
  const context = useContext(ErrorReportingContext);
  
  if (!context) {
    throw new Error('useEnhancedErrorReporting must be used within EnhancedErrorReportingProvider');
  }
  
  return context;
}

/**
 * Hook for easy error reporting
 */
export function useReportError() {
  const { manager, isEnabled } = useEnhancedErrorReporting();
  
  return React.useCallback(async (
    error: Error,
    context?: Partial<import("@/lib/monitoring/error-reporter").ErrorContext>,
    feedback?: import("@/lib/monitoring/error-reporter").UserFeedback
  ) => {
    if (!manager || !isEnabled) {
      console.warn('[useReportError] Error reporting not available');
      return null;
    }
    
    try {
      return await manager.reportError(error, context || {}, feedback);
    } catch (reportError) {
      console.error('[useReportError] Failed to report error:', reportError);
      return null;
    }
  }, [manager, isEnabled]);
}

/**
 * Development helper to check error reporting status
 */
export function useErrorReportingStatus() {
  const { manager, isInitialized, isEnabled, error } = useEnhancedErrorReporting();
  
  return {
    isInitialized,
    isEnabled,
    hasError: !!error,
    error,
    storedErrorCount: manager?.getStoredErrors().length || 0,
    config: manager?.getConfig(),
  };
}