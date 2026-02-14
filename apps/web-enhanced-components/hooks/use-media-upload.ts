/**
 * useMediaUpload Hook
 * 
 * React hook for file uploads with progress state and cancellation support.
 * Provides a clean interface for uploading files to Matrix content repository
 * with real-time progress updates and error handling.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { uploadMedia, abortUpload } from '../../../lib/matrix/media';
import type { MxcUrl, UploadProgress, UploadError } from '../../../lib/matrix/types/media';

// =============================================================================
// Hook Interface
// =============================================================================

/**
 * Upload function interface
 */
export interface UploadFunction {
  (file: File): Promise<MxcUrl>;
}

/**
 * Cancel function interface
 */
export interface CancelFunction {
  (): void;
}

/**
 * useMediaUpload hook return value
 */
export interface UseMediaUploadReturn {
  /** Upload function that accepts a file and returns Promise<MxcUrl> */
  upload: UploadFunction;
  /** Current upload progress (0-100) */
  progress: number;
  /** Whether an upload is currently in progress */
  isUploading: boolean;
  /** Upload error if one occurred */
  error: Error | null;
  /** Function to cancel current upload */
  cancel: CancelFunction;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for file uploads with progress state and cancellation
 * 
 * Provides a React interface for uploading files to Matrix content repository.
 * Manages upload state, progress tracking, and error handling automatically.
 * 
 * @returns Upload interface with state and controls
 * 
 * @example
 * ```tsx
 * function FileUploadComponent() {
 *   const { upload, progress, isUploading, error, cancel } = useMediaUpload();
 * 
 *   const handleFileSelect = async (file: File) => {
 *     try {
 *       const mxcUrl = await upload(file);
 *       console.log('Uploaded:', mxcUrl);
 *     } catch (error) {
 *       console.error('Upload failed:', error);
 *     }
 *   };
 * 
 *   return (
 *     <div>
 *       <input type="file" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
 *       {isUploading && (
 *         <div>
 *           <progress value={progress} max={100} />
 *           <button onClick={cancel}>Cancel Upload</button>
 *         </div>
 *       )}
 *       {error && <div>Error: {error.message}</div>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useMediaUpload(): UseMediaUploadReturn {
  // =============================================================================
  // State Management
  // =============================================================================

  /** Current upload progress percentage (0-100) */
  const [progress, setProgress] = useState<number>(0);
  
  /** Whether an upload is currently active */
  const [isUploading, setIsUploading] = useState<boolean>(false);
  
  /** Upload error if one occurred */
  const [error, setError] = useState<Error | null>(null);

  // =============================================================================
  // Upload Tracking
  // =============================================================================

  /** Current upload ID for tracking and cancellation */
  const currentUploadIdRef = useRef<string | null>(null);
  
  /** Whether component is mounted (for cleanup) */
  const mountedRef = useRef<boolean>(true);

  // =============================================================================
  // Cleanup Effect
  // =============================================================================

  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      // Cancel any active upload when component unmounts
      if (currentUploadIdRef.current) {
        abortUpload(currentUploadIdRef.current);
        currentUploadIdRef.current = null;
      }
    };
  }, []);

  // =============================================================================
  // Progress Callback
  // =============================================================================

  /** Handle upload progress updates from uploadMedia function */
  const handleProgress = useCallback((progressInfo: UploadProgress) => {
    // Only update state if component is still mounted
    if (!mountedRef.current) {
      return;
    }

    // Update progress percentage
    setProgress(progressInfo.progress);

    // Handle different upload states
    switch (progressInfo.state) {
      case 'pending':
      case 'uploading':
      case 'processing':
        setIsUploading(true);
        setError(null);
        break;

      case 'completed':
        setIsUploading(false);
        setError(null);
        // Keep progress at 100% for completed uploads
        setProgress(100);
        // Clear upload ID
        currentUploadIdRef.current = null;
        break;

      case 'failed':
        setIsUploading(false);
        // Convert UploadError to standard Error
        const uploadError = progressInfo.error;
        if (uploadError) {
          const error = new Error(uploadError.message);
          (error as any).code = uploadError.code;
          (error as any).retryable = uploadError.retryable;
          (error as any).details = uploadError.details;
          setError(error);
        } else {
          setError(new Error('Upload failed with unknown error'));
        }
        // Clear upload ID
        currentUploadIdRef.current = null;
        break;

      case 'cancelled':
        setIsUploading(false);
        setError(new Error('Upload cancelled'));
        // Clear upload ID
        currentUploadIdRef.current = null;
        break;
    }
  }, []);

  // =============================================================================
  // Upload Function
  // =============================================================================

  /** 
   * Upload a file to Matrix content repository
   * @param file - File to upload
   * @returns Promise resolving to MXC URL
   */
  const upload = useCallback<UploadFunction>(async (file: File): Promise<MxcUrl> => {
    // Validate input
    if (!file) {
      throw new Error('File is required for upload');
    }

    // Cancel any existing upload
    if (currentUploadIdRef.current) {
      abortUpload(currentUploadIdRef.current);
    }

    // Reset state for new upload
    setProgress(0);
    setIsUploading(true);
    setError(null);

    // Generate upload ID for tracking
    const uploadId = `useMediaUpload_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    currentUploadIdRef.current = uploadId;

    try {
      // Start upload with progress callback
      const mxcUrl = await uploadMedia(file, handleProgress, {
        uploadId,
        filename: file.name,
        abortExisting: true
      });

      // Final success state (handleProgress should have already set this, but ensure consistency)
      if (mountedRef.current) {
        setProgress(100);
        setIsUploading(false);
        setError(null);
      }

      return mxcUrl;

    } catch (uploadError) {
      // Handle upload error
      if (mountedRef.current) {
        setIsUploading(false);
        
        // Convert to standard Error if needed
        const error = uploadError instanceof Error 
          ? uploadError 
          : new Error(typeof uploadError === 'string' ? uploadError : 'Upload failed');
        
        setError(error);
      }

      // Clear upload ID
      currentUploadIdRef.current = null;

      // Re-throw error for caller to handle
      throw uploadError;
    }
  }, [handleProgress]);

  // =============================================================================
  // Cancel Function
  // =============================================================================

  /** 
   * Cancel the current upload if one is active
   */
  const cancel = useCallback<CancelFunction>(() => {
    if (currentUploadIdRef.current) {
      // Abort the upload
      const success = abortUpload(currentUploadIdRef.current);
      
      if (success && mountedRef.current) {
        // Update state to reflect cancellation
        setIsUploading(false);
        setError(new Error('Upload cancelled by user'));
        currentUploadIdRef.current = null;
      }
    }
  }, []);

  // =============================================================================
  // Return Interface
  // =============================================================================

  return {
    upload,
    progress,
    isUploading,
    error,
    cancel
  };
}

// =============================================================================
// Default Export
// =============================================================================

export default useMediaUpload;