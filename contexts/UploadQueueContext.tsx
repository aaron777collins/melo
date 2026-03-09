'use client';

/**
 * Upload Queue Context
 * BDV2-US-2.3: Upload Queue Management
 * 
 * Provides upload queue state and actions to the component tree.
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  useRef,
} from 'react';
import { UploadQueueManager } from '@/lib/upload/queue-manager';
import {
  QueueItem,
  QueueStats,
  UploadQueueContextValue,
} from '@/types/upload-queue';

const UploadQueueContext = createContext<UploadQueueContextValue | null>(null);

interface UploadQueueProviderProps {
  projectId: string;
  maxConcurrent?: number;
  maxQueueSize?: number;
  onUpload?: (item: QueueItem) => Promise<void>;
  children: React.ReactNode;
}

export function UploadQueueProvider({
  projectId,
  maxConcurrent = 1,
  maxQueueSize = 100,
  onUpload,
  children,
}: UploadQueueProviderProps) {
  const managerRef = useRef<UploadQueueManager | null>(null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);

  // Initialize manager
  useEffect(() => {
    managerRef.current = new UploadQueueManager({
      projectId,
      maxConcurrent,
      maxQueueSize,
    });
    
    // Subscribe to events
    const unsubscribe = managerRef.current.subscribe(() => {
      if (managerRef.current) {
        setItems(managerRef.current.getItems());
      }
    });

    // Initial load
    setItems(managerRef.current.getItems());

    return () => {
      unsubscribe();
    };
  }, [projectId, maxConcurrent, maxQueueSize]);

  // Process queue
  const processQueue = useCallback(async () => {
    const manager = managerRef.current;
    if (!manager || !onUpload) return;

    while (processingRef.current) {
      if (!manager.canStartUpload()) {
        // Wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }

      const nextItem = manager.getNextQueuedItem();
      if (!nextItem) {
        // No more items to process
        break;
      }

      // Start upload
      manager.setItemStatus(nextItem.id, 'uploading');
      setItems(manager.getItems());

      try {
        await onUpload(nextItem);
        manager.setItemStatus(nextItem.id, 'complete');
        manager.setItemProgress(nextItem.id, 100);
      } catch (error) {
        manager.setItemStatus(nextItem.id, 'failed');
        manager.setItemError(
          nextItem.id,
          error instanceof Error ? error.message : 'Upload failed'
        );
      }

      setItems(manager.getItems());
    }

    processingRef.current = false;
    setIsProcessing(false);
  }, [onUpload]);

  const startProcessing = useCallback(() => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);
    processQueue();
  }, [processQueue]);

  const stopProcessing = useCallback(() => {
    processingRef.current = false;
    setIsProcessing(false);
  }, []);

  const addFiles = useCallback((files: File[]) => {
    const manager = managerRef.current;
    if (!manager) return;

    manager.addFiles(files);
    setItems(manager.getItems());

    // Auto-start processing if we have an upload handler
    if (onUpload && !processingRef.current) {
      startProcessing();
    }
  }, [onUpload, startProcessing]);

  const cancelItem = useCallback((id: string) => {
    const manager = managerRef.current;
    if (!manager) return;

    manager.cancelItem(id);
    setItems(manager.getItems());
  }, []);

  const retryItem = useCallback((id: string) => {
    const manager = managerRef.current;
    if (!manager) return;

    manager.retryItem(id);
    setItems(manager.getItems());

    // Restart processing if stopped
    if (onUpload && !processingRef.current) {
      startProcessing();
    }
  }, [onUpload, startProcessing]);

  const clearCompleted = useCallback(() => {
    const manager = managerRef.current;
    if (!manager) return;

    manager.clearCompleted();
    setItems(manager.getItems());
  }, []);

  const cancelAll = useCallback(() => {
    const manager = managerRef.current;
    if (!manager) return;

    manager.cancelAll();
    setItems(manager.getItems());
    stopProcessing();
  }, [stopProcessing]);

  const stats: QueueStats = managerRef.current?.getStats() ?? {
    total: 0,
    queued: 0,
    uploading: 0,
    complete: 0,
    failed: 0,
    cancelled: 0,
    overallProgress: 0,
  };

  const value: UploadQueueContextValue = {
    items,
    stats,
    isProcessing,
    addFiles,
    cancelItem,
    retryItem,
    clearCompleted,
    cancelAll,
    startProcessing,
    stopProcessing,
  };

  return (
    <UploadQueueContext.Provider value={value}>
      {children}
    </UploadQueueContext.Provider>
  );
}

export function useUploadQueueContext(): UploadQueueContextValue {
  const context = useContext(UploadQueueContext);
  if (!context) {
    throw new Error(
      'useUploadQueueContext must be used within an UploadQueueProvider'
    );
  }
  return context;
}

export { UploadQueueContext };
