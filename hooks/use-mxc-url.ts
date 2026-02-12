/**
 * useMxcUrl Hook
 *
 * Converts Matrix Content Repository (mxc://) URLs to HTTP URLs for display.
 * Supports both full-size media and thumbnails with dimension parameters.
 *
 * @module hooks/use-mxc-url
 * @see {@link ../../lib/matrix/types/media.ts} - Media type definitions
 *
 * @example Basic usage
 * ```tsx
 * import { useMxcUrl } from '@/hooks/use-mxc-url';
 *
 * function AvatarImage({ mxcUrl }: { mxcUrl: string }) {
 *   const httpUrl = useMxcUrl(mxcUrl);
 *
 *   if (!httpUrl) {
 *     return <DefaultAvatar />;
 *   }
 *
 *   return <img src={httpUrl} alt="User avatar" />;
 * }
 * ```
 *
 * @example Thumbnail usage
 * ```tsx
 * import { useMxcUrl } from '@/hooks/use-mxc-url';
 *
 * function ImageThumbnail({ mxcUrl }: { mxcUrl: string }) {
 *   const thumbnailUrl = useMxcUrl(mxcUrl, 200, 200);
 *
 *   return (
 *     <img
 *       src={thumbnailUrl}
 *       width={200}
 *       height={200}
 *       alt="Image thumbnail"
 *     />
 *   );
 * }
 * ```
 */

"use client";

import { useMemo } from "react";
import type { MxcUrl } from "@/lib/matrix/types/media";
import {
  createMxcUrl,
  mxcToHttpUrl,
  mxcToThumbnailUrl,
} from "@/lib/matrix/types/media";
import { useMatrixClient } from "@/hooks/use-matrix-client";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for thumbnail generation
 */
