"use client";

/**
 * Message File Upload Modal
 * 
 * Handles file uploads using Matrix's native media API.
 * Files are uploaded to the Matrix homeserver and sent as m.file/m.image/m.video/m.audio messages.
 */

import React, { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { FileIcon, ImageIcon, VideoIcon, Music, Upload, X, Loader2, AlertCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useModal } from "@/hooks/use-modal-store";
import { useMatrixClient } from "@/hooks/use-matrix-client";

// =============================================================================
// Types
// =============================================================================

interface FilePreview {
  file: File;
  previewUrl: string | null;
  type: "image" | "video" | "audio" | "file";
}

// =============================================================================
// Constants
// =============================================================================

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_TYPES = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
  video: ["video/mp4", "video/webm", "video/ogg", "video/quicktime"],
  audio: ["audio/mpeg", "audio/ogg", "audio/wav", "audio/webm", "audio/flac"],
};

// =============================================================================
// Helper Functions
// =============================================================================

function getFileType(mimeType: string): "image" | "video" | "audio" | "file" {
  if (ALLOWED_TYPES.image.includes(mimeType)) return "image";
  if (ALLOWED_TYPES.video.includes(mimeType)) return "video";
  if (ALLOWED_TYPES.audio.includes(mimeType)) return "audio";
  return "file";
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(type: "image" | "video" | "audio" | "file") {
  switch (type) {
    case "image":
      return <ImageIcon className="w-8 h-8" />;
    case "video":
      return <VideoIcon className="w-8 h-8" />;
    case "audio":
      return <Music className="w-8 h-8" />;
    default:
      return <FileIcon className="w-8 h-8" />;
  }
}

// =============================================================================
// Component
// =============================================================================

export function MessageFileModal() {
  const { isOpen, onClose, type, data } = useModal();
  const matrixClient = useMatrixClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // State
  const [selectedFile, setSelectedFile] = useState<FilePreview | null>(null);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const isModalOpen = isOpen && type === "messageFile";
  const roomId = data?.roomId as string | undefined;

  // =============================================================================
  // Handlers
  // =============================================================================

  const handleClose = useCallback(() => {
    if (!isUploading) {
      setSelectedFile(null);
      setCaption("");
      setError(null);
      setUploadProgress(0);
      onClose();
    }
  }, [isUploading, onClose]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`);
      return;
    }

    const fileType = getFileType(file.type);
    let previewUrl: string | null = null;

    // Create preview for images and videos
    if (fileType === "image" || fileType === "video") {
      previewUrl = URL.createObjectURL(file);
    }

    setSelectedFile({
      file,
      previewUrl,
      type: fileType,
    });
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    setError(null);

    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`);
      return;
    }

    const fileType = getFileType(file.type);
    let previewUrl: string | null = null;

    if (fileType === "image" || fileType === "video") {
      previewUrl = URL.createObjectURL(file);
    }

    setSelectedFile({
      file,
      previewUrl,
      type: fileType,
    });
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !roomId || !matrixClient?.client) {
      setError("Missing required data for upload");
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const client = matrixClient.client;

      // Upload file to Matrix media repository
      const uploadResponse = await client.uploadContent(selectedFile.file, {
        name: selectedFile.file.name,
        type: selectedFile.file.type,
        progressHandler: (progress) => {
          setUploadProgress(Math.round((progress.loaded / progress.total) * 100));
        },
      });

      const mxcUrl = uploadResponse.content_uri;

      // Determine message type based on file type
      let msgtype: string;
      let content: Record<string, unknown> = {
        body: caption || selectedFile.file.name,
        url: mxcUrl,
        info: {
          mimetype: selectedFile.file.type,
          size: selectedFile.file.size,
        },
      };

      switch (selectedFile.type) {
        case "image":
          msgtype = "m.image";
          // For images, we could add dimensions if we read them
          break;
        case "video":
          msgtype = "m.video";
          break;
        case "audio":
          msgtype = "m.audio";
          break;
        default:
          msgtype = "m.file";
          content.filename = selectedFile.file.name;
      }

      // Send the message
      await client.sendMessage(roomId, {
        msgtype,
        ...content,
      });

      // Close modal on success
      handleClose();
      
    } catch (err) {
      console.error("File upload error:", err);
      setError(
        err instanceof Error
          ? `Upload failed: ${err.message}`
          : "Failed to upload file. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, roomId, matrixClient, caption, handleClose]);

  const handleRemoveFile = useCallback(() => {
    if (selectedFile?.previewUrl) {
      URL.revokeObjectURL(selectedFile.previewUrl);
    }
    setSelectedFile(null);
    setError(null);
  }, [selectedFile]);

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload File
          </DialogTitle>
          <DialogDescription>
            Upload a file to share in this conversation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* File Selection / Preview */}
          {!selectedFile ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">
                Click to select or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                Max file size: {formatFileSize(MAX_FILE_SIZE)}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Preview */}
              <div className="relative bg-muted rounded-lg p-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 h-6 w-6 p-0"
                  onClick={handleRemoveFile}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-4">
                  {/* Preview Thumbnail or Icon */}
                  {selectedFile.previewUrl && selectedFile.type === "image" ? (
                    <img
                      src={selectedFile.previewUrl}
                      alt="Preview"
                      className="w-16 h-16 object-cover rounded"
                    />
                  ) : selectedFile.previewUrl && selectedFile.type === "video" ? (
                    <video
                      src={selectedFile.previewUrl}
                      className="w-16 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-background rounded flex items-center justify-center text-muted-foreground">
                      {getFileIcon(selectedFile.type)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {selectedFile.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(selectedFile.file.size)} • {selectedFile.file.type || "Unknown type"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Caption Input */}
              <div className="space-y-2">
                <Label htmlFor="caption">Caption (optional)</Label>
                <Input
                  id="caption"
                  placeholder="Add a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  disabled={isUploading}
                />
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
