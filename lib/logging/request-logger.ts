/**
 * API Request/Response Logging Service
 * Handles logging of HTTP requests with timing, correlation IDs, and performance metrics
 */

import { promises as fs } from 'fs';
import { dirname } from 'path';
import { 
  RequestContext, 
  ResponseContext, 
  RequestTiming, 
  RequestLogEntry, 
  LogConfig,
  ErrorContext,
  IRequestLogger 
} from './types';
import { generateCorrelationId, parseSize, formatSize } from './logger';

/**
 * Default request logger configuration
 */
const DEFAULT_REQUEST_CONFIG = {
  filePath: process.env.REQUEST_LOG_FILE_PATH || './logs/requests.log',
  logHeaders: process.env.LOG_REQUEST_HEADERS === 'true',
  logBody: process.env.LOG_REQUEST_BODY === 'true',
  logSensitiveData: process.env.LOG_SENSITIVE_DATA === 'true',
  maxBodySize: parseInt(process.env.LOG_MAX_BODY_SIZE || '1024'), // bytes
};

/**
 * Headers that should not be logged for security reasons
 */
const SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
  'access-token',
  'refresh-token',
];

/**
 * Request logger implementation
 */
export class RequestLogger implements IRequestLogger {
  private config: typeof DEFAULT_REQUEST_CONFIG & Partial<LogConfig>;
  private requestStore: Map<string, {
    context: RequestContext;
    timing: RequestTiming;
  }> = new Map();

  constructor(config: Partial<LogConfig> = {}) {
    this.config = { 
      ...DEFAULT_REQUEST_CONFIG, 
      service: 'haos-v2-requests',
      environment: process.env.NODE_ENV || 'development',
      ...config 
    };
  }

  /**
   * Log incoming request
   */
  public logRequest(request: RequestContext): void {
    const correlationId = request.headers?.['x-correlation-id'] || generateCorrelationId();
    
    // Create timing object
    const timing: RequestTiming = {
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      durationFormatted: '',
    };

    // Store request context for later completion
    this.requestStore.set(correlationId, {
      context: { ...request, headers: this.filterHeaders(request.headers) },
      timing,
    });

    // Log request start (optional, for debugging)
    if (process.env.LOG_REQUEST_START === 'true') {
      this.writeRequestLog({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `${request.method} ${request.path} - Request started`,
        correlationId,
        service: this.config.service,
        environment: this.config.environment,
        type: 'request',
        request: { ...request, headers: this.filterHeaders(request.headers) },
        timing,
      });
    }
  }

  /**
   * Log successful response
   */
  public logResponse(
    request: RequestContext, 
    response: ResponseContext, 
    timing?: RequestTiming
  ): void {
    const correlationId = request.headers?.['x-correlation-id'] || generateCorrelationId();
    
    // Get stored request data or create new timing
    const stored = this.requestStore.get(correlationId);
    const requestTiming = timing || stored?.timing || {
      startTime: Date.now(),
      endTime: Date.now(),
      duration: 0,
      durationFormatted: '0ms',
    };

    // Complete timing
    if (!timing && stored) {
      requestTiming.endTime = Date.now();
      requestTiming.duration = requestTiming.endTime - requestTiming.startTime;
      requestTiming.durationFormatted = this.formatDuration(requestTiming.duration);
    }

    // Create request log entry
    const logEntry: RequestLogEntry = {
      timestamp: new Date().toISOString(),
      level: this.getLogLevel(response.statusCode),
      message: `${request.method} ${request.path} - ${response.statusCode} ${response.statusText || ''} (${requestTiming.durationFormatted})`,
      correlationId,
      service: this.config.service,
      environment: this.config.environment,
      type: 'request',
      request: { 
        ...request, 
        headers: this.filterHeaders(request.headers) 
      },
      response: { 
        ...response, 
        headers: this.filterHeaders(response.headers) 
      },
      timing: requestTiming,
    };

    this.writeRequestLog(logEntry);

    // Clean up stored request
    this.requestStore.delete(correlationId);
  }

  /**
   * Log request error
   */
  public logError(
    request: RequestContext, 
    error: Error, 
    timing?: RequestTiming
  ): void {
    const correlationId = request.headers?.['x-correlation-id'] || generateCorrelationId();
    
    // Get stored request data or create new timing
    const stored = this.requestStore.get(correlationId);
    const requestTiming = timing || stored?.timing || {
      startTime: Date.now(),
      endTime: Date.now(),
      duration: 0,
      durationFormatted: '0ms',
    };

    // Complete timing
    if (!timing && stored) {
      requestTiming.endTime = Date.now();
      requestTiming.duration = requestTiming.endTime - requestTiming.startTime;
      requestTiming.durationFormatted = this.formatDuration(requestTiming.duration);
    }

    // Format error context
    const errorContext: ErrorContext = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
      ...(error as any).code && { code: (error as any).code },
    };

