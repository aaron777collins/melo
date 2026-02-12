/**
 * Matrix Media Types
 * 
 * TypeScript types for Matrix media handling, mxc:// URLs, uploads,
 * and media metadata. Provides strong typing for all media operations.
 */

// =============================================================================
// Core URL Types (Branded Types for Type Safety)
// =============================================================================

/**
 * Brand symbol for MXC URLs to ensure type safety
 */
declare const MXC_URL_BRAND: unique symbol;

/**
 * Type-safe MXC URL string (mxc://server/media-id format)
 * 
 * Branded string type prevents accidental mixing of MXC URLs with regular strings.
 * Use `createMxcUrl()` to create instances safely.
 * 
 * @example "mxc://matrix.org/GCmhgzMPRjqgpODLsNQzVuHZ"
 */
export type MxcUrl = string & { readonly [MXC_URL_BRAND]: true };

/**
 * Create a type-safe MXC URL after validation
 * @param url - String to validate and convert
 * @returns MXC URL if valid, null if invalid
 * 
 * @example
 * const avatarUrl = createMxcUrl("mxc://matrix.org/abc123");
 * if (avatarUrl) {
 *   // TypeScript knows this is a valid MXC URL
 *   const httpUrl = mxcToHttpUrl(avatarUrl, homeserverUrl);
 * }
 */
export function createMxcUrl(url: string): MxcUrl | null {
  if (!url || !isMxcUrl(url)) {
    return null;
  }
  return url as MxcUrl;
}

/**
 * Type guard to check if string is a valid MXC URL
 * @param url - String to check
 * @returns True if valid MXC URL format
 */
export function isMxcUrl(url: string): url is MxcUrl {
  return typeof url === 'string' && /^mxc:\/\/[^/]+\/[^/]+$/.test(url);
}

/**
 * Parse MXC URL into components
 * @param mxcUrl - MXC URL to parse
 * @returns Server and media ID components
 */
export function parseMxcUrl(mxcUrl: MxcUrl): { serverName: string; mediaId: string } | null {
  const match = mxcUrl.match(/^mxc:\/\/([^/]+)\/(.+)$/);
  if (!match) return null;
  
  return {
    serverName: match[1],
    mediaId: match[2]
  };
}

// =============================================================================
// Media Info Types
// =============================================================================

/**
 * Core media information for uploaded files
 */
export interface MediaInfo {
  /** MIME type of the media (e.g., "image/jpeg", "video/mp4") */
  mimetype: string;
  /** File size in bytes */
  size: number;
  /** Original filename (if provided during upload) */
  filename?: string;
  /** Image/video width in pixels (if applicable) */
  width?: number;
  /** Image/video height in pixels (if applicable) */
  height?: number;
  /** Video/audio duration in milliseconds (if applicable) */
  duration?: number;
  /** Additional metadata specific to media type */
  metadata?: MediaMetadata;
}

/**
 * Extended metadata for specific media types
 */
export interface MediaMetadata {
  /** Image EXIF data if available */
  exif?: Record<string, unknown>;
  /** Video codec information */
  videoCodec?: string;
  /** Audio codec information */
  audioCodec?: string;
  /** Video frame rate */
  framerate?: number;
  /** Audio sample rate */
  sampleRate?: number;
  /** Audio bit depth */
  bitDepth?: number;
  /** Image orientation (EXIF orientation value) */
  orientation?: number;
}

/**
 * Thumbnail information for media files
 */
export interface ThumbnailInfo {
  /** MXC URL of the thumbnail */
  thumbnailUrl: MxcUrl;
  /** Thumbnail MIME type (usually "image/jpeg" or "image/png") */
  thumbnailMimetype: string;
  /** Thumbnail file size in bytes */
  thumbnailSize: number;
  /** Thumbnail width in pixels */
  thumbnailWidth: number;
  /** Thumbnail height in pixels */
  thumbnailHeight: number;
}

/**
 * Complete media object with content and optional thumbnail
 */
export interface MatrixMedia {
  /** MXC URL of the media content */
  url: MxcUrl;
  /** Media information */
  info: MediaInfo;
  /** Thumbnail information if available */
  thumbnailInfo?: ThumbnailInfo;
  /** Whether this media is encrypted */
  encrypted?: boolean;
  /** Encryption info if encrypted */
  encryptionInfo?: MediaEncryptionInfo;
}

/**
 * Encryption information for encrypted media
 */
export interface MediaEncryptionInfo {
  /** Algorithm used (e.g., "A256CTR") */
  algorithm: string;
  /** Base64-encoded initialization vector */
  iv: string;
  /** Key information */
  key: {
    /** Key algorithm */
    alg: string;
    /** Whether key is extractable */
    ext: boolean;
    /** Key type */
    kty: string;
    /** Key operations allowed */
    key_ops: string[];
    /** Base64url-encoded key material */
    k: string;
  };
  /** SHA256 hash of ciphertext */
  hashes: {
    sha256: string;
  };
  /** Version (should be "v1") */
  v: string;
}

// =============================================================================
// Upload Progress Types
// =============================================================================

/**
 * Upload state during media upload process
 */
export type UploadState = 
  | 'pending'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Upload progress information for media files
 */
export interface UploadProgress {
  /** Unique identifier for this upload */
  uploadId: string;
  /** Current upload state */
  state: UploadState;
  /** Bytes uploaded so far */
  bytesUploaded: number;
  /** Total file size in bytes */
  totalBytes: number;
  /** Upload progress as percentage (0-100) */
  progress: number;
  /** Upload speed in bytes per second (if available) */
  uploadSpeed?: number;
  /** Estimated time remaining in milliseconds (if available) */
  estimatedTimeRemaining?: number;
  /** Error information if upload failed */
  error?: UploadError;
  /** Timestamp when upload started (ISO 8601) */
  startedAt: string;
  /** Timestamp when upload completed/failed (ISO 8601) */
  completedAt?: string;
  /** MXC URL of uploaded media (available when completed) */
  mxcUrl?: MxcUrl;
  /** Media info of uploaded file (available when completed) */
  mediaInfo?: MediaInfo;
}

