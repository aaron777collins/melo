/**
 * Matrix Media Upload Service
 * 
 * Functions for uploading files to Matrix content repository.
 * Handles file uploads, progress tracking, and thumbnail generation.
 */

import { getClient } from './client';
import { 
  type MxcUrl, 
  type UploadProgress,
  type MediaInfo,
  type UploadError,
  createMxcUrl,
  getMediaCategory,
  supportsThumbnails
} from './types/media';

// Ensure types for added duration field
declare module './types/media' {
  interface MediaInfo {
    duration?: number; // duration in seconds, added for video/audio files
  }
}

// Re-export createMxcUrl for convenience
export { createMxcUrl } from './types/media';

// =============================================================================
// Upload Configuration
// =============================================================================

/**
 * Maximum file size for uploads (100MB)
 */
export const MAX_UPLOAD_SIZE = 100 * 1024 * 1024;

/**
 * Default thumbnail dimensions
 */
export const DEFAULT_THUMBNAIL_WIDTH = 800;
export const DEFAULT_THUMBNAIL_HEIGHT = 600;

/**
 * Supported thumbnail formats (in order of preference)
 */
export const THUMBNAIL_FORMATS = ['image/jpeg', 'image/png', 'image/webp'] as const;

// =============================================================================
// Upload Options
// =============================================================================

/**
 * Options for media upload
 */
export interface UploadOptions {
  /** Upload ID for tracking (auto-generated if not provided) */
  uploadId?: string;
  /** Content type to override file.type */
  contentType?: string;
  /** Original filename to preserve */
  filename?: string;
  /** Whether to abort existing uploads for the same file */
  abortExisting?: boolean;
}

/**
 * Progress callback function signature
 * Called periodically during upload with current progress
 */
export type ProgressCallback = (progress: UploadProgress) => void;

/**
 * Options for thumbnail upload
 */
export interface ThumbnailOptions extends Omit<UploadOptions, 'filename'> {
  /** Thumbnail quality (0-1, default 0.8) */
  quality?: number;
  /** Output format (default: 'image/jpeg') */
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
}

// =============================================================================
// Active Upload Tracking
// =============================================================================

/**
 * Map of active uploads by upload ID
 */
const activeUploads = new Map<string, AbortController>();

/**
 * Generate unique upload ID
 */
function generateUploadId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Abort an active upload
 * @param uploadId - Upload ID to abort
 * @returns True if upload was aborted, false if not found
 */
export function abortUpload(uploadId: string): boolean {
  const controller = activeUploads.get(uploadId);
  if (controller) {
    controller.abort();
    activeUploads.delete(uploadId);
    return true;
  }
  return false;
}

/**
 * Get list of active upload IDs
 */
export function getActiveUploads(): string[] {
  return Array.from(activeUploads.keys());
}

// =============================================================================
// Upload Progress Utilities
// =============================================================================

/**
 * Create initial upload progress object
 */
function createInitialProgress(
  uploadId: string,
  file: File,
  state: UploadProgress['state'] = 'pending'
): UploadProgress {
  const startedAt = new Date().toISOString();
  
  return {
    uploadId,
    state,
    bytesUploaded: 0,
    totalBytes: file.size,
    progress: 0,
    startedAt,
    ...(state === 'completed' || state === 'failed' ? { completedAt: startedAt } : {})
  };
}

/**
 * Update upload progress with optional extra fields
 */
function updateProgress(
  baseProgress: UploadProgress,
  bytesUploaded: number,
  state?: UploadProgress['state'],
  extraFields?: Partial<UploadProgress>
): UploadProgress {
  const progress = Math.min(100, Math.max(0, (bytesUploaded / baseProgress.totalBytes) * 100));
  const now = new Date().toISOString();
  
  return {
    ...baseProgress,
    state: state || baseProgress.state,
    bytesUploaded,
    progress,
    ...extraFields,
    ...(state === 'completed' || state === 'failed' ? { completedAt: now } : {})
  };
}

/**
 * Create error progress object
 */
