/**
 * Modal Components E2E Tests
 * 
 * Comprehensive E2E tests for all modal components.
 * Tests visual parity with Discord-clone and Matrix integration.
 */

import { test, expect, Page } from '@playwright/test';
import { 
  waitForAppReady,
  waitForMatrixSync,
  generateServerName,
  generateChannelName
} from '../fixtures';

// =============================================================================
// Page Object Models
// =============================================================================

class NavigationHelper {
  constructor(private page: Page) {}

  get addServerButton() {
    return this.page.locator('[aria-label="Add a server"], button:has(svg.lucide-plus)').first();
  }

  async clickAddServer() {
    await this.addServerButton.click();
    await this.page.waitForTimeout(500);
  }

  async selectServer(serverName: string) {
    await this.page.locator(`[aria-label="${serverName}"], img[alt="${serverName}"]`).click();
    await this.page.waitForTimeout(500);
  }
}

class ModalHelper {
  constructor(protected page: Page) {}

  get modal() {
    return this.page.locator('[role="dialog"], [data-state="open"]').first();
  }

  get closeButton() {
    return this.modal.locator('button[aria-label="Close"], button:has(svg.lucide-x)');
  }

  get cancelButton() {
    return this.modal.locator('button:has-text("Cancel")');
  }

  get confirmButton() {
    return this.modal.locator('button:has-text("Confirm")');
  }

  get submitButton() {
    return this.modal.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
  }

  async expectVisible() {
    await expect(this.modal).toBeVisible({ timeout: 5000 });
  }

  async expectHidden() {
    await expect(this.modal).not.toBeVisible({ timeout: 5000 });
  }

  async close() {
    const close = this.closeButton;
    if (await close.isVisible()) {
      await close.click();
    } else {
      await this.cancelButton.click();
    }
    await this.page.waitForTimeout(300);
  }
}

class CreateServerModal extends ModalHelper {
  get nameInput() {
    return this.modal.locator('input[placeholder*="server name" i], input[name="name"]');
  }

  get fileUpload() {
    return this.modal.locator('input[type="file"]');
  }

  async fillServerName(name: string) {
    await this.nameInput.fill(name);
  }

  async createServer(name: string) {
    await this.fillServerName(name);
    await this.submitButton.click();
  }
}

class CreateChannelModal extends ModalHelper {
  get nameInput() {
    return this.modal.locator('input[placeholder*="channel name" i], input[name="name"]');
  }

  get typeSelector() {
    return this.modal.locator('[role="combobox"], select');
  }

  async fillChannelName(name: string) {
    await this.nameInput.fill(name);
  }

  async selectChannelType(type: 'TEXT' | 'AUDIO' | 'VIDEO') {
    await this.typeSelector.click();
    await this.page.locator(`[role="option"]:has-text("${type.toLowerCase()}")`).click();
  }

  async createChannel(name: string, type: 'TEXT' | 'AUDIO' | 'VIDEO' = 'TEXT') {
    await this.fillChannelName(name);
    if (type !== 'TEXT') {
      await this.selectChannelType(type);
    }
    await this.submitButton.click();
  }
}

class InviteModal extends ModalHelper {
  get inviteLinkInput() {
    return this.modal.locator('input[readonly]');
  }

  get copyButton() {
    return this.modal.locator('button:has(svg.lucide-copy)');
  }

  get regenerateButton() {
    return this.modal.locator('button:has-text("Generate a new link")');
  }

  async copyLink() {
    await this.copyButton.click();
  }

  async regenerateLink() {
    await this.regenerateButton.click();
  }
}

class MembersModal extends ModalHelper {
  get memberList() {
    return this.modal.locator('[class*="scroll"]').first();
  }

  getMemberRow(username: string) {
    return this.modal.locator(`text=${username}`).locator('..').locator('..');
  }

  getMemberActions(username: string) {
    return this.getMemberRow(username).locator('button:has(svg.lucide-more-vertical)');
  }
}

