/**
 * MessageAttachment Component
 * 
 * Displays file attachments in messages with proper handling for different media types.
 * Supports images, videos, audio files, and generic files with download functionality.
 * 
 * @example Basic usage
 * ```tsx
 * <MessageAttachment
 *   mxcUrl="mxc://matrix.org/abc123"
 *   filename="image.jpg"
 *   mimetype="image/jpeg"
 *   size={1024000}
 * />
 * ```
 * 
 * @example Audio file
 * ```tsx
 * <MessageAttachment
 *   mxcUrl="mxc://matrix.org/def456"
 *   filename="song.mp3"
 *   mimetype="audio/mpeg"
 *   size={5242880}
 * />
 * ```
 */

"use client";

import React, { useState, useCallback } from "react";
import { Download, FileIcon, ImageIcon, VideoIcon, MusicIcon, AlertCircle, Loader2 } from "lucide-react";
import { useMxcUrl } from "@/hooks/use-mxc-url";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { MatrixImage } from "@/apps/web/components/matrix-image";

// =============================================================================
// Types
// =============================================================================

interface MessageAttachmentProps {
  /** Matrix Content URI (mxc:// format) */
  mxcUrl: string;
  /** Original filename */
  filename: string;
  /** MIME type of the file */
  mimetype?: string;
  /** File size in bytes */
  size?: number;
  /** Optional thumbnail mxc:// URL for videos/images */
  thumbnailMxcUrl?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show compact layout (smaller preview) */
  compact?: boolean;
  /** Callback when attachment is clicked/downloaded */
  onInteraction?: () => void;
}

type AttachmentType = 'image' | 'video' | 'audio' | 'file';

// =============================================================================
// Constants  
// =============================================================================

// Image MIME types that can be displayed inline
const IMAGE_MIMETYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp'
];

// Video MIME types that can be played inline
const VIDEO_MIMETYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/avi',
  'video/mov',
  'video/mkv',
  'video/m4v'
];

// Audio MIME types that can be played inline
const AUDIO_MIMETYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav', 
  'audio/ogg',
  'audio/aac',
  'audio/flac',
  'audio/m4a',
  'audio/weba'
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Determines attachment type from MIME type and filename
 */
