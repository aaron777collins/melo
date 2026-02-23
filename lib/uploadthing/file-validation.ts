/**
 * File validation utilities for UploadThing
 * Provides security-focused file validation with comprehensive checks
 */

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileValidationError';
  }
}

// Default allowed file types (security-first approach)
export const DEFAULT_ALLOWED_TYPES = [
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  
  // Text files
  'text/plain',
  'text/csv',
  'text/markdown',
  
  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  
  // Video  
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/avi',
  'video/quicktime',
  
  // Archives (limited)
  'application/zip',
  'application/x-rar-compressed'
];

// Default maximum file size (4MB)
export const DEFAULT_MAX_FILE_SIZE = 4 * 1024 * 1024;

// Default maximum total upload size (20MB)  
export const DEFAULT_MAX_TOTAL_SIZE = 20 * 1024 * 1024;

// Dangerous file extensions to reject
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.scr', '.pif',
  '.js', '.vbs', '.vba', '.vbe', '.jse', '.wsh', '.wsf', '.wsc',
  '.ps1', '.ps1xml', '.ps2', '.ps2xml', '.psc1', '.psc2',
  '.msh', '.msh1', '.msh2', '.mshxml', '.msh1xml', '.msh2xml',
  '.scf', '.lnk', '.inf', '.reg', '.doc', '.xls', '.ppt',
  '.docm', '.dotm', '.xlsm', '.xltm', '.xlam', '.pptm', '.potm', '.ppam', '.ppsm', '.sldm',
  '.php', '.asp', '.aspx', '.jsp', '.cgi', '.pl', '.py', '.rb', '.sh'
];

// Dangerous full filenames (not just extensions)
const DANGEROUS_FILENAMES = [
  '.htaccess', '.htpasswd', 'web.config', 'robots.txt'
];

/**
 * Validates file type against allowed types list
 */
export function validateFileType(file: File, allowedTypes: string[] = DEFAULT_ALLOWED_TYPES): void {
  const fileType = file.type.toLowerCase();
  const normalizedAllowedTypes = allowedTypes.map(type => type.toLowerCase());
  
  if (!fileType || !normalizedAllowedTypes.includes(fileType)) {
    throw new FileValidationError(`File type not allowed: ${fileType}`);
  }
}

/**
 * Validates file size against maximum limit
 */
export function validateFileSize(file: File, maxSize: number = DEFAULT_MAX_FILE_SIZE): void {
  if (file.size > maxSize) {
    const fileSizeKB = (file.size / 1024).toFixed(1);
    const maxSizeKB = (maxSize / 1024).toFixed(1);
    
    throw new FileValidationError(
      `File size exceeds limit: ${fileSizeKB} KB > ${maxSizeKB} KB`
    );
  }
}

/**
 * Validates file name for security issues
 */
export function validateFileName(file: File): void {
  const fileName = file.name.trim();
  
  // Check for empty name
  if (!fileName) {
    throw new FileValidationError('File name cannot be empty');
  }
  
  // Check for dangerous extensions and filenames first
  const lowerFileName = fileName.toLowerCase();
  
  // Check dangerous extensions
  for (const ext of DANGEROUS_EXTENSIONS) {
    if (lowerFileName.endsWith(ext)) {
      throw new FileValidationError('File name not allowed');
    }
  }
  
  // Check dangerous full filenames
  for (const dangerousName of DANGEROUS_FILENAMES) {
    if (lowerFileName === dangerousName.toLowerCase()) {
      throw new FileValidationError('File name not allowed');
    }
  }
  
  // Check for path traversal
  if (fileName.includes('../') || fileName.includes('..\\') || fileName.includes('/') || fileName.includes('\\')) {
    throw new FileValidationError('File name contains invalid characters');
  }
  
  // Check for excessively long names
  if (fileName.length > 255) {
    throw new FileValidationError('File name too long');
  }
}

/**
 * Configuration interface for file validation
 */
export interface ValidationConfig {
  allowedTypes?: string[];
  maxFileSize?: number;
  maxFileCount?: number;
  maxTotalSize?: number;
}

/**
 * Validates multiple files at once
 */
export function validateFiles(files: File[], config: ValidationConfig = {}): void {
  const {
    allowedTypes = DEFAULT_ALLOWED_TYPES,
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    maxFileCount = 10,
    maxTotalSize = DEFAULT_MAX_TOTAL_SIZE
  } = config;
  
  // Check if files provided
  if (!files || files.length === 0) {
    throw new FileValidationError('No files provided');
  }
  
  // Check file count
  if (files.length > maxFileCount) {
    throw new FileValidationError(`Too many files. Maximum allowed: ${maxFileCount}`);
  }
  
  // Calculate total size if specified
  let totalSize = 0;
  if (maxTotalSize) {
    totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > maxTotalSize) {
      const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1);
      const maxTotalSizeMB = (maxTotalSize / (1024 * 1024)).toFixed(1);
      
      throw new FileValidationError(
        `Total file size exceeds limit: ${totalSizeMB} MB > ${maxTotalSizeMB} MB`
      );
    }
  }
  
  // Validate each file individually
  for (const file of files) {
    validateFileName(file);
    validateFileType(file, allowedTypes);
    validateFileSize(file, maxFileSize);
  }
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Check if file type is image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Check if file type is video
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}

/**
 * Check if file type is audio
 */
export function isAudioFile(file: File): boolean {
  return file.type.startsWith('audio/');
}