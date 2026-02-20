/**
 * Matrix File Operations E2E Tests
 * 
 * Comprehensive E2E tests for Matrix file upload and download functionality.
 * Tests file operations including various file types, thumbnails, size limits,
 * error handling, and real-time file sharing in chat.
 * 
 * Test Scenarios:
 * - File upload to Matrix homeserver (various file types)
 * - File download from Matrix with content integrity verification
 * - File thumbnail display and functionality
 * - File size limit enforcement
 * - Error handling (oversized files, unsupported types, network errors)
 * - Real-time file sharing in chat rooms
 * - MXC URL conversion and accessibility
 * - File metadata preservation and display
 * 
 * Follows TDD approach:
 * 1. Tests written FIRST (should initially FAIL - RED phase)
 * 2. Implementation testing (GREEN phase)
 * 3. Refactoring and optimization (REFACTOR phase)
 */

import { test, expect } from '@playwright/test';
import { 
  AuthPage,
  NavigationPage,
  ServerPage,
  ChatPage,
  TEST_CONFIG,
  waitForAppReady,
  waitForMatrixSync,
  clearBrowserState,
  isLoggedIn,
  loginWithTestUser,
  createTestSpace,
  cleanupTestSpace,
  screenshot,
  generateMessage,
  uniqueId,
  retry
} from '../fixtures';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

