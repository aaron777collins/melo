/**
 * Upload Queue Manager
 * BDV2-US-2.3: Upload Queue Management
 * 
 * Manages the state and persistence of the upload queue.
 */

import {
  QueueItem,
  QueueStats,
  SerializedQueueItem,
  QueueManagerConfig,
  UploadStatus,
  QueueEvent,
  QueueEventHandler,
} from '@/types/upload-queue';

export class UploadQueueManager {
  private items: QueueItem[] = [];
  private projectId: string;
  private maxConcurrent: number;
  private maxQueueSize: number;
  private persistKey: string;
  private eventHandlers: QueueEventHandler[] = [];

  constructor(config: QueueManagerConfig) {
    this.projectId = config.projectId;
    this.maxConcurrent = config.maxConcurrent ?? 1;
    this.maxQueueSize = config.maxQueueSize ?? 100;
    this.persistKey = config.persistKey ?? `upload-queue-${config.projectId}`;
    
    this.restore();
  }

  /**
   * Generate a unique ID for queue items
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Persist queue to localStorage
   */
  private persist(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const serialized = this.serialize();
      localStorage.setItem(this.persistKey, JSON.stringify(serialized));
    } catch (error) {
      console.error('Failed to persist queue:', error);
    }
  }

  /**
   * Restore queue from localStorage
   */
  private restore(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.persistKey);
      if (stored) {
        const serialized: SerializedQueueItem[] = JSON.parse(stored);
        this.items = serialized.map(item => ({
          ...item,
          file: undefined as unknown as File, // File can't be restored
        }));
      }
    } catch (error) {
      console.error('Failed to restore queue:', error);
      this.items = [];
    }
  }

  /**
   * Emit an event to all registered handlers
   */
  private emit(event: QueueEvent): void {
    this.eventHandlers.forEach(handler => handler(event));
  }

  /**
   * Subscribe to queue events
   */
  subscribe(handler: QueueEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      this.eventHandlers = this.eventHandlers.filter(h => h !== handler);
    };
  }

  /**
   * Add files to the queue
   * Returns the number of files actually added
   */
  addFiles(files: File[]): number {
    const availableSlots = this.maxQueueSize - this.items.length;
    const filesToAdd = files.slice(0, availableSlots);
    
    const newItems: QueueItem[] = filesToAdd.map(file => ({
      id: this.generateId(),
      file,
      filename: file.name,
      size: file.size,
      status: 'queued' as UploadStatus,
      progress: 0,
      addedAt: Date.now(),
    }));

    this.items = [...this.items, ...newItems];
    this.persist();

    newItems.forEach(item => {
      this.emit({ type: 'itemAdded', itemId: item.id });
    });

    return filesToAdd.length;
  }

  /**
   * Get all queue items
   */
  getItems(): QueueItem[] {
    return [...this.items];
  }

  /**
   * Get a specific item by ID
   */
  getItem(id: string): QueueItem | undefined {
    return this.items.find(item => item.id === id);
  }

  /**
   * Set item status
   */
  setItemStatus(id: string, status: UploadStatus): void {
    const item = this.items.find(i => i.id === id);
    if (!item) return;

    item.status = status;
    
    if (status === 'uploading' && !item.startedAt) {
      item.startedAt = Date.now();
    }
    
    if (status === 'complete' || status === 'failed') {
      item.completedAt = Date.now();
    }

    this.persist();
    this.emit({ type: 'itemStatusChanged', itemId: id, data: { status } });
  }

  /**
   * Set item progress (0-100)
   */
  setItemProgress(id: string, progress: number): void {
    const item = this.items.find(i => i.id === id);
    if (!item) return;

    item.progress = Math.min(100, Math.max(0, progress));
    this.emit({ type: 'itemProgress', itemId: id, data: { progress: item.progress } });
  }

  /**
   * Set item error message
   */
  setItemError(id: string, error: string): void {
    const item = this.items.find(i => i.id === id);
    if (!item) return;

    item.error = error;
    this.persist();
  }

  /**
   * Cancel a queue item
   */
  cancelItem(id: string): void {
    const item = this.items.find(i => i.id === id);
    if (!item) return;

    // Can only cancel queued or uploading items
    if (item.status === 'queued' || item.status === 'uploading') {
      item.status = 'cancelled';
      item.completedAt = Date.now();
      this.persist();
      this.emit({ type: 'itemStatusChanged', itemId: id, data: { status: 'cancelled' } });
    }
  }

  /**
   * Retry a failed item
   */
  retryItem(id: string): void {
    const item = this.items.find(i => i.id === id);
    if (!item) return;

    // Can only retry failed items
    if (item.status === 'failed') {
      item.status = 'queued';
      item.progress = 0;
      item.error = undefined;
      item.startedAt = undefined;
      item.completedAt = undefined;
      this.persist();
      this.emit({ type: 'itemStatusChanged', itemId: id, data: { status: 'queued' } });
    }
  }

  /**
   * Clear completed and cancelled items
   */
  clearCompleted(): void {
    const removedIds = this.items
      .filter(i => i.status === 'complete' || i.status === 'cancelled')
      .map(i => i.id);

    this.items = this.items.filter(
      item => item.status !== 'complete' && item.status !== 'cancelled'
    );
    
    this.persist();
    removedIds.forEach(id => {
      this.emit({ type: 'itemRemoved', itemId: id });
    });
  }

  /**
   * Cancel all queued and uploading items
   */
  cancelAll(): void {
    this.items.forEach(item => {
      if (item.status === 'queued' || item.status === 'uploading') {
        item.status = 'cancelled';
        item.completedAt = Date.now();
        this.emit({ type: 'itemStatusChanged', itemId: item.id, data: { status: 'cancelled' } });
      }
    });
    
    this.persist();
  }

  /**
   * Get the next queued item for processing
   */
  getNextQueuedItem(): QueueItem | null {
    return this.items.find(item => item.status === 'queued') ?? null;
  }

  /**
   * Check if we can start another upload
   */
  canStartUpload(): boolean {
    const currentlyUploading = this.items.filter(
      item => item.status === 'uploading'
    ).length;
    
    return currentlyUploading < this.maxConcurrent;
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const stats: QueueStats = {
      total: this.items.length,
      queued: 0,
      uploading: 0,
      complete: 0,
      failed: 0,
      cancelled: 0,
      overallProgress: 0,
    };

    let totalProgress = 0;

    this.items.forEach(item => {
      switch (item.status) {
        case 'queued':
          stats.queued++;
          break;
        case 'uploading':
          stats.uploading++;
          break;
        case 'complete':
          stats.complete++;
          break;
        case 'failed':
          stats.failed++;
          break;
        case 'cancelled':
          stats.cancelled++;
          break;
      }
      totalProgress += item.progress;
    });

    stats.overallProgress = this.items.length > 0 
      ? Math.round(totalProgress / this.items.length) 
      : 0;

    return stats;
  }

  /**
   * Get summary string (e.g., "2 of 5 complete")
   */
  getSummary(): string {
    const stats = this.getStats();
    return `${stats.complete} of ${stats.total} complete`;
  }

  /**
   * Serialize queue for persistence (without File objects)
   */
  serialize(): SerializedQueueItem[] {
    return this.items.map(item => ({
      id: item.id,
      filename: item.filename,
      size: item.size,
      status: item.status,
      progress: item.progress,
      error: item.error,
      addedAt: item.addedAt,
      startedAt: item.startedAt,
      completedAt: item.completedAt,
    }));
  }

  /**
   * Clear the entire queue
   */
  clear(): void {
    this.items = [];
    this.persist();
    this.emit({ type: 'queueCleared' });
  }
}
