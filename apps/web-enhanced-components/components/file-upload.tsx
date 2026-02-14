"use client";

import React, { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Video, Music, AlertCircle, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { useMediaUpload } from '../hooks/use-media-upload';
import type { MxcUrl } from '../../../lib/matrix/types/media';
import { formatFileSize, getMediaCategory } from '../../../lib/matrix/types/media';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface FileUploadProps {
  /** Callback when file upload completes successfully */
  onUploadComplete?: (mxcUrl: MxcUrl, file: File) => void;
  /** Callback when upload fails */
  onUploadError?: (error: Error, file: File) => void;
  /** Allowed file types (MIME types) */
  accept?: string[];
  /** Maximum file size in bytes (default: 50MB) */
  maxSize?: number;
  /** Whether to show file preview */
  showPreview?: boolean;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Custom placeholder text */
  placeholder?: string;
}

interface FilePreview {
  file: File;
  url: string;
  category: 'image' | 'video' | 'audio' | 'file';
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50MB
const DEFAULT_ACCEPT = [
  'image/*',
  'video/*',
  'audio/*',
  'application/pdf',
  'text/*'
];

const PREVIEW_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// =============================================================================
// File Upload Component
// =============================================================================

/**
 * FileUpload Component
 * 
 * A drag-and-drop file upload component with progress tracking, file validation,
 * and preview capabilities. Uses the Matrix media upload system.
 */
export function FileUpload({
  onUploadComplete,
  onUploadError,
  accept = DEFAULT_ACCEPT,
  maxSize = DEFAULT_MAX_SIZE,
  showPreview = true,
  disabled = false,
  className,
  placeholder
}: FileUploadProps) {
  // =============================================================================
  // State Management
  // =============================================================================

  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadedMxcUrl, setUploadedMxcUrl] = useState<MxcUrl | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Media upload hook
  const { upload, progress, isUploading, error, cancel } = useMediaUpload();

  // =============================================================================
  // File Validation
  // =============================================================================

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      return `File size must be less than ${formatFileSize(maxSize)}`;
    }

    // Check file type
    if (accept.length > 0) {
      const isAccepted = accept.some(acceptType => {
        if (acceptType.endsWith('/*')) {
          const baseType = acceptType.slice(0, -2);
          return file.type.startsWith(baseType);
        }
        return file.type === acceptType;
      });

      if (!isAccepted) {
        return `File type ${file.type} is not allowed`;
      }
    }

    return null;
  }, [maxSize, accept]);

  // =============================================================================
  // File Preview Creation
  // =============================================================================

  const createFilePreview = useCallback((file: File): FilePreview => {
    const category = getMediaCategory(file.type);
    let url = '';

    // Create object URL for preview (only for images and videos)
    if (PREVIEW_IMAGE_TYPES.includes(file.type) || file.type.startsWith('video/')) {
      url = URL.createObjectURL(file);
    }

    return {
      file,
      url,
      category
    };
  }, []);

  // =============================================================================
  // File Selection Handlers
  // =============================================================================

  const handleFileSelect = useCallback(async (file: File) => {
    setValidationError(null);
    setUploadedMxcUrl(null);

    // Validate file
    const error = validateFile(file);
    if (error) {
      setValidationError(error);
      return;
    }

    // Set selected file and preview
    setSelectedFile(file);
    
    if (showPreview) {
      setFilePreview(createFilePreview(file));
    }

    // Start upload automatically
    try {
      const mxcUrl = await upload(file);
      setUploadedMxcUrl(mxcUrl);
      onUploadComplete?.(mxcUrl, file);
    } catch (uploadError) {
      const errorObj = uploadError instanceof Error ? uploadError : new Error('Upload failed');
      onUploadError?.(errorObj, file);
    }
  }, [validateFile, showPreview, createFilePreview, upload, onUploadComplete, onUploadError]);

  const handleFileInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // =============================================================================
  // Drag and Drop Handlers
  // =============================================================================

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    // Only set dragOver to false if we're leaving the component entirely
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [disabled, handleFileSelect]);

  // =============================================================================
  // Action Handlers
  // =============================================================================

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  }, [disabled, isUploading]);

  const handleClear = useCallback(() => {
    if (isUploading) {
      cancel();
    }
    
    // Clear state
    setSelectedFile(null);
    setFilePreview(null);
    setValidationError(null);
    setUploadedMxcUrl(null);

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Cleanup object URL if exists
    if (filePreview?.url) {
      URL.revokeObjectURL(filePreview.url);
    }
  }, [isUploading, cancel, filePreview]);

  // =============================================================================
  // Render Helpers
  // =============================================================================

  const getFileIcon = (category: string) => {
    switch (category) {
      case 'image':
        return <ImageIcon className="h-8 w-8" />;
      case 'video':
        return <Video className="h-8 w-8" />;
      case 'audio':
        return <Music className="h-8 w-8" />;
      default:
        return <FileText className="h-8 w-8" />;
    }
  };

  const getStatusIcon = () => {
    if (uploadedMxcUrl) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (error || validationError) {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
    return null;
  };

  const getStatusMessage = () => {
    if (uploadedMxcUrl) {
      return 'Upload complete';
    }
    if (error) {
      return error.message;
    }
    if (validationError) {
      return validationError;
    }
    if (isUploading) {
      return `Uploading... ${Math.round(progress)}%`;
    }
    return null;
  };

  // =============================================================================
  // Render File Preview
  // =============================================================================

  const renderFilePreview = () => {
    if (!filePreview) return null;

    const { file, url, category } = filePreview;

    return (
      <div className="mt-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center space-x-4">
          {/* File Icon/Preview */}
          <div className="flex-shrink-0">
            {url && category === 'image' ? (
              <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                <Image
                  src={url}
                  alt={file.name}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                {getFileIcon(category)}
              </div>
            )}
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {file.name}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {category.toUpperCase()}
              </Badge>
              <span className="text-xs text-gray-500">
                {formatFileSize(file.size)}
              </span>
            </div>
          </div>

          {/* Status and Actions */}
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        {isUploading && (
          <div className="mt-4">
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Status Message */}
        {getStatusMessage() && (
          <p className={cn(
            "mt-2 text-sm",
            error || validationError ? "text-red-500" : 
            uploadedMxcUrl ? "text-green-500" : 
            "text-gray-500"
          )}>
            {getStatusMessage()}
          </p>
        )}
      </div>
    );
  };

  // =============================================================================
  // Main Render
  // =============================================================================

  return (
    <div className={cn("w-full", className)}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Dropzone */}
      <Card
        className={cn(
          "cursor-pointer transition-all duration-200",
          isDragOver && "border-primary bg-primary/5",
          disabled && "cursor-not-allowed opacity-50",
          isUploading && "cursor-not-allowed"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <div className={cn(
            "rounded-full p-4 mb-4 transition-colors",
            isDragOver ? "bg-primary text-primary-foreground" : "bg-gray-100 dark:bg-gray-800 text-gray-400"
          )}>
            <Upload className="h-8 w-8" />
          </div>
          
          <h3 className="text-lg font-medium mb-2">
            {placeholder || (isDragOver ? "Drop your file here" : "Upload a file")}
          </h3>
          
          <p className="text-sm text-gray-500 mb-4">
            {isDragOver ? "Release to upload" : "Click to browse or drag and drop"}
          </p>

          {/* File Type Info */}
          {accept.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center">
              {accept.map((type) => (
                <Badge key={type} variant="outline" className="text-xs">
                  {type}
                </Badge>
              ))}
            </div>
          )}

          {/* Size Limit */}
          <p className="text-xs text-gray-400 mt-2">
            Maximum size: {formatFileSize(maxSize)}
          </p>
        </CardContent>
      </Card>

      {/* File Preview */}
      {showPreview && renderFilePreview()}
    </div>
  );
}

export default FileUpload;