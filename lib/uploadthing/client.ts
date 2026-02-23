/**
 * UploadThing client wrapper with enhanced security and validation
 * Provides a type-safe, validated interface for file uploads
 */

import { uploadFiles } from 'uploadthing/client';
import { 
  validateFiles, 
  FileValidationError, 
  DEFAULT_ALLOWED_TYPES, 
  DEFAULT_MAX_FILE_SIZE,
  ValidationConfig,
  isImageFile
} from './file-validation';

// Re-export validation error for convenience
export { FileValidationError } from './file-validation';

/**
 * Configuration options for the UploadThing client
 */
export interface UploadConfig {
  allowedFileTypes?: string[];
  maxFileSize?: number;
  enableValidation?: boolean;
}

/**
 * Upload progress callback type
 */
export interface UploadProgress {
  file: string;
  progress: number;
}

/**
 * Upload options for individual upload operations
 */
export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
}

/**
 * Upload result interface
 */
export interface UploadResult {
  name: string;
  size: number;
  key: string;
  url: string;
}

/**
 * UploadThing client wrapper class
 */
export class UploadthingClient {
  private config: Required<UploadConfig>;
  
  constructor(config: UploadConfig = {}) {
    this.config = {
      allowedFileTypes: config.allowedFileTypes || DEFAULT_ALLOWED_TYPES,
      maxFileSize: config.maxFileSize || DEFAULT_MAX_FILE_SIZE,
      enableValidation: config.enableValidation !== false // Default to true
    };
  }
  
  /**
   * Upload files for message attachments
   */
  async uploadMessageFiles(files: File[], options: UploadOptions = {}): Promise<UploadResult[]> {
    // Validate files if enabled
    if (this.config.enableValidation) {
      validateFiles(files, {
        allowedTypes: this.config.allowedFileTypes,
        maxFileSize: this.config.maxFileSize,
        maxFileCount: 5, // Limit message attachments
        maxTotalSize: 20 * 1024 * 1024 // 20MB total
      });
    }
    
    try {
      const results = await uploadFiles('messageFile', {
        files,
        onUploadProgress: options.onProgress || (() => {})
      });
      
      return results.map(result => ({
        name: result.name,
        size: result.size,
        key: result.key,
        url: result.url
      }));
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Upload failed: ${error.message}`);
      }
      throw new Error('Upload failed: Unknown error');
    }
  }
  
  /**
   * Upload server icon image
   */
  async uploadServerImage(file: File, options: UploadOptions = {}): Promise<UploadResult> {
    // Server image upload requires exactly one file
    if (Array.isArray(file)) {
      throw new FileValidationError('Server image upload requires exactly one file');
    }
    
    const files = [file];
    
    // Validate files if enabled
    if (this.config.enableValidation) {
      validateFiles(files, {
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'], // Only images for server icons
        maxFileSize: this.config.maxFileSize,
        maxFileCount: 1
      });
      
      // Additional validation for server images
      if (!isImageFile(file)) {
        throw new FileValidationError('Server image must be an image file');
      }
    }
    
    try {
      const results = await uploadFiles('serverImage', {
        files,
        onUploadProgress: options.onProgress
      });
      
      if (results.length !== 1) {
        throw new Error('Expected exactly one upload result for server image');
      }
      
      return {
        name: results[0].name,
        size: results[0].size,
        key: results[0].key,
        url: results[0].url
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Server image upload failed: ${error.message}`);
      }
      throw new Error('Server image upload failed: Unknown error');
    }
  }
}

/**
 * Factory function to create UploadThing client
 */
export function createUploadthingClient(config: UploadConfig = {}): UploadthingClient {
  return new UploadthingClient(config);
}

/**
 * Default client instance with standard configuration
 */
export const defaultUploadClient = createUploadthingClient({
  allowedFileTypes: DEFAULT_ALLOWED_TYPES,
  maxFileSize: DEFAULT_MAX_FILE_SIZE,
  enableValidation: true
});

/**
 * Utility function to get file type category
 */
export function getFileCategory(file: File): 'image' | 'video' | 'audio' | 'document' | 'other' {
  const type = file.type.toLowerCase();
  
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  if (type.includes('pdf') || 
      type.includes('document') || 
      type.includes('spreadsheet') || 
      type.includes('presentation') ||
      type === 'text/plain') return 'document';
  
  return 'other';
}

/**
 * Utility function to generate preview for uploaded files
 */
export function generateFilePreview(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    // Only generate previews for images
    if (!isImageFile(file)) {
      resolve(null);
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as string || null);
    };
    reader.onerror = () => {
      resolve(null);
    };
    reader.readAsDataURL(file);
  });
}