interface ThumbnailOptions {
  /** Thumbnail width in pixels */
  width: number;
  /** Thumbnail height in pixels */
  height: number;
  /** Resize method: 'crop' maintains aspect ratio, 'scale' stretches to fit */
  method?: 'crop' | 'scale';
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook to convert mxc:// URLs to HTTP URLs for display.
 *
 * Automatically handles invalid URLs by returning null. Supports both
 * full-size media access and thumbnail generation with custom dimensions.
 *
 * @param mxcUrl - The Matrix Content URL (mxc://server/media-id format)
 * @param width - Optional thumbnail width in pixels
 * @param height - Optional thumbnail height in pixels
 * @param method - Thumbnail resize method ('crop' or 'scale', defaults to 'crop')
 * @returns HTTP URL string for the media, or null if invalid/unavailable
 *
 * @example Full-size image
 * ```tsx
 * function UserAvatar({ avatarUrl }: { avatarUrl: string }) {
 *   const httpUrl = useMxcUrl(avatarUrl);
 *
 *   if (!httpUrl) {
 *     return <div className="avatar-placeholder">👤</div>;
 *   }
 *
 *   return <img src={httpUrl} alt="Avatar" className="rounded-full" />;
 * }
 * ```
 *
 * @example Thumbnail with dimensions
 * ```tsx
 * function MediaPreview({ mediaUrl }: { mediaUrl: string }) {
 *   const thumbnailUrl = useMxcUrl(mediaUrl, 300, 200, 'crop');
 *
 *   return (
 *     <div className="media-preview">
 *       {thumbnailUrl ? (
 *         <img
 *           src={thumbnailUrl}
 *           width={300}
 *           height={200}
 *           alt="Media preview"
 *         />
 *       ) : (
 *         <div className="no-preview">Preview unavailable</div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Conditional rendering
 * ```tsx
 * function MessageMedia({ mxcUrl }: { mxcUrl?: string }) {
 *   const mediaUrl = useMxcUrl(mxcUrl || '');
 *
 *   if (!mediaUrl) {
 *     return null; // No media to display
 *   }
 *
 *   return (
 *     <a href={mediaUrl} target="_blank" rel="noopener noreferrer">
 *       <img src={mediaUrl} alt="Message attachment" />
 *     </a>
 *   );
 * }
 * ```
 */
export function useMxcUrl(
  mxcUrl: string,
  width?: number,
  height?: number,
  method: 'crop' | 'scale' = 'crop'
): string | null {
  const { client, isReady } = useMatrixClient();

  return useMemo(() => {
    // Return null if client not ready or mxcUrl is empty
    if (!isReady || !client || !mxcUrl) {
      return null;
    }

    // Validate the mxc URL format
    const validMxcUrl = createMxcUrl(mxcUrl);
    if (!validMxcUrl) {
      // Invalid mxc:// URL format
      return null;
    }

    // Get homeserver URL from the Matrix client
    const homeserverUrl = client.getHomeserverUrl();
    if (!homeserverUrl) {
      // No homeserver URL available
      return null;
    }

    try {
      // Generate thumbnail URL if dimensions provided
      if (width !== undefined && height !== undefined) {
        return mxcToThumbnailUrl(validMxcUrl, homeserverUrl, width, height, method);
      }

      // Generate full-size HTTP URL
      return mxcToHttpUrl(validMxcUrl, homeserverUrl);
    } catch (error) {
      // Handle any URL conversion errors gracefully
      console.warn('Failed to convert mxc URL to HTTP:', error);
      return null;
    }
  }, [mxcUrl, width, height, method, client, isReady]);
}

// =============================================================================
// Utility Hook for Batch Conversions
// =============================================================================

/**
 * Hook to convert multiple mxc:// URLs to HTTP URLs efficiently.
 *
 * Useful for components that need to display multiple media items
 * and want to batch the URL conversions for better performance.
 *
 * @param mxcUrls - Array of mxc:// URLs to convert
 * @param thumbnailOptions - Optional thumbnail configuration applied to all URLs
 * @returns Array of HTTP URLs (same order as input, null for invalid URLs)
 *
 * @example
 * ```tsx
 * function MediaGrid({ mediaUrls }: { mediaUrls: string[] }) {
 *   const httpUrls = useMxcUrlBatch(mediaUrls, { width: 150, height: 150 });
 *
 *   return (
 *     <div className="grid grid-cols-3 gap-2">
 *       {httpUrls.map((url, index) => (
 *         <div key={mediaUrls[index]} className="aspect-square">
 *           {url ? (
 *             <img src={url} alt={`Media ${index}`} />
 *           ) : (
 *             <div className="bg-gray-200 w-full h-full" />
 *           )}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useMxcUrlBatch(
  mxcUrls: string[],
  thumbnailOptions?: ThumbnailOptions
): (string | null)[] {
  const { client, isReady } = useMatrixClient();

  return useMemo(() => {
    if (!isReady || !client || mxcUrls.length === 0) {
      return mxcUrls.map(() => null);
    }

    const homeserverUrl = client.getHomeserverUrl();
    if (!homeserverUrl) {
      return mxcUrls.map(() => null);
    }

    return mxcUrls.map((mxcUrl) => {
      if (!mxcUrl) {
        return null;
      }

      const validMxcUrl = createMxcUrl(mxcUrl);
      if (!validMxcUrl) {
        return null;
      }

      try {
        if (thumbnailOptions) {
          return mxcToThumbnailUrl(
            validMxcUrl,
            homeserverUrl,
            thumbnailOptions.width,
            thumbnailOptions.height,
            thumbnailOptions.method || 'crop'
          );
        }

        return mxcToHttpUrl(validMxcUrl, homeserverUrl);
      } catch (error) {
        console.warn('Failed to convert mxc URL to HTTP:', error);
        return null;
      }
    });
  }, [mxcUrls, thumbnailOptions, client, isReady]);
}

// =============================================================================
// Type Exports
// =============================================================================

export type { ThumbnailOptions };