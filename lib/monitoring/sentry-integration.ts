/**
 * Sentry Integration for Melo-V2 Error Reporting
 * 
 * Provides Sentry SDK integration with Melo-specific configuration,
 * source map support, and Matrix-aware context enrichment.
 */

import type { ErrorReportingService, ErrorContext, UserFeedback, ErrorReportingConfig } from './error-reporter';

// Sentry types (to avoid requiring Sentry SDK when not used)
interface SentryConfig {
  dsn: string;
  environment: string;
  sampleRate?: number;
  enableTracing?: boolean;
  beforeSend?: (event: any) => any | null;
  beforeSendTransaction?: (event: any) => any | null;
  integrations?: any[];
  release?: string;
  dist?: string;
}

interface SentryHub {
  captureException(error: Error, scope?: any): string;
  captureMessage(message: string, level?: string, scope?: any): string;
  withScope(callback: (scope: any) => void): void;
  addBreadcrumb(breadcrumb: any): void;
  setUser(user: any): void;
  setTag(key: string, value: string): void;
  setContext(name: string, context: any): void;
  setLevel(level: string): void;
}

interface SentryScope {
  setTag(key: string, value: string): void;
  setContext(name: string, context: any): void;
  setUser(user: any): void;
  setLevel(level: string): void;
  addBreadcrumb(breadcrumb: any): void;
  setFingerprint(fingerprint: string[]): void;
}

/**
 * Sentry Error Reporting Service Implementation
 */
export class SentryErrorReportingService implements ErrorReportingService {
  private sentry: any = null;
  private hub: SentryHub | null = null;
  private isInitialized = false;

