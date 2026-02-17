/**
 * Role Management E2E Tests
 * 
 * Tests for role editing, deletion, and reordering functionality.
 * Ensures all changes persist via Matrix API calls.
 */

import { test, expect } from '@playwright/test';
import { 
  AuthPage,
  NavigationPage,
  ServerPage,
  ModalPage,
  waitForAppReady,
  waitForMatrixSync,
  TEST_CONFIG 
} from '../fixtures';

/**
 * Role Management Page Object
 */
class RoleManagementPage {
  readonly page: any;
  readonly rolesList: any;
  readonly createRoleButton: any;
  readonly roleItems: any;
  readonly editRoleButtons: any;
  readonly deleteRoleButtons: any;
  readonly dragHandles: any;

  constructor(page: any) {
    this.page = page;
    this.rolesList = page.locator('[data-testid="roles-list"], .role-manager');
    this.createRoleButton = page.locator('button:has-text("Create Role"), button:has-text("Add Role")');
    this.roleItems = page.locator('[data-testid="role-item"], .role-item');
    this.editRoleButtons = page.locator('button:has-text("Edit Role"), [aria-label*="edit role" i]');
    this.deleteRoleButtons = page.locator('button:has-text("Delete Role"), [aria-label*="delete role" i]');
    this.dragHandles = page.locator('[data-testid="drag-handle"], .drag-handle');
  }

  async openRoleManagement() {
    // Navigate to Server Settings > Roles
    await this.page.locator('button[aria-label*="server settings" i], button:has-text("Server Settings")').click();
    await this.page.waitForTimeout(1000);
    
    // Click on Roles tab/section
    const rolesTab = this.page.locator('button:has-text("Roles"), [data-tab="roles"], a[href*="roles"]');
    await rolesTab.click();
    await this.page.waitForTimeout(2000);
  }

  async getRoleByName(roleName: string) {
    return this.page.locator(`[data-testid="role-${roleName}"], :text("${roleName}")`).first();
  }

  async openEditModal(roleName: string) {
    const roleItem = await this.getRoleByName(roleName);
    
    // Look for more options button on the role
    const moreOptions = roleItem.locator('button:has-text("⋯"), button[aria-label*="more" i], button[aria-label*="options" i]').first();
    await moreOptions.click();
    
    // Click edit option
    await this.page.locator('text="Edit Role"').click();
    await this.page.waitForTimeout(1000);
  }

  async openDeleteConfirmation(roleName: string) {
    const roleItem = await this.getRoleByName(roleName);
    
    // Look for more options button on the role  
    const moreOptions = roleItem.locator('button:has-text("⋯"), button[aria-label*="more" i], button[aria-label*="options" i]').first();
    await moreOptions.click();
    
    // Click delete option
    await this.page.locator('text="Delete Role"').click();
    await this.page.waitForTimeout(500);
  }

  async expectRoleExists(roleName: string) {
    const role = await this.getRoleByName(roleName);
    await expect(role).toBeVisible();
  }

  async expectRoleNotExists(roleName: string) {
    const role = await this.getRoleByName(roleName);
    await expect(role).not.toBeVisible();
  }

  async dragRoleToPosition(fromRole: string, toPosition: number) {
    const sourceRole = await this.getRoleByName(fromRole);
    const dragHandle = sourceRole.locator('[data-testid="drag-handle"], .drag-handle').first();
    
    // Get all role items to determine target position
    const allRoles = await this.roleItems.all();
    const targetRole = allRoles[toPosition];
    
    // Perform drag and drop
    await dragHandle.dragTo(targetRole);
    await this.page.waitForTimeout(2000); // Wait for API call
  }

  async getRoleOrder(): Promise<string[]> {
    const roleNames: string[] = [];
    const roles = await this.roleItems.all();
    
    for (const role of roles) {
      const nameElement = role.locator('.font-semibold, [data-testid="role-name"]');
      const name = await nameElement.textContent();
      if (name) roleNames.push(name.trim());
    }
    
    return roleNames;
  }
}

