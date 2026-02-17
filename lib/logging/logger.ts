/**
 * Core Logging Service
 * Provides structured JSON logging with configurable levels and output targets
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { 
  LogLevel, 
  LogConfig, 
  ApplicationLogEntry, 
  ErrorContext, 
  ILogger 
} from './types';

/**
 * Log level priorities for filtering
 */
const LOG_LEVEL_PRIORITIES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Default log configuration
 */
const DEFAULT_CONFIG: LogConfig = {
  level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  console: process.env.NODE_ENV !== 'production',
  file: true,
  filePath: process.env.LOG_FILE_PATH || './logs/application.log',
  maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
  maxSize: process.env.LOG_MAX_SIZE || '10MB',
  format: 'json',
  service: 'melo-v2',
  version: process.env.npm_package_version || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
};

/**
 * Core logger implementation with structured JSON output
 */
export class Logger implements ILogger {
  private config: LogConfig;
  private correlationId?: string;

  constructor(config: Partial<LogConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set correlation ID for distributed tracing
   */
  public setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  /**
   * Get current correlation ID
   */
  public getCorrelationId(): string | undefined {
    return this.correlationId;
  }

  /**
   * Log debug message
   */
  public debug(message: string, metadata?: Record<string, unknown>): void {
    this.log('debug', message, undefined, metadata);
  }

  /**
   * Log info message
   */
  public info(message: string, metadata?: Record<string, unknown>): void {
    this.log('info', message, undefined, metadata);
  }

  /**
   * Log warning message
   */
  public warn(message: string, metadata?: Record<string, unknown>): void {
    this.log('warn', message, undefined, metadata);
  }

  /**
   * Log error message with optional Error object
   */
  public error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    this.log('error', message, error, metadata);
  }

  /**
   * Core logging method
   */
  private async log(
    level: LogLevel, 
    message: string, 
    error?: Error, 
    metadata?: Record<string, unknown>
  ): Promise<void> {
    // Check if log level should be output
    if (!this.shouldLog(level)) {
      return;
    }

    // Create log entry
    const logEntry: ApplicationLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId: this.correlationId,
      service: this.config.service,
      version: this.config.version,
      environment: this.config.environment,
      type: 'application',
      metadata: metadata || {},
    };

    // Add error context if provided
    if (error) {
      logEntry.error = this.formatError(error);
    }

    // Output to console if enabled
    if (this.config.console) {
      this.outputToConsole(logEntry);
    }

    // Output to file if enabled
    if (this.config.file) {
      await this.outputToFile(logEntry);
    }
  }

  /**
   * Check if log level should be output based on configuration
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITIES[level] >= LOG_LEVEL_PRIORITIES[this.config.level];
  }

  /**
   * Format error object for logging
   */
  private formatError(error: Error): ErrorContext {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
      ...(error as any).code && { code: (error as any).code },
    };
  }

  /**
   * Output log entry to console with appropriate colors
   */
  private outputToConsole(logEntry: ApplicationLogEntry): void {
    const { level, message, timestamp, correlationId } = logEntry;
    
    // Color codes for different log levels
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m', // Red
    };
    const reset = '\x1b[0m';
    
    const prefix = `${colors[level]}[${level.toUpperCase()}]${reset}`;
    const timeStr = new Date(timestamp).toLocaleTimeString();
    const corrStr = correlationId ? ` [${correlationId}]` : '';
    
    if (this.config.format === 'json') {
      console.log(JSON.stringify(logEntry, null, 2));
    } else {
      console.log(`${timeStr} ${prefix}${corrStr} ${message}`);
      
      // Print additional data if available
      if (logEntry.metadata && Object.keys(logEntry.metadata).length > 0) {
        console.log('  Metadata:', logEntry.metadata);
      }
      
      if (logEntry.error) {
        console.log('  Error:', logEntry.error);
      }
    }
  }

  /**
   * Output log entry to file
   */
  private async outputToFile(logEntry: ApplicationLogEntry): Promise<void> {
    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      
      // Ensure directory exists
      if (this.config.filePath) {
        await this.ensureDirectoryExists(dirname(this.config.filePath));
        
        // Append to log file
        await fs.appendFile(this.config.filePath, logLine, 'utf8');
      }
    } catch (error) {
      // Fallback to console if file logging fails
      console.error('Failed to write to log file:', error);
      console.log('Log entry that failed to write:', logEntry);
    }
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
   * Update logger configuration
   */
  public updateConfig(config: Partial<LogConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): LogConfig {
    return { ...this.config };
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Create a logger with custom configuration
 */
export function createLogger(config: Partial<LogConfig>): Logger {
  return new Logger(config);
}

/**
 * Generate correlation ID for request tracking
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parse log file size string to bytes
 */
export function parseSize(sizeStr: string): number {
  const units: Record<string, number> = {
    'B': 1,
    'KB': 1024,
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024,
  };
  
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/i);
  if (!match) {
    throw new Error(`Invalid size format: ${sizeStr}`);
  }
  
  const [, size, unit] = match;
  return Math.round(parseFloat(size) * units[unit.toUpperCase()]);
}

/**
 * Format file size to human readable string
 */
export function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}