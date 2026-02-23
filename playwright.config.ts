import { defineConfig, devices } from '@playwright/test';

/**
 * Melo V2 Playwright Configuration
 * 
 * Comprehensive E2E testing suite for the Melo V2 Matrix client.
 * Runs against Dev2 server: https://dev2.aaroncollins.info
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e',
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],
  
  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.TEST_BASE_URL || 'https://dev2.aaroncollins.info',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'on-first-retry',
    
    // Ignore HTTPS errors (self-signed certs)
    ignoreHTTPSErrors: true,
    
    // Default viewport
    viewport: { width: 1920, height: 1080 },
    
    // Default timeout for actions
    actionTimeout: 15000,
    
    // Navigation timeout - increased for Next.js dev server compilation
    navigationTimeout: 60000,
    
    // Add custom headers to identify test requests
    extraHTTPHeaders: {
      'X-Test-Mode': 'true',
      'X-Playwright-Test': 'true',
    },
  },
  
  // Global timeout per test - increased for Next.js dev server compilation
  timeout: 120000,
  
  // Expect timeout
  expect: {
    timeout: 10000,
  },

  // Configure projects for major browsers
  projects: [
    // Setup project to authenticate before tests
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    
    // Auth tests run WITHOUT authenticated state (they test login flows)
    {
      name: 'auth-tests',
      testMatch: /.*\/auth\/(?!auth\.setup).*\.spec\.ts/,
      use: { 
        ...devices['Desktop Chrome'],
        // No storageState - these tests need unauthenticated state
      },
    },
    
    // Route validation tests - no auth needed (tests route handling, not Matrix)
    {
      name: 'route-tests',
      testMatch: /.*\/routes\/.*\.spec\.ts/,
      use: { 
        ...devices['Desktop Chrome'],
        // Empty storage state - these tests don't need auth
        storageState: { cookies: [], origins: [] },
      },
      // No dependencies - runs without auth setup
    },
    
    // All other tests use authenticated state
    {
      name: 'chromium',
      testMatch: /.*\/(?!auth\/).*\.spec\.ts/,
      use: { 
        ...devices['Desktop Chrome'],
        // Use setup's authenticated state
        storageState: 'tests/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  // Output directory for test artifacts
  outputDir: 'test-results/',
  
  // Global setup/teardown
  globalSetup: undefined,
  globalTeardown: undefined,
});
