/**
 * Channel Permissions E2E Tests
 * 
 * Tests for comprehensive channel permissions management.
 * Covers Matrix room member loading, permission overrides, and UI interactions.
 */

import { test, expect, Page, Locator } from '@playwright/test';
import { 
  NavigationPage,
  waitForAppReady, 
  waitForMatrixSync,
  loginWithTestUser,
  isLoggedIn,
  clearBrowserState,
  retry,
  screenshot
} from '../fixtures';
import { TEST_CONFIG } from '../fixtures/test-data';

/**
 * Channel Permissions Page Object
 */
class ChannelPermissionsPage {
  readonly page: Page;
  readonly refreshButton: Locator;
  readonly addRoleOverrideButton: Locator;
  readonly addUserOverrideButton: Locator;
  readonly roleTab: Locator;
  readonly userTab: Locator;
  readonly bulkTab: Locator;
  readonly roleOverrideCards: Locator;
  readonly userOverrideCards: Locator;
  readonly editButtons: Locator;
  readonly removeButtons: Locator;
  readonly permissionModal: Locator;
  readonly roleSelect: Locator;
  readonly userSelect: Locator;
  readonly savePermissionsButton: Locator;
  readonly cancelButton: Locator;
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.refreshButton = page.locator('button:has-text("Refresh")');
    this.addRoleOverrideButton = page.locator('button:has-text("Add Role Override")');
    this.addUserOverrideButton = page.locator('button:has-text("Add User Override")');
    this.roleTab = page.locator('[data-value="roles"], button:has-text("Roles")');
    this.userTab = page.locator('[data-value="users"], button:has-text("Users")');
    this.bulkTab = page.locator('[data-value="bulk"], button:has-text("Bulk Actions")');
    this.roleOverrideCards = page.locator('[data-testid="role-override"], .role-override-card, .card:has-text("Level")');
    this.userOverrideCards = page.locator('[data-testid="user-override"], .user-override-card, .card:has([data-icon="user"])');
    this.editButtons = page.locator('button:has-text("Edit")');
    this.removeButtons = page.locator('button:has([data-icon="trash-2"])');
    this.permissionModal = page.locator('[role="dialog"]:has-text("Permissions")');
    this.roleSelect = page.locator('[data-testid="role-select"], select:has(option:has-text("Level"))');
    this.userSelect = page.locator('[data-testid="user-select"], select:has(option[value*="@"])');
    this.savePermissionsButton = page.locator('button:has-text("Save Permissions")');
    this.cancelButton = page.locator('button:has-text("Cancel")');
    this.loadingSpinner = page.locator('.loading, [data-loading="true"], .animate-spin');
  }

  async waitForPermissionsLoad() {
    // Wait for loading spinner to disappear
    try {
      await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 15000 });
    } catch {
      // No spinner present, which is fine
    }
    
    // Wait for tabs to appear
    await this.roleTab.waitFor({ state: 'visible', timeout: 10000 });
    
    // Wait for content to stabilize
    await this.page.waitForTimeout(2000);
  }

  async switchToRolesTab() {
    await this.roleTab.click();
    await this.page.waitForTimeout(500);
  }

  async switchToUsersTab() {
    await this.userTab.click();
    await this.page.waitForTimeout(500);
  }

  async switchToBulkTab() {
    await this.bulkTab.click();
    await this.page.waitForTimeout(500);
  }

  async getRoleOverrideCount(): Promise<number> {
    await this.switchToRolesTab();
    return await this.roleOverrideCards.count();
  }

  async getUserOverrideCount(): Promise<number> {
    await this.switchToUsersTab();
    return await this.userOverrideCards.count();
  }

  async openAddRoleOverrideModal(): Promise<void> {
    await this.switchToRolesTab();
    await this.addRoleOverrideButton.click();
    await this.permissionModal.waitFor({ state: 'visible', timeout: 5000 });
  }

  async openAddUserOverrideModal(): Promise<void> {
    await this.switchToUsersTab();
    await this.addUserOverrideButton.click();
    await this.permissionModal.waitFor({ state: 'visible', timeout: 5000 });
  }

  async selectRole(roleText: string): Promise<void> {
    // Click select trigger
    const selectTrigger = this.page.locator('[data-testid="role-select"] button, button:has-text("Choose a role")').first();
    await selectTrigger.click();
    
    // Select role option
    const roleOption = this.page.locator(`[role="option"]:has-text("${roleText}"), [data-value*="Level"]:has-text("${roleText}")`).first();
    await roleOption.click();
  }

  async selectUser(userDisplayName: string): Promise<void> {
    // Click select trigger
    const selectTrigger = this.page.locator('[data-testid="user-select"] button, button:has-text("Choose a user")').first();
    await selectTrigger.click();
    
    // Select user option
    const userOption = this.page.locator(`[role="option"]:has-text("${userDisplayName}")`).first();
    await userOption.click();
  }

  async togglePermission(permissionName: string, targetState: 'allow' | 'deny' | 'inherit'): Promise<void> {
    const permissionRow = this.page.locator(`:has-text("${permissionName}")`).first();
    const permissionButton = permissionRow.locator('button').last();
    
    // Click until we reach the target state
    let attempts = 0;
    while (attempts < 4) { // Max 3 clicks (allow -> deny -> inherit -> allow)
      const currentState = await this.getPermissionState(permissionButton);
      if (currentState === targetState) break;
      
      await permissionButton.click();
      await this.page.waitForTimeout(200);
      attempts++;
    }
  }

  async getPermissionState(button: Locator): Promise<'allow' | 'deny' | 'inherit'> {
    const text = await button.textContent();
    if (text?.includes('Allow')) return 'allow';
    if (text?.includes('Deny')) return 'deny';
    return 'inherit';
  }

  async savePermissions(): Promise<void> {
    await this.savePermissionsButton.click();
    
    // Wait for modal to close
    await this.permissionModal.waitFor({ state: 'hidden', timeout: 10000 });
    
    // Wait for any loading to complete
    await this.waitForPermissionsLoad();
  }

  async cancelPermissions(): Promise<void> {
    await this.cancelButton.click();
    await this.permissionModal.waitFor({ state: 'hidden', timeout: 5000 });
  }

  async editFirstRoleOverride(): Promise<void> {
    await this.switchToRolesTab();
    const firstCard = this.roleOverrideCards.first();
    await firstCard.locator('button:has-text("Edit")').click();
    await this.permissionModal.waitFor({ state: 'visible', timeout: 5000 });
  }

  async editFirstUserOverride(): Promise<void> {
    await this.switchToUsersTab();
    const firstCard = this.userOverrideCards.first();
    await firstCard.locator('button:has-text("Edit")').click();
    await this.permissionModal.waitFor({ state: 'visible', timeout: 5000 });
  }

  async removeFirstRoleOverride(): Promise<void> {
    await this.switchToRolesTab();
    const initialCount = await this.getRoleOverrideCount();
    
    const firstCard = this.roleOverrideCards.first();
    await firstCard.locator('button:has([data-icon="trash-2"])').click();
    
    // Wait for change to take effect
    await this.page.waitForTimeout(2000);
    
    // Verify count decreased
    const newCount = await this.getRoleOverrideCount();
    if (newCount >= initialCount) {
      throw new Error('Role override was not removed');
    }
  }

  async removeFirstUserOverride(): Promise<void> {
    await this.switchToUsersTab();
    const initialCount = await this.getUserOverrideCount();
    
    const firstCard = this.userOverrideCards.first();
    await firstCard.locator('button:has([data-icon="trash-2"])').click();
    
    // Wait for change to take effect
    await this.page.waitForTimeout(2000);
    
    // Verify count decreased
    const newCount = await this.getUserOverrideCount();
    if (newCount >= initialCount) {
      throw new Error('User override was not removed');
    }
  }

  async getAvailableUsers(): Promise<string[]> {
    await this.openAddUserOverrideModal();
    
    // Click user select to open dropdown
    const selectTrigger = this.page.locator('[data-testid="user-select"] button, button:has-text("Choose a user")').first();
    await selectTrigger.click();
    
    // Get all user options
    const userOptions = this.page.locator('[role="option"]');
    const userCount = await userOptions.count();
    const users: string[] = [];
    
    for (let i = 0; i < userCount; i++) {
      const userText = await userOptions.nth(i).textContent();
      if (userText && userText.trim() && !users.includes(userText)) {
        users.push(userText.trim());
      }
    }
    
    await this.cancelPermissions();
    return users;
  }

  async hasRealUsers(): Promise<boolean> {
    const users = await this.getAvailableUsers();
    
    // Check if we have actual Matrix user IDs (not placeholder data)
    const hasMatrixUsers = users.some(user => 
      user.includes('@') && user.includes(':') && !user.includes('User 1') && !user.includes('User 2')
    );
    
    return hasMatrixUsers && users.length > 0;
  }
}