function createErrorProgress(
  baseProgress: UploadProgress,
  error: UploadError
): UploadProgress {
  return updateProgress(baseProgress, baseProgress.bytesUploaded, 'failed', {
    error,
    completedAt: new Date().toISOString()
  });
}

// =============================================================================
// Core Upload Functions
// =============================================================================

/**
 * Upload a file to the Matrix content repository
 * 
 * Uploads the file and returns a promise that resolves to the mxc:// URL.
 * Optionally calls a progress callback during upload to track progress.
 * 
 * @param file - The File object to upload
 * @param onProgress - Optional callback to receive upload progress updates
 * @param options - Optional upload configuration
 * @returns Promise resolving to MXC URL on success
 * @throws Error on upload failure or invalid parameters
 * 
 * @example
 * ```typescript
 * const file = new File(['content'], 'test.txt', { type: 'text/plain' });
 * 
 * // Basic upload
 * const mxcUrl = await uploadMedia(file);
 * 
 * // With progress tracking
 * const mxcUrl = await uploadMedia(file, (progress) => {
 *   console.log(`Upload ${progress.progress.toFixed(1)}% complete`);
 *   if (progress.state === 'failed') {
 *     console.error('Upload failed:', progress.error);
 *   }
 * });
 * ```
 */
export async function uploadMedia(
  file: File, 
  onProgress?: ProgressCallback,
  options: UploadOptions = {}
): Promise<MxcUrl> {
  // Validate inputs
  if (!file) {
    throw new Error('File is required for upload');
  }
  
  if (file.size === 0) {
    throw new Error('Cannot upload empty file');
  }
  
  if (file.size > MAX_UPLOAD_SIZE) {
    throw new Error(`File too large: ${file.size} bytes (max: ${MAX_UPLOAD_SIZE})`);
  }

  // Get Matrix client
  const client = getClient();
  if (!client) {
    throw new Error('Matrix client not initialized. Call initializeClient() first.');
  }

  // Setup upload tracking
  const uploadId = options.uploadId || generateUploadId();
  const abortController = new AbortController();
  
  // Abort existing upload if requested
  if (options.abortExisting) {
    abortUpload(uploadId);
  }
  
  // Check if upload already in progress
  if (activeUploads.has(uploadId)) {
    throw new Error(`Upload ${uploadId} already in progress`);
  }
  
  activeUploads.set(uploadId, abortController);

  // Create progress tracking
  let currentProgress = createInitialProgress(uploadId, file, 'pending');
  
  // Notify initial state
  onProgress?.(currentProgress);

  try {
    // Update to uploading state
    currentProgress = updateProgress(currentProgress, 0, 'uploading');
    onProgress?.(currentProgress);

    // Determine content type
    const contentType = options.contentType || file.type || 'application/octet-stream';
    
    // Create upload promise with progress tracking
    const uploadPromise = new Promise<string>((resolve, reject) => {
      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (abortController.signal.aborted) {
          xhr.abort();
          reject(new Error('Upload aborted'));
          return;
        }

        if (event.lengthComputable) {
          currentProgress = updateProgress(currentProgress, event.loaded, 'uploading');
          onProgress?.(currentProgress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.content_uri) {
              resolve(response.content_uri);
            } else {
              reject(new Error('Upload response missing content_uri'));
            }
          } catch (error) {
            reject(new Error('Invalid JSON response from upload'));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload request failed'));
      });

      // Get access token for authorization
      const accessToken = client.getAccessToken();
      if (!accessToken) {
        reject(new Error('No access token available'));
        return;
      }

      // Use Matrix upload endpoint
      const homeserverUrl = client.getHomeserverUrl();
      const uploadUrl = `${homeserverUrl}/_matrix/media/v3/upload`;
      
      xhr.open('POST', uploadUrl);
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      xhr.send(formData);

      // Handle abort signal
      abortController.signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new Error('Upload aborted'));
      });
    });

    // Wait for upload with abort support
    const result = await Promise.race([
      uploadPromise,
      new Promise<never>((_, reject) => {
        abortController.signal.addEventListener('abort', () => {
          reject(new Error('Upload aborted'));
        });
      })
    ]);

    // Validate MXC URL
    const mxcUrl = createMxcUrl(result);
    if (!mxcUrl) {
      throw new Error(`Invalid MXC URL returned: ${result}`);
    }

    // Create media info
    const mediaInfo: MediaInfo = {
      mimetype: contentType,
      size: file.size,
      filename: options.filename || file.name,
    };

    // Add dimensions for images
    if (file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
      try {
        const dimensions = await getImageDimensions(file);
        mediaInfo.width = dimensions.width;
        mediaInfo.height = dimensions.height;
      } catch {
        // Non-critical - continue without dimensions
      }
    }

    // Update to completed state
    currentProgress = updateProgress(currentProgress, file.size, 'completed', {
      mxcUrl,
      mediaInfo
    });
    onProgress?.(currentProgress);

    // Cleanup
    activeUploads.delete(uploadId);

    return mxcUrl;

  } catch (error) {
    // Create upload error
    const uploadError: UploadError = {
      code: error instanceof Error && error.message.includes('aborted') ? 'M_UPLOAD_ABORTED' : 'M_UPLOAD_FAILED',
      message: error instanceof Error ? error.message : 'Unknown upload error',
      retryable: error instanceof Error && !error.message.includes('aborted'),
      details: { originalError: error }
    };

    // Update to failed state
    currentProgress = updateProgress(currentProgress, currentProgress.bytesUploaded, 'failed', {
      error: uploadError
    });
    onProgress?.(currentProgress);

    // Cleanup
    activeUploads.delete(uploadId);

    // Re-throw error
    const errorToThrow = new Error(uploadError.message);
    (errorToThrow as any).cause = error;
    throw errorToThrow;
  }
}

