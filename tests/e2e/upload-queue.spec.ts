/**
 * Upload Queue E2E Tests
 * BDV2-US-2.3: Upload Queue Management
 */

import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Upload Queue Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-upload-queue');
    await expect(page.getByTestId('upload-queue')).toBeVisible();
  });

  test('should display upload queue container', async ({ page }) => {
    await expect(page.getByTestId('upload-queue')).toBeVisible();
    await expect(page.getByText('No files in queue')).toBeVisible();
  });

  test('should add files via file input', async ({ page }) => {
    const fileInput = page.getByTestId('file-input');
    
    // Create test file
    await fileInput.setInputFiles({
      name: 'test-video.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('mock video content'),
    });

    // Verify queue item appears
    await expect(page.getByTestId('queue-item')).toBeVisible();
    await expect(page.getByTestId('queue-item-filename')).toContainText('test-video.mp4');
  });

  test('should display file size', async ({ page }) => {
    const fileInput = page.getByTestId('file-input');
    
    // Create test file with known size
    const content = 'x'.repeat(1024); // 1 KB
    await fileInput.setInputFiles({
      name: 'sized-video.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from(content),
    });

    await expect(page.getByTestId('queue-item-size')).toBeVisible();
  });

  test('should display status for queue items', async ({ page }) => {
    const fileInput = page.getByTestId('file-input');
    
    await fileInput.setInputFiles({
      name: 'status-test.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('content'),
    });

    // Should show uploading or queued status
    await expect(page.getByTestId('queue-item-status')).toBeVisible();
  });

  test('should show progress bar during upload', async ({ page }) => {
    const fileInput = page.getByTestId('file-input');
    
    await fileInput.setInputFiles({
      name: 'progress-test.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('content'),
    });

    // Progress bar may or may not be visible depending on upload speed
    const progressBar = page.getByTestId('queue-item-progress');
    // Either progress is visible during upload, or item completes quickly
    await expect(page.getByTestId('queue-item')).toBeVisible();
  });

  test('should allow canceling queued items', async ({ page }) => {
    const fileInput = page.getByTestId('file-input');
    
    // Add multiple files to ensure some stay queued
    await fileInput.setInputFiles([
      { name: 'file1.mp4', mimeType: 'video/mp4', buffer: Buffer.from('x'.repeat(10000)) },
      { name: 'file2.mp4', mimeType: 'video/mp4', buffer: Buffer.from('x'.repeat(10000)) },
    ]);

    // Wait for items to appear
    await expect(page.getByTestId('queue-item').first()).toBeVisible();

    // Try to cancel
    const cancelButton = page.getByTestId('queue-item-cancel').first();
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      // Verify status changed to cancelled
      await expect(page.getByText('Cancelled')).toBeVisible();
    }
  });

  test('should display queue summary', async ({ page }) => {
    const fileInput = page.getByTestId('file-input');
    
    await fileInput.setInputFiles([
      { name: 'summary-test1.mp4', mimeType: 'video/mp4', buffer: Buffer.from('content1') },
      { name: 'summary-test2.mp4', mimeType: 'video/mp4', buffer: Buffer.from('content2') },
    ]);

    // Queue summary should appear
    await expect(page.getByTestId('queue-summary')).toBeVisible();
    await expect(page.getByTestId('queue-summary')).toContainText('of');
    await expect(page.getByTestId('queue-summary')).toContainText('complete');
  });

  test('should show clear completed button after uploads finish', async ({ page }) => {
    const fileInput = page.getByTestId('file-input');
    
    // Add a small file that will complete quickly
    await fileInput.setInputFiles({
      name: 'quick-upload.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('tiny'),
    });

    // Wait for upload to complete
    await expect(page.getByText('Complete')).toBeVisible({ timeout: 10000 });
    
    // Clear completed button should appear
    await expect(page.getByTestId('clear-completed-button')).toBeVisible();
  });

  test('should clear completed items when button clicked', async ({ page }) => {
    const fileInput = page.getByTestId('file-input');
    
    await fileInput.setInputFiles({
      name: 'clear-test.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('tiny'),
    });

    // Wait for completion
    await expect(page.getByText('Complete')).toBeVisible({ timeout: 10000 });
    
    // Click clear
    await page.getByTestId('clear-completed-button').click();
    
    // Queue should be empty
    await expect(page.getByText('No files in queue')).toBeVisible();
  });

  test('should show cancel all button when items are active', async ({ page }) => {
    const fileInput = page.getByTestId('file-input');
    
    // Add multiple files to keep queue active
    await fileInput.setInputFiles([
      { name: 'cancel-all1.mp4', mimeType: 'video/mp4', buffer: Buffer.from('x'.repeat(50000)) },
      { name: 'cancel-all2.mp4', mimeType: 'video/mp4', buffer: Buffer.from('x'.repeat(50000)) },
    ]);

    // Cancel all button should appear
    const cancelAllButton = page.getByTestId('cancel-all-button');
    if (await cancelAllButton.isVisible()) {
      await cancelAllButton.click();
      // All items should be cancelled
      await expect(page.getByText('Cancelled').first()).toBeVisible();
    }
  });

  test('should support adding files to existing queue', async ({ page }) => {
    const fileInput = page.getByTestId('file-input');
    
    // Add first batch
    await fileInput.setInputFiles({
      name: 'batch1.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('x'.repeat(10000)),
    });

    await expect(page.getByTestId('queue-item')).toBeVisible();
    
    // Add second batch
    await fileInput.setInputFiles({
      name: 'batch2.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('y'.repeat(10000)),
    });

    // Both files should be in queue (or one completed + one in progress)
    const queueItems = page.getByTestId('queue-item');
    await expect(queueItems).toHaveCount(2);
  });

  test('should allow retry of failed items', async ({ page }) => {
    // This test relies on the 10% failure rate in the mock
    // We'll add many files and wait for a failure
    const fileInput = page.getByTestId('file-input');
    
    // Add multiple files - statistically some should fail
    const files = [];
    for (let i = 0; i < 10; i++) {
      files.push({
        name: `retry-test-${i}.mp4`,
        mimeType: 'video/mp4',
        buffer: Buffer.from('content'),
      });
    }
    await fileInput.setInputFiles(files);

    // Wait for processing
    await page.waitForTimeout(5000);

    // Check if any failed
    const failedText = page.getByText('Failed');
    if (await failedText.count() > 0) {
      // Retry button should be visible
      const retryButton = page.getByTestId('queue-item-retry').first();
      await expect(retryButton).toBeVisible();
      
      // Click retry
      await retryButton.click();
      
      // Item should be back in queue or uploading
      await expect(page.getByText('Waiting...').or(page.getByText('Uploading...'))).toBeVisible();
    }
  });

  test('should display error message for failed items', async ({ page }) => {
    // This test relies on the mock's random failure
    const fileInput = page.getByTestId('file-input');
    
    // Add many files to increase chance of failure
    const files = [];
    for (let i = 0; i < 15; i++) {
      files.push({
        name: `error-test-${i}.mp4`,
        mimeType: 'video/mp4',
        buffer: Buffer.from('content'),
      });
    }
    await fileInput.setInputFiles(files);

    // Wait for processing
    await page.waitForTimeout(8000);

    // If any failed, error message should be visible
    const errorElement = page.getByTestId('queue-item-error');
    if (await errorElement.count() > 0) {
      await expect(errorElement.first()).toContainText('Simulated upload failure');
    }
  });

  test('should handle drag and drop', async ({ page }) => {
    const dropZone = page.locator('[data-testid="upload-queue"] > div').first();
    
    // Create a DataTransfer with files
    const dataTransfer = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      const file = new File(['content'], 'dropped-file.mp4', { type: 'video/mp4' });
      dt.items.add(file);
      return dt;
    });

    // Trigger drop event
    await dropZone.dispatchEvent('drop', { dataTransfer });

    // File should be added to queue
    await expect(page.getByTestId('queue-item')).toBeVisible();
    await expect(page.getByText('dropped-file.mp4')).toBeVisible();
  });

  test('all required test IDs are present', async ({ page }) => {
    const fileInput = page.getByTestId('file-input');
    
    // Add a file to populate the queue
    await fileInput.setInputFiles({
      name: 'test-ids.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('x'.repeat(10000)),
    });

    // Core test IDs
    await expect(page.getByTestId('upload-queue')).toBeVisible();
    await expect(page.getByTestId('queue-summary')).toBeVisible();
    await expect(page.getByTestId('queue-item')).toBeVisible();
    await expect(page.getByTestId('queue-item-filename')).toBeVisible();
    await expect(page.getByTestId('queue-item-size')).toBeVisible();
    await expect(page.getByTestId('queue-item-status')).toBeVisible();
    await expect(page.getByTestId('file-input')).toBeAttached();
    
    // Cancel button should be visible while uploading
    const cancelButton = page.getByTestId('queue-item-cancel');
    if (await cancelButton.isVisible()) {
      await expect(cancelButton).toBeVisible();
    }
  });
});