/**
 * Helper to navigate to channel permissions
 */
async function navigateToChannelPermissions(page: Page, channelName?: string): Promise<ChannelPermissionsPage> {
  const nav = new NavigationPage(page);
  
  // Navigate to a server/space
  const serverButton = page.locator('[data-testid="server-item"], .server-icon, button:has([data-icon="users"])').first();
  if (await serverButton.isVisible({ timeout: 5000 })) {
    await serverButton.click();
    await page.waitForTimeout(1000);
  }
  
  // Navigate to a channel
  const channelButton = channelName ? 
    page.locator(`[data-testid="channel"]:has-text("${channelName}"), .channel-item:has-text("${channelName}")`).first() :
    page.locator('[data-testid="channel"], .channel-item, [data-icon="hash"]').first();
  
  if (await channelButton.isVisible({ timeout: 5000 })) {
    await channelButton.click();
    await page.waitForTimeout(1000);
  }
  
  // Open channel settings or permissions
  const settingsButton = page.locator('button[aria-label*="settings" i], button:has([data-icon="settings"])').first();
  if (await settingsButton.isVisible({ timeout: 5000 })) {
    await settingsButton.click();
  } else {
    // Try right-click context menu
    await channelButton.click({ button: 'right' });
    await page.locator('text="Settings", text="Permissions"').first().click();
  }
  
  await page.waitForTimeout(1000);
  
  // Look for permissions tab/section
  const permissionsTab = page.locator('button:has-text("Permissions"), [data-tab="permissions"]').first();
  if (await permissionsTab.isVisible({ timeout: 5000 })) {
    await permissionsTab.click();
    await page.waitForTimeout(500);
  }
  
  const channelPermissions = new ChannelPermissionsPage(page);
  await channelPermissions.waitForPermissionsLoad();
  
  return channelPermissions;
}

