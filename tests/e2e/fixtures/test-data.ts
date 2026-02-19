/**
 * Test Data Configuration
 * 
 * Contains test user credentials and other test data.
 * Uses environment variables where possible for security.
 */

export const TEST_CONFIG = {
  // Base URL
  baseUrl: process.env.TEST_BASE_URL || 'https://dev2.aaroncollins.info',
  
  // Matrix homeserver
  homeserver: process.env.TEST_HOMESERVER || 'https://dev2.aaroncollins.info',
  
  // Primary test user - STABLE CREDENTIALS (pre-registered)
  testUser: {
    username: process.env.TEST_USERNAME || 'sophietest',
    password: process.env.TEST_PASSWORD || 'SophieTest2026!',
    displayName: 'E2E Test User',
  },
  
  // Secondary test user (for DM tests, etc.) - STABLE CREDENTIALS (pre-registered)
  secondUser: {
    username: process.env.TEST_USERNAME_2 || 'e2etest2',
    password: process.env.TEST_PASSWORD_2 || 'E2ETest2026!',
    displayName: 'E2E Test User 2',
  },
  
  // Fresh test user - USE STABLE CREDENTIALS INSTEAD OF DYNAMIC
  // Note: Registration requires CAPTCHA/email verification that Melo doesn't support
  // Using pre-registered stable user instead
  freshUser: {
    username: process.env.TEST_USERNAME_FRESH || 'stabletest',
    password: process.env.TEST_PASSWORD_FRESH || 'StableTest2026!',
    displayName: 'Stable E2E Test User',
  },
  
  // Test timeouts
  timeouts: {
    short: 5000,
    medium: 10000,
    long: 30000,
    veryLong: 60000,
  },
  
  // Test data generators
  generators: {
    serverName: () => `Test Server ${Date.now()}`,
    channelName: () => `test-channel-${Date.now()}`,
    roomName: () => `Test Room ${Date.now()}`,
    message: () => `Test message ${Date.now()}`,
    dmMessage: () => `DM test ${Date.now()}`,
  },
};

/**
 * Matrix user ID format
 */
export function getMatrixUserId(username: string, homeserver: string = TEST_CONFIG.homeserver): string {
  const domain = new URL(homeserver).hostname;
  return `@${username}:${domain}`;
}

/**
 * Generate unique test identifiers
 */
export function uniqueId(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}
