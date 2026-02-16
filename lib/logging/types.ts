/**
 * Logging Infrastructure Types
 * Defines TypeScript interfaces for structured logging system
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Base log entry structure
 */
export interface BaseLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  service: string;
  version?: string;
  environment?: string;
}

/**
 * HTTP request context for request logging
 */
export interface RequestContext {
  method: string;
  url: string;
  path: string;
  query?: Record<string, string | string[]>;
  headers?: Record<string, string>;
  userAgent?: string;
  ip?: string;
  userId?: string;
  sessionId?: string;
}

/**
 * HTTP response context for request logging
 */
export interface ResponseContext {
  statusCode: number;
  statusText?: string;
  headers?: Record<string, string>;
  size?: number;
}

/**
 * Performance timing information
 */
export interface RequestTiming {
  startTime: number;
  endTime: number;
  duration: number;
  durationFormatted: string;
}

/**
 * Error context for error logging
 */
export interface ErrorContext {
  name: string;
  message: string;
  stack?: string;
  code?: string | number;
  cause?: unknown;
}

/**
 * Request log entry (extends BaseLogEntry)
 */
export interface RequestLogEntry extends BaseLogEntry {
  type: 'request';
  request: RequestContext;
  response?: ResponseContext;
  timing: RequestTiming;
  error?: ErrorContext;
}

/**
 * Application log entry (extends BaseLogEntry)
 */
export interface ApplicationLogEntry extends BaseLogEntry {
  type: 'application';
  metadata?: Record<string, unknown>;
  error?: ErrorContext;
}

/**
 * Union type for all log entries
 */
export type LogEntry = RequestLogEntry | ApplicationLogEntry;

/**
 * Log configuration
 */
export interface LogConfig {
  level: LogLevel;
  console: boolean;
  file: boolean;
  filePath?: string;
  maxFiles?: number;
  maxSize?: string;
  format?: 'json' | 'text';
  service: string;
  version?: string;
  environment?: string;
}

/**
 * Log rotation configuration
 */
export interface LogRotationConfig {
  maxFiles: number;
  maxSize: string; // e.g., "10MB", "1GB"
  datePattern?: string; // e.g., "YYYY-MM-DD"
  compress?: boolean;
}

/**
 * Log file metadata
 */
export interface LogFileMetadata {
  path: string;
  size: number;
  created: Date;
  modified: Date;
}

/**
 * Log query filters
 */
export interface LogQueryFilters {
  level?: LogLevel;
  correlationId?: string;
  startTime?: Date;
  endTime?: Date;
  message?: string;
  userId?: string;
  path?: string;
  statusCode?: number;
  limit?: number;
  offset?: number;
}

/**
 * Log statistics
 */
export interface LogStats {
  totalEntries: number;
  byLevel: Record<LogLevel, number>;
  timeRange: {
    start: Date;
    end: Date;
  };
  topPaths?: Array<{
    path: string;
    count: number;
    avgDuration?: number;
  }>;
  topErrors?: Array<{
    message: string;
    count: number;
  }>;
}

/**
 * Logger interface
 */
export interface ILogger {
  debug(message: string, metadata?: Record<string, unknown>): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, error?: Error, metadata?: Record<string, unknown>): void;
  setCorrelationId(correlationId: string): void;
  getCorrelationId(): string | undefined;
}

/**
 * Request logger interface
 */
export interface IRequestLogger {
  logRequest(request: RequestContext): void;
  logResponse(request: RequestContext, response: ResponseContext, timing: RequestTiming): void;
  logError(request: RequestContext, error: Error, timing: RequestTiming): void;
}

/**
 * Log file manager interface
 */
export interface ILogFileManager {
  rotate(): Promise<void>;
  cleanup(): Promise<void>;
  getFiles(): Promise<LogFileMetadata[]>;
  getStats(): Promise<LogStats>;
  query(filters: LogQueryFilters): Promise<LogEntry[]>;
}