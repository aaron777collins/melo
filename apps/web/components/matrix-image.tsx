/**
 * MatrixImage Component
 * 
 * Renders Matrix media (mxc:// URLs) with Next.js Image optimization.
 * Supports thumbnails, loading states, and graceful error handling.
 * 
 * @example Basic usage
 * ```tsx
 * <MatrixImage
 *   mxcUrl="mxc://matrix.org/abc123"
 *   alt="User uploaded image"
 *   width={400}
 *   height={300}
 * />
 * ```
 * 
 * @example Thumbnail mode
 * ```tsx
 * <MatrixImage
 *   mxcUrl="mxc://matrix.org/abc123"
 *   alt="Image preview"
 *   width={150}
 *   height={150}
 *   thumbnail={true}
 * />
 * ```
 */

"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useMxcUrl } from "@/hooks/use-mxc-url";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface MatrixImageProps {
  /** Matrix Content URI (mxc:// format) */
  mxcUrl: string;
  /** Alt text for accessibility */
  alt: string;
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** Whether to load thumbnail version (default: false for full-size) */
  thumbnail?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Loading placeholder component */
  loadingComponent?: React.ReactNode;
  /** Error placeholder component */
  errorComponent?: React.ReactNode;
  /** Callback when image loads successfully */
  onLoad?: () => void;
  /** Callback when image fails to load */
  onError?: () => void;
}

// =============================================================================
// Component Implementation  
// =============================================================================

/**
 * MatrixImage - Renders Matrix media with Next.js optimization
 * 
 * Features:
 * - Automatic mxc:// to HTTP URL conversion
 * - Next.js Image optimization (lazy loading, responsive images, etc.)
 * - Thumbnail support for smaller previews
 * - Loading and error state handling
 * - Graceful fallback when mxc URL is invalid
 * - Proper accessibility with alt text
 * 
 * The component handles three states:
 * 1. Loading: Shows loading placeholder while converting URL
 * 2. Ready: Shows the actual image via Next.js Image component
 * 3. Error: Shows error placeholder if URL conversion fails or image fails to load
 */
export function MatrixImage({
  mxcUrl,
  alt,
  width,
  height,
  thumbnail = false,
  className,
  loadingComponent,
  errorComponent,
  onLoad,
  onError,
}: MatrixImageProps) {
  // Convert mxc:// URL to HTTP URL using the useMxcUrl hook
  // If thumbnail=true, pass width/height to get thumbnail version
  const httpUrl = useMxcUrl(
    mxcUrl,
    thumbnail ? width : undefined,
    thumbnail ? height : undefined,
    'crop' // Use crop method for thumbnails to maintain aspect ratio
  );

  // Local state for image loading and error handling
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [imageError, setImageError] = useState<string | null>(null);

  // Handle image load success
  const handleLoad = () => {
    setImageState('loaded');
    setImageError(null);
    onLoad?.();
  };

  // Handle image load error
  const handleError = () => {
    setImageState('error');
    setImageError('Failed to load image');
    onError?.();
  };

  // If mxc URL couldn't be converted to HTTP URL, show error immediately
  if (!httpUrl) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400",
          "border border-neutral-200 dark:border-neutral-700 rounded-md",
          className
        )}
        style={{ width, height }}
      >
        {errorComponent || (
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <svg
              className="w-8 h-8 mb-2 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round" 
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-xs">Invalid image URL</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ width, height }}
    >
      {/* Loading placeholder - shown while image is loading */}
      {imageState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 animate-pulse">
          {loadingComponent || (
            <div className="flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-400">
              <svg
                className="w-6 h-6 mb-1 animate-spin opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="text-xs">Loading...</span>
            </div>
          )}
        </div>
      )}

      {/* Error placeholder - shown if image failed to load */}
      {imageState === 'error' && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800",
            "text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700"
          )}
        >
          {errorComponent || (
            <div className="flex flex-col items-center justify-center p-4 text-center">
              <svg
                className="w-8 h-8 mb-2 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-xs">Failed to load</span>
              {imageError && (
                <span className="text-xs opacity-75 mt-1">{imageError}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Next.js Image component - handles the actual image display */}
      <Image
        src={httpUrl}
        alt={alt}
        width={width}
        height={height}
        className={cn(
          "transition-opacity duration-200",
          imageState === 'loaded' ? "opacity-100" : "opacity-0"
        )}
        style={{ 
          objectFit: thumbnail ? 'cover' : 'contain',
          width: '100%',
          height: '100%' 
        }}
        onLoad={handleLoad}
        onError={handleError}
        // Optimize loading behavior
        priority={false} // Most Matrix images are not above the fold
        placeholder="empty" // We handle our own loading placeholder
        quality={thumbnail ? 75 : 85} // Lower quality for thumbnails
        sizes={`${width}px`} // Help Next.js choose appropriate image size
      />
    </div>
  );
}

// =============================================================================
// Export
// =============================================================================

export type { MatrixImageProps };