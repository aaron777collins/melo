/**
 * Upload Queue Types
 * BDV2-US-2.3: Upload Queue Management
 */

export type UploadStatus = 
  | 'queued'
  | 'uploading'
  | 'complete'
  | 'failed'
  | 'cancelled';

export interface QueueItem {
  id: string;
  file: File;
  filename: string;
  size: number;
  status: UploadStatus;
  progress: number;
  error?: string;
  addedAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface QueueStats {
  total: number;
  queued: number;
  uploading: number;
  complete: number;
  failed: number;
  cancelled: number;
  overallProgress: number;
}

export interface SerializedQueueItem {
  id: string;
  filename: string;
  size: number;
  status: UploadStatus;
  progress: number;
  error?: string;
  addedAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface QueueManagerConfig {
  projectId: string;
  maxConcurrent?: number;
  maxQueueSize?: number;
  persistKey?: string;
}

export interface QueueManagerState {
  items: QueueItem[];
  isProcessing: boolean;
}

export type QueueEventType = 
  | 'itemAdded'
  | 'itemStatusChanged'
  | 'itemProgress'
  | 'itemRemoved'
  | 'queueCleared'
  | 'processingStarted'
  | 'processingStopped';

export interface QueueEvent {
  type: QueueEventType;
  itemId?: string;
  data?: unknown;
}

export type QueueEventHandler = (event: QueueEvent) => void;

export interface UploadQueueContextValue {
  items: QueueItem[];
  stats: QueueStats;
  isProcessing: boolean;
  addFiles: (files: File[]) => void;
  cancelItem: (id: string) => void;
  retryItem: (id: string) => void;
  clearCompleted: () => void;
  cancelAll: () => void;
  startProcessing: () => void;
  stopProcessing: () => void;
}
