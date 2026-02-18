/**
 * Rich Media Handler Component
 * 
 * Handles display and interaction with rich media content in Matrix messages,
 * including images, files, audio, video, and other media types.
 */

"use client";

import React, { useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { 
  Download, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music, 
  File,
  ExternalLink,
  Play,
  Pause,
  Volume2,
  VolumeX 
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useMatrixClient } from '@/hooks/use-matrix-client';
import type { MatrixEvent } from '@/lib/matrix/matrix-sdk-exports';

// =============================================================================
// Types
// =============================================================================

export interface MediaContent {
  /** Matrix content URI (mxc://) */
  url: string;
  /** Original filename */
  filename?: string;
  /** MIME type */
  mimetype?: string;
  /** File size in bytes */
  size?: number;
  /** Image/video dimensions */
  info?: {
    w?: number;
    h?: number;
    duration?: number;
    thumbnail_url?: string;
    thumbnail_info?: {
      w?: number;
      h?: number;
      mimetype?: string;
      size?: number;
    };
  };
}

export interface RichMediaHandlerProps {
  /** Matrix event containing media */
  event: MatrixEvent;
  /** Room ID for context */
  roomId: string;
  /** Maximum display width */
  maxWidth?: number;
  /** Whether to show download button */
  showDownload?: boolean;
  /** Whether to auto-play media */
  autoPlay?: boolean;
  /** Additional CSS classes */
  className?: string;
}

interface MediaDisplayProps extends RichMediaHandlerProps {
  content: MediaContent;
  mediaType: 'image' | 'video' | 'audio' | 'file';
  httpUrl: string;
  thumbnailUrl?: string;
}

// =============================================================================
// Utility Functions
// =============================================================================

const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getMediaType = (mimetype?: string): 'image' | 'video' | 'audio' | 'file' => {
  if (!mimetype) return 'file';
  
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  
  return 'file';
};

const getMediaIcon = (mediaType: string) => {
  switch (mediaType) {
    case 'image': return ImageIcon;
    case 'video': return Video;
    case 'audio': return Music;
    default: return File;
  }
};

// =============================================================================
// Image Display Component
// =============================================================================

const ImageDisplay: React.FC<MediaDisplayProps> = ({ 
  content, 
  httpUrl, 
  thumbnailUrl, 
  maxWidth = 400,
  className 
}) => {
  const [showFullSize, setShowFullSize] = useState(false);
  const [imageError, setImageError] = useState(false);

  const dimensions = useMemo(() => {
    const info = content.info;
    if (!info?.w || !info?.h) return { width: maxWidth, height: 200 };

    const aspectRatio = info.h / info.w;
    const width = Math.min(info.w, maxWidth);
    const height = Math.round(width * aspectRatio);

    return { width, height };
  }, [content.info, maxWidth]);

  if (imageError) {
    return (
      <div className={`border rounded-lg p-4 ${className}`} style={{ maxWidth }}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <ImageIcon className="w-5 h-5" />
          <div>
            <p className="font-medium">Image failed to load</p>
            <p className="text-sm">{content.filename || 'Unknown image'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`relative cursor-pointer ${className}`}>
        <Image
          src={thumbnailUrl || httpUrl}
          alt={content.filename || 'Image'}
          width={dimensions.width}
          height={dimensions.height}
          className="rounded-lg object-cover hover:opacity-90 transition-opacity"
          onClick={() => setShowFullSize(true)}
          onError={() => setImageError(true)}
        />
        {content.size && (
          <Badge variant="secondary" className="absolute bottom-2 right-2 text-xs">
            {formatFileSize(content.size)}
          </Badge>
        )}
      </div>

      <Dialog open={showFullSize} onOpenChange={setShowFullSize}>
        <DialogContent className="max-w-[90vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{content.filename || 'Image'}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center">
            <Image
              src={httpUrl}
              alt={content.filename || 'Image'}
              width={content.info?.w || 800}
              height={content.info?.h || 600}
              className="max-w-full max-h-[70vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// =============================================================================
// Video Display Component
// =============================================================================

const VideoDisplay: React.FC<MediaDisplayProps> = ({ 
  content, 
  httpUrl, 
  thumbnailUrl,
  maxWidth = 400,
  autoPlay,
  className 
}) => {
  return (
    <div className={`relative ${className}`} style={{ maxWidth }}>
      <video
        src={httpUrl}
        poster={thumbnailUrl}
        controls
        autoPlay={autoPlay}
        className="w-full rounded-lg"
        style={{ 
          maxWidth,
          height: content.info?.h ? Math.min(content.info.h, 300) : 200 
        }}
      >
        Your browser does not support video playback.
      </video>
      
      <div className="absolute bottom-2 right-2 flex gap-1">
        {content.info?.duration && (
          <Badge variant="secondary" className="text-xs">
            {formatDuration(content.info.duration)}
          </Badge>
        )}
        {content.size && (
          <Badge variant="secondary" className="text-xs">
            {formatFileSize(content.size)}
          </Badge>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// Audio Display Component
// =============================================================================

const AudioDisplay: React.FC<MediaDisplayProps> = ({ 
  content, 
  httpUrl,
  className 
}) => {
  return (
    <Card className={`w-full max-w-md ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Music className="w-8 h-8 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {content.filename || 'Audio file'}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {content.info?.duration && (
                <span>{formatDuration(content.info.duration)}</span>
              )}
              {content.size && (
                <span>{formatFileSize(content.size)}</span>
              )}
            </div>
          </div>
        </div>
        
        <audio
          src={httpUrl}
          controls
          className="w-full mt-3"
        >
          Your browser does not support audio playback.
        </audio>
      </CardContent>
    </Card>
  );
};

// =============================================================================
// File Display Component
// =============================================================================

const FileDisplay: React.FC<MediaDisplayProps & { showDownload?: boolean }> = ({ 
  content, 
  httpUrl,
  showDownload = true,
  className 
}) => {
  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = httpUrl;
    link.download = content.filename || 'file';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [httpUrl, content.filename]);

  const IconComponent = getMediaIcon(getMediaType(content.mimetype));

  return (
    <Card className={`w-full max-w-md ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <IconComponent className="w-8 h-8 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {content.filename || 'Unknown file'}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {content.mimetype && (
                <Badge variant="outline" className="text-xs">
                  {content.mimetype.split('/')[1]?.toUpperCase()}
                </Badge>
              )}
              {content.size && (
                <span>{formatFileSize(content.size)}</span>
              )}
            </div>
          </div>
          
          {showDownload && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleDownload}
              className="flex-shrink-0"
            >
              <Download className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// =============================================================================
// Main Rich Media Handler Component
// =============================================================================

export const RichMediaHandler: React.FC<RichMediaHandlerProps> = ({
  event,
  roomId,
  maxWidth = 400,
  showDownload = true,
  autoPlay = false,
  className = '',
}) => {
  const { client } = useMatrixClient();

  // Extract media content from event
  const mediaContent = useMemo((): MediaContent | null => {
    const content = event.getContent();
    
    // Handle m.file, m.image, m.video, m.audio message types
    if (content.url && typeof content.url === 'string') {
      return {
        url: content.url,
        filename: content.filename || content.body,
        mimetype: content.info?.mimetype || content.mimetype,
        size: content.info?.size || content.size,
        info: content.info,
      };
    }
    
    return null;
  }, [event]);

  // Convert mxc:// URL to HTTP URL
  const httpUrl = useMemo(() => {
    if (!mediaContent?.url || !client) return '';
    
    try {
      return client.mxcUrlToHttp(mediaContent.url) || '';
    } catch (error) {
      console.error('Failed to convert MXC URL:', error);
      return '';
    }
  }, [mediaContent?.url, client]);

  // Get thumbnail URL if available
  const thumbnailUrl = useMemo(() => {
    if (!mediaContent?.info?.thumbnail_url || !client) return undefined;
    
    try {
      return client.mxcUrlToHttp(mediaContent.info.thumbnail_url) || undefined;
    } catch (error) {
      console.error('Failed to convert thumbnail MXC URL:', error);
      return undefined;
    }
  }, [mediaContent?.info?.thumbnail_url, client]);

  // Don't render if no media content or HTTP URL
  if (!mediaContent || !httpUrl) {
    return null;
  }

  const mediaType = getMediaType(mediaContent.mimetype);

  const commonProps = {
    event,
    roomId,
    content: mediaContent,
    mediaType,
    httpUrl,
    thumbnailUrl,
    maxWidth,
    showDownload,
    autoPlay,
    className,
  };

  // Render appropriate component based on media type
  switch (mediaType) {
    case 'image':
      return <ImageDisplay {...commonProps} />;
    case 'video':
      return <VideoDisplay {...commonProps} />;
    case 'audio':
      return <AudioDisplay {...commonProps} />;
    case 'file':
    default:
      return <FileDisplay {...commonProps} showDownload={showDownload} />;
  }
};

// =============================================================================
// Export
// =============================================================================

export default RichMediaHandler;
export type { MediaContent, RichMediaHandlerProps };