    // Create error log entry
    const logEntry: RequestLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message: `${request.method} ${request.path} - ERROR: ${error.message} (${requestTiming.durationFormatted})`,
      correlationId,
      service: this.config.service,
      environment: this.config.environment,
      type: 'request',
      request: { 
        ...request, 
        headers: this.filterHeaders(request.headers) 
      },
      timing: requestTiming,
      error: errorContext,
    };

    this.writeRequestLog(logEntry);

    // Clean up stored request
    this.requestStore.delete(correlationId);
  }

  /**
   * Filter sensitive headers from logging
   */
  private filterHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
    if (!headers || !this.config.logHeaders) {
      return undefined;
    }

    if (this.config.logSensitiveData) {
      return headers;
    }

    const filtered: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      
      if (SENSITIVE_HEADERS.includes(lowerKey)) {
        filtered[key] = '[REDACTED]';
      } else {
        filtered[key] = value;
      }
    }

    return filtered;
  }

  /**
   * Get appropriate log level based on response status code
   */
  private getLogLevel(statusCode: number): 'info' | 'warn' | 'error' {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'info';
  }

  /**
   * Format duration in milliseconds to human readable string
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  /**
   * Write request log entry to file
   */
  private async writeRequestLog(logEntry: RequestLogEntry): Promise<void> {
    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      
      // Ensure directory exists
      if (this.config.filePath) {
        await this.ensureDirectoryExists(dirname(this.config.filePath));
        
        // Append to log file
        await fs.appendFile(this.config.filePath, logLine, 'utf8');
      }

      // Also log to console in development
      if (process.env.NODE_ENV === 'development') {
        this.logToConsole(logEntry);
      }
    } catch (error) {
      console.error('Failed to write request log:', error);
      console.log('Failed log entry:', logEntry);
    }
  }

  /**
   * Log request to console with formatting
   */
  private logToConsole(logEntry: RequestLogEntry): void {
    const { level, message, timing, response, error } = logEntry;
    
    // Color codes
    const colors = {
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow  
      error: '\x1b[31m', // Red
    };
    const reset = '\x1b[0m';
    
    const statusCode = response?.statusCode;
    const status = statusCode 
      ? (statusCode >= 500 ? '❌' : statusCode >= 400 ? '⚠️' : '✅')
      : error ? '💥' : '🔄';
    
    console.log(
      `${status} ${colors[level]}[${level.toUpperCase()}]${reset} ${message}`,
      timing.duration > 1000 ? '🐌' : timing.duration > 500 ? '⏳' : '⚡'
    );
  }

  /**
   * Ensure directory exists for log file
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Clean up stale request entries (for memory management)
   */
  public cleanupStaleRequests(maxAge: number = 300000): void { // 5 minutes default
    const now = Date.now();
    const staleKeys: string[] = [];

    for (const [correlationId, { timing }] of this.requestStore.entries()) {
      if (now - timing.startTime > maxAge) {
        staleKeys.push(correlationId);
      }
    }

    for (const key of staleKeys) {
      this.requestStore.delete(key);
    }
  }

  /**
   * Get current request store size (for monitoring)
   */
  public getActiveRequestsCount(): number {
    return this.requestStore.size;
  }

  /**
   * Get current configuration
   */
  public getConfig(): typeof DEFAULT_REQUEST_CONFIG & Partial<LogConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<LogConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Default request logger instance
 */
export const requestLogger = new RequestLogger();

/**
 * Create request logger with custom configuration
 */
export function createRequestLogger(config: Partial<LogConfig> = {}): RequestLogger {
  return new RequestLogger(config);
}

/**
 * Express-style middleware factory for request logging
 */
export function createRequestLoggingMiddleware(logger: RequestLogger = requestLogger) {
  return (req: any, res: any, next: any) => {
    const correlationId = req.headers['x-correlation-id'] || generateCorrelationId();
    
    // Set correlation ID header if not present
    if (!req.headers['x-correlation-id']) {
      req.headers['x-correlation-id'] = correlationId;
    }

    // Log request start
    const requestContext: RequestContext = {
      method: req.method,
      url: req.url,
      path: req.path || req.url.split('?')[0],
      query: req.query,
      headers: req.headers,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id,
      sessionId: req.session?.id,
    };

    logger.logRequest(requestContext);

    // Capture response
    const originalSend = res.send;
    const originalJson = res.json;
    
    res.send = function(data: any) {
      const responseContext: ResponseContext = {
        statusCode: res.statusCode,
        statusText: res.statusMessage,
        headers: res.getHeaders(),
        size: Buffer.byteLength(data || '', 'utf8'),
      };
      
      logger.logResponse(requestContext, responseContext);
      return originalSend.call(this, data);
    };
    
    res.json = function(data: any) {
      const responseContext: ResponseContext = {
        statusCode: res.statusCode,
        statusText: res.statusMessage,
        headers: res.getHeaders(),
        size: Buffer.byteLength(JSON.stringify(data), 'utf8'),
      };
      
      logger.logResponse(requestContext, responseContext);
      return originalJson.call(this, data);
    };

    // Handle errors
    res.on('error', (error: Error) => {
      logger.logError(requestContext, error);
    });

    next();
  };
}