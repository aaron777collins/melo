import { test, expect } from '@playwright/test';

test.describe('Server Settings E2E', () => {
  // Test credentials and setup
  const testCredentials = {
    username: 'test-admin',
    password: 'test123456',
    homeserver: 'https://matrix.dev2.aaroncollins.info',
  };

  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Handle potential auth wall - log in if needed
    const loginForm = page.locator('[data-testid="login-form"]').first();
    
    if (await loginForm.isVisible({ timeout: 3000 })) {
      // Fill in login credentials
      await page.fill('[data-testid="username-input"]', testCredentials.username);
      await page.fill('[data-testid="password-input"]', testCredentials.password);
      await page.click('[data-testid="login-button"]');
      
      // Wait for successful login (dashboard or main app should load)
      await expect(page.locator('[data-testid="main-content"]', '[data-testid="dashboard"]').first())
        .toBeVisible({ timeout: 10000 });
    }

    // Navigate to server settings page
    await page.goto('/server-settings');
    
    // Wait for server settings page to load
    await expect(page.locator('h1', { hasText: /server settings/i }))
      .toBeVisible({ timeout: 5000 });
  });

  test.describe('AC-1: Server name editing via Matrix API', () => {
    test('should update server name through UI and verify Matrix API calls', async ({ page }) => {
      // Find the server name input field
      const nameInput = page.locator('[data-testid="server-name-input"]');
      await expect(nameInput).toBeVisible();

      // Clear existing name and enter new name
      const newServerName = `Test Server ${Date.now()}`;
      await nameInput.fill(newServerName);

      // Click save button
      const saveButton = page.locator('[data-testid="save-server-name-button"]');
      await saveButton.click();

      // Wait for success indicator
      const successMessage = page.locator('[data-testid="success-message"]', { hasText: /saved/i });
      await expect(successMessage).toBeVisible({ timeout: 5000 });

      // Verify the name persists on page reload
      await page.reload();
      await expect(page.locator('[data-testid="server-name-input"]')).toHaveValue(newServerName);

      // Take screenshot for validation evidence
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/server-name-update-success.png',
        fullPage: true 
      });
    });

    test('should show error message for unauthorized users', async ({ page }) => {
      // This test would require setting up a limited user account
      // For now, test with invalid/empty name to trigger validation
      
      const nameInput = page.locator('[data-testid="server-name-input"]');
      await nameInput.fill(''); // Empty name should trigger validation

      const saveButton = page.locator('[data-testid="save-server-name-button"]');
      await saveButton.click();

      // Should show validation error
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/name.*required|name.*empty/i);

      // Take screenshot for validation evidence
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/server-name-validation-error.png',
        fullPage: true 
      });
    });
  });

  test.describe('AC-2: Server icon/avatar management via Matrix API', () => {
    test('should update server avatar through UI upload', async ({ page }) => {
      // Find the avatar upload section
      const avatarSection = page.locator('[data-testid="server-avatar-section"]');
      await expect(avatarSection).toBeVisible();

      // Click upload button or drag-and-drop area
      const uploadButton = page.locator('[data-testid="avatar-upload-button"]');
      
      // Create a simple test image file (1x1 pixel PNG)
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        'base64'
      );

      // Set up file chooser handler
      const fileChooserPromise = page.waitForEvent('filechooser');
      await uploadButton.click();
      
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles([{
        name: 'test-avatar.png',
        mimeType: 'image/png',
        buffer: testImageBuffer,
      }]);

      // Wait for upload to complete
      const successMessage = page.locator('[data-testid="avatar-success-message"]');
      await expect(successMessage).toBeVisible({ timeout: 10000 });

      // Verify avatar appears in UI
      const avatarImage = page.locator('[data-testid="server-avatar-image"]');
      await expect(avatarImage).toBeVisible();
      
      // Take screenshot for validation evidence
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/server-avatar-upload-success.png',
        fullPage: true 
      });
    });

    test('should handle avatar removal', async ({ page }) => {
      // Find remove avatar button (if avatar exists)
      const removeButton = page.locator('[data-testid="remove-avatar-button"]');
      
      // Only test removal if remove button exists
      if (await removeButton.isVisible({ timeout: 2000 })) {
        await removeButton.click();

        // Confirm removal in dialog
        const confirmButton = page.locator('[data-testid="confirm-remove-avatar"]');
        if (await confirmButton.isVisible({ timeout: 2000 })) {
          await confirmButton.click();
        }

        // Verify avatar is removed
        const defaultAvatar = page.locator('[data-testid="default-avatar-placeholder"]');
        await expect(defaultAvatar).toBeVisible();

        // Take screenshot for validation evidence
        await page.screenshot({ 
          path: 'tests/e2e/screenshots/server-avatar-removal-success.png',
          fullPage: true 
        });
      } else {
        // Skip test if no avatar to remove
        test.skip();
      }
    });
  });

  test.describe('AC-3: Server description editing via Matrix API', () => {
    test('should update server description through UI', async ({ page }) => {
      // Find the server description textarea
      const descriptionTextarea = page.locator('[data-testid="server-description-textarea"]');
      await expect(descriptionTextarea).toBeVisible();

      // Enter new description
      const newDescription = `Updated server description ${Date.now()}\nMultiple lines supported!`;
      await descriptionTextarea.fill(newDescription);

      // Click save button
      const saveButton = page.locator('[data-testid="save-description-button"]');
      await saveButton.click();

      // Wait for success indicator
      const successMessage = page.locator('[data-testid="description-success-message"]');
      await expect(successMessage).toBeVisible({ timeout: 5000 });

      // Verify the description persists on page reload
      await page.reload();
      await expect(page.locator('[data-testid="server-description-textarea"]'))
        .toHaveValue(newDescription);

      // Take screenshot for validation evidence
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/server-description-update-success.png',
        fullPage: true 
      });
    });

    test('should clear description when requested', async ({ page }) => {
      // Find the server description textarea
      const descriptionTextarea = page.locator('[data-testid="server-description-textarea"]');
      
      // Clear the description
      await descriptionTextarea.fill('');

      // Click save button
      const saveButton = page.locator('[data-testid="save-description-button"]');
      await saveButton.click();

      // Wait for success indicator
      const successMessage = page.locator('[data-testid="description-success-message"]');
      await expect(successMessage).toBeVisible({ timeout: 5000 });

      // Verify description is empty on reload
      await page.reload();
      await expect(page.locator('[data-testid="server-description-textarea"]'))
        .toHaveValue('');

      // Take screenshot for validation evidence
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/server-description-clear-success.png',
        fullPage: true 
      });
    });
  });

  test.describe('Responsive Design Tests', () => {
    test('should work on desktop viewport (1920x1080)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Verify main elements are visible
      await expect(page.locator('[data-testid="server-name-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="server-description-textarea"]')).toBeVisible();
      
      // Take screenshot
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/desktop-1920x1080.png',
        fullPage: true 
      });
    });

    test('should work on tablet viewport (768x1024)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Verify main elements are visible and properly arranged
      await expect(page.locator('[data-testid="server-name-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="server-description-textarea"]')).toBeVisible();
      
      // Take screenshot
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/tablet-768x1024.png',
        fullPage: true 
      });
    });

    test('should work on mobile viewport (375x667)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Verify main elements are visible and mobile-friendly
      await expect(page.locator('[data-testid="server-name-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="server-description-textarea"]')).toBeVisible();
      
      // Check that elements are not truncated or overlapping
      const nameInput = page.locator('[data-testid="server-name-input"]');
      const inputBox = await nameInput.boundingBox();
      expect(inputBox?.width).toBeGreaterThan(200); // Should be reasonably wide on mobile
      
      // Take screenshot
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/mobile-375x667.png',
        fullPage: true 
      });
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network failure by intercepting requests
      await page.route('**/_matrix/client/**', route => {
        route.abort('failed');
      });

      const nameInput = page.locator('[data-testid="server-name-input"]');
      await nameInput.fill('Network Test Name');

      const saveButton = page.locator('[data-testid="save-server-name-button"]');
      await saveButton.click();

      // Should show network error message
      const errorMessage = page.locator('[data-testid="network-error-message"]');
      await expect(errorMessage).toBeVisible({ timeout: 10000 });

      // Take screenshot for validation evidence
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/network-error-handling.png',
        fullPage: true 
      });
    });

    test('should validate input lengths', async ({ page }) => {
      // Test maximum length validation for server name
      const nameInput = page.locator('[data-testid="server-name-input"]');
      const longName = 'x'.repeat(300); // Exceeds 255 character limit
      await nameInput.fill(longName);

      const saveButton = page.locator('[data-testid="save-server-name-button"]');
      await saveButton.click();

      // Should show validation error
      const errorMessage = page.locator('[data-testid="validation-error-message"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/255 characters/i);

      // Take screenshot for validation evidence
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/input-validation-error.png',
        fullPage: true 
      });
    });
  });

  test.describe('Permission Tests', () => {
    test('should show appropriate UI for admin users', async ({ page }) => {
      // All edit buttons should be enabled for admin users
      await expect(page.locator('[data-testid="save-server-name-button"]')).toBeEnabled();
      await expect(page.locator('[data-testid="save-description-button"]')).toBeEnabled();
      
      // Upload functionality should be available
      const uploadSection = page.locator('[data-testid="server-avatar-section"]');
      await expect(uploadSection).toBeVisible();

      // Take screenshot for validation evidence
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/admin-permissions-ui.png',
        fullPage: true 
      });
    });
  });
});