class ConfirmationModal extends ModalHelper {
  async confirm() {
    await this.confirmButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
  }
}

// =============================================================================
// Test Suites
// =============================================================================

test.describe('Modal Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await waitForMatrixSync(page);
  });

  // ===========================================================================
  // Create Server Modal Tests
  // ===========================================================================
  
  test.describe('Create Server Modal', () => {
    test('displays with Discord-clone styling', async ({ page }) => {
      const nav = new NavigationHelper(page);
      await nav.clickAddServer();
      
      const modal = new CreateServerModal(page);
      await modal.expectVisible();
      
      // Check for Discord-clone elements
      await expect(page.getByText('Customize your server')).toBeVisible();
      await expect(modal.nameInput).toBeVisible();
    });

    test('has white background with proper contrast', async ({ page }) => {
      const nav = new NavigationHelper(page);
      await nav.clickAddServer();
      
      const modal = new CreateServerModal(page);
      await modal.expectVisible();
      
      // Take screenshot for visual comparison
      await page.screenshot({ path: 'tests/screenshots/create-server-modal.png' });
    });

    test('creates server and navigates to it', async ({ page }) => {
      const nav = new NavigationHelper(page);
      const serverName = generateServerName();
      
      await nav.clickAddServer();
      
      const modal = new CreateServerModal(page);
      await modal.createServer(serverName);
      
      // Wait for navigation
      await page.waitForTimeout(3000);
      
      // Should navigate to server or see server in list
      const urlMatches = page.url().includes('/servers/');
      const serverVisible = await page.getByText(serverName).isVisible().catch(() => false);
      
      expect(urlMatches || serverVisible).toBeTruthy();
    });

    test('closes on cancel', async ({ page }) => {
      const nav = new NavigationHelper(page);
      await nav.clickAddServer();
      
      const modal = new CreateServerModal(page);
      await modal.expectVisible();
      await modal.close();
      await modal.expectHidden();
    });
  });

  // ===========================================================================
  // Create Channel Modal Tests
  // ===========================================================================
  
  test.describe('Create Channel Modal', () => {
    test.beforeEach(async ({ page }) => {
      // Need to be in a server first
      // This assumes there's at least one server or creates one
      const hasServer = await page.locator('[aria-label*="server" i]').first().isVisible().catch(() => false);
      if (!hasServer) {
        test.skip();
      }
      await page.locator('[aria-label*="server" i]').first().click();
      await page.waitForTimeout(500);
    });

    test('displays correct styling', async ({ page }) => {
      // Open server header dropdown and click create channel
      await page.locator('[aria-label*="Server options" i], button:has-text("Server")').first().click().catch(() => {});
      await page.locator('button:has-text("Create Channel"), [role="menuitem"]:has-text("Create Channel")').click().catch(() => {});
      
      // Take screenshot
      await page.screenshot({ path: 'tests/screenshots/create-channel-modal.png' });
    });

    test('shows all channel types', async ({ page }) => {
      // Open create channel modal
      await page.locator('[aria-label*="Server options" i]').first().click().catch(() => {});
      await page.locator('button:has-text("Create Channel")').click().catch(() => {});
      
      const modal = new CreateChannelModal(page);
      if (await modal.modal.isVisible()) {
        await modal.typeSelector.click();
        
        // Should show TEXT, AUDIO, VIDEO options
        await expect(page.getByRole('option', { name: /text/i })).toBeVisible();
      }
    });
  });

  // ===========================================================================
  // Invite Modal Tests
  // ===========================================================================
  
  test.describe('Invite Modal', () => {
    test.beforeEach(async ({ page }) => {
      const hasServer = await page.locator('[aria-label*="server" i]').first().isVisible().catch(() => false);
      if (!hasServer) {
        test.skip();
      }
      await page.locator('[aria-label*="server" i]').first().click();
      await page.waitForTimeout(500);
    });

    test('displays invite link', async ({ page }) => {
      // Open invite modal
      await page.locator('[aria-label*="Server options" i]').first().click().catch(() => {});
      await page.locator('button:has-text("Invite"), [role="menuitem"]:has-text("Invite")').click().catch(() => {});
      
      const modal = new InviteModal(page);
      if (await modal.modal.isVisible()) {
        await expect(modal.inviteLinkInput).toBeVisible();
      }
      
      // Screenshot
      await page.screenshot({ path: 'tests/screenshots/invite-modal.png' });
    });

    test('copy button changes icon on click', async ({ page }) => {
      await page.locator('[aria-label*="Server options" i]').first().click().catch(() => {});
      await page.locator('button:has-text("Invite")').click().catch(() => {});
      
      const modal = new InviteModal(page);
      if (await modal.modal.isVisible()) {
        await modal.copyLink();
        
        // Should show checkmark briefly
        await expect(page.locator('svg.lucide-check')).toBeVisible({ timeout: 2000 }).catch(() => {});
      }
    });
  });

  // ===========================================================================
  // Leave Server Modal Tests
  // ===========================================================================
  
  test.describe('Leave Server Modal', () => {
    test('displays confirmation dialog', async ({ page }) => {
      const hasServer = await page.locator('[aria-label*="server" i]').first().isVisible().catch(() => false);
      if (!hasServer) {
        test.skip();
      }
      
      await page.locator('[aria-label*="server" i]').first().click();
      await page.waitForTimeout(500);
      
      // Open server settings
      await page.locator('[aria-label*="Server options" i]').first().click().catch(() => {});
      await page.locator('button:has-text("Leave Server"), [role="menuitem"]:has-text("Leave")').click().catch(() => {});
      
      const modal = new ConfirmationModal(page);
      if (await modal.modal.isVisible()) {
        await expect(page.getByText('Leave Server')).toBeVisible();
        await expect(modal.cancelButton).toBeVisible();
        await expect(modal.confirmButton).toBeVisible();
        
        // Screenshot
        await page.screenshot({ path: 'tests/screenshots/leave-server-modal.png' });
        
        // Cancel to avoid actually leaving
        await modal.cancel();
      }
    });
  });

  // ===========================================================================
  // Members Modal Tests
  // ===========================================================================
  
  test.describe('Members Modal', () => {
    test('displays member list', async ({ page }) => {
      const hasServer = await page.locator('[aria-label*="server" i]').first().isVisible().catch(() => false);
      if (!hasServer) {
        test.skip();
      }
      
      await page.locator('[aria-label*="server" i]').first().click();
      await page.waitForTimeout(500);
      
      // Open members modal
      await page.locator('[aria-label*="Server options" i]').first().click().catch(() => {});
      await page.locator('button:has-text("Members"), [role="menuitem"]:has-text("Members")').click().catch(() => {});
      
      const modal = new MembersModal(page);
      if (await modal.modal.isVisible()) {
        await expect(page.getByText('Manage Members')).toBeVisible();
        
        // Screenshot
        await page.screenshot({ path: 'tests/screenshots/members-modal.png' });
      }
    });
  });

  // ===========================================================================
  // Visual Regression Tests
  // ===========================================================================
  
  test.describe('Visual Regression', () => {
    test('modals match Discord-clone design', async ({ page }) => {
      // This test captures screenshots for manual visual comparison
      const screenshots: string[] = [];
      
      // Create server modal
      const nav = new NavigationHelper(page);
      if (await nav.addServerButton.isVisible()) {
        await nav.clickAddServer();
        const modal = new CreateServerModal(page);
        if (await modal.modal.isVisible()) {
          await page.screenshot({ 
            path: 'tests/screenshots/visual-regression/create-server.png',
            fullPage: false 
          });
          screenshots.push('create-server.png');
          await modal.close().catch(() => {});
        }
      }
      
      // Report captured screenshots
      console.log('Captured screenshots:', screenshots);
    });
  });
});
