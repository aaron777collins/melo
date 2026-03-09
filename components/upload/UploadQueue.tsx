'use client';

/**
 * Upload Queue Component
 * BDV2-US-2.3: Upload Queue Management
 * 
 * Container component for the upload queue with summary, file input, and actions.
 */

import React, { useCallback, useRef } from 'react';
import { Upload, Trash2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QueueItem } from './QueueItem';
import { useUploadQueueContext } from '@/contexts/UploadQueueContext';

interface UploadQueueProps {
  className?: string;
  accept?: string;
  maxFiles?: number;
}

export function UploadQueue({
  className,
  accept = 'video/*',
  maxFiles = 50,
}: UploadQueueProps) {
  const {
    items,
    stats,
    addFiles,
    cancelItem,
    retryItem,
    clearCompleted,
    cancelAll,
  } = useUploadQueueContext();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (files.length > 0) {
        addFiles(files.slice(0, maxFiles));
      }
      // Reset input so the same file can be selected again
      event.target.value = '';
    },
    [addFiles, maxFiles]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const files = Array.from(event.dataTransfer.files);
      if (files.length > 0) {
        addFiles(files.slice(0, maxFiles));
      }
    },
    [addFiles, maxFiles]
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dropZoneRef.current?.classList.add('border-blue-500', 'bg-blue-50', 'dark:bg-blue-950');
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dropZoneRef.current?.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-950');
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const hasCompletedItems = stats.complete > 0 || stats.cancelled > 0;
  const hasActiveItems = stats.queued > 0 || stats.uploading > 0;

  return (
    <div
      data-testid="upload-queue"
      className={cn('flex flex-col gap-4', className)}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        data-testid="file-input"
        className="hidden"
        accept={accept}
        multiple
        onChange={handleFileSelect}
      />

      {/* Drop Zone / Add Files */}
      <div
        ref={dropZoneRef}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          'border-gray-300 dark:border-gray-600',
          'hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950'
        )}
      >
        <Upload className="h-10 w-10 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Drag and drop files here, or click to select
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          Maximum {maxFiles} files per batch
        </p>
      </div>

      {/* Queue Summary */}
      {items.length > 0 && (
        <div data-testid="queue-summary" className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {stats.complete} of {stats.total} complete
            </span>
            <span className="text-xs text-gray-500">
              {stats.overallProgress}% overall
            </span>
          </div>
          <Progress value={stats.overallProgress} className="h-2" />

          {/* Stats breakdown */}
          <div className="flex gap-4 text-xs text-gray-500">
            {stats.queued > 0 && <span>{stats.queued} queued</span>}
            {stats.uploading > 0 && <span>{stats.uploading} uploading</span>}
            {stats.failed > 0 && (
              <span className="text-red-500">{stats.failed} failed</span>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {items.length > 0 && (
        <div className="flex gap-2">
          {hasCompletedItems && (
            <Button
              data-testid="clear-completed-button"
              variant="outline"
              size="sm"
              onClick={clearCompleted}
              className="flex items-center gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Clear Completed
            </Button>
          )}
          {hasActiveItems && (
            <Button
              data-testid="cancel-all-button"
              variant="outline"
              size="sm"
              onClick={cancelAll}
              className="flex items-center gap-1 text-red-600 hover:text-red-700"
            >
              <XCircle className="h-4 w-4" />
              Cancel All
            </Button>
          )}
        </div>
      )}

      {/* Queue Items */}
      {items.length > 0 && (
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2 pr-4">
            {items.map((item) => (
              <QueueItem
                key={item.id}
                item={item}
                onCancel={cancelItem}
                onRetry={retryItem}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Empty State */}
      {items.length === 0 && (
        <p className="text-center text-sm text-gray-500 py-4">
          No files in queue
        </p>
      )}
    </div>
  );
}
