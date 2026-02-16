/**
 * Error Reporting Service Abstraction for HAOS-V2
 * 
 * Provides a unified interface for error reporting across different services
 * (Sentry, custom endpoints, local logging) with environment-based configuration.
 */

export interface ErrorContext {
  // Error identification
  errorId: string;
  timestamp: string;
  
  // Error details  
  error: {
    message: string;
    stack?: string;
    name: string;
    cause?: string;
  };

  // Application context
  level: 'app' | 'page' | 'section' | 'component';
  component?: string;
  route?: string;
  
  // User context
  userId?: string;
  sessionId: string;
  userAgent?: string;
  
  // Matrix context
  matrixServer?: string;
  matrixUserId?: string;
  matrixDeviceId?: string;
  matrixRoomId?: string;
  
  // Performance context
  connectionStatus?: 'online' | 'offline';
  memoryUsage?: number;
  retryCount?: number;
  
  // Additional metadata
  tags?: Record<string, string>;
  extra?: Record<string, any>;
}

export interface UserFeedback {
  description: string;
  email?: string;
  reproductionSteps?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: 'bug' | 'performance' | 'ui' | 'network' | 'other';
}

export interface ErrorReportingConfig {
  // Core settings
  enabled: boolean;
  environment: 'development' | 'production' | 'staging';
  enableUserFeedback: boolean;
  enableAutomaticReporting: boolean;
  
  // Service configuration
  services: {
    sentry?: {
      dsn: string;
      environment: string;
      sampleRate?: number;
      enableTracing?: boolean;
    };
    customEndpoint?: {
      url: string;
      apiKey?: string;
      headers?: Record<string, string>;
    };
    console?: {
      enabled: boolean;
      verboseMode?: boolean;
    };
    localStorage?: {
      enabled: boolean;
      maxEntries?: number;
    };
  };
  
  // Filtering and sampling
  sampleRate?: number;
  blacklistUrls?: string[];
  whitelistUrls?: string[];
  beforeSend?: (context: ErrorContext) => ErrorContext | null;
  
  // User feedback collection
  feedbackOptions?: {
    showDialog?: boolean;
    dialogTitle?: string;
    dialogMessage?: string;
    collectUserInfo?: boolean;
    allowScreenshot?: boolean;
  };
}

export interface ErrorReportingService {
  // Core reporting methods
  reportError(error: Error, context: Partial<ErrorContext>, feedback?: UserFeedback): Promise<string>;
  reportMessage(message: string, level: 'info' | 'warning' | 'error', context?: Partial<ErrorContext>): Promise<string>;
  
  // Batch reporting
  reportBatch(reports: Array<{ error: Error; context: Partial<ErrorContext>; feedback?: UserFeedback }>): Promise<string[]>;
  
  // User feedback
  collectUserFeedback(errorId: string, feedback: UserFeedback): Promise<void>;
  showFeedbackDialog(errorId: string, error: Error): Promise<UserFeedback | null>;
  
  // Configuration management
  updateConfig(config: Partial<ErrorReportingConfig>): void;
  getConfig(): ErrorReportingConfig;
  
  // Service management
  isEnabled(): boolean;
  enable(): void;
  disable(): void;
  
  // Data management
  getStoredErrors(): ErrorContext[];
  clearStoredErrors(): void;
  exportErrorData(): Promise<string>;
}

/**
 * Main Error Reporting Manager
 * Coordinates multiple error reporting services
 */
export class ErrorReportingManager implements ErrorReportingService {
  private config: ErrorReportingConfig;
  private services: Map<string, ErrorReportingService> = new Map();
  private isInitialized = false;

  constructor(config: ErrorReportingConfig) {
    this.config = { ...this.getDefaultConfig(), ...config };
  }

