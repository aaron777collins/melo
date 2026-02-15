/**
 * Matrix Media Upload/Download Utilities
 * 
 * Handles file uploads to the Matrix homeserver media repository.
 * Files are stored on your server and accessible via mxc:// URLs.
 * 
 * Security:
 * - Files require valid access token to upload
 * - Downloads can be restricted by room membership
 * - Server validates file types and sizes
 * - Files stored locally on your homeserver
 */

// =============================================================================
// Types
// =============================================================================

export interface MediaUploadResult {
  /** Matrix content URI (mxc://server/mediaId) */
  contentUri: string;
  /** Original filename */
  filename: string;
  /** MIME type */
  mimeType: string;
  /** File size in bytes */
  size: number;
}

export interface MediaUploadError {
  code: string;
  message: string;
  httpStatus?: number;
}

export interface ThumbnailOptions {
  width: number;
  height: number;
  method?: 'crop' | 'scale';
}

// =============================================================================
// MXC URL Utilities
// =============================================================================

/**
 * Parse an mxc:// URL into server and media ID components
 */
export function parseMxcUrl(mxcUrl: string): { serverName: string; mediaId: string } | null {
  if (!mxcUrl || !mxcUrl.startsWith('mxc://')) {
    return null;
  }
  
  const match = mxcUrl.match(/^mxc:\/\/([^/]+)\/(.+)$/);
  if (!match) {
    return null;
  }
  
  return {
    serverName: match[1],
    mediaId: match[2]
  };
}

/**
 * Convert mxc:// URL to HTTP download URL
 */
export function mxcToHttpUrl(
  mxcUrl: string | null | undefined,
  homeserverUrl: string
): string | null {
  if (!mxcUrl) return null;
  
  const parsed = parseMxcUrl(mxcUrl);
  if (!parsed) return mxcUrl; // Return as-is if not mxc://
  
  const baseUrl = homeserverUrl.replace(/\/+$/, '');
  return `${baseUrl}/_matrix/media/v3/download/${parsed.serverName}/${parsed.mediaId}`;
}

/**
 * Convert mxc:// URL to HTTP thumbnail URL
 */
export function mxcToThumbnailUrl(
  mxcUrl: string | null | undefined,
  homeserverUrl: string,
  options: ThumbnailOptions
): string | null {
  if (!mxcUrl) return null;
  
  const parsed = parseMxcUrl(mxcUrl);
  if (!parsed) return mxcUrl;
  
  const baseUrl = homeserverUrl.replace(/\/+$/, '');
  const method = options.method || 'crop';
  
  return `${baseUrl}/_matrix/media/v3/thumbnail/${parsed.serverName}/${parsed.mediaId}?width=${options.width}&height=${options.height}&method=${method}`;
}

// =============================================================================
// Upload Functions
// =============================================================================

/**
 * Upload a file to the Matrix media repository
 * 
 * @param file - File to upload
 * @param accessToken - Matrix access token
 * @param homeserverUrl - Homeserver base URL
 * @returns Upload result with mxc:// URL
 */
export async function uploadMedia(
  file: File,
  accessToken: string,
  homeserverUrl: string
): Promise<MediaUploadResult> {
  const baseUrl = homeserverUrl.replace(/\/+$/, '');
  const uploadUrl = `${baseUrl}/_matrix/media/v3/upload?filename=${encodeURIComponent(file.name)}`;
  
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ errcode: 'M_UNKNOWN', error: 'Upload failed' }));
    throw {
      code: error.errcode || 'M_UNKNOWN',
      message: error.error || 'Upload failed',
      httpStatus: response.status,
    } as MediaUploadError;
  }
  
  const result = await response.json();
  
  return {
    contentUri: result.content_uri,
    filename: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
  };
}

/**
 * Upload a blob/buffer to the Matrix media repository
 */
export async function uploadBlob(
  blob: Blob,
  filename: string,
  accessToken: string,
  homeserverUrl: string
): Promise<MediaUploadResult> {
  const file = new File([blob], filename, { type: blob.type });
  return uploadMedia(file, accessToken, homeserverUrl);
}

// =============================================================================
// Download Functions  
// =============================================================================

/**
 * Get the download URL for a media item
 * This doesn't download the file, just returns the URL
 */
export function getMediaDownloadUrl(
  mxcUrl: string,
  homeserverUrl: string,
  filename?: string
): string | null {
  const parsed = parseMxcUrl(mxcUrl);
  if (!parsed) return null;
  
  const baseUrl = homeserverUrl.replace(/\/+$/, '');
  let url = `${baseUrl}/_matrix/media/v3/download/${parsed.serverName}/${parsed.mediaId}`;
  
  if (filename) {
    url += `/${encodeURIComponent(filename)}`;
  }
  
  return url;
}

/**
 * Get thumbnail URL for an image
 */
export function getMediaThumbnailUrl(
  mxcUrl: string,
  homeserverUrl: string,
  width: number,
  height: number,
  method: 'crop' | 'scale' = 'crop'
): string | null {
  return mxcToThumbnailUrl(mxcUrl, homeserverUrl, { width, height, method });
}

// =============================================================================
// Validation
// =============================================================================

/** Maximum file size for uploads (matches Synapse default) */
export const MAX_UPLOAD_SIZE = 100 * 1024 * 1024; // 100MB

/** Allowed image types for avatars/icons */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp',
];

/** Allowed file types for general uploads */
export const ALLOWED_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  'application/pdf',
  'text/plain',
  'application/json',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
];

/**
 * Validate a file before upload
 */
export function validateFile(
  file: File,
  options: {
    maxSize?: number;
    allowedTypes?: string[];
  } = {}
): { valid: boolean; error?: string } {
  const maxSize = options.maxSize || MAX_UPLOAD_SIZE;
  const allowedTypes = options.allowedTypes || ALLOWED_FILE_TYPES;
  
  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / 1024 / 1024);
    return { valid: false, error: `File too large. Maximum size is ${maxMB}MB.` };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type not allowed: ${file.type}` };
  }
  
  return { valid: true };
}

/**
 * Validate an image file for avatar/icon use
 */
export function validateImageFile(file: File, maxSize: number = 4 * 1024 * 1024): { valid: boolean; error?: string } {
  return validateFile(file, {
    maxSize,
    allowedTypes: ALLOWED_IMAGE_TYPES,
  });
}
