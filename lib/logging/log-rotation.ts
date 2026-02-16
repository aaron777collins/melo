/**
 * Log Rotation and File Management Utilities
 * Handles log file rotation, cleanup, and disk space management
 */

import { promises as fs } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { 
  LogRotationConfig, 
  LogFileMetadata, 
  LogStats, 
  LogQueryFilters, 
  LogEntry,
  ILogFileManager 
} from './types';
import { parseSize, formatSize } from './logger';

/**
 * Default rotation configuration
 */
const DEFAULT_ROTATION_CONFIG: LogRotationConfig = {
  maxFiles: 5,
  maxSize: '10MB',
  datePattern: 'YYYY-MM-DD',
  compress: false,
};

/**
 * Log file manager implementation
 */
export class LogFileManager implements ILogFileManager {
  private config: LogRotationConfig;
  private logDirectory: string;

  constructor(
    logFilePath: string,
    config: Partial<LogRotationConfig> = {}
  ) {
    this.config = { ...DEFAULT_ROTATION_CONFIG, ...config };
    this.logDirectory = dirname(logFilePath);
  }

  /**
   * Rotate log files when they exceed size limit
   */
  public async rotate(): Promise<void> {
    try {
      const files = await this.getLogFiles();
      const maxSizeBytes = parseSize(this.config.maxSize);

      for (const file of files) {
        if (file.size >= maxSizeBytes) {
          await this.rotateFile(file);
        }
      }

      await this.cleanupOldFiles();
    } catch (error) {
      console.error('Log rotation failed:', error);
      throw new Error(`Log rotation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean up old log files based on retention policy
   */
  public async cleanup(): Promise<void> {
    try {
      await this.cleanupOldFiles();
    } catch (error) {
      console.error('Log cleanup failed:', error);
      throw new Error(`Log cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get metadata for all log files
   */
  public async getFiles(): Promise<LogFileMetadata[]> {
    try {
      return await this.getLogFiles();
    } catch (error) {
      console.error('Failed to get log files:', error);
      return [];
    }
  }

  /**
   * Get log statistics
   */
  public async getStats(): Promise<LogStats> {
    try {
      const files = await this.getLogFiles();
      const entries = await this.getAllLogEntries();

      const stats: LogStats = {
        totalEntries: entries.length,
        byLevel: {
          debug: 0,
          info: 0,
          warn: 0,
          error: 0,
        },
        timeRange: {
          start: new Date(),
          end: new Date(),
        },
        topPaths: [],
        topErrors: [],
      };

      if (entries.length === 0) {
        return stats;
      }

      // Count by level
      for (const entry of entries) {
        stats.byLevel[entry.level]++;
      }

      // Calculate time range
      const timestamps = entries.map(entry => new Date(entry.timestamp));
      stats.timeRange.start = new Date(Math.min(...timestamps.map(d => d.getTime())));
      stats.timeRange.end = new Date(Math.max(...timestamps.map(d => d.getTime())));

      // Top paths (for request logs)
      const pathCounts = new Map<string, { count: number; totalDuration: number }>();
      const errorCounts = new Map<string, number>();

      for (const entry of entries) {
        if (entry.type === 'request') {
          const path = entry.request.path;
          const existing = pathCounts.get(path) || { count: 0, totalDuration: 0 };
          pathCounts.set(path, {
            count: existing.count + 1,
            totalDuration: existing.totalDuration + entry.timing.duration,
          });
        }

        if (entry.error) {
          const errorMessage = entry.error.message;
          errorCounts.set(errorMessage, (errorCounts.get(errorMessage) || 0) + 1);
        }
      }

      // Sort and format top paths
      stats.topPaths = Array.from(pathCounts.entries())
        .map(([path, data]) => ({
          path,
          count: data.count,
          avgDuration: Math.round(data.totalDuration / data.count),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Sort and format top errors
      stats.topErrors = Array.from(errorCounts.entries())
        .map(([message, count]) => ({ message, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return stats;
    } catch (error) {
      console.error('Failed to get log stats:', error);
      throw new Error(`Failed to get log stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Query log entries with filters
   */
  public async query(filters: LogQueryFilters): Promise<LogEntry[]> {
    try {
      const entries = await this.getAllLogEntries();
      let filtered = entries;

      // Apply filters
      if (filters.level) {
        filtered = filtered.filter(entry => entry.level === filters.level);
      }

      if (filters.correlationId) {
        filtered = filtered.filter(entry => entry.correlationId === filters.correlationId);
      }

      if (filters.startTime) {
        filtered = filtered.filter(entry => 
          new Date(entry.timestamp) >= filters.startTime!
        );
      }

      if (filters.endTime) {
        filtered = filtered.filter(entry => 
          new Date(entry.timestamp) <= filters.endTime!
        );
      }

      if (filters.message) {
        const searchTerm = filters.message.toLowerCase();
        filtered = filtered.filter(entry => 
          entry.message.toLowerCase().includes(searchTerm)
        );
      }

      if (filters.userId) {
        filtered = filtered.filter(entry => 
          entry.type === 'request' && entry.request.userId === filters.userId
        );
      }

      if (filters.path) {
        filtered = filtered.filter(entry => 
          entry.type === 'request' && entry.request.path === filters.path
        );
      }

      if (filters.statusCode) {
        filtered = filtered.filter(entry => 
          entry.type === 'request' && entry.response?.statusCode === filters.statusCode
        );
      }

      // Sort by timestamp (newest first)
      filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply pagination
      const offset = filters.offset || 0;
      const limit = filters.limit || 100;
      
      return filtered.slice(offset, offset + limit);
    } catch (error) {
      console.error('Log query failed:', error);
      throw new Error(`Log query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all log files in directory
   */
  private async getLogFiles(): Promise<LogFileMetadata[]> {
    try {
      // Ensure directory exists
      await fs.mkdir(this.logDirectory, { recursive: true });
      
      const files = await fs.readdir(this.logDirectory);
      const logFiles: LogFileMetadata[] = [];

      for (const file of files) {
        if (file.endsWith('.log') || file.endsWith('.log.gz')) {
          const filePath = join(this.logDirectory, file);
          const stats = await fs.stat(filePath);
          
          logFiles.push({
            path: filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
          });
        }
      }

      return logFiles.sort((a, b) => b.modified.getTime() - a.modified.getTime());
    } catch (error) {
      console.error('Failed to get log files:', error);
      return [];
    }
  }

  /**
   * Rotate a specific log file
   */
  private async rotateFile(file: LogFileMetadata): Promise<void> {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const baseName = basename(file.path, extname(file.path));
    const extension = extname(file.path);
    const rotatedName = `${baseName}-${timestamp}${extension}`;
    const rotatedPath = join(dirname(file.path), rotatedName);

    try {
      await fs.rename(file.path, rotatedPath);
      
      // Compress if configured
      if (this.config.compress) {
        await this.compressFile(rotatedPath);
        await fs.unlink(rotatedPath); // Remove uncompressed file
      }
    } catch (error) {
      console.error(`Failed to rotate file ${file.path}:`, error);
      throw error;
    }
  }

  /**
   * Compress log file using gzip
   */
  private async compressFile(filePath: string): Promise<void> {
    const zlib = await import('zlib');
    const { createReadStream, createWriteStream } = await import('fs');
    const { pipeline } = await import('stream');
    const { promisify } = await import('util');
    
    const pipelineAsync = promisify(pipeline);
    const compressedPath = `${filePath}.gz`;

    try {
      await pipelineAsync(
        createReadStream(filePath),
        zlib.createGzip(),
        createWriteStream(compressedPath)
      );
    } catch (error) {
      console.error(`Failed to compress file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Clean up old log files based on retention policy
   */
  private async cleanupOldFiles(): Promise<void> {
    const files = await this.getLogFiles();
    
    if (files.length <= this.config.maxFiles) {
      return;
    }

    // Sort by modified date (oldest first)
    const sortedFiles = files.sort((a, b) => a.modified.getTime() - b.modified.getTime());
    const filesToDelete = sortedFiles.slice(0, files.length - this.config.maxFiles);

    for (const file of filesToDelete) {
      try {
        await fs.unlink(file.path);
      } catch (error) {
        console.error(`Failed to delete old log file ${file.path}:`, error);
      }
    }
  }

  /**
   * Read and parse all log entries from all files
   */
  private async getAllLogEntries(): Promise<LogEntry[]> {
    const files = await this.getLogFiles();
    const entries: LogEntry[] = [];

    for (const file of files) {
      try {
        const content = await fs.readFile(file.path, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const entry = JSON.parse(line) as LogEntry;
            entries.push(entry);
          } catch (parseError) {
            // Skip invalid JSON lines
            continue;
          }
        }
      } catch (error) {
        console.error(`Failed to read log file ${file.path}:`, error);
        continue;
      }
    }

    return entries;
  }
}

/**
 * Create log file manager with default configuration
 */
export function createLogFileManager(
  logFilePath: string,
  config: Partial<LogRotationConfig> = {}
): LogFileManager {
  return new LogFileManager(logFilePath, config);
}

/**
 * Utility function to setup automatic log rotation
 */
export function setupLogRotation(
  logFilePath: string,
  config: Partial<LogRotationConfig> = {}
): { manager: LogFileManager; cleanup: () => void } {
  const manager = new LogFileManager(logFilePath, config);
  
  // Run rotation every hour
  const interval = setInterval(async () => {
    try {
      await manager.rotate();
    } catch (error) {
      console.error('Automatic log rotation failed:', error);
    }
  }, 60 * 60 * 1000); // 1 hour

  const cleanup = () => {
    clearInterval(interval);
  };

  return { manager, cleanup };
}

/**
 * Utility function to get human readable log file size
 */
export function getLogFileSizes(files: LogFileMetadata[]): Record<string, string> {
  const sizes: Record<string, string> = {};
  
  for (const file of files) {
    sizes[basename(file.path)] = formatSize(file.size);
  }
  
  return sizes;
}