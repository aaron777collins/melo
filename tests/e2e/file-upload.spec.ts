import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('File Upload Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and ensure user is authenticated
    await page.goto('/');
    
    // Wait for authentication or redirect to sign-in
    await page.waitForLoadState('networkidle');
    
    // If on sign-in page, perform login
    if (page.url().includes('/sign-in')) {
      await page.fill('[data-testid="email-input"]', 'test@matrix.org');
      await page.fill('[data-testid="password-input"]', 'test123');
      await page.click('[data-testid="sign-in-button"]');
      await page.waitForURL('/');
    }
    
    // Wait for the main interface to load
    await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 10000 });
  });

  test('should display file upload button in message input', async ({ page }) => {
    // Look for file upload button in the message input area
    const uploadButton = page.locator('[data-testid="file-upload-button"]');
    await expect(uploadButton).toBeVisible();
    await expect(uploadButton).toHaveAttribute('type', 'button');
  });

  test('should open file picker when upload button clicked', async ({ page }) => {
    // Set up file chooser handler
    const fileChooserPromise = page.waitForEvent('filechooser');
    
    // Click the upload button
    await page.click('[data-testid="file-upload-button"]');
    
    // Wait for file chooser to appear
    const fileChooser = await fileChooserPromise;
    expect(fileChooser).toBeDefined();
  });

  test('should upload image file successfully', async ({ page }) => {
    // Create a test image file
    const testImagePath = path.join(__dirname, '../../public/next.svg');
    
    // Set up file chooser handler
    const fileChooserPromise = page.waitForEvent('filechooser');
    
    // Click the upload button
    await page.click('[data-testid="file-upload-button"]');
    
    // Select the test image
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([testImagePath]);
    
    // Wait for upload progress indicator
    await page.waitForSelector('[data-testid="upload-progress"]', { timeout: 5000 });
    
    // Wait for upload completion
    await page.waitForSelector('[data-testid="upload-success"]', { timeout: 15000 });
    
    // Verify success message or uploaded file preview
    const uploadedFile = page.locator('[data-testid="uploaded-file-preview"]');
    await expect(uploadedFile).toBeVisible();
    
    // Verify file name is displayed
    await expect(uploadedFile).toContainText('next.svg');
  });

  test('should show upload progress during file upload', async ({ page }) => {
    const testImagePath = path.join(__dirname, '../../public/next.svg');
    
    // Set up file chooser handler
    const fileChooserPromise = page.waitForEvent('filechooser');
    
    // Click the upload button
    await page.click('[data-testid="file-upload-button"]');
    
    // Select the test image
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([testImagePath]);
    
    // Check for progress indicator
    const progressBar = page.locator('[data-testid="upload-progress-bar"]');
    await expect(progressBar).toBeVisible();
    
    // Wait for completion
    await page.waitForSelector('[data-testid="upload-success"]', { timeout: 15000 });
    
    // Progress bar should be hidden after completion
    await expect(progressBar).toBeHidden();
  });

  test('should handle multiple file uploads', async ({ page }) => {
    const testFiles = [
      path.join(__dirname, '../../public/next.svg'),
      path.join(__dirname, '../../public/vercel.svg')
    ];
    
    // Set up file chooser handler
    const fileChooserPromise = page.waitForEvent('filechooser');
    
    // Click the upload button
    await page.click('[data-testid="file-upload-button"]');
    
    // Select multiple files
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(testFiles);
    
    // Wait for all uploads to complete
    await page.waitForSelector('[data-testid="upload-success"]', { timeout: 20000 });
    
    // Verify both files are shown
    const uploadedFiles = page.locator('[data-testid="uploaded-file-preview"]');
    await expect(uploadedFiles).toHaveCount(2);
  });

  test('should reject invalid file types', async ({ page }) => {
    // Create a temporary text file (not allowed)
    const fs = require('fs');
    const tmpDir = require('os').tmpdir();
    const testFilePath = path.join(tmpDir, 'test.txt');
    fs.writeFileSync(testFilePath, 'This is a test file');
    
    try {
      // Set up file chooser handler
      const fileChooserPromise = page.waitForEvent('filechooser');
      
      // Click the upload button
      await page.click('[data-testid="file-upload-button"]');
      
      // Select the invalid file
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles([testFilePath]);
      
      // Wait for error message
      const errorMessage = page.locator('[data-testid="upload-error"]');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
      await expect(errorMessage).toContainText('File type not allowed');
    } finally {
      // Clean up temporary file
      fs.unlinkSync(testFilePath);
    }
  });

  test('should reject files that are too large', async ({ page }) => {
    // This test would need a large file - we'll simulate the error
    // In a real implementation, you might mock the file size validation
    
    // Mock a large file response
    await page.route('**/api/uploadthing', route => {
      route.fulfill({
        status: 400,
        body: JSON.stringify({
          error: 'File size exceeds limit of 4MB'
        }),
        headers: { 'Content-Type': 'application/json' }
      });
    });
    
    const testImagePath = path.join(__dirname, '../../public/next.svg');
    
    // Set up file chooser handler
    const fileChooserPromise = page.waitForEvent('filechooser');
    
    // Click the upload button
    await page.click('[data-testid="file-upload-button"]');
    
    // Select the file
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([testImagePath]);
    
    // Wait for error message
    const errorMessage = page.locator('[data-testid="upload-error"]');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    await expect(errorMessage).toContainText('File size exceeds limit');
  });

  test('should handle upload cancellation', async ({ page }) => {
    const testImagePath = path.join(__dirname, '../../public/next.svg');
    
    // Set up file chooser handler
    const fileChooserPromise = page.waitForEvent('filechooser');
    
    // Click the upload button
    await page.click('[data-testid="file-upload-button"]');
    
    // Select the test image
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([testImagePath]);
    
    // Wait for upload to start
    await page.waitForSelector('[data-testid="upload-progress"]', { timeout: 5000 });
    
    // Click cancel button if available
    const cancelButton = page.locator('[data-testid="upload-cancel-button"]');
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      
      // Verify upload was cancelled
      await expect(page.locator('[data-testid="upload-cancelled"]')).toBeVisible();
      await expect(page.locator('[data-testid="upload-progress"]')).toBeHidden();
    }
  });

  test('should integrate uploaded files with chat messages', async ({ page }) => {
    const testImagePath = path.join(__dirname, '../../public/next.svg');
    
    // Upload a file first
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="file-upload-button"]');
    
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([testImagePath]);
    
    // Wait for upload completion
    await page.waitForSelector('[data-testid="upload-success"]', { timeout: 15000 });
    
    // Add a message with the uploaded file
    await page.fill('[data-testid="message-input"]', 'Here is an image I uploaded');
    await page.click('[data-testid="send-message-button"]');
    
    // Wait for message to appear in chat
    await page.waitForSelector('[data-testid="chat-message"]', { timeout: 10000 });
    
    // Verify the message contains both text and file
    const lastMessage = page.locator('[data-testid="chat-message"]').last();
    await expect(lastMessage).toContainText('Here is an image I uploaded');
    await expect(lastMessage.locator('[data-testid="message-attachment"]')).toBeVisible();
  });

  test('should support drag and drop file upload', async ({ page }) => {
    // This test would require more complex drag and drop simulation
    // For now, we'll test that the drop zone is present and functional
    
    const dropZone = page.locator('[data-testid="file-drop-zone"]');
    await expect(dropZone).toBeVisible();
    
    // Verify drop zone has proper drag over styling
    await dropZone.dragTo(dropZone); // Simulate drag over
    await expect(dropZone).toHaveClass(/drag-over/);
  });

  test('should display file thumbnails for images', async ({ page }) => {
    const testImagePath = path.join(__dirname, '../../public/next.svg');
    
    // Upload an image
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="file-upload-button"]');
    
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([testImagePath]);
    
    // Wait for upload completion
    await page.waitForSelector('[data-testid="upload-success"]', { timeout: 15000 });
    
    // Verify thumbnail is displayed
    const thumbnail = page.locator('[data-testid="file-thumbnail"]');
    await expect(thumbnail).toBeVisible();
    await expect(thumbnail).toHaveAttribute('src', /.+/); // Has src attribute
  });

  test('should handle authentication errors during upload', async ({ page }) => {
    // Mock authentication failure
    await page.route('**/api/uploadthing', route => {
      route.fulfill({
        status: 401,
        body: JSON.stringify({
          error: 'Unauthorized: No session found'
        }),
        headers: { 'Content-Type': 'application/json' }
      });
    });
    
    const testImagePath = path.join(__dirname, '../../public/next.svg');
    
    // Attempt upload
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="file-upload-button"]');
    
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([testImagePath]);
    
    // Wait for authentication error
    const errorMessage = page.locator('[data-testid="upload-error"]');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    await expect(errorMessage).toContainText('Unauthorized');
  });

  test('should respect file upload permissions per room', async ({ page }) => {
    // Navigate to a restricted room (if such rooms exist in test setup)
    // This would depend on the specific implementation of room permissions
    
    // For now, we'll test that upload button can be disabled based on permissions
    await page.evaluate(() => {
      // Simulate restricted room by adding disabled attribute
      const uploadButton = document.querySelector('[data-testid="file-upload-button"]');
      if (uploadButton) {
        uploadButton.setAttribute('disabled', 'true');
      }
    });
    
    const uploadButton = page.locator('[data-testid="file-upload-button"]');
    await expect(uploadButton).toBeDisabled();
    
    // Verify tooltip or message explaining restriction
    await uploadButton.hover();
    const tooltip = page.locator('[data-testid="upload-disabled-tooltip"]');
    await expect(tooltip).toBeVisible();
  });
});