/**
 * Upload a thumbnail for media
 * 
 * Creates a resized version of an image file and uploads it as a thumbnail.
 * Automatically generates appropriate dimensions and format for optimal display.
 * 
 * @param file - The image File object to create a thumbnail for
 * @param width - Target thumbnail width in pixels
 * @param height - Target thumbnail height in pixels
 * @param options - Optional thumbnail configuration
 * @returns Promise resolving to thumbnail MXC URL
 * @throws Error if file is not an image or upload fails
 * 
 * @example
 * ```typescript
 * const imageFile = new File([...], 'photo.jpg', { type: 'image/jpeg' });
 * 
 * // Create standard thumbnail
 * const thumbUrl = await uploadThumbnail(imageFile, 200, 150);
 * 
 * // Create high quality PNG thumbnail
 * const thumbUrl = await uploadThumbnail(imageFile, 400, 300, {
 *   quality: 1.0,
 *   format: 'image/png'
 * });
 * ```
 */
export async function uploadThumbnail(
  file: File,
  width: number,
  height: number,
  options: ThumbnailOptions = {}
): Promise<MxcUrl> {
  // Validate inputs
  if (!file) {
    throw new Error('File is required for thumbnail upload');
  }
  
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image for thumbnail generation');
  }
  
  if (width <= 0 || height <= 0) {
    throw new Error('Thumbnail dimensions must be positive numbers');
  }
  
  if (width > 2048 || height > 2048) {
    throw new Error('Thumbnail dimensions too large (max: 2048x2048)');
  }

  // Create thumbnail file
  const thumbnailFile = await createThumbnail(file, width, height, {
    quality: options.quality ?? 0.8,
    format: options.format ?? 'image/jpeg'
  });

  // Upload thumbnail using regular upload function
  return uploadMedia(thumbnailFile, undefined, {
    uploadId: options.uploadId,
    contentType: options.contentType || thumbnailFile.type,
    filename: generateThumbnailFilename(file.name, width, height, options.format),
    abortExisting: options.abortExisting
  });
}

// =============================================================================
// Thumbnail Generation Utilities
// =============================================================================

/**
 * Create a thumbnail from an image file
 */