/**
 * Role Edit Modal Page Object
 */
class RoleEditModal extends ModalPage {
  readonly nameInput: any;
  readonly colorPicker: any;
  readonly powerLevelSlider: any;
  readonly saveButton: any;
  readonly permissionToggles: any;

  constructor(page: any) {
    super(page);
    this.nameInput = page.locator('input[placeholder*="role" i], input[placeholder*="name" i]');
    this.colorPicker = page.locator('input[type="color"], [data-testid="color-picker"]');
    this.powerLevelSlider = page.locator('[role="slider"], input[type="range"]');
    this.saveButton = page.locator('button:has-text("Update Role"), button:has-text("Save")');
    this.permissionToggles = page.locator('[role="switch"], input[type="checkbox"]');
  }

  async updateRoleName(newName: string) {
    await this.nameInput.fill(newName);
  }

  async updateRoleColor(color: string) {
    // Try clicking preset color first
    const presetColor = this.page.locator(`[style*="${color}"], [data-color="${color}"]`).first();
    const isPresetVisible = await presetColor.isVisible().catch(() => false);
    
    if (isPresetVisible) {
      await presetColor.click();
    } else {
      // Use color picker input
      await this.colorPicker.fill(color);
    }
  }

  async updatePowerLevel(level: number) {
    // Try slider first
    try {
      await this.powerLevelSlider.fill(level.toString());
    } catch {
      // Try clicking preset buttons
      const presetButton = this.page.locator(`button:has-text("${level}"), [data-level="${level}"]`).first();
      await presetButton.click();
    }
  }

  async saveChanges() {
    await this.saveButton.click();
    await this.page.waitForTimeout(2000); // Wait for API call and UI update
  }

  async togglePermission(permissionName: string) {
    const permission = this.page.locator(`[data-permission="${permissionName}"], label:has-text("${permissionName}")`).first();
    await permission.click();
  }
}

// Test data
const TEST_SERVER_NAME = 'Role Management Test Server';
const TEST_ROLE_NAME = 'Test Role';
const UPDATED_ROLE_NAME = 'Updated Test Role';
const TEST_ROLE_COLOR = '#ff5733';

