"use client";

/**
 * Matrix File Upload Component
 * 
 * Uploads files directly to the Matrix homeserver.
 * Replaces UploadThing for self-hosted file storage.
 */

import React, { useState, useRef, useCallback } from "react";
import { Upload, X, FileIcon, ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";

import { useMatrixAuth } from "@/components/providers/matrix-auth-provider";
import {
  uploadMedia,
  mxcToHttpUrl,
  validateImageFile,
  validateFile,
  ALLOWED_IMAGE_TYPES,
  MediaUploadError,
} from "@/lib/matrix/media";

interface MatrixFileUploadProps {
  /** Callback when file is uploaded successfully */
  onUpload: (mxcUrl: string, file: File) => void;
  /** Callback when upload fails */
  onError?: (error: string) => void;
  /** Current value (mxc:// URL) */
  value?: string;
  /** Clear the current value */
  onClear?: () => void;
  /** Upload type - images only or any file */
  type?: "image" | "file";
  /** Maximum file size in bytes (default 4MB for images, 100MB for files) */
  maxSize?: number;
  /** Custom placeholder text */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** CSS class for container */
  className?: string;
}

export function MatrixFileUpload({
  onUpload,
  onError,
  value,
  onClear,
  type = "image",
  maxSize,
  placeholder,
  disabled,
  className = "",
}: MatrixFileUploadProps) {
  const { session } = useMatrixAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const homeserverUrl = session?.homeserverUrl || process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL || "";
  const accessToken = session?.accessToken;

  const defaultMaxSize = type === "image" ? 4 * 1024 * 1024 : 100 * 1024 * 1024;
  const effectiveMaxSize = maxSize || defaultMaxSize;

  const acceptTypes = type === "image" 
    ? ALLOWED_IMAGE_TYPES.join(",")
    : undefined; // Accept all for file type

  const handleFile = useCallback(async (file: File) => {
    if (!accessToken) {
      onError?.("Not authenticated. Please sign in.");
      return;
    }

    // Validate file
    const validation = type === "image" 
      ? validateImageFile(file, effectiveMaxSize)
      : validateFile(file, { maxSize: effectiveMaxSize });
    
    if (!validation.valid) {
      onError?.(validation.error || "Invalid file");
      return;
    }

    setIsUploading(true);
    
    try {
      const result = await uploadMedia(file, accessToken, homeserverUrl);
      onUpload(result.contentUri, file);
    } catch (err) {
      const error = err as MediaUploadError;
      onError?.(error.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }, [accessToken, homeserverUrl, type, effectiveMaxSize, onUpload, onError]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset input so same file can be selected again
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  // Show uploaded image
  if (value && type === "image") {
    const httpUrl = mxcToHttpUrl(value, homeserverUrl);
    
    return (
      <div className={`relative inline-block ${className}`}>
        <div className="relative h-20 w-20">
          {httpUrl && (
            <Image
              fill
              src={httpUrl}
              alt="Uploaded image"
              className="rounded-full object-cover"
            />
          )}
        </div>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute -top-1 -right-1 bg-rose-500 text-white p-1 rounded-full shadow-sm hover:bg-rose-600 transition-colors"
            disabled={disabled}
            role="button"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  // Show uploaded file
  if (value && type === "file") {
    return (
      <div className={`relative flex items-center p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg ${className}`}>
        <FileIcon className="h-8 w-8 text-indigo-500" />
        <span className="ml-2 text-sm text-zinc-700 dark:text-zinc-300 truncate max-w-[200px]">
          {value}
        </span>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="ml-auto bg-rose-500 text-white p-1 rounded-full shadow-sm hover:bg-rose-600 transition-colors"
            disabled={disabled}
            role="button"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  // Upload dropzone
  return (
    <div
      className={`
        relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
        flex flex-col items-center
        ${dragActive 
          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" 
          : "border-zinc-300 dark:border-zinc-600 hover:border-indigo-400"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${className}
      `}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={disabled ? undefined : handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={acceptTypes}
        onChange={handleInputChange}
        disabled={disabled || isUploading}
        className="hidden"
      />
      
      {isUploading ? (
        <>
          <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mx-auto" role="status" />
          <p className="mt-2 text-sm text-zinc-500">Uploading...</p>
        </>
      ) : (
        <>
          {type === "image" ? (
            <ImageIcon className="h-10 w-10 text-zinc-400 mx-auto" />
          ) : (
            <Upload className="h-10 w-10 text-zinc-400 mx-auto" />
          )}
          <p className="mt-2 text-sm text-indigo-500 font-medium">
            {placeholder || "Choose files or drag and drop"}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {type === "image" 
              ? `Image (${Math.round(effectiveMaxSize / 1024 / 1024)}MB)`
              : `Max ${Math.round(effectiveMaxSize / 1024 / 1024)}MB`
            }
          </p>
        </>
      )}
    </div>
  );
}