test.describe('Channel Permissions Management', () => {
  test.beforeEach(async ({ page }) => {
    // Clear browser state for clean test environment
    await clearBrowserState(page);
    
    // Navigate and wait for app
    await page.goto('/');
    await waitForAppReady(page);
    
    // Login if not already logged in
    if (!(await isLoggedIn(page))) {
      await loginWithTestUser(page);
    }
    
    await waitForMatrixSync(page);
  });

  test('channel permissions page loads correctly', async ({ page }) => {
    const channelPermissions = await navigateToChannelPermissions(page);
    
    // Should show permission management tabs
    await expect(channelPermissions.roleTab).toBeVisible();
    await expect(channelPermissions.userTab).toBeVisible();
    await expect(channelPermissions.bulkTab).toBeVisible();
    
    // Should show role tab by default
    await expect(channelPermissions.addRoleOverrideButton).toBeVisible();
    
    console.log('✓ Channel permissions page loads with correct tabs');
  });

  test('loads actual users from Matrix room state', async ({ page }) => {
    const channelPermissions = await navigateToChannelPermissions(page);
    
    // Check if we have real users (not placeholder data)
    const hasRealUsers = await channelPermissions.hasRealUsers();
    
    if (!hasRealUsers) {
      console.log('⚠️ No real Matrix users found - may be in a test room with limited members');
      
      // At minimum, we should have some users available (even if it's just the current user)
      const users = await channelPermissions.getAvailableUsers();
      expect(users.length).toBeGreaterThan(0);
      
      console.log(`Found ${users.length} user(s): ${users.slice(0, 3).join(', ')}${users.length > 3 ? '...' : ''}`);
    } else {
      const users = await channelPermissions.getAvailableUsers();
      
      // Should have actual Matrix user IDs
      const matrixUserCount = users.filter(user => user.includes('@') && user.includes(':')).length;
      expect(matrixUserCount).toBeGreaterThan(0);
      
      // Should not have placeholder data
      const hasPlaceholder = users.some(user => user.includes('User 1') || user.includes('User 2'));
      expect(hasPlaceholder).toBeFalsy();
      
      console.log(`✓ Loaded ${users.length} real Matrix users (${matrixUserCount} with Matrix IDs)`);
    }
  });

  test('can create role permission override', async ({ page }) => {
    const channelPermissions = await navigateToChannelPermissions(page);
    
    // Get initial role override count
    const initialCount = await channelPermissions.getRoleOverrideCount();
    
    // Open role override modal
    await channelPermissions.openAddRoleOverrideModal();
    
    // Should show role selection
    await expect(channelPermissions.roleSelect.first()).toBeVisible();
    
    // Try to select a role (look for any available role)
    const roleOptions = page.locator('[role="option"], select option');
    if (await roleOptions.first().isVisible({ timeout: 5000 })) {
      const firstRoleText = await roleOptions.first().textContent();
      if (firstRoleText) {
        await channelPermissions.selectRole(firstRoleText.trim());
        
        // Toggle some permissions
        await channelPermissions.togglePermission('Send Messages', 'allow');
        await channelPermissions.togglePermission('Manage Messages', 'deny');
        
        // Save
        await channelPermissions.savePermissions();
        
        // Verify role override was created
        const newCount = await channelPermissions.getRoleOverrideCount();
        expect(newCount).toBeGreaterThan(initialCount);
        
        console.log(`✓ Created role permission override (count: ${initialCount} → ${newCount})`);
      } else {
        console.log('⚠️ No role options available for override test');
      }
    } else {
      console.log('⚠️ No roles available for override test');
    }
  });

  test('can create user permission override', async ({ page }) => {
    const channelPermissions = await navigateToChannelPermissions(page);
    
    // Get initial user override count
    const initialCount = await channelPermissions.getUserOverrideCount();
    
    // Get available users
    const availableUsers = await channelPermissions.getAvailableUsers();
    
    if (availableUsers.length === 0) {
      console.log('⚠️ No users available for override test');
      return;
    }
    
    // Open user override modal
    await channelPermissions.openAddUserOverrideModal();
    
    // Select first available user
    await channelPermissions.selectUser(availableUsers[0]);
    
    // Toggle some permissions
    await channelPermissions.togglePermission('Send Messages', 'allow');
    await channelPermissions.togglePermission('Embed Links', 'deny');
    
    // Save
    await channelPermissions.savePermissions();
    
    // Verify user override was created
    const newCount = await channelPermissions.getUserOverrideCount();
    expect(newCount).toBeGreaterThan(initialCount);
    
    console.log(`✓ Created user permission override for "${availableUsers[0]}" (count: ${initialCount} → ${newCount})`);
  });

  test('can edit existing permission overrides', async ({ page }) => {
    const channelPermissions = await navigateToChannelPermissions(page);
    
    // Create a role override first if none exist
    let roleOverrideCount = await channelPermissions.getRoleOverrideCount();
    
    if (roleOverrideCount === 0) {
      await channelPermissions.openAddRoleOverrideModal();
      
      const roleOptions = page.locator('[role="option"], select option');
      if (await roleOptions.first().isVisible({ timeout: 3000 })) {
        const firstRoleText = await roleOptions.first().textContent();
        if (firstRoleText) {
          await channelPermissions.selectRole(firstRoleText.trim());
          await channelPermissions.togglePermission('Send Messages', 'allow');
          await channelPermissions.savePermissions();
          roleOverrideCount = await channelPermissions.getRoleOverrideCount();
        }
      }
    }
    
    if (roleOverrideCount > 0) {
      // Edit existing role override
      await channelPermissions.editFirstRoleOverride();
      
      // Change a permission
      await channelPermissions.togglePermission('Send Messages', 'deny');
      await channelPermissions.savePermissions();
      
      console.log('✓ Successfully edited role permission override');
    } else {
      console.log('⚠️ No role overrides available to edit');
    }
  });

  test('can remove permission overrides', async ({ page }) => {
    const channelPermissions = await navigateToChannelPermissions(page);
    
    // Create a role override to remove
    let roleOverrideCount = await channelPermissions.getRoleOverrideCount();
    
    if (roleOverrideCount === 0) {
      await channelPermissions.openAddRoleOverrideModal();
      
      const roleOptions = page.locator('[role="option"], select option');
      if (await roleOptions.first().isVisible({ timeout: 3000 })) {
        const firstRoleText = await roleOptions.first().textContent();
        if (firstRoleText) {
          await channelPermissions.selectRole(firstRoleText.trim());
          await channelPermissions.togglePermission('Send Messages', 'allow');
          await channelPermissions.savePermissions();
          roleOverrideCount = await channelPermissions.getRoleOverrideCount();
        }
      }
    }
    
    if (roleOverrideCount > 0) {
      // Remove the role override
      await channelPermissions.removeFirstRoleOverride();
      
      console.log('✓ Successfully removed role permission override');
    } else {
      console.log('⚠️ No role overrides available to remove');
    }
  });

  test('permission states toggle correctly', async ({ page }) => {
    const channelPermissions = await navigateToChannelPermissions(page);
    
    await channelPermissions.openAddRoleOverrideModal();
    
    const roleOptions = page.locator('[role="option"], select option');
    if (await roleOptions.first().isVisible({ timeout: 3000 })) {
      const firstRoleText = await roleOptions.first().textContent();
      if (firstRoleText) {
        await channelPermissions.selectRole(firstRoleText.trim());
        
        // Test permission toggle cycle: inherit → allow → deny → inherit
        const permissionRow = page.locator(':has-text("Send Messages")').first();
        const permissionButton = permissionRow.locator('button').last();
        
        // Should start as inherit
        let currentState = await channelPermissions.getPermissionState(permissionButton);
        expect(currentState).toBe('inherit');
        
        // Click to allow
        await permissionButton.click();
        await page.waitForTimeout(200);
        currentState = await channelPermissions.getPermissionState(permissionButton);
        expect(currentState).toBe('allow');
        
        // Click to deny
        await permissionButton.click();
        await page.waitForTimeout(200);
        currentState = await channelPermissions.getPermissionState(permissionButton);
        expect(currentState).toBe('deny');
        
        // Click back to inherit
        await permissionButton.click();
        await page.waitForTimeout(200);
        currentState = await channelPermissions.getPermissionState(permissionButton);
        expect(currentState).toBe('inherit');
        
        console.log('✓ Permission states toggle correctly (inherit → allow → deny → inherit)');
        
        await channelPermissions.cancelPermissions();
      }
    }
  });

  test('bulk actions tab is accessible', async ({ page }) => {
    const channelPermissions = await navigateToChannelPermissions(page);
    
    // Switch to bulk actions tab
    await channelPermissions.switchToBulkTab();
    
    // Should show bulk action controls
    const bulkContent = page.locator(':has-text("Bulk"), :has-text("Target Type"), :has-text("Operation")');
    await expect(bulkContent.first()).toBeVisible({ timeout: 5000 });
    
    console.log('✓ Bulk actions tab is accessible');
  });

  test('handles no users gracefully', async ({ page }) => {
    const channelPermissions = await navigateToChannelPermissions(page);
    
    // Even if there are no users, the UI should handle it gracefully
    await channelPermissions.switchToUsersTab();
    
    // Should show empty state or have at least current user
    const userContent = page.locator(':has-text("No User Overrides"), :has-text("Add User Override")');
    await expect(userContent.first()).toBeVisible();
    
    console.log('✓ Handles empty user state gracefully');
  });

  test('permission categories are displayed', async ({ page }) => {
    const channelPermissions = await navigateToChannelPermissions(page);
    
    await channelPermissions.openAddRoleOverrideModal();
    
    const roleOptions = page.locator('[role="option"], select option');
    if (await roleOptions.first().isVisible({ timeout: 3000 })) {
      const firstRoleText = await roleOptions.first().textContent();
      if (firstRoleText) {
        await channelPermissions.selectRole(firstRoleText.trim());
        
        // Should show different permission categories
        const categories = page.locator(':has-text("General"), :has-text("Text"), :has-text("Voice"), :has-text("Moderation")');
        const categoryCount = await categories.count();
        
        expect(categoryCount).toBeGreaterThan(0);
        
        console.log(`✓ Permission categories displayed (${categoryCount} categories)`);
        
        await channelPermissions.cancelPermissions();
      }
    }
  });

  test('respects Matrix room membership', async ({ page }) => {
    const channelPermissions = await navigateToChannelPermissions(page);
    
    const availableUsers = await channelPermissions.getAvailableUsers();
    
    if (availableUsers.length > 0) {
      // All users should be valid (no empty or undefined entries)
      const validUsers = availableUsers.filter(user => user && user.trim().length > 0);
      expect(validUsers.length).toBe(availableUsers.length);
      
      // Users should be sorted alphabetically
      const sortedUsers = [...availableUsers].sort((a, b) => a.localeCompare(b));
      expect(availableUsers).toEqual(sortedUsers);
      
      console.log(`✓ Users are properly filtered and sorted (${validUsers.length} valid users)`);
    } else {
      console.log('⚠️ No users available - may be in a room with limited membership');
    }
  });
});

