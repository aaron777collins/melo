import { defineConfig, devices } from '@playwright/test';

/**
 * Debug Configuration for Authentication Issues
 * 
 * Simplified config without authentication setup to isolate auth problems
 */
export default defineConfig({
  // Test directory - only our auth config test
  testDir: './tests/e2e',
  testMatch: /(test-auth-config|test-environment-verification|matrix-credentials-mock|auth-bypass-test)\.spec\.ts/,
  
  // Run tests in sequence for debugging
  fullyParallel: false,
  
  // No retries for debugging
  retries: 0,
  
  // Single worker for debugging
  workers: 1,
  
  // Reporter to use
  reporter: [
    ['list', { printSteps: true }]
  ],
  
  // Shared settings
  use: {
    // Base URL
    baseURL: process.env.TEST_BASE_URL || 'https://dev2.aaroncollins.info',
    
    // Debugging settings
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    
    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,
    
    // Default viewport
    viewport: { width: 1920, height: 1080 },
    
    // Increased timeouts for debugging
    actionTimeout: 30000,
    navigationTimeout: 60000,
    
    // Add test headers
    extraHTTPHeaders: {
      'X-Test-Mode': 'true',
      'X-Playwright-Debug': 'true',
    },
  },
  
  // Global timeout per test
  timeout: 300000, // 5 minutes for debugging
  
  // Expect timeout
  expect: {
    timeout: 15000,
  },

  // Single project without authentication setup
  projects: [
    {
      name: 'auth-debug',
      use: { 
        ...devices['Desktop Chrome'],
        // No storageState - we want to test authentication from scratch
      },
    },
  ],

  // Output directory for test artifacts
  outputDir: 'test-results-auth-debug/',
});