/**
 * Page Object Model for Melo V2 E2E Tests
 * 
 * Encapsulates page interactions for better maintainability.
 */

import { Page, Locator, expect } from '@playwright/test';
import { TEST_CONFIG } from './test-data';

/**
 * Authentication Page Object
 */
export class AuthPage {
  readonly page: Page;
  readonly homeserverInput: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly signUpLink: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    // Use test IDs first, fall back to generic selectors
    this.homeserverInput = page.locator('[data-testid="homeserver-input"], input[type="url"], input[placeholder*="homeserver" i], input[placeholder*="server" i]').first();
    this.usernameInput = page.locator('[data-testid="username-input"], input[type="text"]').first();
    // For sign-in page (single password field)
    this.passwordInput = page.locator('[data-testid="password-input"], input[type="password"]').first();
    // For sign-up page (confirm password field)
    this.confirmPasswordInput = page.locator('input[placeholder*="confirm" i], input[type="password"]').last();
    this.submitButton = page.locator('[data-testid="login-button"], button[type="submit"]');
    this.signUpLink = page.locator('a:has-text("Sign up"), a:has-text("Register"), a:has-text("Create account")');
    this.errorMessage = page.locator('[data-testid="error-message"], .text-red-400, .text-red-500, .bg-red-100').first();
  }

  async goto(type: 'sign-in' | 'sign-up' = 'sign-in') {
    await this.page.goto(`/${type}`);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForHydration() {
    // Wait for React hydration - look for specific test IDs to be ready
    await this.page.waitForLoadState('networkidle');
    
    // Wait for core form elements to be visible and interactable
    await expect(this.usernameInput).toBeVisible({ timeout: 10000 });
    await expect(this.passwordInput).toBeVisible({ timeout: 10000 });
    await expect(this.submitButton).toBeVisible({ timeout: 10000 });
    
    // Additional wait to ensure form is fully interactive
    await this.page.waitForTimeout(1000);
  }

  async login(username: string, password: string, homeserver?: string) {
    await this.waitForHydration();
    
    // Fill homeserver if provided
    if (homeserver) {
      try {
        await this.homeserverInput.fill(homeserver);
      } catch {
        // Homeserver input might not exist if pre-filled
      }
    }
    
    // Fill username and password
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    
    // Submit
    await this.submitButton.click();
    
    // Wait for navigation or error
    await this.page.waitForTimeout(5000);
  }

  async signUp(username: string, password: string, homeserver?: string) {
    await this.goto('sign-up');
    await this.waitForHydration();
    
    // Fill homeserver if provided
    if (homeserver) {
      try {
        await this.homeserverInput.fill(homeserver);
      } catch {
        // Homeserver input might not exist if pre-filled
      }
    }
    
    // Fill username
    await this.usernameInput.fill(username);
    
    // Fill password (first field)
    await this.passwordInput.fill(password);
    
    // Fill confirm password (second field) if it exists
    const hasConfirmPassword = await this.page.locator('input[placeholder*="confirm" i]').isVisible().catch(() => false);
    if (hasConfirmPassword) {
      await this.page.locator('input[placeholder*="confirm" i]').fill(password);
    } else {
      // Try the second password field
      const passwordFields = await this.page.locator('input[type="password"]').count();
      if (passwordFields > 1) {
        await this.page.locator('input[type="password"]').nth(1).fill(password);
      }
    }
    
    // Submit
    await this.submitButton.click();
    
    // Wait for navigation or error
    await this.page.waitForTimeout(5000);
  }

  async expectLoggedIn() {
    // Should not be on sign-in page
    await expect(this.page).not.toHaveURL(/\/sign-in/);
  }

  async expectError() {
    await expect(this.errorMessage).toBeVisible();
  }
}

/**
 * Navigation/Sidebar Page Object
 */
export class NavigationPage {
  readonly page: Page;
  readonly serverList: Locator;
  readonly addServerButton: Locator;
  readonly userArea: Locator;
  readonly settingsButton: Locator;
  readonly dmList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.serverList = page.locator('[data-testid="server-list"], .server-list, nav');
    this.addServerButton = page.locator('button:has-text("Add"), button:has-text("Create"), [aria-label*="add server" i]');
    this.userArea = page.locator('[data-testid="user-area"], .user-area');
    this.settingsButton = page.locator('button[aria-label*="settings" i], button:has-text("Settings")');
    this.dmList = page.locator('[data-testid="dm-list"], .dm-list');
  }

  async clickServer(serverName: string) {
    await this.page.locator(`[data-testid="server-${serverName}"], :text("${serverName}")`).first().click();
  }

  async openSettings() {
    await this.settingsButton.click();
  }
}

/**
 * Server/Space Page Object
 */