test.describe('Channel Permissions Integration', () => {
  test('permissions persist after page reload', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    
    if (!(await isLoggedIn(page))) {
      await loginWithTestUser(page);
    }
    
    await waitForMatrixSync(page);
    
    const channelPermissions = await navigateToChannelPermissions(page);
    
    // Get current override counts
    const initialRoleCount = await channelPermissions.getRoleOverrideCount();
    const initialUserCount = await channelPermissions.getUserOverrideCount();
    
    // Reload page
    await page.reload();
    await waitForAppReady(page);
    await waitForMatrixSync(page);
    
    // Navigate back to channel permissions
    const newChannelPermissions = await navigateToChannelPermissions(page);
    
    // Counts should persist
    const newRoleCount = await newChannelPermissions.getRoleOverrideCount();
    const newUserCount = await newChannelPermissions.getUserOverrideCount();
    
    expect(newRoleCount).toBe(initialRoleCount);
    expect(newUserCount).toBe(initialUserCount);
    
    console.log(`✓ Permission overrides persist after reload (roles: ${newRoleCount}, users: ${newUserCount})`);
  });

  test('works across different screen sizes', async ({ page, browserName }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await waitForAppReady(page);
    
    if (!(await isLoggedIn(page))) {
      await loginWithTestUser(page);
    }
    
    await waitForMatrixSync(page);
    
    const channelPermissions = await navigateToChannelPermissions(page);
    
    // Should be accessible on mobile
    await expect(channelPermissions.roleTab).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    
    // Should still work
    await expect(channelPermissions.userTab).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);
    
    await expect(channelPermissions.bulkTab).toBeVisible();
    
    console.log(`✓ Channel permissions responsive across screen sizes (${browserName})`);
  });
});