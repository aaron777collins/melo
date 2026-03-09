'use client';

/**
 * Test Upload Queue Page
 * BDV2-US-2.3: Upload Queue Management
 * 
 * Test page for E2E testing the upload queue functionality.
 */

import { UploadQueueProvider } from '@/contexts/UploadQueueContext';
import { UploadQueue } from '@/components/upload/UploadQueue';
import { QueueItem } from '@/types/upload-queue';

// Mock upload function that simulates network delays
async function mockUpload(item: QueueItem): Promise<void> {
  // Simulate upload time based on file size
  const delay = Math.min(item.size / 100, 3000); // Max 3 seconds
  
  // 10% chance of failure for testing
  const shouldFail = Math.random() < 0.1;
  
  await new Promise((resolve) => setTimeout(resolve, delay));
  
  if (shouldFail) {
    throw new Error('Simulated upload failure');
  }
}

export default function TestUploadQueuePage() {
  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Upload Queue Test</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Test page for BDV2-US-2.3: Upload Queue Management
        </p>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <UploadQueueProvider
            projectId="test-project"
            maxConcurrent={1}
            maxQueueSize={50}
            onUpload={mockUpload}
          >
            <UploadQueue accept="video/*,image/*" maxFiles={20} />
          </UploadQueueProvider>
        </div>

        <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
          <p>Test IDs available:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>upload-queue</li>
            <li>queue-summary</li>
            <li>queue-item</li>
            <li>queue-item-filename</li>
            <li>queue-item-size</li>
            <li>queue-item-status</li>
            <li>queue-item-progress</li>
            <li>queue-item-cancel</li>
            <li>queue-item-retry</li>
            <li>queue-item-error</li>
            <li>clear-completed-button</li>
            <li>cancel-all-button</li>
            <li>file-input</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
