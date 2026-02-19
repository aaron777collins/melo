/**
 * General Test Helper Functions for E2E Tests
 * 
 * Provides general-purpose utilities for E2E testing
 */

/**
 * Generate a unique identifier for testing
 */
export function generateUniqueId(prefix: string = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Generate a unique test room name
 */
export function generateTestRoomName(): string {
  return `Test Room ${generateUniqueId()}`;
}

/**
 * Generate a unique test message
 */
export function generateTestMessage(): string {
  return `Test message ${generateUniqueId()}`;
}

/**
 * Generate a unique username for testing
 */
export function generateTestUsername(prefix: string = 'testuser'): string {
  return generateUniqueId(prefix);
}

/**
 * Wait for a specific condition with timeout
 */
export async function waitForCondition(
  condition: () => Promise<boolean> | boolean,
  timeoutMs: number = 5000,
  checkIntervalMs: number = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
  }
  
  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

/**
 * Create a delay for testing
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000,
  backoffMultiplier: number = 2
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries - 1) {
        break;
      }
      
      const delayMs = initialDelayMs * Math.pow(backoffMultiplier, attempt);
      console.log(`Operation failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delayMs}ms...`);
      await delay(delayMs);
    }
  }
  
  throw lastError || new Error('Operation failed after all retries');
}

/**
 * Generate test data objects
 */
export const TestDataGenerators = {
  /**
   * Generate a test user object
   */
  user: () => ({
    username: generateTestUsername(),
    displayName: `Test User ${generateUniqueId()}`,
    email: `test${generateUniqueId()}@example.com`,
  }),
  
  /**
   * Generate a test room object
   */
  room: () => ({
    name: generateTestRoomName(),
    topic: `Test room topic ${generateUniqueId()}`,
    type: 'public_chat' as const,
  }),
  
  /**
   * Generate a test message object
   */
  message: () => ({
    text: generateTestMessage(),
    timestamp: new Date().toISOString(),
  }),
  
  /**
   * Generate a test server object
   */
  server: () => ({
    name: `Test Server ${generateUniqueId()}`,
    description: `Test server description ${generateUniqueId()}`,
  }),
};

/**
 * Common selectors for E2E testing
 */
export const CommonSelectors = {
  // Authentication
  usernameInput: 'input[name="username"], input[type="text"]',
  passwordInput: 'input[name="password"], input[type="password"]',
  signInButton: 'button[type="submit"], button:has-text("Sign in"), button:has-text("Login")',
  signOutButton: 'button:has-text("Logout"), button:has-text("Sign out")',
  
  // Navigation
  serverSidebar: '[data-testid="server-sidebar"]',
  channelSidebar: '[data-testid="channel-sidebar"], [data-testid="navigation-sidebar"]',
  mainContent: '[data-testid="main-content"], main[role="main"]',
  
  // Chat
  messageInput: '[data-testid="message-input"], [role="textbox"], textarea',
  sendButton: '[data-testid="send-button"], button:has-text("Send")',
  messageList: '[data-testid="message-list"], .message-list',
  
  // Modals
  modal: '[role="dialog"], .modal, [data-modal="true"]',
  modalClose: 'button[aria-label*="close" i], button:has-text("Close")',
  
  // Forms
  createButton: 'button:has-text("Create")',
  cancelButton: 'button:has-text("Cancel")',
  submitButton: 'button[type="submit"]',
  
  // Settings
  settingsButton: '[data-testid="settings-button"], button[aria-label*="settings" i]',
  appearanceSettings: 'a[href*="appearance"], button:has-text("Appearance")',
};

/**
 * Common test utilities
 */
export const TestUtils = {
  /**
   * Take a screenshot with timestamp in filename
   */
  timestampedScreenshot: (baseName: string): string => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `test-results/${baseName}-${timestamp}.png`;
  },
  
  /**
   * Log test step with timestamp
   */
  logStep: (step: string): void => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🧪 ${step}`);
  },
  
  /**
   * Mark test as TODO/pending
   */
  markTodo: (reason: string): void => {
    console.log(`📝 TODO: ${reason}`);
  },
  
  /**
   * Validate environment variables for testing
   */
  validateTestEnvironment: (): void => {
    const requiredVars = ['TEST_BASE_URL', 'TEST_HOMESERVER'];
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      console.warn(`⚠️ Missing environment variables: ${missing.join(', ')}`);
      console.warn('   Using default values from TEST_CONFIG');
    }
  },
};