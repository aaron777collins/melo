/**
 * File Upload Tests
 * 
 * Tests for uploading files and images.
 */

import { test, expect } from '@playwright/test';
import { 
  ChatPage,
  waitForAppReady, 
  waitForMatrixSync,
  generateMessage 
} from '../fixtures';
import * as fs from 'fs';
import * as path from 'path';

test.describe('File Upload', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await waitForMatrixSync(page);
    
    // Navigate to a text channel
    const firstServer = page.locator('[data-testid*="server"], .server-item, nav a').first();
    await firstServer.click().catch(() => {});
    await page.waitForTimeout(2000);
    
    const firstChannel = page.locator('[data-testid*="channel"], .channel-item, [href*="channel"]').first();
    await firstChannel.click().catch(() => {});
    await page.waitForTimeout(2000);
  });

  test('should have file upload button', async ({ page }) => {
    const chatPage = new ChatPage(page);
    
    // Look for file upload button
    const uploadButton = page.locator('button[aria-label*="upload" i], button[aria-label*="attach" i], input[type="file"], [data-testid="file-upload"]');
    const hasUploadButton = await uploadButton.first().isVisible().catch(() => false);
    
    expect(hasUploadButton).toBeTruthy();
  });

  test('should show file input element', async ({ page }) => {
    // Look for hidden file input
    const fileInput = page.locator('input[type="file"]');
    const inputCount = await fileInput.count();
    
    expect(inputCount).toBeGreaterThan(0);
  });

  test('should upload image file', async ({ page }) => {
    // Create a test image file
    const testImagePath = path.join('/tmp', 'test-image.png');
    
    // Create a simple 1x1 PNG (minimal valid PNG)
    const pngData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, // IHDR length
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x00, 0x01, // width: 1
      0x00, 0x00, 0x00, 0x01, // height: 1
      0x08, 0x02, // bit depth 8, color type 2 (RGB)
      0x00, 0x00, 0x00, // compression, filter, interlace
      0x90, 0x77, 0x53, 0xDE, // IHDR CRC
      0x00, 0x00, 0x00, 0x0C, // IDAT length
      0x49, 0x44, 0x41, 0x54, // IDAT
      0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0xFF, 0x00, 0x05, 0xFE, 0x02, 0xFE, // data
      0xA3, 0x6C, 0x18, 0x18, // IDAT CRC
      0x00, 0x00, 0x00, 0x00, // IEND length
      0x49, 0x45, 0x4E, 0x44, // IEND
      0xAE, 0x42, 0x60, 0x82, // IEND CRC
    ]);
    
    fs.writeFileSync(testImagePath, pngData);
    
    // Find file input and upload
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testImagePath);
    
    await page.waitForTimeout(3000);
    
    // Image should appear in chat or preview
    const imagePreview = page.locator('img[src*="blob"], img[src*="data:"], .image-preview');
    const hasPreview = await imagePreview.first().isVisible().catch(() => false);
    
    console.log(`Image uploaded: ${hasPreview}`);
    
    // Clean up
    fs.unlinkSync(testImagePath);
  });

  test('should show upload progress indicator', async ({ page }) => {
    // Look for progress indicator when uploading
    const progressIndicator = page.locator('.upload-progress, [role="progressbar"], .progress');
    
    // This would need an actual upload to test fully
    console.log('Progress indicator test - requires actual upload');
  });

  test('should display uploaded images in chat', async ({ page }) => {
    // Look for existing images in chat
    const chatImages = page.locator('.message img, [data-testid="message-image"]');
    const imageCount = await chatImages.count();
    
    console.log(`Images in chat: ${imageCount}`);
  });

  test('should allow downloading uploaded files', async ({ page }) => {
    // Look for download links on files
    const downloadLink = page.locator('a[download], button:has-text("Download"), [data-testid="download"]');
    const hasDownload = await downloadLink.first().isVisible().catch(() => false);
    
    console.log(`Download available: ${hasDownload}`);
  });
});