async function createThumbnail(
  file: File,
  width: number,
  height: number,
  options: { quality: number; format: string }
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        // Create canvas for resizing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not create canvas context'));
          return;
        }

        // Calculate aspect-preserving dimensions
        const { newWidth, newHeight } = calculateThumbnailDimensions(
          img.width,
          img.height,
          width,
          height
        );

        canvas.width = newWidth;
        canvas.height = newHeight;

        // Draw resized image
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create thumbnail blob'));
              return;
            }

            // Create file from blob
            const filename = generateThumbnailFilename(file.name, width, height, options.format);
            const thumbnailFile = new File([blob], filename, {
              type: options.format,
              lastModified: Date.now()
            });

            resolve(thumbnailFile);
          },
          options.format,
          options.quality
        );

      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for thumbnail generation'));
    };

    // Load image
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculate thumbnail dimensions preserving aspect ratio
 */
function calculateThumbnailDimensions(
  originalWidth: number,
  originalHeight: number,
  targetWidth: number,
  targetHeight: number
): { newWidth: number; newHeight: number } {
  const aspectRatio = originalWidth / originalHeight;
  const targetAspectRatio = targetWidth / targetHeight;

  let newWidth: number;
  let newHeight: number;

  if (aspectRatio > targetAspectRatio) {
    // Image is wider - limit by width
    newWidth = targetWidth;
    newHeight = Math.round(targetWidth / aspectRatio);
  } else {
    // Image is taller - limit by height
    newHeight = targetHeight;
    newWidth = Math.round(targetHeight * aspectRatio);
  }

  return { newWidth, newHeight };
}

/**
 * Generate thumbnail filename
 */
function generateThumbnailFilename(
  originalFilename: string,
  width: number,
  height: number,
  format?: string
): string {
  const nameWithoutExt = originalFilename.replace(/\.[^/.]+$/, '');
  const ext = format === 'image/jpeg' ? '.jpg' :
              format === 'image/png' ? '.png' :
              format === 'image/webp' ? '.webp' : '.jpg';
  
  return `${nameWithoutExt}_thumb_${width}x${height}${ext}`;
}

/**
 * Get image dimensions from file
 */
async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}

// =============================================================================
// Media Information Utilities
// =============================================================================

/**
 * Extract media information from a file
 * @param file - File to analyze
 * @returns Promise resolving to MediaInfo
 */
export async function getMediaInfo(file: File): Promise<MediaInfo> {
  const info: MediaInfo = {
    mimetype: file.type || 'application/octet-stream',
    size: file.size,
    filename: file.name
  };

  // Add dimensions for images
  if (file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
    try {
      const dimensions = await getImageDimensions(file);
      info.width = dimensions.width;
      info.height = dimensions.height;
    } catch {
      // Non-critical - continue without dimensions
    }
  }

  // Add duration for videos/audio 
  if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
    try {
      const { getDuration } = await import('get-video-duration');
      const duration = await getDuration(URL.createObjectURL(file));
      info.duration = Math.round(duration); // round to whole seconds
    } catch (error) {
      // Non-critical - media duration couldn't be extracted
      console.warn('Could not extract media duration:', error);
    }
  }

  return info;
}

/**
 * Check if a file can have thumbnails generated
 * @param file - File to check
 * @returns True if thumbnails can be generated
 */
export function canGenerateThumbnail(file: File): boolean {
  return supportsThumbnails(file.type) && 
         file.type !== 'image/svg+xml'; // SVG thumbnails need special handling
}

/**
 * Get recommended thumbnail dimensions for a file
 * @param file - File to get recommendations for
 * @returns Recommended width and height, or null if not applicable
 */
export function getRecommendedThumbnailSize(file: File): { width: number; height: number } | null {
  if (!canGenerateThumbnail(file)) {
    return null;
  }

  const category = getMediaCategory(file.type);
  
  switch (category) {
    case 'image':
      return { width: DEFAULT_THUMBNAIL_WIDTH, height: DEFAULT_THUMBNAIL_HEIGHT };
    case 'video':
      return { width: 480, height: 270 }; // 16:9 aspect ratio
    default:
      return null;
  }
}