  private getDefaultConfig(): ErrorReportingConfig {
    return {
      enabled: process.env.NODE_ENV === 'production',
      environment: (process.env.NODE_ENV as any) || 'development',
      enableUserFeedback: true,
      enableAutomaticReporting: process.env.NODE_ENV === 'production',
      services: {
        console: {
          enabled: process.env.NODE_ENV === 'development',
          verboseMode: true,
        },
        localStorage: {
          enabled: true,
          maxEntries: 100,
        },
      },
      sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      feedbackOptions: {
        showDialog: true,
        dialogTitle: 'Something went wrong',
        dialogMessage: 'Help us improve by sharing what happened.',
        collectUserInfo: true,
        allowScreenshot: true,
      },
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize configured services
      if (this.config.services.sentry) {
        const { SentryErrorReportingService } = await import('./sentry-integration');
        const sentryService = new SentryErrorReportingService(this.config.services.sentry, this.config);
        await sentryService.initialize();
        this.services.set('sentry', sentryService);
      }

      if (this.config.services.customEndpoint) {
        const customService = new CustomEndpointService(this.config.services.customEndpoint, this.config);
        this.services.set('custom', customService);
      }

      if (this.config.services.console?.enabled) {
        const consoleService = new ConsoleErrorService(this.config.services.console, this.config);
        this.services.set('console', consoleService);
      }

      if (this.config.services.localStorage?.enabled) {
        const localStorageService = new LocalStorageErrorService(this.config.services.localStorage, this.config);
        this.services.set('localStorage', localStorageService);
      }

      this.isInitialized = true;
      console.log(`[ErrorReporting] Initialized with ${this.services.size} services`);
    } catch (error) {
      console.error('[ErrorReporting] Failed to initialize:', error);
      throw error;
    }
  }

  async reportError(error: Error, context: Partial<ErrorContext> = {}, feedback?: UserFeedback): Promise<string> {
    if (!this.config.enabled || !this.isInitialized) {
      console.warn('[ErrorReporting] Service disabled or not initialized');
      return '';
    }

    // Create full context
    const fullContext = this.enrichContext(error, context);
    
    // Apply beforeSend filter
    const processedContext = this.config.beforeSend ? this.config.beforeSend(fullContext) : fullContext;
    if (!processedContext) {
      console.log('[ErrorReporting] Error filtered out by beforeSend');
      return '';
    }

    // Apply sampling
    if (Math.random() > (this.config.sampleRate || 1.0)) {
      console.log('[ErrorReporting] Error filtered out by sampling');
      return '';
    }

    // Report to all configured services
    const reportPromises = Array.from(this.services.entries()).map(async ([serviceName, service]) => {
      try {
        return await service.reportError(error, processedContext, feedback);
      } catch (serviceError) {
        console.error(`[ErrorReporting] Service ${serviceName} failed:`, serviceError);
        return '';
      }
    });

    const results = await Promise.allSettled(reportPromises);
    const successfulReports = results
      .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
      .map(result => result.value)
      .filter(Boolean);

    if (successfulReports.length === 0) {
      console.error('[ErrorReporting] All services failed to report error');
    }

    return fullContext.errorId;
  }

  async reportMessage(message: string, level: 'info' | 'warning' | 'error', context: Partial<ErrorContext> = {}): Promise<string> {
    const mockError = new Error(message);
    mockError.name = `${level.toUpperCase()}_MESSAGE`;
    return this.reportError(mockError, { ...context, level: context.level || 'app' });
  }

  async reportBatch(reports: Array<{ error: Error; context: Partial<ErrorContext>; feedback?: UserFeedback }>): Promise<string[]> {
    const reportPromises = reports.map(({ error, context, feedback }) =>
      this.reportError(error, context, feedback)
    );
    return Promise.all(reportPromises);
  }

  async collectUserFeedback(errorId: string, feedback: UserFeedback): Promise<void> {
    const promises = Array.from(this.services.values()).map(async (service) => {
      try {
        await service.collectUserFeedback(errorId, feedback);
      } catch (error) {
        console.error('[ErrorReporting] Failed to collect user feedback:', error);
      }
    });

    await Promise.allSettled(promises);
  }

  async showFeedbackDialog(errorId: string, error: Error): Promise<UserFeedback | null> {
    if (!this.config.enableUserFeedback || !this.config.feedbackOptions?.showDialog) {
      return null;
    }

    // This would typically show a modal dialog
    // For now, return null as the UI implementation would handle this
    return null;
  }

  updateConfig(config: Partial<ErrorReportingConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update service configurations
    this.services.forEach((service) => {
      service.updateConfig(config);
    });
  }

