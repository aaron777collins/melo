"use client";

import React, { useState } from "react";
import { FileUpload } from "@/apps/web/components/file-upload";
import { useModal } from "@/hooks/use-modal-store";
import { sendFile } from "@/apps/web/services/matrix-message";
import type { MxcUrl } from "@/lib/matrix/types/media";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// =============================================================================
// Types
// =============================================================================

interface MessageFileModalData {
  roomId?: string;
  onFileUploaded?: (mxcUrl: string, file: File) => void;
}

// =============================================================================
// Component
// =============================================================================

export function MessageFileModal() {
  const {
    isOpen,
    onClose,
    type,
    data
  } = useModal();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    file: File;
    mxcUrl: MxcUrl;
  } | null>(null);

  const isModalOpen = isOpen && type === "messageFile";
  
  // Type-safe data access
  const modalData = data as MessageFileModalData;
  const { roomId, onFileUploaded } = modalData;

  // =============================================================================
  // Event Handlers
  // =============================================================================

  const handleClose = () => {
    setUploadedFile(null);
    setIsUploading(false);
    onClose();
  };

  const handleUploadComplete = (mxcUrl: MxcUrl, file: File) => {
    setUploadedFile({ file, mxcUrl });
    setIsUploading(false);
  };

  const handleUploadError = (error: Error, file: File) => {
    console.error('[MessageFileModal] Upload failed:', error);
    setIsUploading(false);
    // TODO: Show error toast
  };

  const handleSendFile = async () => {
    if (!uploadedFile || !roomId) {
      return;
    }

    setIsUploading(true);

    try {
      // Send the file as a message via Matrix
      const eventId = await sendFile(roomId, uploadedFile.file);
      
      // Notify parent component
      onFileUploaded?.(uploadedFile.mxcUrl as string, uploadedFile.file);
      
      // Close modal on success
      handleClose();
      
    } catch (error) {
      console.error('[MessageFileModal] Failed to send file:', error);
      setIsUploading(false);
      // TODO: Show error toast
    }
  };

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white dark:bg-zinc-900 text-black dark:text-white p-0 overflow-hidden max-w-md">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold">
            Upload File
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-500 dark:text-zinc-400">
            Choose a file to upload and send as a message.
          </DialogDescription>
        </DialogHeader>
        
        <div className="px-6 pb-6">
          <FileUpload
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            showPreview={true}
            className="w-full"
            placeholder="Click to upload or drag and drop"
          />
          
          {/* Send button (only show when file is uploaded) */}
          {uploadedFile && (
            <div className="mt-4 flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendFile}
                disabled={isUploading}
                className="bg-indigo-500 hover:bg-indigo-600"
              >
                {isUploading ? 'Sending...' : 'Send File'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