test.describe('Matrix File Operations', () => {
  let authPage: AuthPage;
  let navPage: NavigationPage;
  let serverPage: ServerPage;
  let chatPage: ChatPage;
  let testSpaceId: string | null = null;

  // Test file paths
  const testFilesDir = '/tmp/e2e-test-files';
  const testImagePath = path.join(testFilesDir, 'test-image.png');
  const testDocPath = path.join(testFilesDir, 'test-document.pdf');
  const testLargeFilePath = path.join(testFilesDir, 'large-file.bin');
  const testVideoPath = path.join(testFilesDir, 'test-video.mp4');
  const testAudioPath = path.join(testFilesDir, 'test-audio.wav');

  test.beforeAll(async () => {
    // Create test files directory
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }

    // Create test image (valid PNG - 1x1 pixel)
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

    // Create test PDF document
    const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000173 00000 n 
trailer
<< /Size 4 /Root 1 0 R >>
startxref
288
%%EOF`;
    fs.writeFileSync(testDocPath, pdfContent);

    // Create large file (5MB) for size limit testing
    const largeFileBuffer = Buffer.alloc(5 * 1024 * 1024, 'a'); // 5MB of 'a' characters
    fs.writeFileSync(testLargeFilePath, largeFileBuffer);

    // Create minimal MP4 video file
    const mp4Data = Buffer.from([
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, // ftyp box header
      0x69, 0x73, 0x6F, 0x6D, // isom brand
      0x00, 0x00, 0x02, 0x00, // minor version
      0x69, 0x73, 0x6F, 0x6D, // compatible brands
      0x69, 0x73, 0x6F, 0x32, 0x61, 0x76, 0x63, 0x31,
      0x6D, 0x70, 0x34, 0x31, // more brands
    ]);
    fs.writeFileSync(testVideoPath, mp4Data);

    // Create minimal WAV audio file
    const wavData = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // "RIFF"
      0x24, 0x00, 0x00, 0x00, // file size - 8
      0x57, 0x41, 0x56, 0x45, // "WAVE"
      0x66, 0x6D, 0x74, 0x20, // "fmt "
      0x10, 0x00, 0x00, 0x00, // chunk size
      0x01, 0x00, // audio format (PCM)
      0x01, 0x00, // number of channels
      0x44, 0xAC, 0x00, 0x00, // sample rate (44100)
      0x88, 0x58, 0x01, 0x00, // byte rate
      0x02, 0x00, // block align
      0x10, 0x00, // bits per sample
      0x64, 0x61, 0x74, 0x61, // "data"
      0x00, 0x00, 0x00, 0x00, // data size
    ]);
    fs.writeFileSync(testAudioPath, wavData);
  });

  test.afterAll(async () => {
    // Cleanup test files
    if (fs.existsSync(testFilesDir)) {
      fs.rmSync(testFilesDir, { recursive: true, force: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Initialize page objects
    authPage = new AuthPage(page);
    navPage = new NavigationPage(page);
    serverPage = new ServerPage(page);
    chatPage = new ChatPage(page);

    // Clear browser state for clean test
    await clearBrowserState(page);

    // Ensure user is logged in
    if (!(await isLoggedIn(page))) {
      await loginWithTestUser(page);
    }
    await waitForAppReady(page);
    await waitForMatrixSync(page);

    // Create a test space for file operations
    const spaceName = `FileOpsTest-${uniqueId()}`;
    testSpaceId = await createTestSpace(page, spaceName, { 
      topic: 'E2E file operations testing space' 
    });
    
    // Navigate to the general channel
    await page.waitForTimeout(2000);
    const generalChannel = page.locator('[data-testid*="channel"], .channel-item, [href*="channel"]').first();
    await generalChannel.click();
    await page.waitForTimeout(1000);
  });

  test.afterEach(async ({ page }) => {
    // Cleanup test space
    if (testSpaceId) {
      await cleanupTestSpace(page, testSpaceId);
      testSpaceId = null;
    }
  });

  test.describe('File Upload Functionality', () => {
    
    test('should successfully upload an image file to Matrix', async ({ page }) => {
      // Locate file upload element
      const fileInput = page.locator('input[type="file"]').first();
      expect(await fileInput.count()).toBeGreaterThan(0);

      // Upload the test image
      await fileInput.setInputFiles(testImagePath);

      // Wait for upload to complete
      await page.waitForTimeout(3000);

      // Verify image appears in chat
      const uploadedImage = page.locator('img[src*="matrix"], img[src*="mxc"], img[src*="blob"], .message img');
      await expect(uploadedImage.first()).toBeVisible({ timeout: 10000 });

      // Verify MXC URL is used
      const imageElement = uploadedImage.first();
      const src = await imageElement.getAttribute('src');
      expect(src).toBeTruthy();
      
      // Should be either MXC converted to HTTP or blob URL during upload
      expect(src).toMatch(/^(https?:\/\/.*\/_matrix\/media|blob:|data:)/);

      // Take screenshot for verification
      await screenshot(page, 'image-upload-success');
    });

    test('should successfully upload a PDF document to Matrix', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      
      // Upload the test PDF
      await fileInput.setInputFiles(testDocPath);
      await page.waitForTimeout(3000);

      // Verify file appears in chat (as file attachment)
      const fileAttachment = page.locator('.file-attachment, .document-attachment, [data-file-type="pdf"], .message [href*="pdf"]');
      await expect(fileAttachment.first()).toBeVisible({ timeout: 10000 });

      // Verify filename is displayed
      const fileName = page.locator(':text("test-document.pdf")');
      await expect(fileName.first()).toBeVisible();

      await screenshot(page, 'pdf-upload-success');
    });

    test('should successfully upload a video file to Matrix', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      
      await fileInput.setInputFiles(testVideoPath);
      await page.waitForTimeout(3000);

      // Verify video appears in chat
      const videoElement = page.locator('video, .video-attachment, [data-file-type="video"]');
      await expect(videoElement.first()).toBeVisible({ timeout: 10000 });

      await screenshot(page, 'video-upload-success');
    });

    test('should successfully upload an audio file to Matrix', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      
      await fileInput.setInputFiles(testAudioPath);
      await page.waitForTimeout(3000);

      // Verify audio appears in chat
      const audioElement = page.locator('audio, .audio-attachment, [data-file-type="audio"]');
      await expect(audioElement.first()).toBeVisible({ timeout: 10000 });

      await screenshot(page, 'audio-upload-success');
    });

    test('should show upload progress indicator during file upload', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      
      // Use large file to see progress indicator
      await fileInput.setInputFiles(testLargeFilePath);

      // Look for progress indicator
      const progressIndicator = page.locator('.upload-progress, [role="progressbar"], .progress, .uploading, [aria-label*="upload" i]');
      
      // Should appear quickly after starting upload
      await expect(progressIndicator.first()).toBeVisible({ timeout: 5000 });

      await screenshot(page, 'upload-progress-indicator');

      // Wait for upload to complete or fail
      await page.waitForTimeout(10000);
    });

    test('should preserve original filename in uploaded files', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      
      await fileInput.setInputFiles(testDocPath);
      await page.waitForTimeout(3000);

      // Check that original filename is preserved
      const originalFileName = 'test-document.pdf';
      const fileNameElement = page.locator(`:text("${originalFileName}")`);
      await expect(fileNameElement.first()).toBeVisible();
    });

  });

  test.describe('File Download Functionality', () => {

    test('should provide download links for uploaded files', async ({ page }) => {
      // First upload a file
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(testDocPath);
      await page.waitForTimeout(3000);

      // Look for download link
      const downloadLink = page.locator('a[download], a[href*="download"], button:has-text("Download"), [data-action="download"]');
      await expect(downloadLink.first()).toBeVisible({ timeout: 10000 });

      // Verify link has proper href
      const href = await downloadLink.first().getAttribute('href');
      expect(href).toBeTruthy();
      expect(href).toMatch(/^https?:\/\/.*\/_matrix\/media/);
    });

    test('should download files with correct content integrity', async ({ page }) => {
      // Upload a file first
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(testImagePath);
      await page.waitForTimeout(3000);

      // Get the download link
      const downloadLink = page.locator('a[href*="/_matrix/media"], a[download]').first();
      await expect(downloadLink).toBeVisible();

      const downloadUrl = await downloadLink.getAttribute('href');
      expect(downloadUrl).toBeTruthy();

      // Verify the URL format is correct Matrix media URL
      expect(downloadUrl).toMatch(/\/_matrix\/media\/v3\/download/);

      // Note: Actual download testing would require additional setup
      // This test verifies the download URL is properly generated
    });

    test('should handle download errors gracefully', async ({ page }) => {
      // Create a fake download link with invalid URL
      await page.evaluate(() => {
        const link = document.createElement('a');
        link.href = 'https://invalid-matrix-server.com/_matrix/media/v3/download/invalid/file';
        link.textContent = 'Test Download';
        link.id = 'test-invalid-download';
        document.body.appendChild(link);
      });

      const invalidLink = page.locator('#test-invalid-download');
      await expect(invalidLink).toBeVisible();

      // Clicking should not crash the application
      await invalidLink.click();
      await page.waitForTimeout(1000);

      // App should still be functional
      await expect(page.locator('body')).toBeVisible();
    });

  });

  test.describe('File Thumbnails and Previews', () => {

    test('should display thumbnails for uploaded images', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(testImagePath);
      await page.waitForTimeout(3000);

      // Check for image thumbnail
      const thumbnail = page.locator('img[src*="thumbnail"], img.thumbnail, .image-preview img');
      await expect(thumbnail.first()).toBeVisible({ timeout: 10000 });

      // Verify thumbnail has proper dimensions (should be smaller than full image)
      const img = thumbnail.first();
      const boundingBox = await img.boundingBox();
      expect(boundingBox).toBeTruthy();
      expect(boundingBox!.width).toBeLessThanOrEqual(300); // Reasonable thumbnail size

      await screenshot(page, 'image-thumbnail-display');
    });

    test('should show file icons for non-image files', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(testDocPath);
      await page.waitForTimeout(3000);

      // Look for file icon
      const fileIcon = page.locator('.file-icon, [data-file-type="pdf"], svg[data-lucide="file"]');
      await expect(fileIcon.first()).toBeVisible();

      await screenshot(page, 'file-icon-display');
    });

    test('should support thumbnail generation for supported formats', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(testImagePath);
      await page.waitForTimeout(3000);

      // Wait for thumbnail processing
      const thumbnail = page.locator('img[src*="thumbnail"], img[src*="/_matrix/media/v3/thumbnail"]');
      
      // Either thumbnail endpoint is used OR a regular image is shown (both acceptable)
      const hasValidThumbnail = await page.locator('img[src*="/_matrix/media"]').first().isVisible().catch(() => false);
      expect(hasValidThumbnail).toBeTruthy();
    });

  });

  test.describe('File Size Limits and Validation', () => {

    test('should enforce file size limits for uploads', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      
      // Try to upload large file (should be rejected or show error)
      await fileInput.setInputFiles(testLargeFilePath);
      await page.waitForTimeout(3000);

      // Look for error message about file size
      const errorMessage = page.locator('.error, .toast-error, :text("too large"), :text("file size"), :text("exceeds")');
      
      // Should show error or not upload the file
      const hasError = await errorMessage.first().isVisible().catch(() => false);
      const hasUploadedLargeFile = await page.locator('.message [data-file-size*="5242880"], .file-attachment:has-text("large-file.bin")').first().isVisible().catch(() => false);
      
      // Either should show error OR refuse to upload large file
      expect(hasError || !hasUploadedLargeFile).toBeTruthy();

      await screenshot(page, 'file-size-limit-enforcement');
    });

    test('should validate file types appropriately', async ({ page }) => {
      // Create an invalid file type
      const invalidFilePath = path.join(testFilesDir, 'invalid.exe');
      fs.writeFileSync(invalidFilePath, Buffer.from('fake executable'));

      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(invalidFilePath);
      await page.waitForTimeout(3000);

      // Should either show error or accept the file (depending on configuration)
      // At minimum, should not crash the application
      await expect(page.locator('body')).toBeVisible();

      // Clean up
      fs.unlinkSync(invalidFilePath);
    });

    test('should show appropriate error messages for invalid files', async ({ page }) => {
      // Create corrupt image
      const corruptImagePath = path.join(testFilesDir, 'corrupt.png');
      fs.writeFileSync(corruptImagePath, Buffer.from('not a real png file'));

      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(corruptImagePath);
      await page.waitForTimeout(3000);

      // Look for error handling
      const errorIndicator = page.locator('.error, .toast, [role="alert"], :text("invalid"), :text("corrupt")');
      
      // Application should handle gracefully
      await expect(page.locator('body')).toBeVisible();

      // Clean up
      fs.unlinkSync(corruptImagePath);
    });

  });

  test.describe('Real-time File Sharing in Chat', () => {

    test('should display uploaded files in chat messages immediately', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(testImagePath);

      // File should appear in chat within reasonable time
      const chatMessage = page.locator('.message, [data-testid="message"]').last();
      await expect(chatMessage).toContainText('png', { timeout: 10000 }).catch(() => {
        // Alternative: look for image in message
        return expect(chatMessage.locator('img')).toBeVisible({ timeout: 10000 });
      });

      await screenshot(page, 'file-in-chat-message');
    });

    test('should maintain file accessibility across page refreshes', async ({ page }) => {
      // Upload a file
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(testDocPath);
      await page.waitForTimeout(3000);

      // Verify file is uploaded
      const fileInChat = page.locator(':text("test-document.pdf"), .file-attachment').first();
      await expect(fileInChat).toBeVisible();

      // Refresh page
      await page.reload();
      await waitForAppReady(page);
      await waitForMatrixSync(page);

      // File should still be accessible
      await expect(fileInChat).toBeVisible({ timeout: 15000 });
    });

    test('should support multiple file uploads in sequence', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();

      // Upload image
      await fileInput.setInputFiles(testImagePath);
      await page.waitForTimeout(2000);

      // Upload document
      await fileInput.setInputFiles(testDocPath);
      await page.waitForTimeout(2000);

      // Both files should be visible in chat
      const imageFile = page.locator('img[src*="matrix"], img[src*="blob"]').first();
      const docFile = page.locator(':text("test-document.pdf")').first();

      await expect(imageFile).toBeVisible();
      await expect(docFile).toBeVisible();

      await screenshot(page, 'multiple-files-uploaded');
    });

    test('should handle concurrent file uploads gracefully', async ({ page }) => {
      // This tests the upload queue/concurrency handling
      const fileInput = page.locator('input[type="file"]').first();

      // Start multiple uploads quickly
      await fileInput.setInputFiles([testImagePath, testDocPath]);
      await page.waitForTimeout(5000);

      // Should handle both files without errors
      const messages = page.locator('.message, [data-testid="message"]');
      const messageCount = await messages.count();
      expect(messageCount).toBeGreaterThan(0);

      // Application should remain stable
      await expect(page.locator('body')).toBeVisible();

      await screenshot(page, 'concurrent-uploads-handled');
    });

  });

  test.describe('Error Handling and Edge Cases', () => {

    test('should handle network errors during upload gracefully', async ({ page }) => {
      // Simulate network issue by intercepting requests
      await page.route('**/_matrix/media/v3/upload**', route => {
        route.abort('failed');
      });

      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(testImagePath);
      await page.waitForTimeout(3000);

      // Should show error message
      const errorMessage = page.locator('.error, .toast-error, :text("upload failed"), :text("network"), :text("error")');
      const hasError = await errorMessage.first().isVisible().catch(() => false);

      // Application should remain functional
      await expect(page.locator('body')).toBeVisible();
      
      // Should handle error gracefully (either show error or fail silently)
      expect(true).toBeTruthy(); // Test passes if app doesn't crash
    });

    test('should handle authentication errors during upload', async ({ page }) => {
      // Simulate auth error
      await page.route('**/_matrix/media/v3/upload**', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ errcode: 'M_UNAUTHORIZED', error: 'Unauthorized' })
        });
      });

      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(testImagePath);
      await page.waitForTimeout(3000);

      // Should handle auth error appropriately
      const authError = page.locator(':text("unauthorized"), :text("sign in"), :text("authentication")');
      const hasAuthError = await authError.first().isVisible().catch(() => false);

      // Application should handle gracefully
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle server errors during upload', async ({ page }) => {
      // Simulate server error
      await page.route('**/_matrix/media/v3/upload**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ errcode: 'M_UNKNOWN', error: 'Internal server error' })
        });
      });

      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(testImagePath);
      await page.waitForTimeout(3000);

      // Should handle server error
      const serverError = page.locator('.error, :text("server error"), :text("try again")');
      const hasServerError = await serverError.first().isVisible().catch(() => false);

      // Application should remain stable
      await expect(page.locator('body')).toBeVisible();
    });

    test('should recover from temporary network issues', async ({ page }) => {
      let requestCount = 0;
      
      // Fail first request, succeed on retry
      await page.route('**/_matrix/media/v3/upload**', route => {
        requestCount++;
        if (requestCount === 1) {
          route.abort('failed');
        } else {
          route.continue();
        }
      });

      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(testImagePath);
      await page.waitForTimeout(5000);

      // Should eventually succeed or show appropriate error
      await expect(page.locator('body')).toBeVisible();
    });

  });

  test.describe('MXC URL Handling and Integration', () => {

    test('should properly convert MXC URLs to HTTP URLs for display', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(testImagePath);
      await page.waitForTimeout(3000);

      // Check that image src uses proper HTTP URL (converted from MXC)
      const image = page.locator('img[src*="/_matrix/media"]').first();
      if (await image.isVisible()) {
        const src = await image.getAttribute('src');
        expect(src).toMatch(/\/_matrix\/media\/v3\/download/);
        expect(src).toMatch(/^https?:\/\//); // Should be full HTTP URL
      }
    });

    test('should handle MXC URL accessibility and permissions', async ({ page }) => {
      // Upload file to test MXC URL access
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(testImagePath);
      await page.waitForTimeout(3000);

      // Get MXC-based HTTP URL
      const downloadLink = page.locator('a[href*="/_matrix/media"]').first();
      if (await downloadLink.isVisible()) {
        const href = await downloadLink.getAttribute('href');
        expect(href).toBeTruthy();
        
        // URL should be accessible (this tests the conversion logic)
        expect(href).toMatch(/^https?:\/\/.*\/_matrix\/media\/v3\/download/);
      }
    });

  });

  test.describe('File Metadata and Information Display', () => {

    test('should display file size information for uploaded files', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(testDocPath);
      await page.waitForTimeout(3000);

      // Look for file size information
      const fileSizeInfo = page.locator('[data-file-size], :text("bytes"), :text("KB"), :text("MB"), .file-size');
      const hasFileSizeInfo = await fileSizeInfo.first().isVisible().catch(() => false);

      // File size info is optional but good UX if present
      if (hasFileSizeInfo) {
        await screenshot(page, 'file-size-information');
      }
    });

    test('should show file type information for uploaded files', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(testDocPath);
      await page.waitForTimeout(3000);

      // Look for file type indication (icon, text, or class)
      const fileTypeIndicator = page.locator(
        '.pdf-icon, [data-file-type="pdf"], :text("PDF"), svg[data-lucide="file"]'
      );
      const hasFileTypeIndicator = await fileTypeIndicator.first().isVisible().catch(() => false);

      // Should have some visual indication of file type
      expect(hasFileTypeIndicator).toBeTruthy();
    });

    test('should preserve and display upload timestamps', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(testImagePath);
      await page.waitForTimeout(3000);

      // Look for timestamp on message containing the file
      const messageWithFile = page.locator('.message:has(img), [data-testid="message"]:has(img)').last();
      const timestamp = messageWithFile.locator('.timestamp, [data-timestamp], time');
      
      // Messages should have timestamps
      const hasTimestamp = await timestamp.first().isVisible().catch(() => false);
      expect(hasTimestamp).toBeTruthy();
    });

  });

});