  getConfig(): ErrorReportingConfig {
    return { ...this.config };
  }

  isEnabled(): boolean {
    return this.config.enabled && this.isInitialized;
  }

  enable(): void {
    this.config.enabled = true;
  }

  disable(): void {
    this.config.enabled = false;
  }

  getStoredErrors(): ErrorContext[] {
    const localStorageService = this.services.get('localStorage');
    if (localStorageService) {
      return localStorageService.getStoredErrors();
    }
    return [];
  }

  clearStoredErrors(): void {
    this.services.forEach((service) => {
      try {
        service.clearStoredErrors();
      } catch (error) {
        console.error('[ErrorReporting] Failed to clear stored errors:', error);
      }
    });
  }

  async exportErrorData(): Promise<string> {
    const allErrors = this.getStoredErrors();
    return JSON.stringify({
      errors: allErrors,
      exportedAt: new Date().toISOString(),
      config: {
        environment: this.config.environment,
        servicesEnabled: Array.from(this.services.keys()),
      },
    }, null, 2);
  }

  private enrichContext(error: Error, context: Partial<ErrorContext>): ErrorContext {
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    return {
      errorId,
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        cause: error.cause?.toString(),
      },
      level: context.level || 'component',
      component: context.component,
      route: typeof window !== 'undefined' ? window.location.pathname : undefined,
      userId: context.userId,
      sessionId: context.sessionId || this.getSessionId(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      matrixServer: typeof window !== 'undefined' ? localStorage.getItem('matrix-homeserver') || undefined : undefined,
      matrixUserId: typeof window !== 'undefined' ? localStorage.getItem('matrix-user-id') || undefined : undefined,
      connectionStatus: typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline',
      memoryUsage: this.getMemoryUsage(),
      retryCount: context.retryCount || 0,
      tags: context.tags || {},
      extra: context.extra || {},
      ...context,
    };
  }

  private getSessionId(): string {
    if (typeof window === 'undefined') return 'server-session';
    
    let sessionId = sessionStorage.getItem('haos-error-session');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('haos-error-session', sessionId);
    }
    return sessionId;
  }

  private getMemoryUsage(): number | undefined {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize;
    }
    return undefined;
  }
}

/**
 * Console Error Service
 * Logs errors to console with structured formatting
 */
class ConsoleErrorService implements ErrorReportingService {
  constructor(
    private config: { enabled: boolean; verboseMode?: boolean },
    private globalConfig: ErrorReportingConfig
  ) {}

  async reportError(error: Error, context: Partial<ErrorContext>, feedback?: UserFeedback): Promise<string> {
    if (!this.config.enabled) return '';

    const errorId = context.errorId || `console-${Date.now()}`;
    
    if (this.config.verboseMode) {
      console.group(`🚨 HAOS Error [${context.level}:${context.component || 'unknown'}]`);
      console.error('Error ID:', errorId);
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
      console.error('Context:', context);
      if (feedback) console.error('Feedback:', feedback);
      console.groupEnd();
    } else {
      console.error(`🚨 HAOS Error [${errorId}]:`, error.message, context);
    }

    return errorId;
  }

  async reportMessage(message: string, level: 'info' | 'warning' | 'error', context?: Partial<ErrorContext>): Promise<string> {
    const logger = level === 'info' ? console.log : level === 'warning' ? console.warn : console.error;
    const errorId = `console-${Date.now()}`;
    logger(`📝 HAOS ${level.toUpperCase()} [${errorId}]:`, message, context);
    return errorId;
  }

  async reportBatch(): Promise<string[]> { return []; }
  async collectUserFeedback(): Promise<void> {}
  async showFeedbackDialog(): Promise<UserFeedback | null> { return null; }
  updateConfig(): void {}
  getConfig(): ErrorReportingConfig { return this.globalConfig; }
  isEnabled(): boolean { return this.config.enabled; }
  enable(): void { this.config.enabled = true; }
  disable(): void { this.config.enabled = false; }
  getStoredErrors(): ErrorContext[] { return []; }
  clearStoredErrors(): void {}
  async exportErrorData(): Promise<string> { return '[]'; }
}

/**
 * LocalStorage Error Service
 * Persists errors to localStorage for offline scenarios and debugging
 */