  constructor(
    private config: SentryConfig,
    private globalConfig: ErrorReportingConfig
  ) {}

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Dynamic import of Sentry SDK (only load in production or when explicitly configured)
      if (this.config.dsn) {
        this.sentry = await import('@sentry/nextjs');
        
        // Initialize Sentry with Melo-specific configuration
        this.sentry.init({
          dsn: this.config.dsn,
          environment: this.config.environment,
          sampleRate: this.config.sampleRate || 1.0,
          tracesSampleRate: this.config.enableTracing ? 0.1 : 0,
          
          // Release configuration for source maps
          release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
          dist: process.env.NEXT_PUBLIC_SENTRY_DIST || 'unknown',

          // Use default integrations with optional tracing
          ...(this.config.enableTracing && {
            integrations: [
              // Include basic tracing if available
              ...(this.sentry.BrowserTracing ? [new this.sentry.BrowserTracing({
                tracingOrigins: [
                  'localhost',
                  /^https:\/\/.*\.aaroncollins\.info/,
                  /^https:\/\/.*\.matrix\.org/,
                ],
              })] : []),
              
              ...(this.config.integrations || []),
            ],
          }),

          // Filter and enhance errors before sending
          beforeSend: (event: any, hint: any) => {
            // Apply global beforeSend filter first
            if (this.globalConfig.beforeSend && hint?.originalException instanceof Error) {
              const context = this.extractContextFromEvent(event);
              const filteredContext = this.globalConfig.beforeSend(context);
              if (!filteredContext) return null;
              event = this.enhanceEventWithContext(event, filteredContext);
            }

            // Apply Sentry-specific filters
            if (this.config.beforeSend) {
              event = this.config.beforeSend(event);
            }

            // Filter out common non-actionable errors
            if (this.shouldFilterError(event, hint)) {
              return null;
            }

            // Enhance with Melo-specific context
            return this.enhanceEvent(event, hint);
          },

          beforeSendTransaction: this.config.beforeSendTransaction,

          // Additional configuration
          debug: process.env.NODE_ENV === 'development',
          autoSessionTracking: true,
          sendDefaultPii: false, // Respect privacy
          
          // Performance monitoring
          profilesSampleRate: this.config.enableTracing ? 0.1 : 0,
        });

        this.hub = this.sentry.getCurrentHub();
        
        // Set initial context
        this.setInitialContext();
        
        console.log('[SentryErrorReporting] Initialized successfully');
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('[SentryErrorReporting] Failed to initialize:', error);
      // Don't throw - allow app to continue without Sentry
    }
  }

  private setInitialContext(): void {
    if (!this.hub || !this.sentry) return;

    // Set user context if available
    this.hub.withScope((scope: SentryScope) => {
      // Matrix user context
      if (typeof window !== 'undefined') {
        const matrixUserId = localStorage.getItem('matrix-user-id');
        const matrixServer = localStorage.getItem('matrix-homeserver');
        
        if (matrixUserId) {
          scope.setUser({
            id: matrixUserId,
            username: matrixUserId.split(':')[0]?.substring(1), // Remove @ prefix
          });
        }

        // Melo-specific tags
        scope.setTag('melo.version', process.env.NEXT_PUBLIC_APP_VERSION || 'unknown');
        scope.setTag('melo.environment', this.config.environment);
        if (matrixServer) {
          scope.setTag('matrix.homeserver', matrixServer);
        }

        // Browser context
        scope.setContext('browser', {
          name: navigator.userAgent,
          online: navigator.onLine,
          cookieEnabled: navigator.cookieEnabled,
          language: navigator.language,
        });

        // Performance context
        if ('memory' in performance) {
          const memory = (performance as any).memory;
          scope.setContext('performance', {
            memoryUsed: memory.usedJSHeapSize,
            memoryTotal: memory.totalJSHeapSize,
            memoryLimit: memory.jsHeapSizeLimit,
          });
        }
      }
    });
  }

  async reportError(error: Error, context: Partial<ErrorContext>, feedback?: UserFeedback): Promise<string> {
    if (!this.isInitialized || !this.hub || !this.sentry) {
      console.warn('[SentryErrorReporting] Service not initialized');
      return '';
    }

    try {
      let eventId = '';

      this.hub.withScope((scope: SentryScope) => {
        // Set error-specific context
        this.enhanceScope(scope, context, feedback);

        // Capture the error
        eventId = this.hub!.captureException(error, scope);
      });

      // Add breadcrumb for error reporting
      this.hub.addBreadcrumb({
        message: 'Error reported to Sentry',
        category: 'error-reporting',
        level: 'error',
        data: {
          errorId: eventId,
          component: context.component,
          level: context.level,
        },
      });

      return eventId;
    } catch (sentryError) {
      console.error('[SentryErrorReporting] Failed to report error:', sentryError);
      return '';
    }
  }

  async reportMessage(message: string, level: 'info' | 'warning' | 'error', context?: Partial<ErrorContext>): Promise<string> {
    if (!this.isInitialized || !this.hub || !this.sentry) {
      return '';
    }

    try {
      let eventId = '';

      this.hub.withScope((scope: SentryScope) => {
        if (context) {
          this.enhanceScope(scope, context);
        }

        const sentryLevel = level === 'warning' ? 'warning' : level === 'error' ? 'error' : 'info';
        scope.setLevel(sentryLevel);

        eventId = this.hub!.captureMessage(message, sentryLevel, scope);
      });

      return eventId;
    } catch (sentryError) {
      console.error('[SentryErrorReporting] Failed to report message:', sentryError);
      return '';
    }
  }

  async reportBatch(reports: Array<{ error: Error; context: Partial<ErrorContext>; feedback?: UserFeedback }>): Promise<string[]> {
    const results = await Promise.allSettled(
      reports.map(({ error, context, feedback }) => this.reportError(error, context, feedback))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
      .map(result => result.value)
      .filter(Boolean);
  }

  async collectUserFeedback(errorId: string, feedback: UserFeedback): Promise<void> {
    if (!this.isInitialized || !this.sentry) return;

    try {
      // Send user feedback to Sentry
      this.sentry.captureUserFeedback({
        event_id: errorId,
        name: feedback.email ? feedback.email.split('@')[0] : 'Anonymous User',
        email: feedback.email || 'anonymous@melo.local',
        comments: feedback.description,
      });

      // Add breadcrumb
      if (this.hub) {
        this.hub.addBreadcrumb({
          message: 'User feedback collected',
          category: 'user-feedback',
          level: 'info',
          data: {
            errorId,
            feedbackLength: feedback.description.length,
            hasEmail: !!feedback.email,
            severity: feedback.severity,
          },
        });
      }
    } catch (error) {
      console.error('[SentryErrorReporting] Failed to collect user feedback:', error);
    }
  }

  async showFeedbackDialog(errorId: string, error: Error): Promise<UserFeedback | null> {
    if (!this.isInitialized || !this.sentry) return null;

    try {
      // Sentry provides a user feedback dialog
      const result = await this.sentry.showReportDialog({
        eventId: errorId,
        title: 'Something went wrong',
        subtitle: 'Help us improve Melo by sharing what happened.',
        subtitle2: 'Your feedback helps make the app better for everyone.',
        labelName: 'Name (optional)',
        labelEmail: 'Email (optional)',
        labelComments: 'What happened?',
        labelClose: 'Close',
        labelSubmit: 'Submit Feedback',
        successMessage: 'Thank you for your feedback!',
      });

      // Note: Sentry dialog doesn't return user input directly
      // This would need to be handled by a custom implementation
      return null;
    } catch (error) {
      console.error('[SentryErrorReporting] Failed to show feedback dialog:', error);
      return null;
    }
  }

  updateConfig(config: Partial<ErrorReportingConfig>): void {
    this.globalConfig = { ...this.globalConfig, ...config };
    
    // Update Sentry configuration if needed
    if (this.sentry && config.services?.sentry) {
      // Note: Sentry doesn't support runtime config updates
      // Would need to reinitialize for major changes
      console.warn('[SentryErrorReporting] Runtime config updates not fully supported');
    }
  }

  getConfig(): ErrorReportingConfig {
    return this.globalConfig;
  }

  isEnabled(): boolean {
    return this.isInitialized && !!this.config.dsn;
  }

  enable(): void {
    if (this.sentry) {
      // Re-enable Sentry client
      const client = this.sentry.getCurrentHub().getClient();
      if (client) {
        const options = client.getOptions() as any;
        options.enabled = true;
      }
    }
  }

  disable(): void {
    if (this.sentry) {
      // Disable Sentry client
      const client = this.sentry.getCurrentHub().getClient();
      if (client) {
        const options = client.getOptions() as any;
        options.enabled = false;
      }
    }
  }

  getStoredErrors(): ErrorContext[] {
    // Sentry doesn't provide direct access to stored errors
    // Would need to implement local storage fallback
    return [];
  }

  clearStoredErrors(): void {
    // Not applicable for Sentry
    console.log('[SentryErrorReporting] Clear stored errors not applicable for Sentry');
  }

  async exportErrorData(): Promise<string> {
    // Export would need to be done through Sentry dashboard
    return JSON.stringify({
      note: 'Error data is managed by Sentry. Access via Sentry dashboard.',
      sentryProject: this.config.dsn ? new URL(this.config.dsn).pathname : 'unknown',
      environment: this.config.environment,
    }, null, 2);
  }

  // Helper methods

  private enhanceScope(scope: SentryScope, context: Partial<ErrorContext>, feedback?: UserFeedback): void {
    // Set tags
    if (context.level) scope.setTag('error.level', context.level);
    if (context.component) scope.setTag('error.component', context.component);
    if (context.route) scope.setTag('error.route', context.route);
    if (context.matrixRoomId) scope.setTag('matrix.room', context.matrixRoomId);
    if (context.connectionStatus) scope.setTag('connection.status', context.connectionStatus);

    // Set contexts
    if (context.matrixUserId || context.matrixServer) {
      scope.setContext('matrix', {
        userId: context.matrixUserId,
        server: context.matrixServer,
        deviceId: context.matrixDeviceId,
        roomId: context.matrixRoomId,
      });
    }

    if (context.retryCount !== undefined || context.memoryUsage) {
      scope.setContext('performance', {
        retryCount: context.retryCount,
        memoryUsage: context.memoryUsage,
      });
    }

    if (feedback) {
      scope.setContext('user-feedback', {
        description: feedback.description,
        severity: feedback.severity,
        category: feedback.category,
        hasReproductionSteps: !!feedback.reproductionSteps,
      });
    }

    // Set additional tags from context
    if (context.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    // Set fingerprint for error grouping
    if (context.component && context.error) {
      scope.setFingerprint([
        context.component,
        context.error.name,
        context.error.message,
      ]);
    }
  }

  private shouldFilterError(event: any, hint?: any): boolean {
    const errorMessage = event?.exception?.values?.[0]?.value || '';
    const errorType = event?.exception?.values?.[0]?.type || '';

    // Filter out common browser errors that aren't actionable
    const ignoredErrors = [
      'Network Error',
      'Script error',
      'Non-Error promise rejection captured',
      'ChunkLoadError',
      'Loading chunk',
      'ResizeObserver loop limit exceeded',
      'AbortError',
    ];

    return ignoredErrors.some(ignored => 
      errorMessage.includes(ignored) || errorType.includes(ignored)
    );
  }

  private enhanceEvent(event: any, hint?: any): any {
    // Add Melo-specific fingerprinting
    if (event?.exception?.values?.[0]) {
      const error = event.exception.values[0];
      
      // Enhance stack trace with source maps context
      if (error.stacktrace?.frames) {
        error.stacktrace.frames.forEach((frame: any) => {
          if (frame.filename?.includes('melo-v2')) {
            frame.in_app = true;
          }
        });
      }
    }

    // Add request context if available
    if (typeof window !== 'undefined') {
      event.request = {
        url: window.location.href,
        headers: {
          'User-Agent': navigator.userAgent,
        },
      };
    }

    return event;
  }

  private extractContextFromEvent(event: any): ErrorContext {
    // Extract context information from Sentry event
    // This is a simplified version - real implementation would be more comprehensive
    return {
      errorId: event.event_id || 'unknown',
      timestamp: new Date().toISOString(),
      error: {
        message: event?.exception?.values?.[0]?.value || 'Unknown error',
        stack: event?.exception?.values?.[0]?.stacktrace?.frames?.map((f: any) => f.function).join('\n'),
        name: event?.exception?.values?.[0]?.type || 'Error',
      },
      level: 'component',
      sessionId: 'sentry-session',
    };
  }

  private enhanceEventWithContext(event: any, context: ErrorContext): any {
    // Apply filtered context back to Sentry event
    if (context.tags) {
      event.tags = { ...event.tags, ...context.tags };
    }
    
    if (context.extra) {
      event.extra = { ...event.extra, ...context.extra };
    }

    return event;
  }
}

/**
 * Helper function to check if Sentry SDK is available
 */
export function isSentryAvailable(): boolean {
  try {
    // Use dynamic require to avoid build-time resolution
    eval("require.resolve('@sentry/nextjs')");
    return true;
  } catch {
    return false;
  }
}

/**
 * Create Sentry service with environment-based configuration
 */
export function createSentryService(
  config?: Partial<SentryConfig>,
  globalConfig?: ErrorReportingConfig
): SentryErrorReportingService {
  const defaultConfig: SentryConfig = {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
    environment: process.env.NODE_ENV || 'development',
    sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    enableTracing: process.env.NODE_ENV === 'production',
  };

  const defaultGlobalConfig: ErrorReportingConfig = {
    enabled: !!defaultConfig.dsn && process.env.NODE_ENV === 'production',
    environment: defaultConfig.environment as any,
    enableUserFeedback: true,
    enableAutomaticReporting: true,
    services: {},
  };

  return new SentryErrorReportingService(
    { ...defaultConfig, ...config },
    { ...defaultGlobalConfig, ...globalConfig }
  );
}