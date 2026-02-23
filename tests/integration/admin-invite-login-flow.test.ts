/**
 * Integration Tests for Admin Invite Login Flow
 * 
 * Tests the complete flow from invite creation to login validation
 * This verifies that isLoginAllowedWithInvite() and markInviteUsedServerSide()
 * are properly wired into the actual login flow.
 * 
 * TDD Approach:
 * 1. RED: Write tests that verify invite login behavior (should fail initially)
 * 2. GREEN: Implementation should make these tests pass
 * 3. REFACTOR: Improve code quality while keeping tests green
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { 
  serverCreateInvite, 
  serverCheckHasValidInvite, 
  serverMarkInviteUsed,
  serverGetAllInvites,
  serverCleanupExpiredInvites
} from '../../lib/matrix/server-invites';
import { 
  isLoginAllowedWithInvite, 
  markInviteUsedServerSide,
  getAccessControlConfig
} from '../../lib/matrix/access-control';

// Test data directory
const TEST_DATA_DIR = path.join(process.cwd(), 'data', 'test-invites');
const TEST_INVITES_FILE = path.join(TEST_DATA_DIR, 'server-invites.json');

// Mock environment for consistent testing
const originalEnv = process.env;

describe('Admin Invite Login Flow Integration', () => {
  beforeEach(() => {
    // Reset environment to private mode
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_MATRIX_HOMESERVER_URL: 'https://matrix.example.com',
      // No MELO_PUBLIC_MODE = private mode (default)
    };
    
    // Clean up test data
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true });
    }
    
    // Mock the data directory for testing
    vi.mock('../../lib/matrix/server-invites', async () => {
      const actual = await vi.importActual('../../lib/matrix/server-invites') as any;
      return {
        ...actual,
        // Override the data directory for tests
        INVITES_DATA_DIR: TEST_DATA_DIR,
        INVITES_FILE: TEST_INVITES_FILE,
      };
    });
    
    // Silence console output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
    
    // Clean up test data
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true });
    }
    
    vi.restoreAllMocks();
  });

  describe('Access Control Configuration', () => {
    it('should be in private mode by default', () => {
      const config = getAccessControlConfig();
      
      expect(config.privateMode).toBe(true);
      expect(config.publicMode).toBe(false);
      expect(config.inviteOnly).toBe(true);
      expect(config.allowedHomeserver).toBe('https://matrix.example.com');
    });

    it('should allow public mode when explicitly enabled', () => {
      process.env.MELO_PUBLIC_MODE = 'true';
      
      const config = getAccessControlConfig();
      
      expect(config.privateMode).toBe(false);
      expect(config.publicMode).toBe(true);
      expect(config.inviteOnly).toBe(false);
    });
  });

  describe('Server-Side Invite Storage', () => {
    it('should create and store invites', () => {
      const invite = serverCreateInvite({
        invitedUserId: '@alice:matrix.org',
        createdBy: '@admin:matrix.example.com',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        used: false,
        notes: 'Test invite for Alice',
      });
      
      expect(invite).toBeTruthy();
      expect(invite?.invitedUserId).toBe('@alice:matrix.org');
      expect(invite?.id).toBeTruthy();
      expect(invite?.used).toBe(false);
    });

    it('should check for valid invites', () => {
      // Create invite
      const invite = serverCreateInvite({
        invitedUserId: '@bob:matrix.org',
        createdBy: '@admin:matrix.example.com',
        createdAt: new Date().toISOString(),
        used: false,
      });
      
      expect(invite).toBeTruthy();
      
      // Check invite exists
      const hasInvite = serverCheckHasValidInvite('@bob:matrix.org');
      expect(hasInvite).toBe(true);
      
      // Check non-existent user
      const hasNoInvite = serverCheckHasValidInvite('@charlie:matrix.org');
      expect(hasNoInvite).toBe(false);
    });

    it('should mark invites as used', () => {
      // Create invite
      const invite = serverCreateInvite({
        invitedUserId: '@carol:matrix.org',
        createdBy: '@admin:matrix.example.com',
        createdAt: new Date().toISOString(),
        used: false,
      });
      
      expect(invite).toBeTruthy();
      expect(serverCheckHasValidInvite('@carol:matrix.org')).toBe(true);
      
      // Mark as used
      const marked = serverMarkInviteUsed('@carol:matrix.org');
      expect(marked).toBe(true);
      
      // Should no longer be valid
      expect(serverCheckHasValidInvite('@carol:matrix.org')).toBe(false);
      
      // Verify invite was marked used
      const allInvites = serverGetAllInvites();
      const usedInvite = allInvites.find(inv => inv.invitedUserId === '@carol:matrix.org');
      expect(usedInvite?.used).toBe(true);
      expect(usedInvite?.usedAt).toBeTruthy();
    });

    it('should handle expired invites', () => {
      // Create expired invite
      const expiredInvite = serverCreateInvite({
        invitedUserId: '@expired:matrix.org',
        createdBy: '@admin:matrix.example.com',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // expired 1 day ago
        used: false,
      });
      
      expect(expiredInvite).toBeTruthy();
      
      // Should not find expired invite
      const hasInvite = serverCheckHasValidInvite('@expired:matrix.org');
      expect(hasInvite).toBe(false);
    });
  });

  describe('Login Flow Integration', () => {
    it('should allow external user WITH valid invite to log in', () => {
      // Create invite for external user
      const invite = serverCreateInvite({
        invitedUserId: '@external:matrix.org',
        createdBy: '@admin:matrix.example.com',
        createdAt: new Date().toISOString(),
        used: false,
        notes: 'Test invite for external login',
      });
      
      expect(invite).toBeTruthy();
      
      // Test login validation - should be allowed with invite
      const result = isLoginAllowedWithInvite(
        'https://matrix.org',
        '@external:matrix.org'
      );
      
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.code).toBeUndefined();
    });

    it('should reject external user WITHOUT invite', () => {
      // Test login validation without invite - should be rejected
      const result = isLoginAllowedWithInvite(
        'https://matrix.org',
        '@uninvited:matrix.org'
      );
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('invitation from an administrator');
      expect(result.code).toBe('INVITE_REQUIRED');
    });

    it('should allow user from same homeserver without invite check', () => {
      // User from same homeserver should always be allowed
      const result = isLoginAllowedWithInvite(
        'https://matrix.example.com',
        '@local:matrix.example.com'
      );
      
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.code).toBeUndefined();
    });

    it('should mark invite as used after successful login', () => {
      // Create invite
      const invite = serverCreateInvite({
        invitedUserId: '@login-test:matrix.org',
        createdBy: '@admin:matrix.example.com',
        createdAt: new Date().toISOString(),
        used: false,
      });
      
      expect(invite).toBeTruthy();
      expect(serverCheckHasValidInvite('@login-test:matrix.org')).toBe(true);
      
      // Simulate successful login - mark invite as used
      const marked = markInviteUsedServerSide('@login-test:matrix.org');
      expect(marked).toBe(true);
      
      // Invite should no longer be valid
      expect(serverCheckHasValidInvite('@login-test:matrix.org')).toBe(false);
      
      // Subsequent login attempt should be rejected
      const secondResult = isLoginAllowedWithInvite(
        'https://matrix.org',
        '@login-test:matrix.org'
      );
      
      expect(secondResult.allowed).toBe(false);
      expect(secondResult.code).toBe('INVITE_REQUIRED');
    });

    it('should handle multiple invites for same user', () => {
      // Create multiple invites for same user
      const invite1 = serverCreateInvite({
        invitedUserId: '@multi:matrix.org',
        createdBy: '@admin1:matrix.example.com',
        createdAt: new Date().toISOString(),
        used: false,
        notes: 'First invite',
      });
      
      const invite2 = serverCreateInvite({
        invitedUserId: '@multi:matrix.org',
        createdBy: '@admin2:matrix.example.com',
        createdAt: new Date().toISOString(),
        used: false,
        notes: 'Second invite (should return existing)',
      });
      
      expect(invite1).toBeTruthy();
      expect(invite2).toBeTruthy();
      expect(invite1?.id).toBe(invite2?.id); // Should return same invite
      
      // Should still have valid invite
      expect(serverCheckHasValidInvite('@multi:matrix.org')).toBe(true);
      
      // Mark as used
      markInviteUsedServerSide('@multi:matrix.org');
      
      // Should no longer be valid
      expect(serverCheckHasValidInvite('@multi:matrix.org')).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid user IDs gracefully', () => {
      const result = isLoginAllowedWithInvite(
        'https://matrix.org',
        'invalid-user-id'
      );
      
      expect(result.allowed).toBe(false);
      expect(result.code).toBe('M_FORBIDDEN');
    });

    it('should handle missing user ID', () => {
      const result = isLoginAllowedWithInvite('https://matrix.org');
      
      expect(result.allowed).toBe(false);
      expect(result.code).toBe('M_FORBIDDEN');
    });

    it('should handle homeserver-only validation', () => {
      const result = isLoginAllowedWithInvite('https://matrix.example.com');
      
      // Should be allowed (same homeserver)
      expect(result.allowed).toBe(true);
    });

    it('should clean up expired invites', () => {
      // Create mix of valid and expired invites
      serverCreateInvite({
        invitedUserId: '@valid:matrix.org',
        createdBy: '@admin:matrix.example.com',
        createdAt: new Date().toISOString(),
        used: false,
      });
      
      serverCreateInvite({
        invitedUserId: '@expired1:matrix.org',
        createdBy: '@admin:matrix.example.com',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        used: false,
      });
      
      const beforeCount = serverGetAllInvites().length;
      expect(beforeCount).toBeGreaterThan(0);
      
      const cleanup = serverCleanupExpiredInvites();
      expect(cleanup.removed).toBe(1);
      
      const afterCount = serverGetAllInvites().length;
      expect(afterCount).toBe(beforeCount - 1);
      
      // Valid invite should still work
      expect(serverCheckHasValidInvite('@valid:matrix.org')).toBe(true);
      // Expired invite should not work
      expect(serverCheckHasValidInvite('@expired1:matrix.org')).toBe(false);
    });
  });

  describe('Public Mode Behavior', () => {
    it('should allow all logins in public mode regardless of invites', () => {
      process.env.MELO_PUBLIC_MODE = 'true';
      
      // Should allow external user without invite
      const result = isLoginAllowedWithInvite(
        'https://matrix.org',
        '@anyone:matrix.org'
      );
      
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.code).toBeUndefined();
    });
  });
});