/**
 * Upload error details
 */
export interface UploadError {
  /** Error code (Matrix error codes or custom) */
  code: string;
  /** Human-readable error message */
  message: string;
  /** HTTP status code if applicable */
  httpStatus?: number;
  /** Whether upload can be retried */
  retryable: boolean;
  /** Additional error details */
  details?: Record<string, unknown>;
}

// =============================================================================
// Media Type Categories
// =============================================================================

/**
 * Supported media type categories
 */
export type MediaCategory = 'image' | 'video' | 'audio' | 'file';

/**
 * Get media category from MIME type
 * @param mimetype - MIME type to categorize
 * @returns Media category
 */
export function getMediaCategory(mimetype: string): MediaCategory {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'file';
}

/**
 * Check if media type supports thumbnails
 * @param mimetype - MIME type to check
 * @returns True if thumbnails are supported
 */
export function supportsThumbnails(mimetype: string): boolean {
  const category = getMediaCategory(mimetype);
  return category === 'image' || category === 'video';
}

/**
 * Common image MIME types
 */
export const IMAGE_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp'
] as const;

/**
 * Common video MIME types
 */
export const VIDEO_MIMETYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/avi',
  'video/mov',
  'video/wmv',
  'video/flv'
] as const;

/**
 * Common audio MIME types
 */
export const AUDIO_MIMETYPES = [
  'audio/mp3',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/flac',
  'audio/aac',
  'audio/webm'
] as const;

// =============================================================================
// HTTP URL Conversion
// =============================================================================

/**
 * Convert MXC URL to HTTP URL for downloading
 * @param mxcUrl - MXC URL to convert
 * @param homeserverUrl - Homeserver base URL
 * @returns HTTP download URL
 */
export function mxcToHttpUrl(mxcUrl: MxcUrl, homeserverUrl: string): string {
  const parsed = parseMxcUrl(mxcUrl);
  if (!parsed) {
    throw new Error('Invalid MXC URL format');
  }

  const baseUrl = homeserverUrl.replace(/\/$/, '');
  return `${baseUrl}/_matrix/media/v3/download/${parsed.serverName}/${parsed.mediaId}`;
}

/**
 * Convert MXC URL to HTTP thumbnail URL
 * @param mxcUrl - MXC URL to convert
 * @param homeserverUrl - Homeserver base URL
 * @param width - Thumbnail width
 * @param height - Thumbnail height
 * @param method - Resize method ('crop' or 'scale')
 * @returns HTTP thumbnail URL
 */
export function mxcToThumbnailUrl(
  mxcUrl: MxcUrl,
  homeserverUrl: string,
  width: number,
  height: number,
  method: 'crop' | 'scale' = 'crop'
): string {
  const parsed = parseMxcUrl(mxcUrl);
  if (!parsed) {
    throw new Error('Invalid MXC URL format');
  }

  const baseUrl = homeserverUrl.replace(/\/$/, '');
  return `${baseUrl}/_matrix/media/v3/thumbnail/${parsed.serverName}/${parsed.mediaId}?width=${width}&height=${height}&method=${method}`;
}

// =============================================================================
// File Size Utilities
// =============================================================================

/**
 * Format file size in human-readable format
 * @param bytes - Size in bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted size string (e.g., "1.23 MB")
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Calculate upload progress percentage
 * @param bytesUploaded - Bytes uploaded so far
 * @param totalBytes - Total file size
 * @returns Progress percentage (0-100)
 */
export function calculateUploadProgress(bytesUploaded: number, totalBytes: number): number {
  if (totalBytes <= 0) return 0;
  return Math.min(100, Math.max(0, (bytesUploaded / totalBytes) * 100));
}

/**
 * Estimate remaining upload time
 * @param bytesUploaded - Bytes uploaded so far
 * @param totalBytes - Total file size
 * @param uploadSpeed - Upload speed in bytes per second
 * @returns Estimated remaining time in milliseconds
 */
export function estimateRemainingTime(
  bytesUploaded: number,
  totalBytes: number,
  uploadSpeed: number
): number {
  if (uploadSpeed <= 0 || bytesUploaded >= totalBytes) return 0;
  
  const remainingBytes = totalBytes - bytesUploaded;
  return (remainingBytes / uploadSpeed) * 1000;
}

// =============================================================================
// Type Guards and Validation
// =============================================================================

/**
 * Type guard to check if upload is in progress
 */
export function isUploadInProgress(progress: UploadProgress): boolean {
  return progress.state === 'uploading' || progress.state === 'processing';
}

/**
 * Type guard to check if upload completed successfully
 */
export function isUploadCompleted(progress: UploadProgress): boolean {
  return progress.state === 'completed' && progress.mxcUrl !== undefined;
}

/**
 * Type guard to check if upload failed
 */
export function isUploadFailed(progress: UploadProgress): boolean {
  return progress.state === 'failed';
}

/**
 * Validate media info object
 * @param mediaInfo - Media info to validate
 * @returns True if valid
 */
export function isValidMediaInfo(mediaInfo: unknown): mediaInfo is MediaInfo {
  return (
    typeof mediaInfo === 'object' &&
    mediaInfo !== null &&
    typeof (mediaInfo as MediaInfo).mimetype === 'string' &&
    typeof (mediaInfo as MediaInfo).size === 'number' &&
    (mediaInfo as MediaInfo).size >= 0
  );
}