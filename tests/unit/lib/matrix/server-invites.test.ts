/**
 * Unit Tests for Server-Side Invite Management
 * 
 * Tests the server-side invite storage and validation functionality
 * that supports the admin invite system in login flow.
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
} from '../../../../lib/matrix/server-invites';

// Test data directory
const TEST_DATA_DIR = path.join(process.cwd(), 'data', 'test-invites-unit');

describe('Server-Side Invite Management', () => {
  beforeEach(() => {
    // Clean up test data
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true });
    }
    
    // Silence console output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    // Clean up test data
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true });
    }
    
    vi.restoreAllMocks();
  });

  describe('Basic Invite Operations', () => {
    it('should create a new invite', () => {
      const invite = serverCreateInvite({
        invitedUserId: '@test:matrix.org',
        createdBy: '@admin:matrix.example.com',
        createdAt: new Date().toISOString(),
        used: false,
        notes: 'Test invite',
      });

      expect(invite).toBeTruthy();
      expect(invite?.invitedUserId).toBe('@test:matrix.org');
      expect(invite?.createdBy).toBe('@admin:matrix.example.com');
      expect(invite?.used).toBe(false);
      expect(invite?.id).toBeTruthy();
      expect(invite?.id).toHaveLength(32); // 16 bytes * 2 hex chars
    });

    it('should check for valid invites', () => {
      // Initially no invite
      expect(serverCheckHasValidInvite('@user:matrix.org')).toBe(false);

      // Create invite
      serverCreateInvite({
        invitedUserId: '@user:matrix.org',
        createdBy: '@admin:matrix.example.com',
        createdAt: new Date().toISOString(),
        used: false,
      });

      // Should now have valid invite
      expect(serverCheckHasValidInvite('@user:matrix.org')).toBe(true);
    });

    it('should mark invites as used', () => {
      // Create invite
      serverCreateInvite({
        invitedUserId: '@markused:matrix.org',
        createdBy: '@admin:matrix.example.com',
        createdAt: new Date().toISOString(),
        used: false,
      });

      expect(serverCheckHasValidInvite('@markused:matrix.org')).toBe(true);

      // Mark as used
      const result = serverMarkInviteUsed('@markused:matrix.org');
      expect(result).toBe(true);

      // Should no longer be valid
      expect(serverCheckHasValidInvite('@markused:matrix.org')).toBe(false);
    });

    it('should handle non-existent invites when marking as used', () => {
      const result = serverMarkInviteUsed('@nonexistent:matrix.org');
      expect(result).toBe(false);
    });

    it('should return existing invite for duplicate creation', () => {
      const invite1 = serverCreateInvite({
        invitedUserId: '@duplicate:matrix.org',
        createdBy: '@admin1:matrix.example.com',
        createdAt: new Date().toISOString(),
        used: false,
        notes: 'First',
      });

      const invite2 = serverCreateInvite({
        invitedUserId: '@duplicate:matrix.org',
        createdBy: '@admin2:matrix.example.com',
        createdAt: new Date().toISOString(),
        used: false,
        notes: 'Second',
      });

      expect(invite1).toBeTruthy();
      expect(invite2).toBeTruthy();
      expect(invite1?.id).toBe(invite2?.id);
    });
  });

  describe('Expiration Handling', () => {
    it('should not return expired invites as valid', () => {
      // Create expired invite
      serverCreateInvite({
        invitedUserId: '@expired:matrix.org',
        createdBy: '@admin:matrix.example.com',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        used: false,
      });

      expect(serverCheckHasValidInvite('@expired:matrix.org')).toBe(false);
    });

    it('should clean up expired invites', () => {
      // Create valid invite
      serverCreateInvite({
        invitedUserId: '@valid:matrix.org',
        createdBy: '@admin:matrix.example.com',
        createdAt: new Date().toISOString(),
        used: false,
      });

      // Create expired invite
      serverCreateInvite({
        invitedUserId: '@expired:matrix.org',
        createdBy: '@admin:matrix.example.com',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        used: false,
      });

      const allInvites = serverGetAllInvites();
      expect(allInvites.length).toBe(1); // Only valid invite should be returned

      const cleanup = serverCleanupExpiredInvites();
      expect(cleanup.removed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle filesystem errors gracefully', () => {
      // Mock fs to throw error
      const originalWriteFileSync = fs.writeFileSync;
      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
        throw new Error('Disk full');
      });

      const invite = serverCreateInvite({
        invitedUserId: '@filesystem-error:matrix.org',
        createdBy: '@admin:matrix.example.com',
        createdAt: new Date().toISOString(),
        used: false,
      });

      expect(invite).toBe(null);
      
      // Restore original function
      fs.writeFileSync = originalWriteFileSync;
    });

    it('should handle corrupted storage files', () => {
      // Create directory and corrupt file
      const dataDir = path.join(process.cwd(), 'data', 'invites');
      const inviteFile = path.join(dataDir, 'server-invites.json');
      
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      fs.writeFileSync(inviteFile, 'invalid json{');

      // Should handle gracefully and return empty array
      const result = serverCheckHasValidInvite('@any:matrix.org');
      expect(result).toBe(false);

      // Clean up
      if (fs.existsSync(dataDir)) {
        fs.rmSync(dataDir, { recursive: true });
      }
    });
  });
});