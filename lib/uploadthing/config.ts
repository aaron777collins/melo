/**
 * UploadThing configuration and settings
 * Centralized configuration for file upload functionality
 */

import { UploadConfig } from './client';

/**
 * Environment-based UploadThing configuration
 */
export const uploadthingConfig = {
  // API endpoints
  endpoint: '/api/uploadthing',
  
  // Rate limiting
  rateLimiting: {
    maxUploadsPerMinute: 10,
    maxUploadsPerHour: 100,
    cooldownPeriod: 60000 // 1 minute in milliseconds
  },
  
  // File size limits
  fileLimits: {
    messageFile: {
      maxFileSize: 4 * 1024 * 1024, // 4MB per file
      maxFileCount: 5,
      maxTotalSize: 20 * 1024 * 1024 // 20MB total
    },
    serverImage: {
      maxFileSize: 4 * 1024 * 1024, // 4MB
      maxFileCount: 1,
      maxTotalSize: 4 * 1024 * 1024 // 4MB
    }
  },
  
  // Security settings
  security: {
    enableValidation: true,
    enableVirusScan: false, // Future feature
    enableContentModeration: false, // Future feature
    allowedOrigins: process.env.NODE_ENV === 'production' 
      ? [process.env.NEXT_PUBLIC_SITE_URL] 
      : ['http://localhost:3000'],
  }
} as const;

/**
 * Client configuration for different upload types
 */
export const messageFileConfig: UploadConfig = {
  allowedFileTypes: [
    // Images
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    
    // Documents
    'application/pdf',
    'text/plain',
    
    // Audio
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    
    // Video
    'video/mp4',
    'video/webm',
    'video/ogg'
  ],
  maxFileSize: uploadthingConfig.fileLimits.messageFile.maxFileSize,
  enableValidation: uploadthingConfig.security.enableValidation
};

export const serverImageConfig: UploadConfig = {
  allowedFileTypes: [
    'image/jpeg',
    'image/jpg',
    'image/png', 
    'image/gif',
    'image/webp'
  ],
  maxFileSize: uploadthingConfig.fileLimits.serverImage.maxFileSize,
  enableValidation: uploadthingConfig.security.enableValidation
};

/**
 * Check if UploadThing is properly configured
 */
export function isUploadthingConfigured(): boolean {
  return !!(
    process.env.UPLOADTHING_SECRET && 
    process.env.UPLOADTHING_APP_ID
  );
}

/**
 * Get UploadThing configuration status for debugging
 */
export function getUploadthingStatus() {
  return {
    configured: isUploadthingConfigured(),
    hasSecret: !!process.env.UPLOADTHING_SECRET,
    hasAppId: !!process.env.UPLOADTHING_APP_ID,
    environment: process.env.NODE_ENV,
    endpoint: uploadthingConfig.endpoint
  };
}

/**
 * Validate environment variables
 */
export function validateUploadthingEnvironment(): string[] {
  const errors: string[] = [];
  
  if (!process.env.UPLOADTHING_SECRET) {
    errors.push('UPLOADTHING_SECRET environment variable is required');
  }
  
  if (!process.env.UPLOADTHING_APP_ID) {
    errors.push('UPLOADTHING_APP_ID environment variable is required');
  }
  
  return errors;
}

/**
 * Default upload configurations by type
 */
export const uploadConfigs = {
  messageFile: messageFileConfig,
  serverImage: serverImageConfig
} as const;

export type UploadType = keyof typeof uploadConfigs;