export class ServerPage {
  readonly page: Page;
  readonly serverName: Locator;
  readonly channelList: Locator;
  readonly addChannelButton: Locator;
  readonly serverSettingsButton: Locator;
  readonly inviteButton: Locator;
  readonly memberList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.serverName = page.locator('[data-testid="server-name"], .server-name, h1, h2').first();
    this.channelList = page.locator('[data-testid="channel-list"], .channel-list');
    this.addChannelButton = page.locator('button:has-text("Create Channel"), button[aria-label*="add channel" i]');
    this.serverSettingsButton = page.locator('button[aria-label*="server settings" i], button:has-text("Server Settings")');
    this.inviteButton = page.locator('button:has-text("Invite"), button[aria-label*="invite" i]');
    this.memberList = page.locator('[data-testid="member-list"], .member-list');
  }

  async clickChannel(channelName: string) {
    await this.page.locator(`[data-testid="channel-${channelName}"], :text("${channelName}")`).first().click();
  }

  async createChannel(name: string, type: 'text' | 'voice' = 'text') {
    await this.addChannelButton.click();
    await this.page.waitForTimeout(500);
    
    // Fill channel name
    await this.page.locator('input[placeholder*="channel" i], input[placeholder*="name" i]').fill(name);
    
    // Select type if applicable
    if (type === 'voice') {
      await this.page.locator('button:has-text("Voice"), [data-value="voice"]').click();
    }
    
    // Submit
    await this.page.locator('button:has-text("Create"), button[type="submit"]').click();
    await this.page.waitForTimeout(2000);
  }
}

/**
 * Chat Page Object
 */
export class ChatPage {
  readonly page: Page;
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly messageList: Locator;
  readonly chatHeader: Locator;
  readonly pinButton: Locator;
  readonly threadButton: Locator;
  readonly reactionPicker: Locator;
  readonly fileUploadButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.messageInput = page.locator('textarea[placeholder*="message" i], input[placeholder*="message" i], [contenteditable="true"]');
    this.sendButton = page.locator('button[aria-label*="send" i], button:has-text("Send")');
    this.messageList = page.locator('[data-testid="message-list"], .message-list, [role="log"]');
    this.chatHeader = page.locator('[data-testid="chat-header"], .chat-header, header');
    this.pinButton = page.locator('button[aria-label*="pin" i]');
    this.threadButton = page.locator('button[aria-label*="thread" i], button:has-text("Reply")');
    this.reactionPicker = page.locator('button[aria-label*="reaction" i], button[aria-label*="emoji" i]');
    this.fileUploadButton = page.locator('button[aria-label*="upload" i], input[type="file"]');
  }

  async sendMessage(message: string) {
    await this.messageInput.fill(message);
    
    // Try clicking send button or pressing Enter
    try {
      await this.sendButton.click({ timeout: 2000 });
    } catch {
      await this.messageInput.press('Enter');
    }
    
    await this.page.waitForTimeout(2000);
  }

  async expectMessageVisible(messageText: string) {
    await expect(this.page.locator(`text="${messageText}"`).first()).toBeVisible({ timeout: 10000 });
  }

  async getLastMessage(): Promise<Locator> {
    return this.messageList.locator('[data-testid="message"], .message').last();
  }

  async reactToMessage(messageLocator: Locator, emoji: string) {
    await messageLocator.hover();
    await this.reactionPicker.click();
    await this.page.locator(`[data-emoji="${emoji}"], :text("${emoji}")`).click();
  }

  async openThread(messageLocator: Locator) {
    await messageLocator.hover();
    await this.threadButton.click();
  }

  async pinMessage(messageLocator: Locator) {
    await messageLocator.hover();
    // Right-click for context menu
    await messageLocator.click({ button: 'right' });
    await this.page.locator('text="Pin"').click();
  }
}

/**
 * Modal Page Object (generic for all modals)
 */
export class ModalPage {
  readonly page: Page;
  readonly modal: Locator;
  readonly closeButton: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.locator('[role="dialog"], .modal, [data-testid="modal"]');
    this.closeButton = page.locator('button[aria-label*="close" i], button:has-text("Close"), .modal-close');
    this.submitButton = page.locator('[role="dialog"] button[type="submit"], [role="dialog"] button:has-text("Create"), [role="dialog"] button:has-text("Save")');
    this.cancelButton = page.locator('[role="dialog"] button:has-text("Cancel")');
  }

  async expectVisible() {
    await expect(this.modal).toBeVisible();
  }

  async expectHidden() {
    await expect(this.modal).not.toBeVisible();
  }

  async close() {
    await this.closeButton.click();
  }

  async submit() {
    await this.submitButton.click();
  }
}

/**
 * Create Server Modal Page Object
 */
export class CreateServerModal extends ModalPage {
  readonly serverNameInput: Locator;

  constructor(page: Page) {
    super(page);
    this.serverNameInput = page.locator('input[placeholder*="server" i], input[placeholder*="name" i]');
  }

  async createServer(name: string) {
    await this.serverNameInput.fill(name);
    await this.submit();
    await this.page.waitForTimeout(3000);
  }
}

/**
 * Settings Modal Page Object
 */
export class SettingsModal extends ModalPage {
  readonly themeToggle: Locator;
  readonly securityTab: Locator;
  readonly profileTab: Locator;

  constructor(page: Page) {
    super(page);
    this.themeToggle = page.locator('button[aria-label*="theme" i], [data-testid="theme-toggle"]');
    this.securityTab = page.locator('button:has-text("Security"), [data-tab="security"]');
    this.profileTab = page.locator('button:has-text("Profile"), [data-tab="profile"]');
  }

  async toggleTheme() {
    await this.themeToggle.click();
  }

  async openSecuritySettings() {
    await this.securityTab.click();
  }
}