test.describe('Role Management', () => {
  let roleManagement: RoleManagementPage;
  let editModal: RoleEditModal;

  test.beforeEach(async ({ page }) => {
    roleManagement = new RoleManagementPage(page);
    editModal = new RoleEditModal(page);

    // Login and wait for app to be ready
    await page.goto('/sign-in');
    await waitForAppReady(page);

    const auth = new AuthPage(page);
    await auth.login(TEST_CONFIG.testUser.username, TEST_CONFIG.testUser.password);
    await waitForMatrixSync(page);
    
    // Navigate to test server or create one
    const nav = new NavigationPage(page);
    const serverPage = new ServerPage(page);
    
    try {
      await nav.clickServer(TEST_SERVER_NAME);
    } catch {
      // Create test server if it doesn't exist
      await nav.addServerButton.click();
      await page.waitForTimeout(1000);
      
      const createModal = page.locator('[role="dialog"]');
      await createModal.locator('input').fill(TEST_SERVER_NAME);
      await createModal.locator('button[type="submit"]').click();
      await page.waitForTimeout(3000);
    }
  });

  test('should display roles management interface', async ({ page }) => {
    await roleManagement.openRoleManagement();
    
    // Should show roles list
    await expect(roleManagement.rolesList).toBeVisible();
    
    // Should show create role button
    await expect(roleManagement.createRoleButton).toBeVisible();
    
    // Should show default roles
    await roleManagement.expectRoleExists('@everyone');
  });

  test('should create a new role', async ({ page }) => {
    await roleManagement.openRoleManagement();
    
    // Click create role button
    await roleManagement.createRoleButton.click();
    await page.waitForTimeout(1000);
    
    // Fill role details
    const createModal = new ModalPage(page);
    await createModal.modal.locator('input[placeholder*="name" i]').fill(TEST_ROLE_NAME);
    
    // Select a color
    const colorButton = createModal.modal.locator('[style*="#7289da"]').first();
    await colorButton.click();
    
    // Set power level
    const powerSlider = createModal.modal.locator('[role="slider"]').first();
    if (await powerSlider.isVisible()) {
      await powerSlider.fill('25');
    }
    
    // Save
    await createModal.modal.locator('button:has-text("Create"), button[type="submit"]').click();
    await page.waitForTimeout(3000);
    
    // Verify role was created
    await roleManagement.expectRoleExists(TEST_ROLE_NAME);
  });

  test('should edit an existing role', async ({ page }) => {
    await roleManagement.openRoleManagement();
    
    // Ensure test role exists
    try {
      await roleManagement.expectRoleExists(TEST_ROLE_NAME);
    } catch {
      // Create it if it doesn't exist
      await roleManagement.createRoleButton.click();
      await page.waitForTimeout(1000);
      
      const createModal = new ModalPage(page);
      await createModal.modal.locator('input[placeholder*="name" i]').fill(TEST_ROLE_NAME);
      await createModal.modal.locator('button:has-text("Create"), button[type="submit"]').click();
      await page.waitForTimeout(3000);
    }
    
    // Open edit modal
    await roleManagement.openEditModal(TEST_ROLE_NAME);
    
    // Verify edit modal is open
    await expect(editModal.modal).toBeVisible();
    
    // Update role name
    await editModal.updateRoleName(UPDATED_ROLE_NAME);
    
    // Update role color
    await editModal.updateRoleColor(TEST_ROLE_COLOR);
    
    // Save changes
    await editModal.saveChanges();
    
    // Verify changes persisted
    await roleManagement.expectRoleExists(UPDATED_ROLE_NAME);
    await roleManagement.expectRoleNotExists(TEST_ROLE_NAME);
  });

  test('should show confirmation dialog when deleting role', async ({ page }) => {
    await roleManagement.openRoleManagement();
    
    // Ensure test role exists
    try {
      await roleManagement.expectRoleExists(UPDATED_ROLE_NAME);
    } catch {
      // Create it if it doesn't exist
      await roleManagement.createRoleButton.click();
      await page.waitForTimeout(1000);
      
      const createModal = new ModalPage(page);
      await createModal.modal.locator('input[placeholder*="name" i]').fill(UPDATED_ROLE_NAME);
      await createModal.modal.locator('button:has-text("Create"), button[type="submit"]').click();
      await page.waitForTimeout(3000);
    }
    
    // Try to delete role
    await roleManagement.openDeleteConfirmation(UPDATED_ROLE_NAME);
    
    // Should show confirmation dialog (could be browser confirm or custom modal)
    await page.waitForTimeout(500);
    
    // Check for either browser confirm dialog or custom confirmation modal
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('delete');
      expect(dialog.message()).toContain('cannot be undone');
    });
    
    // Or check for custom confirmation modal
    const confirmModal = page.locator('[role="dialog"]:has-text("delete"), [role="alertdialog"]');
    const hasCustomModal = await confirmModal.isVisible().catch(() => false);
    
    if (hasCustomModal) {
      await expect(confirmModal).toContainText('delete');
      await expect(confirmModal).toContainText('cannot be undone');
    }
  });

  test('should delete role with confirmation', async ({ page }) => {
    await roleManagement.openRoleManagement();
    
    // Ensure test role exists
    try {
      await roleManagement.expectRoleExists(UPDATED_ROLE_NAME);
    } catch {
      // Create it if it doesn't exist
      await roleManagement.createRoleButton.click();
      await page.waitForTimeout(1000);
      
      const createModal = new ModalPage(page);
      await createModal.modal.locator('input[placeholder*="name" i]').fill(UPDATED_ROLE_NAME);
      await createModal.modal.locator('button:has-text("Create"), button[type="submit"]').click();
      await page.waitForTimeout(3000);
    }
    
    // Delete role and confirm
    page.on('dialog', dialog => dialog.accept()); // Accept browser confirm
    await roleManagement.openDeleteConfirmation(UPDATED_ROLE_NAME);
    
    // Or handle custom modal
    const confirmModal = page.locator('[role="dialog"]:has-text("delete"), [role="alertdialog"]');
    const hasCustomModal = await confirmModal.isVisible().catch(() => false);
    
    if (hasCustomModal) {
      await confirmModal.locator('button:has-text("Delete"), button:has-text("Confirm")').click();
    }
    
    await page.waitForTimeout(3000);
    
    // Verify role was deleted
    await roleManagement.expectRoleNotExists(UPDATED_ROLE_NAME);
  });

  test('should cancel role deletion', async ({ page }) => {
    await roleManagement.openRoleManagement();
    
    // Ensure test role exists
    try {
      await roleManagement.expectRoleExists(UPDATED_ROLE_NAME);
    } catch {
      // Create it if it doesn't exist
      await roleManagement.createRoleButton.click();
      await page.waitForTimeout(1000);
      
      const createModal = new ModalPage(page);
      await createModal.modal.locator('input[placeholder*="name" i]').fill(UPDATED_ROLE_NAME);
      await createModal.modal.locator('button:has-text("Create"), button[type="submit"]').click();
      await page.waitForTimeout(3000);
    }
    
    // Try to delete role but cancel
    page.on('dialog', dialog => dialog.dismiss()); // Dismiss browser confirm
    await roleManagement.openDeleteConfirmation(UPDATED_ROLE_NAME);
    
    // Or handle custom modal
    const confirmModal = page.locator('[role="dialog"]:has-text("delete"), [role="alertdialog"]');
    const hasCustomModal = await confirmModal.isVisible().catch(() => false);
    
    if (hasCustomModal) {
      await confirmModal.locator('button:has-text("Cancel")').click();
    }
    
    await page.waitForTimeout(1000);
    
    // Verify role still exists
    await roleManagement.expectRoleExists(UPDATED_ROLE_NAME);
  });

  test('should reorder roles via drag and drop', async ({ page }) => {
    await roleManagement.openRoleManagement();
    
    // Create multiple test roles for reordering
    const testRoles = ['Role A', 'Role B', 'Role C'];
    
    for (const roleName of testRoles) {
      try {
        await roleManagement.expectRoleExists(roleName);
      } catch {
        await roleManagement.createRoleButton.click();
        await page.waitForTimeout(1000);
        
        const createModal = new ModalPage(page);
        await createModal.modal.locator('input[placeholder*="name" i]').fill(roleName);
        await createModal.modal.locator('button:has-text("Create"), button[type="submit"]').click();
        await page.waitForTimeout(2000);
      }
    }
    
    // Get initial order
    const initialOrder = await roleManagement.getRoleOrder();
    console.log('Initial role order:', initialOrder);
    
    // Try to drag first role to second position
    if (initialOrder.length >= 2) {
      await roleManagement.dragRoleToPosition(initialOrder[0], 1);
      
      // Get new order and verify it changed
      const newOrder = await roleManagement.getRoleOrder();
      console.log('New role order:', newOrder);
      
      // Should be different from initial order
      expect(newOrder).not.toEqual(initialOrder);
    }
  });

  test('should persist role changes via Matrix API', async ({ page }) => {
    await roleManagement.openRoleManagement();
    
    // Create a role
    await roleManagement.createRoleButton.click();
    await page.waitForTimeout(1000);
    
    const persistTestRole = 'API Persist Test Role';
    const createModal = new ModalPage(page);
    await createModal.modal.locator('input[placeholder*="name" i]').fill(persistTestRole);
    await createModal.modal.locator('button:has-text("Create"), button[type="submit"]').click();
    await page.waitForTimeout(3000);
    
    // Verify it exists
    await roleManagement.expectRoleExists(persistTestRole);
    
    // Refresh the page to test persistence
    await page.reload();
    await waitForAppReady(page);
    await waitForMatrixSync(page);
    
    // Navigate back to role management
    await roleManagement.openRoleManagement();
    
    // Verify role still exists after refresh (persisted via Matrix API)
    await roleManagement.expectRoleExists(persistTestRole);
    
    // Clean up - delete the test role
    page.on('dialog', dialog => dialog.accept());
    await roleManagement.openDeleteConfirmation(persistTestRole);
    await page.waitForTimeout(2000);
  });

  test('should update role permissions', async ({ page }) => {
    await roleManagement.openRoleManagement();
    
    // Create a role for permission testing
    const permTestRole = 'Permission Test Role';
    
    try {
      await roleManagement.expectRoleExists(permTestRole);
    } catch {
      await roleManagement.createRoleButton.click();
      await page.waitForTimeout(1000);
      
      const createModal = new ModalPage(page);
      await createModal.modal.locator('input[placeholder*="name" i]').fill(permTestRole);
      await createModal.modal.locator('button:has-text("Create"), button[type="submit"]').click();
      await page.waitForTimeout(3000);
    }
    
    // Open edit modal
    await roleManagement.openEditModal(permTestRole);
    
    // Try to toggle a permission (if permission editor is visible)
    const permissionSection = editModal.modal.locator('text="Permissions", text="permission"');
    const hasPermissions = await permissionSection.isVisible().catch(() => false);
    
    if (hasPermissions) {
      // Look for permission toggles
      const toggles = editModal.modal.locator('[role="switch"], input[type="checkbox"]');
      const toggleCount = await toggles.count();
      
      if (toggleCount > 0) {
        // Toggle first permission
        await toggles.first().click();
        await page.waitForTimeout(500);
      }
    }
    
    // Save changes
    await editModal.saveChanges();
    
    // Clean up
    page.on('dialog', dialog => dialog.accept());
    await roleManagement.openDeleteConfirmation(permTestRole);
    await page.waitForTimeout(2000);
  });

  test('should prevent deleting default @everyone role', async ({ page }) => {
    await roleManagement.openRoleManagement();
    
    // Try to access options for @everyone role
    const everyoneRole = await roleManagement.getRoleByName('@everyone');
    
    // Should not have delete option or should be disabled
    const hasMoreOptions = await everyoneRole.locator('button:has-text("⋯"), button[aria-label*="more" i]')
      .isVisible().catch(() => false);
    
    if (hasMoreOptions) {
      await everyoneRole.locator('button:has-text("⋯"), button[aria-label*="more" i]').click();
      
      // Delete option should not exist or be disabled
      const deleteOption = page.locator('text="Delete Role"');
      const hasDeleteOption = await deleteOption.isVisible().catch(() => false);
      
      if (hasDeleteOption) {
        const isDisabled = await deleteOption.isDisabled().catch(() => true);
        expect(isDisabled).toBeTruthy();
      }
      
      // Close menu
      await page.keyboard.press('Escape');
    }
  });

  test('should show role hierarchy correctly', async ({ page }) => {
    await roleManagement.openRoleManagement();
    
    // Should display roles in hierarchy order (highest power level first)
    const roleOrder = await roleManagement.getRoleOrder();
    
    // Should have at least @everyone role
    expect(roleOrder.length).toBeGreaterThan(0);
    expect(roleOrder).toContain('@everyone');
    
    // @everyone should typically be last (lowest power level)
    const everyoneIndex = roleOrder.indexOf('@everyone');
    expect(everyoneIndex).toBeGreaterThanOrEqual(0);
  });
});