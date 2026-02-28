/**
 * Authentication Helper Functions for E2E Tests
 * 
 * Provides login/logout utilities for test authentication
 * Uses auth bypass due to Matrix backend 502 errors in test environment
 */

import { Page } from '@playwright/test';
import { bypassAuthenticationDirectly, DEFAULT_MOCK_AUTH } from './auth-bypass';

// Re-export logout from auth-helpers
export { logout } from './auth-helpers';

/**
 * User credentials interface
 */
interface UserCredentials {
  username: string;
  password: string;
  userId?: string;
}

/**
 * Login with username/password credentials
 * Uses auth bypass due to Matrix backend issues in test environment
 */
export async function login(page: Page, user: UserCredentials): Promise<void> {
  console.log(`🔐 Logging in as user: ${user.username}`);
  
  // Create mock auth state for this user
  const mockAuth = {
    ...DEFAULT_MOCK_AUTH,
    userId: user.userId || `@${user.username}:dev2.aaroncollins.info`,
    displayName: user.username,
  };
  
  // Use authentication bypass due to Matrix backend 502 errors
  await bypassAuthenticationDirectly(page, mockAuth);
  
  console.log(`✅ Successfully logged in as: ${user.username}`);
}
