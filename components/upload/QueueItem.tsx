'use client';

/**
 * Queue Item Component
 * BDV2-US-2.3: Upload Queue Management
 * 
 * Displays a single upload queue item with progress, status, and actions.
 */

import React from 'react';
import { X, RotateCcw, CheckCircle, AlertCircle, Loader2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { QueueItem as QueueItemType, UploadStatus } from '@/types/upload-queue';

interface QueueItemProps {
  item: QueueItemType;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function StatusIcon({ status }: { status: UploadStatus }) {
  switch (status) {
    case 'queued':
      return <Clock className="h-4 w-4 text-gray-400" />;
    case 'uploading':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'complete':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'cancelled':
      return <X className="h-4 w-4 text-gray-400" />;
    default:
      return null;
  }
}

function getStatusText(status: UploadStatus): string {
  switch (status) {
    case 'queued':
      return 'Waiting...';
    case 'uploading':
      return 'Uploading...';
    case 'complete':
      return 'Complete';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return '';
  }
}

export function QueueItem({ item, onCancel, onRetry }: QueueItemProps) {
  const canCancel = item.status === 'queued' || item.status === 'uploading';
  const canRetry = item.status === 'failed';

  return (
    <div
      data-testid="queue-item"
      data-item-id={item.id}
      className={cn(
        'p-3 rounded-lg border transition-colors',
        item.status === 'failed' && 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950',
        item.status === 'complete' && 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950',
        item.status === 'cancelled' && 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 opacity-60',
        (item.status === 'queued' || item.status === 'uploading') && 'border-gray-200 dark:border-gray-700'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className="mt-0.5">
          <StatusIcon status={item.status} />
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span
              data-testid="queue-item-filename"
              className="font-medium text-sm truncate"
              title={item.filename}
            >
              {item.filename}
            </span>
            <span
              data-testid="queue-item-size"
              className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap"
            >
              {formatFileSize(item.size)}
            </span>
          </div>

          {/* Status Text */}
          <div className="flex items-center gap-2 mt-1">
            <span
              data-testid="queue-item-status"
              className={cn(
                'text-xs',
                item.status === 'failed' && 'text-red-600 dark:text-red-400',
                item.status === 'complete' && 'text-green-600 dark:text-green-400',
                item.status === 'cancelled' && 'text-gray-500',
                (item.status === 'queued' || item.status === 'uploading') && 'text-gray-500 dark:text-gray-400'
              )}
            >
              {getStatusText(item.status)}
            </span>
          </div>

          {/* Progress Bar */}
          {(item.status === 'uploading' || item.status === 'queued') && (
            <div data-testid="queue-item-progress" className="mt-2">
              <Progress value={item.progress} className="h-1.5" />
            </div>
          )}

          {/* Error Message */}
          {item.error && (
            <div
              data-testid="queue-item-error"
              className="mt-1 text-xs text-red-600 dark:text-red-400"
            >
              {item.error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {canRetry && (
            <Button
              data-testid="queue-item-retry"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onRetry(item.id)}
              title="Retry upload"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          {canCancel && (
            <Button
              data-testid="queue-item-cancel"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-500 hover:text-red-500"
              onClick={() => onCancel(item.id)}
              title="Cancel upload"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
