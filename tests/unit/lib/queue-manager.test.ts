/**
 * Queue Manager Unit Tests
 * BDV2-US-2.3: Upload Queue Management
 * TDD: RED → GREEN → REFACTOR
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UploadQueueManager } from '@/lib/upload/queue-manager';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock File
const createMockFile = (name: string, size: number, type = 'video/mp4'): File => {
  const blob = new Blob(['x'.repeat(size)], { type });
  return new File([blob], name, { type });
};

describe('UploadQueueManager', () => {
  let manager: UploadQueueManager;

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    manager = new UploadQueueManager({
      projectId: 'test-project',
      maxConcurrent: 1,
      maxQueueSize: 100,
    });
  });

  describe('initialization', () => {
    it('should create an empty queue for new project', () => {
      const stats = manager.getStats();
      expect(stats.total).toBe(0);
      expect(stats.queued).toBe(0);
    });

    it('should restore queue from localStorage if exists', () => {
      const savedQueue = [{
        id: 'test-1',
        filename: 'video.mp4',
        size: 1024,
        status: 'queued',
        progress: 0,
        addedAt: Date.now(),
      }];
      localStorageMock.setItem('upload-queue-test-project', JSON.stringify(savedQueue));
      
      const newManager = new UploadQueueManager({
        projectId: 'test-project',
        maxConcurrent: 1,
      });
      
      const items = newManager.getItems();
      expect(items).toHaveLength(1);
      expect(items[0].filename).toBe('video.mp4');
    });
  });

  describe('addFiles', () => {
    it('should add multiple files to the queue in order', () => {
      const files = [
        createMockFile('video1.mp4', 1024),
        createMockFile('video2.mp4', 2048),
        createMockFile('video3.mp4', 3072),
      ];
      
      manager.addFiles(files);
      const items = manager.getItems();
      
      expect(items).toHaveLength(3);
      expect(items[0].filename).toBe('video1.mp4');
      expect(items[1].filename).toBe('video2.mp4');
      expect(items[2].filename).toBe('video3.mp4');
    });

    it('should set status to queued for new items', () => {
      const file = createMockFile('video.mp4', 1024);
      manager.addFiles([file]);
      
      const items = manager.getItems();
      expect(items[0].status).toBe('queued');
      expect(items[0].progress).toBe(0);
    });

    it('should persist queue to localStorage after adding files', () => {
      const file = createMockFile('video.mp4', 1024);
      manager.addFiles([file]);
      
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should reject adding beyond max queue size', () => {
      const smallManager = new UploadQueueManager({
        projectId: 'test-project',
        maxQueueSize: 2,
      });
      
      const files = [
        createMockFile('video1.mp4', 1024),
        createMockFile('video2.mp4', 1024),
        createMockFile('video3.mp4', 1024),
      ];
      
      const added = smallManager.addFiles(files);
      expect(added).toBe(2);
      expect(smallManager.getItems()).toHaveLength(2);
    });

    it('should generate unique IDs for each item', () => {
      const files = [
        createMockFile('video1.mp4', 1024),
        createMockFile('video2.mp4', 1024),
      ];
      
      manager.addFiles(files);
      const items = manager.getItems();
      
      expect(items[0].id).not.toBe(items[1].id);
    });
  });

  describe('getStats', () => {
    it('should calculate correct statistics', () => {
      const files = [
        createMockFile('video1.mp4', 1000),
        createMockFile('video2.mp4', 2000),
        createMockFile('video3.mp4', 3000),
      ];
      
      manager.addFiles(files);
      
      // Manually set different statuses
      manager.setItemStatus(manager.getItems()[0].id, 'complete');
      manager.setItemStatus(manager.getItems()[1].id, 'uploading');
      
      const stats = manager.getStats();
      expect(stats.total).toBe(3);
      expect(stats.complete).toBe(1);
      expect(stats.uploading).toBe(1);
      expect(stats.queued).toBe(1);
    });

    it('should return formatted summary string', () => {
      const files = [
        createMockFile('video1.mp4', 1000),
        createMockFile('video2.mp4', 2000),
      ];
      
      manager.addFiles(files);
      manager.setItemStatus(manager.getItems()[0].id, 'complete');
      
      const summary = manager.getSummary();
      expect(summary).toBe('1 of 2 complete');
    });
  });

  describe('cancelItem', () => {
    it('should cancel a queued item', () => {
      const file = createMockFile('video.mp4', 1024);
      manager.addFiles([file]);
      const itemId = manager.getItems()[0].id;
      
      manager.cancelItem(itemId);
      
      expect(manager.getItems()[0].status).toBe('cancelled');
    });

    it('should cancel an uploading item', () => {
      const file = createMockFile('video.mp4', 1024);
      manager.addFiles([file]);
      const itemId = manager.getItems()[0].id;
      
      manager.setItemStatus(itemId, 'uploading');
      manager.cancelItem(itemId);
      
      expect(manager.getItems()[0].status).toBe('cancelled');
    });

    it('should not cancel a completed item', () => {
      const file = createMockFile('video.mp4', 1024);
      manager.addFiles([file]);
      const itemId = manager.getItems()[0].id;
      
      manager.setItemStatus(itemId, 'complete');
      manager.cancelItem(itemId);
      
      expect(manager.getItems()[0].status).toBe('complete');
    });
  });

  describe('retryItem', () => {
    it('should reset failed item to queued status', () => {
      const file = createMockFile('video.mp4', 1024);
      manager.addFiles([file]);
      const itemId = manager.getItems()[0].id;
      
      manager.setItemStatus(itemId, 'failed');
      manager.setItemError(itemId, 'Network error');
      
      manager.retryItem(itemId);
      
      const item = manager.getItems()[0];
      expect(item.status).toBe('queued');
      expect(item.progress).toBe(0);
      expect(item.error).toBeUndefined();
    });

    it('should not retry non-failed items', () => {
      const file = createMockFile('video.mp4', 1024);
      manager.addFiles([file]);
      const itemId = manager.getItems()[0].id;
      
      manager.setItemStatus(itemId, 'uploading');
      manager.retryItem(itemId);
      
      expect(manager.getItems()[0].status).toBe('uploading');
    });
  });

  describe('clearCompleted', () => {
    it('should remove all completed and cancelled items', () => {
      const files = [
        createMockFile('video1.mp4', 1000),
        createMockFile('video2.mp4', 2000),
        createMockFile('video3.mp4', 3000),
        createMockFile('video4.mp4', 4000),
      ];
      
      manager.addFiles(files);
      const items = manager.getItems();
      
      manager.setItemStatus(items[0].id, 'complete');
      manager.setItemStatus(items[1].id, 'cancelled');
      manager.setItemStatus(items[2].id, 'failed');
      // items[3] stays queued
      
      manager.clearCompleted();
      
      const remainingItems = manager.getItems();
      expect(remainingItems).toHaveLength(2); // failed + queued
      expect(remainingItems.find(i => i.status === 'complete')).toBeUndefined();
      expect(remainingItems.find(i => i.status === 'cancelled')).toBeUndefined();
    });

    it('should persist after clearing', () => {
      const file = createMockFile('video.mp4', 1024);
      manager.addFiles([file]);
      manager.setItemStatus(manager.getItems()[0].id, 'complete');
      
      vi.clearAllMocks();
      manager.clearCompleted();
      
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('getNextQueuedItem', () => {
    it('should return the first queued item', () => {
      const files = [
        createMockFile('video1.mp4', 1000),
        createMockFile('video2.mp4', 2000),
      ];
      
      manager.addFiles(files);
      manager.setItemStatus(manager.getItems()[0].id, 'uploading');
      
      const next = manager.getNextQueuedItem();
      expect(next?.filename).toBe('video2.mp4');
    });

    it('should return null if no queued items', () => {
      const file = createMockFile('video.mp4', 1024);
      manager.addFiles([file]);
      manager.setItemStatus(manager.getItems()[0].id, 'complete');
      
      expect(manager.getNextQueuedItem()).toBeNull();
    });
  });

  describe('concurrent upload control', () => {
    it('should only allow configured number of concurrent uploads', () => {
      const files = [
        createMockFile('video1.mp4', 1000),
        createMockFile('video2.mp4', 2000),
        createMockFile('video3.mp4', 3000),
      ];
      
      manager.addFiles(files);
      const items = manager.getItems();
      
      // Start first upload
      manager.setItemStatus(items[0].id, 'uploading');
      
      // Check if we can start another
      expect(manager.canStartUpload()).toBe(false);
    });

    it('should allow more uploads when configured for higher concurrency', () => {
      const concurrentManager = new UploadQueueManager({
        projectId: 'test-project',
        maxConcurrent: 3,
      });
      
      const files = [
        createMockFile('video1.mp4', 1000),
        createMockFile('video2.mp4', 2000),
        createMockFile('video3.mp4', 3000),
      ];
      
      concurrentManager.addFiles(files);
      const items = concurrentManager.getItems();
      
      concurrentManager.setItemStatus(items[0].id, 'uploading');
      expect(concurrentManager.canStartUpload()).toBe(true);
      
      concurrentManager.setItemStatus(items[1].id, 'uploading');
      expect(concurrentManager.canStartUpload()).toBe(true);
      
      concurrentManager.setItemStatus(items[2].id, 'uploading');
      expect(concurrentManager.canStartUpload()).toBe(false);
    });
  });

  describe('progress tracking', () => {
    it('should update item progress', () => {
      const file = createMockFile('video.mp4', 1024);
      manager.addFiles([file]);
      const itemId = manager.getItems()[0].id;
      
      manager.setItemProgress(itemId, 50);
      
      expect(manager.getItems()[0].progress).toBe(50);
    });

    it('should calculate overall progress', () => {
      const files = [
        createMockFile('video1.mp4', 1000),
        createMockFile('video2.mp4', 1000),
      ];
      
      manager.addFiles(files);
      const items = manager.getItems();
      
      manager.setItemStatus(items[0].id, 'complete');
      manager.setItemProgress(items[0].id, 100);
      manager.setItemProgress(items[1].id, 50);
      
      const stats = manager.getStats();
      expect(stats.overallProgress).toBe(75); // (100 + 50) / 2
    });
  });

  describe('error handling', () => {
    it('should store error message on failed items', () => {
      const file = createMockFile('video.mp4', 1024);
      manager.addFiles([file]);
      const itemId = manager.getItems()[0].id;
      
      manager.setItemStatus(itemId, 'failed');
      manager.setItemError(itemId, 'Upload failed: network timeout');
      
      const item = manager.getItems()[0];
      expect(item.error).toBe('Upload failed: network timeout');
    });
  });

  describe('cancelAll', () => {
    it('should cancel all queued and uploading items', () => {
      const files = [
        createMockFile('video1.mp4', 1000),
        createMockFile('video2.mp4', 2000),
        createMockFile('video3.mp4', 3000),
      ];
      
      manager.addFiles(files);
      const items = manager.getItems();
      
      manager.setItemStatus(items[0].id, 'uploading');
      manager.setItemStatus(items[1].id, 'complete');
      // items[2] stays queued
      
      manager.cancelAll();
      
      const updatedItems = manager.getItems();
      expect(updatedItems[0].status).toBe('cancelled'); // was uploading
      expect(updatedItems[1].status).toBe('complete'); // unchanged
      expect(updatedItems[2].status).toBe('cancelled'); // was queued
    });
  });

  describe('serialization', () => {
    it('should serialize queue without File objects', () => {
      const file = createMockFile('video.mp4', 1024);
      manager.addFiles([file]);
      
      const serialized = manager.serialize();
      expect(serialized[0]).not.toHaveProperty('file');
      expect(serialized[0].filename).toBe('video.mp4');
    });

    it('should restore queue from serialized data', () => {
      const serialized = [{
        id: 'test-123',
        filename: 'restored.mp4',
        size: 5000,
        status: 'queued' as const,
        progress: 0,
        addedAt: Date.now(),
      }];
      
      localStorageMock.setItem('upload-queue-restore-project', JSON.stringify(serialized));
      
      const restoredManager = new UploadQueueManager({
        projectId: 'restore-project',
      });
      
      const items = restoredManager.getItems();
      expect(items).toHaveLength(1);
      expect(items[0].filename).toBe('restored.mp4');
      expect(items[0].file).toBeUndefined();
    });
  });
});
