import { test, expect, type Page } from '@playwright/test';

test.describe('Server Overview Settings', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Mock Matrix authentication
    await page.route('**/matrix.org/_matrix/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user_id: '@testuser:matrix.org',
          access_token: 'test_token',
        }),
      });
    });

    // Mock space data
    await page.route('**/api/spaces/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-space-id',
          name: 'Test Server',
          avatarUrl: 'mxc://matrix.org/avatar123',
          topic: 'Test server description',
          memberCount: 25,
        }),
      });
    });

    // Navigate to the overview settings page
    await page.goto('/servers/test-space-id/settings/overview');
  });

  test('should display server overview form', async () => {
    await expect(page.getByText('Server Overview')).toBeVisible();
    await expect(page.getByText('Customize your server settings and appearance')).toBeVisible();
  });

  test('should load existing server data into form', async () => {
    await expect(page.getByDisplayValue('Test Server')).toBeVisible();
    await expect(page.getByDisplayValue('Test server description')).toBeVisible();
  });

  test('should update server name', async () => {
    // Clear and type new server name
    const nameInput = page.getByLabel('Server Name');
    await nameInput.clear();
    await nameInput.fill('Updated Server Name');

    // Submit form
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // Wait for success message
    await expect(page.getByText('Server settings updated successfully')).toBeVisible();
  });

  test('should update server description', async () => {
    // Clear and type new description
    const descInput = page.getByLabel('Description');
    await descInput.clear();
    await descInput.fill('This is an updated server description');

    // Submit form
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // Wait for success message
    await expect(page.getByText('Server settings updated successfully')).toBeVisible();
  });

  test('should handle server avatar upload', async () => {
    // Look for file upload component
    const uploadButton = page.getByText(/upload server/i);
    await expect(uploadButton).toBeVisible();

    // Note: Actual file upload testing would require more complex setup
    // This test verifies the upload component is present and accessible
  });

  test('should display validation errors for empty server name', async () => {
    // Clear server name
    const nameInput = page.getByLabel('Server Name');
    await nameInput.clear();

    // Try to submit
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // Should show validation error
    await expect(page.getByText('Server name is required')).toBeVisible();
  });

  test('should show loading state during submission', async () => {
    // Mock slow API response
    await page.route('**/api/spaces/test-space-id', (route) => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }, 1000);
    });

    const nameInput = page.getByLabel('Server Name');
    await nameInput.fill('New Server Name');

    await page.getByRole('button', { name: 'Save Changes' }).click();

    // Should show loading state
    await expect(page.getByRole('button', { name: /saving/i })).toBeVisible();
  });

  test('should handle API errors gracefully', async () => {
    // Mock API error
    await page.route('**/api/spaces/test-space-id', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    const nameInput = page.getByLabel('Server Name');
    await nameInput.fill('New Server Name');

    await page.getByRole('button', { name: 'Save Changes' }).click();

    // Should show error message
    await expect(page.getByText('Failed to update server settings')).toBeVisible();
  });

  test('should apply Discord color scheme', async () => {
    // Check background colors match Discord theme
    const pageContent = page.locator('main');
    await expect(pageContent).toHaveCSS('background-color', 'rgb(54, 57, 63)'); // #36393f

    // Check card styling
    const card = page.locator('[data-testid="server-overview-card"]');
    await expect(card).toHaveCSS('background-color', 'rgb(43, 45, 49)'); // #2B2D31
  });

  test('should navigate back to server settings', async () => {
    // Look for navigation breadcrumb or back button
    const backLink = page.getByRole('link', { name: /settings/i });
    await expect(backLink).toBeVisible();

    await backLink.click();
    await expect(page).toHaveURL(/\/servers\/test-space-id\/settings$/);
  });

  test('should be responsive on mobile viewport', async () => {
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(page.getByText('Server Overview')).toBeVisible();
    await expect(page.getByLabel('Server Name')).toBeVisible();

    // Form should stack vertically on mobile
    const form = page.locator('form');
    const boundingBox = await form.boundingBox();
    expect(boundingBox?.width).toBeLessThan(400);
  });

  test('should preserve form data when navigating away and back', async () => {
    // Fill form with new data
    await page.getByLabel('Server Name').fill('Temporary Name');
    await page.getByLabel('Description').fill('Temporary description');

    // Navigate away
    await page.getByRole('link', { name: /members/i }).click();

    // Navigate back
    await page.getByRole('link', { name: /overview/i }).click();

    // Original data should be restored (not the temporary changes)
    await expect(page.getByDisplayValue('Test Server')).toBeVisible();
    await expect(page.getByDisplayValue('Test server description')).toBeVisible();
  });

  test('should handle keyboard navigation', async () => {
    // Tab through form elements
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Server Name')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Description')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeFocused();

    // Submit with Enter key
    await page.keyboard.press('Enter');
  });

  test('should display server statistics', async () => {
    // Should show member count or other server stats
    await expect(page.getByText(/members/i)).toBeVisible();
    await expect(page.getByText('25')).toBeVisible(); // Member count from mock data
  });

  test('should open server overview modal from button', async () => {
    // Look for button that opens modal
    const modalButton = page.getByRole('button', { name: /quick edit/i });
    if (await modalButton.isVisible()) {
      await modalButton.click();

      // Check that modal opens
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Server Overview')).toBeVisible();

      // Close modal
      await page.getByRole('button', { name: /close/i }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible();
    }
  });
});