class LocalStorageErrorService implements ErrorReportingService {
  private readonly STORAGE_KEY = 'haos-error-reports';

  constructor(
    private config: { enabled: boolean; maxEntries?: number },
    private globalConfig: ErrorReportingConfig
  ) {}

  async reportError(error: Error, context: Partial<ErrorContext>, feedback?: UserFeedback): Promise<string> {
    if (!this.config.enabled || typeof window === 'undefined') return '';

    const errorId = context.errorId || `localStorage-${Date.now()}`;
    const errorData = {
      ...context,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      feedback,
      reportedAt: new Date().toISOString(),
    };

    try {
      const stored = this.getStoredErrors();
      stored.push(errorData as ErrorContext);

      // Maintain max entries
      const maxEntries = this.config.maxEntries || 100;
      if (stored.length > maxEntries) {
        stored.splice(0, stored.length - maxEntries);
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stored));
      return errorId;
    } catch (storageError) {
      console.error('[LocalStorageErrorService] Failed to store error:', storageError);
      return '';
    }
  }

  async reportMessage(): Promise<string> { return ''; }
  async reportBatch(): Promise<string[]> { return []; }
  async collectUserFeedback(): Promise<void> {}
  async showFeedbackDialog(): Promise<UserFeedback | null> { return null; }
  updateConfig(): void {}
  getConfig(): ErrorReportingConfig { return this.globalConfig; }
  isEnabled(): boolean { return this.config.enabled; }
  enable(): void { this.config.enabled = true; }
  disable(): void { this.config.enabled = false; }

  getStoredErrors(): ErrorContext[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  clearStoredErrors(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  async exportErrorData(): Promise<string> {
    const errors = this.getStoredErrors();
    return JSON.stringify(errors, null, 2);
  }
}

/**
 * Custom Endpoint Error Service
 * Sends errors to a custom HTTP endpoint
 */
class CustomEndpointService implements ErrorReportingService {
  constructor(
    private config: { url: string; apiKey?: string; headers?: Record<string, string> },
    private globalConfig: ErrorReportingConfig
  ) {}

  async reportError(error: Error, context: Partial<ErrorContext>, feedback?: UserFeedback): Promise<string> {
    const errorId = context.errorId || `custom-${Date.now()}`;

    try {
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
          ...this.config.headers,
        },
        body: JSON.stringify({
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
          context,
          feedback,
          reportedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return errorId;
    } catch (fetchError) {
      console.error('[CustomEndpointService] Failed to report error:', fetchError);
      return '';
    }
  }

  async reportMessage(): Promise<string> { return ''; }
  async reportBatch(): Promise<string[]> { return []; }
  async collectUserFeedback(): Promise<void> {}
  async showFeedbackDialog(): Promise<UserFeedback | null> { return null; }
  updateConfig(): void {}
  getConfig(): ErrorReportingConfig { return this.globalConfig; }
  isEnabled(): boolean { return true; }
  enable(): void {}
  disable(): void {}
  getStoredErrors(): ErrorContext[] { return []; }
  clearStoredErrors(): void {}
  async exportErrorData(): Promise<string> { return '[]'; }
}

// Create and export the default error reporting manager instance
let defaultManager: ErrorReportingManager | null = null;

export function getErrorReportingManager(config?: Partial<ErrorReportingConfig>): ErrorReportingManager {
  if (!defaultManager) {
    const defaultConfig: ErrorReportingConfig = {
      enabled: process.env.NODE_ENV === 'production',
      environment: (process.env.NODE_ENV as any) || 'development',
      enableUserFeedback: true,
      enableAutomaticReporting: process.env.NODE_ENV === 'production',
      services: {
        console: {
          enabled: process.env.NODE_ENV === 'development',
        },
        localStorage: {
          enabled: true,
          maxEntries: 100,
        },
        // Sentry configuration would be added here in production
      },
    };
    
    defaultManager = new ErrorReportingManager({ ...defaultConfig, ...config });
  }
  
  return defaultManager;
}

export async function initializeErrorReporting(config?: Partial<ErrorReportingConfig>): Promise<ErrorReportingManager> {
  const manager = getErrorReportingManager(config);
  await manager.initialize();
  return manager;
}