function getAttachmentType(mimetype?: string, filename?: string): AttachmentType {
  if (mimetype) {
    if (IMAGE_MIMETYPES.includes(mimetype)) return 'image';
    if (VIDEO_MIMETYPES.includes(mimetype)) return 'video';  
    if (AUDIO_MIMETYPES.includes(mimetype)) return 'audio';
  }
  
  // Fallback to file extension if no mimetype or not recognized
  if (filename) {
    const ext = filename.toLowerCase().split('.').pop();
    if (ext) {
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
      if (['mp4', 'webm', 'ogg', 'avi', 'mov', 'mkv', 'm4v'].includes(ext)) return 'video';
      if (['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'weba'].includes(ext)) return 'audio';
    }
  }
  
  return 'file';
}

/**
 * Formats file size for display  
 */
function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = Math.round(bytes / Math.pow(1024, i) * 100) / 100;
  return `${size} ${sizes[i]}`;
}

/**
 * Gets appropriate icon for file type
 */
function getFileTypeIcon(type: AttachmentType, className?: string) {
  switch (type) {
    case 'image':
      return <ImageIcon className={className} />;
    case 'video':
      return <VideoIcon className={className} />;
    case 'audio':
      return <MusicIcon className={className} />;
    default:
      return <FileIcon className={className} />;
  }
}

/**
 * Downloads file from URL
 */
function downloadFile(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Image attachment display
 */
function ImageAttachment({ 
  mxcUrl, 
  filename, 
  size, 
  compact = false, 
  onInteraction,
  className 
}: {
  mxcUrl: string;
  filename: string;
  size?: number;
  compact?: boolean;
  onInteraction?: () => void;
  className?: string;
}) {
  const [imageError, setImageError] = useState(false);
  
  const handleImageClick = useCallback(() => {
    onInteraction?.();
    // Could open in modal/lightbox in the future
  }, [onInteraction]);

  const dimensions = compact ? { width: 200, height: 200 } : { width: 400, height: 300 };

  return (
    <div className={cn("mt-2 max-w-md", className)}>
      <div 
        className="relative group cursor-pointer rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
        onClick={handleImageClick}
      >
        <MatrixImage
          mxcUrl={mxcUrl}
          alt={filename}
          {...dimensions}
          thumbnail={compact}
          className="transition-opacity group-hover:opacity-90"
          onError={() => setImageError(true)}
        />
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
      </div>
      
      {/* Metadata */}
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
          {filename}
          {size && ` • ${formatFileSize(size)}`}
        </p>
        
        {imageError && (
          <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-3 h-3" />
            <span>Failed to load</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Video attachment display
 */
function VideoAttachment({ 
  mxcUrl, 
  filename, 
  size, 
  thumbnailMxcUrl,
  compact = false, 
  onInteraction,
  className 
}: {
  mxcUrl: string;
  filename: string;
  size?: number;
  thumbnailMxcUrl?: string;
  compact?: boolean;
  onInteraction?: () => void;
  className?: string;
}) {
  const httpUrl = useMxcUrl(mxcUrl);
  const [videoError, setVideoError] = useState(false);
  
  const handleVideoPlay = useCallback(() => {
    onInteraction?.();
  }, [onInteraction]);

  if (!httpUrl) {
    return (
      <div className={cn("mt-2 max-w-md", className)}>
        <div className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
          <VideoIcon className="h-8 w-8 text-neutral-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
              {filename}
            </p>
            <p className="text-xs text-red-500">Unable to load video</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("mt-2 max-w-md", className)}>
      <div className="relative rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
        <video
          src={httpUrl}
          controls
          className={cn(
            "w-full h-auto object-cover",
            compact ? "max-h-48" : "max-h-96"
          )}
          preload="metadata"
          onPlay={handleVideoPlay}
          onError={() => setVideoError(true)}
        />
      </div>
      
      {/* Metadata */}
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
          {filename}
          {size && ` • ${formatFileSize(size)}`}
        </p>
        
        {videoError && (
          <div className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400">
            <AlertCircle className="w-3 h-3" />
            <span>Playback error</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Audio attachment display
 */
function AudioAttachment({ 
  mxcUrl, 
  filename, 
  size, 
  compact = false, 
  onInteraction,
  className 
}: {
  mxcUrl: string;
  filename: string;
  size?: number;
  compact?: boolean;
  onInteraction?: () => void;
  className?: string;
}) {
  const httpUrl = useMxcUrl(mxcUrl);
  const [audioError, setAudioError] = useState(false);
  
  const handleAudioPlay = useCallback(() => {
    onInteraction?.();
  }, [onInteraction]);

  if (!httpUrl) {
    return (
      <div className={cn("mt-2 max-w-md", className)}>
        <div className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
          <MusicIcon className="h-8 w-8 text-neutral-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
              {filename}
            </p>
            <p className="text-xs text-red-500">Unable to load audio</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("mt-2 max-w-md", className)}>
      <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
        <MusicIcon className="h-8 w-8 text-neutral-500 dark:text-neutral-400" />
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
            {filename}
          </p>
          {size && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {formatFileSize(size)}
            </p>
          )}
          
          {audioError && (
            <p className="text-xs text-red-500 dark:text-red-400">Playback error</p>
          )}
        </div>
        
        <audio 
          src={httpUrl} 
          controls 
          className={compact ? "w-32" : "w-48"}
          onPlay={handleAudioPlay}
          onError={() => setAudioError(true)}
        />
      </div>
    </div>
  );
}

/**
 * Generic file attachment display
 */
function FileAttachment({ 
  mxcUrl, 
  filename, 
  size, 
  type, 
  onInteraction,
  className 
}: {
  mxcUrl: string;
  filename: string;
  size?: number;
  type: AttachmentType;
  onInteraction?: () => void;
  className?: string;
}) {
  const httpUrl = useMxcUrl(mxcUrl);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const handleDownload = useCallback(async () => {
    if (!httpUrl || isDownloading) return;
    
    setIsDownloading(true);
    onInteraction?.();
    
    try {
      downloadFile(httpUrl, filename);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  }, [httpUrl, filename, isDownloading, onInteraction]);

  return (
    <div className={cn("mt-2 max-w-md", className)}>
      <div className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
        {getFileTypeIcon(type, "h-8 w-8 text-neutral-500 dark:text-neutral-400")}
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
            {filename}
          </p>
          {size && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {formatFileSize(size)}
            </p>
          )}
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={handleDownload}
                disabled={!httpUrl || isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {!httpUrl ? 'Download unavailable' : 'Download'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * MessageAttachment - Displays file attachments with proper media type handling
 * 
 * Features:
 * - Automatic media type detection from MIME type or file extension
 * - Image preview with thumbnail support and error handling
 * - Video player with controls and error states  
 * - Audio player with compact controls
 * - Generic file display with download functionality
 * - Responsive design with compact mode
 * - Graceful fallback for unsupported types
 * 
 * The component automatically determines display type based on MIME type
 * and provides appropriate UI for each media format.
 */
export function MessageAttachment({
  mxcUrl,
  filename,
  mimetype,
  size,
  thumbnailMxcUrl,
  className,
  compact = false,
  onInteraction,
}: MessageAttachmentProps) {
  const attachmentType = getAttachmentType(mimetype, filename);
  
  // Validate mxc URL format
  if (!mxcUrl || !mxcUrl.startsWith('mxc://')) {
    return (
      <div className={cn("mt-2 max-w-md", className)}>
        <div className="flex items-center gap-3 p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <div className="text-sm text-red-700 dark:text-red-300">
            Invalid attachment URL
          </div>
        </div>
      </div>
    );
  }

  // Render appropriate component based on attachment type
  switch (attachmentType) {
    case 'image':
      return (
        <ImageAttachment
          mxcUrl={mxcUrl}
          filename={filename}
          size={size}
          compact={compact}
          onInteraction={onInteraction}
          className={className}
        />
      );
      
    case 'video':
      return (
        <VideoAttachment
          mxcUrl={mxcUrl}
          filename={filename}
          size={size}
          thumbnailMxcUrl={thumbnailMxcUrl}
          compact={compact}
          onInteraction={onInteraction}
          className={className}
        />
      );
      
    case 'audio':
      return (
        <AudioAttachment
          mxcUrl={mxcUrl}
          filename={filename}
          size={size}
          compact={compact}
          onInteraction={onInteraction}
          className={className}
        />
      );
      
    default:
      return (
        <FileAttachment
          mxcUrl={mxcUrl}
          filename={filename}
          size={size}
          type={attachmentType}
          onInteraction={onInteraction}
          className={className}
        />
      );
  }
}

// =============================================================================
// Export
// =============================================================================

export type { MessageAttachmentProps };