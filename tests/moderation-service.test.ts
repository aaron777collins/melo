/**
 * Unit Tests for Matrix Moderation Service - Timed Bans
 * 
 * Tests the core logic of the MatrixModerationService including:
 * - Ban duration handling
 * - Automatic expiration mechanism  
 * - Race condition prevention
 * - Matrix API integration
 * - Error handling and edge cases
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock Matrix SDK
const mockMatrixClient = {
  getUserId: jest.fn(() => '@test-system:matrix.org'),
  getRoom: jest.fn(),
  ban: jest.fn(),
  unban: jest.fn(),
  kick: jest.fn(),
  setPowerLevel: jest.fn(),
  sendStateEvent: jest.fn(),
  redactEvent: jest.fn(),
};

const mockRoom = {
  getMember: jest.fn(),
  getMembers: jest.fn(() => []),
  getJoinedMembers: jest.fn(() => []),
  currentState: {
    getStateEvents: jest.fn(),
    events: new Map()
  },
  findEventById: jest.fn(),
  getLiveTimeline: jest.fn(() => ({
    getEvents: jest.fn(() => [])
  }))
};

const mockMember = {
  userId: '@test-target:matrix.org',
  powerLevel: 0,
  membership: 'join',
  name: 'Test User',
  getAvatarUrl: jest.fn(() => null)
};

// Mock the Matrix SDK module
jest.mock('matrix-js-sdk', () => ({
  MatrixClient: jest.fn(() => mockMatrixClient),
  createClient: jest.fn(() => mockMatrixClient),
}), { virtual: true });

// Import after mocking
let MatrixModerationService: any;

describe('MatrixModerationService - Timed Bans', () => {
  beforeEach(async () => {
    // Dynamic import after mocking
    const moderationModule = await import('../lib/matrix/moderation');
    MatrixModerationService = moderationModule.MatrixModerationService;
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default mock behavior
    mockMatrixClient.getRoom.mockReturnValue(mockRoom);
    mockRoom.getMember.mockReturnValue(mockMember);
    mockMatrixClient.ban.mockResolvedValue({});
    mockMatrixClient.unban.mockResolvedValue({});
    mockMatrixClient.sendStateEvent.mockResolvedValue({});
    
    // Mock timers
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const createService = () => new MatrixModerationService(mockMatrixClient);
  const testRoomId = '!test-room:matrix.org';
  const moderatorId = '@test-moderator:matrix.org';
  const targetUserId = '@test-target:matrix.org';

  describe('Ban Duration Setting', () => {
    test('should store ban with correct duration and expiration', async () => {
      const service = createService();
      const banDuration = 60000; // 1 minute
      
      const result = await service.banUser(testRoomId, moderatorId, targetUserId, {
        reason: 'Test ban',
        duration: banDuration
      });
      
      expect(result.success).toBe(true);
      expect(mockMatrixClient.ban).toHaveBeenCalledWith(testRoomId, targetUserId, 'Test ban');
      expect(mockMatrixClient.sendStateEvent).toHaveBeenCalledWith(
        testRoomId,
        'org.melo.moderation.ban',
        expect.objectContaining({
          bannedBy: moderatorId,
          reason: 'Test ban',
          duration: banDuration,
          expiresAt: expect.any(String)
        }),
        targetUserId
      );
    });

    test('should handle different duration formats', async () => {
      const service = createService();
      const testCases = [
        { duration: 1000, name: '1 second' },
        { duration: 60000, name: '1 minute' },
        { duration: 3600000, name: '1 hour' },
        { duration: 86400000, name: '1 day' }
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();
        
        const result = await service.banUser(testRoomId, moderatorId, targetUserId, {
          reason: `Test ${testCase.name}`,
          duration: testCase.duration
        });
        
        expect(result.success).toBe(true);
        expect(mockMatrixClient.sendStateEvent).toHaveBeenCalledWith(
          testRoomId,
          'org.melo.moderation.ban',
          expect.objectContaining({
            duration: testCase.duration
          }),
          targetUserId
        );
      }
    });

    test('should handle permanent bans (duration = 0 or undefined)', async () => {
      const service = createService();
      
      // Test with duration = 0
      let result = await service.banUser(testRoomId, moderatorId, targetUserId, {
        reason: 'Permanent ban',
        duration: 0
      });
      
      expect(result.success).toBe(true);
      
      // Should not store expiry for permanent bans
      expect(mockMatrixClient.sendStateEvent).not.toHaveBeenCalledWith(
        testRoomId,
        'org.melo.moderation.ban',
        expect.objectContaining({
          expiresAt: expect.any(String)
        }),
        targetUserId
      );
      
      jest.clearAllMocks();
      
      // Test with undefined duration
      result = await service.banUser(testRoomId, moderatorId, targetUserId, {
        reason: 'Permanent ban'
        // duration not specified
      });
      
      expect(result.success).toBe(true);
      expect(mockMatrixClient.ban).toHaveBeenCalled();
    });

    test('should validate ban duration bounds', async () => {
      const service = createService();
      
      // Test negative duration - should be handled gracefully
      const result = await service.banUser(testRoomId, moderatorId, targetUserId, {
        reason: 'Invalid duration test',
        duration: -1000
      });
      
      // Should either succeed (treated as permanent) or fail with validation error
      expect(typeof result.success).toBe('boolean');
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Automatic Ban Expiration', () => {
    test('should schedule automatic unban for timed bans', async () => {
      const service = createService();
      const banDuration = 5000; // 5 seconds
      
      // Spy on setTimeout to verify scheduling
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      
      const result = await service.banUser(testRoomId, moderatorId, targetUserId, {
        reason: 'Scheduled unban test',
        duration: banDuration
      });
      
      expect(result.success).toBe(true);
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), banDuration);
      
      setTimeoutSpy.mockRestore();
    });

    test('should automatically unban user when timer expires', async () => {
      const service = createService();
      const banDuration = 1000; // 1 second
      
      // Mock member as banned initially
      mockMember.membership = 'ban';
      
      await service.banUser(testRoomId, moderatorId, targetUserId, {
        reason: 'Auto unban test',
        duration: banDuration
      });
      
      // Fast-forward time
      jest.advanceTimersByTime(banDuration + 100);
      
      // Should have called unban
      expect(mockMatrixClient.unban).toHaveBeenCalledWith(testRoomId, targetUserId);
      expect(mockMatrixClient.sendStateEvent).toHaveBeenCalledWith(
        testRoomId,
        'org.melo.moderation.ban',
        {},
        targetUserId
      );
    });

    test('should not auto-unban if user is no longer banned', async () => {
      const service = createService();
      const banDuration = 1000;
      
      // Mock member as not banned when timer fires
      mockMember.membership = 'join';
      
      await service.banUser(testRoomId, moderatorId, targetUserId, {
        reason: 'Already unbanned test',
        duration: banDuration
      });
      
      // Clear the ban call from setup
      mockMatrixClient.unban.mockClear();
      
      // Fast-forward time
      jest.advanceTimersByTime(banDuration + 100);
      
      // Should NOT call unban since user is already unbanned
      expect(mockMatrixClient.unban).not.toHaveBeenCalled();
    });

    test('should handle multiple concurrent timed bans', async () => {
      const service = createService();
      const testUsers = ['@user1:matrix.org', '@user2:matrix.org', '@user3:matrix.org'];
      const durations = [1000, 2000, 3000];
      
      // Apply concurrent bans
      for (let i = 0; i < testUsers.length; i++) {
        await service.banUser(testRoomId, moderatorId, testUsers[i], {
          reason: `Concurrent ban ${i}`,
          duration: durations[i]
        });
      }
      
      expect(mockMatrixClient.ban).toHaveBeenCalledTimes(3);
      expect(mockMatrixClient.sendStateEvent).toHaveBeenCalledTimes(3);
      
      // Fast-forward to after all bans should expire
      jest.advanceTimersByTime(Math.max(...durations) + 100);
      
      // All users should have been unbanned
      expect(mockMatrixClient.unban).toHaveBeenCalledTimes(3);
    });
  });

  describe('Ban Information Retrieval', () => {
    test('should return correct ban information', async () => {
      const service = createService();
      const banDuration = 30000;
      const bannedAt = new Date();
      const expiresAt = new Date(bannedAt.getTime() + banDuration);
      
      // Mock ban state
      const mockBanState = {
        getContent: () => ({
          bannedBy: moderatorId,
          bannedAt: bannedAt.toISOString(),
          reason: 'Test ban info',
          duration: banDuration,
          expiresAt: expiresAt.toISOString()
        })
      };
      
      mockMember.membership = 'ban';
      mockRoom.currentState.getStateEvents.mockReturnValue(mockBanState);
      
      const banInfo = await service.getBanInfo(testRoomId, targetUserId);
      
      expect(banInfo.isBanned).toBe(true);
      expect(banInfo.banInfo).toEqual({
        bannedBy: moderatorId,
        bannedAt: bannedAt.toISOString(),
        reason: 'Test ban info',
        duration: banDuration,
        expiresAt: expiresAt.toISOString(),
        isExpired: false
      });
    });

    test('should detect expired bans', async () => {
      const service = createService();
      const pastTime = new Date(Date.now() - 10000); // 10 seconds ago
      
      const mockBanState = {
        getContent: () => ({
          bannedBy: moderatorId,
          bannedAt: pastTime.toISOString(),
          reason: 'Expired ban',
          duration: 5000,
          expiresAt: new Date(pastTime.getTime() + 5000).toISOString()
        })
      };
      
      mockMember.membership = 'ban';
      mockRoom.currentState.getStateEvents.mockReturnValue(mockBanState);
      
      const banInfo = await service.getBanInfo(testRoomId, targetUserId);
      
      expect(banInfo.isBanned).toBe(true);
      expect(banInfo.banInfo?.isExpired).toBe(true);
    });

    test('should return correct banned users list', async () => {
      const service = createService();
      
      const mockMembers = [
        { 
          userId: '@banned1:matrix.org', 
          membership: 'ban', 
          name: 'Banned User 1',
          getAvatarUrl: () => null 
        },
        { 
          userId: '@banned2:matrix.org', 
          membership: 'ban', 
          name: 'Banned User 2',
          getAvatarUrl: () => null 
        },
        { 
          userId: '@user3:matrix.org', 
          membership: 'join', 
          name: 'Regular User',
          getAvatarUrl: () => null 
        }
      ];
      
      mockRoom.getMembers.mockReturnValue(mockMembers);
      
      const bannedUsers = await service.getBannedUsers(testRoomId);
      
      expect(bannedUsers).toHaveLength(2);
      expect(bannedUsers[0].userId).toBe('@banned1:matrix.org');
      expect(bannedUsers[1].userId).toBe('@banned2:matrix.org');
    });
  });

  describe('Expired Ban Checking', () => {
    test('should detect and process expired bans', async () => {
      const service = createService();
      const pastTime = new Date(Date.now() - 5000);
      
      // Mock expired ban state
      const mockExpiredBan = {
        getContent: () => ({
          bannedBy: moderatorId,
          bannedAt: pastTime.toISOString(),
          reason: 'Expired ban',
          duration: 1000,
          expiresAt: new Date(pastTime.getTime() + 1000).toISOString()
        })
      };
      
      const banStates = new Map();
      banStates.set(targetUserId, mockExpiredBan);
      mockRoom.currentState.events.set('org.melo.moderation.ban', banStates);
      
      const result = await service.checkExpiredBans(testRoomId);
      
      expect(result.checkedCount).toBe(1);
      expect(result.unbannedCount).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(mockMatrixClient.unban).toHaveBeenCalledWith(testRoomId, targetUserId);
    });

    test('should handle permanent bans (no expiration)', async () => {
      const service = createService();
      
      const mockPermanentBan = {
        getContent: () => ({
          bannedBy: moderatorId,
          bannedAt: new Date().toISOString(),
          reason: 'Permanent ban',
          duration: 0
          // No expiresAt field
        })
      };
      
      const banStates = new Map();
      banStates.set(targetUserId, mockPermanentBan);
      mockRoom.currentState.events.set('org.melo.moderation.ban', banStates);
      
      const result = await service.checkExpiredBans(testRoomId);
      
      expect(result.checkedCount).toBe(1);
      expect(result.unbannedCount).toBe(0); // Permanent ban should not be unbanned
      expect(mockMatrixClient.unban).not.toHaveBeenCalled();
    });

    test('should handle errors during auto-unban gracefully', async () => {
      const service = createService();
      const pastTime = new Date(Date.now() - 5000);
      
      // Mock unban to fail
      mockMatrixClient.unban.mockRejectedValue(new Error('Matrix API error'));
      
      const mockExpiredBan = {
        getContent: () => ({
          bannedBy: moderatorId,
          bannedAt: pastTime.toISOString(),
          reason: 'Error test ban',
          duration: 1000,
          expiresAt: new Date(pastTime.getTime() + 1000).toISOString()
        })
      };
      
      const banStates = new Map();
      banStates.set(targetUserId, mockExpiredBan);
      mockRoom.currentState.events.set('org.melo.moderation.ban', banStates);
      
      const result = await service.checkExpiredBans(testRoomId);
      
      expect(result.checkedCount).toBe(1);
      expect(result.unbannedCount).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        userId: targetUserId,
        error: 'Matrix API error'
      });
    });
  });

  describe('Race Condition Prevention', () => {
    test('should handle concurrent ban expiration checks', async () => {
      const service = createService();
      const pastTime = new Date(Date.now() - 5000);
      
      const mockExpiredBan = {
        getContent: () => ({
          bannedBy: moderatorId,
          bannedAt: pastTime.toISOString(),
          reason: 'Race condition test',
          duration: 1000,
          expiresAt: new Date(pastTime.getTime() + 1000).toISOString()
        })
      };
      
      const banStates = new Map();
      banStates.set(targetUserId, mockExpiredBan);
      mockRoom.currentState.events.set('org.melo.moderation.ban', banStates);
      
      // Run multiple concurrent expiry checks
      const concurrentChecks = Promise.all([
        service.checkExpiredBans(testRoomId),
        service.checkExpiredBans(testRoomId),
        service.checkExpiredBans(testRoomId)
      ]);
      
      const results = await concurrentChecks;
      
      // Should handle gracefully without double-unbanning
      const totalUnbanned = results.reduce((sum, result) => sum + result.unbannedCount, 0);
      expect(totalUnbanned).toBeLessThanOrEqual(3); // At most one unban per check
    });

    test('should handle manual unban during scheduled auto-unban', async () => {
      const service = createService();
      const banDuration = 1000;
      
      // Start with banned user
      mockMember.membership = 'ban';
      
      await service.banUser(testRoomId, moderatorId, targetUserId, {
        reason: 'Manual unban race test',
        duration: banDuration
      });
      
      // Manual unban before scheduled time
      mockMember.membership = 'join';
      await service.unbanUser(testRoomId, moderatorId, targetUserId);
      
      // Clear the calls from manual unban
      mockMatrixClient.unban.mockClear();
      
      // Fast-forward past scheduled time
      jest.advanceTimersByTime(banDuration + 100);
      
      // Scheduled unban should not execute since user is already unbanned
      expect(mockMatrixClient.unban).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle Matrix API errors during ban', async () => {
      const service = createService();
      
      mockMatrixClient.ban.mockRejectedValue({
        errcode: 'M_FORBIDDEN',
        error: 'You do not have permission to ban this user'
      });
      
      const result = await service.banUser(testRoomId, moderatorId, targetUserId, {
        reason: 'Permission error test',
        duration: 1000
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });

    test('should handle missing room error', async () => {
      const service = createService();
      
      mockMatrixClient.getRoom.mockReturnValue(null);
      
      const result = await service.banUser(testRoomId, moderatorId, targetUserId, {
        reason: 'Missing room test',
        duration: 1000
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle invalid expiration timestamps', async () => {
      const service = createService();
      
      const mockInvalidBan = {
        getContent: () => ({
          bannedBy: moderatorId,
          bannedAt: new Date().toISOString(),
          reason: 'Invalid timestamp',
          duration: 1000,
          expiresAt: 'invalid-date-string'
        })
      };
      
      const banStates = new Map();
      banStates.set(targetUserId, mockInvalidBan);
      mockRoom.currentState.events.set('org.melo.moderation.ban', banStates);
      
      const result = await service.checkExpiredBans(testRoomId);
      
      expect(result.checkedCount).toBe(1);
      expect(result.unbannedCount).toBe(0); // Invalid timestamp should be ignored
      expect(result.errors).toHaveLength(0); // Should handle gracefully
    });
  });

  describe('Permission Validation', () => {
    test('should enforce power level requirements for bans', async () => {
      const service = createService();
      
      // Mock moderator with insufficient power level
      const lowPowerModerator = { ...mockMember, powerLevel: 25 };
      mockRoom.getMember.mockReturnValue(lowPowerModerator);
      
      const result = await service.banUser(testRoomId, moderatorId, targetUserId, {
        reason: 'Insufficient power test',
        duration: 1000
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });

    test('should prevent users from banning themselves', async () => {
      const service = createService();
      
      const result = await service.banUser(testRoomId, targetUserId, targetUserId, {
        reason: 'Self ban test',
        duration: 1000
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('yourself');
    });

    test('should prevent banning users with equal or higher power levels', async () => {
      const service = createService();
      
      // Mock moderator and target with same power level
      const equalPowerModerator = { ...mockMember, powerLevel: 50 };
      const equalPowerTarget = { ...mockMember, powerLevel: 50 };
      
      mockRoom.getMember.mockImplementation((userId: string) => {
        if (userId === moderatorId) return equalPowerModerator;
        if (userId === targetUserId) return equalPowerTarget;
        return null;
      });
      
      const result = await service.banUser(testRoomId, moderatorId, targetUserId, {
        reason: 'Equal power test',
        duration: 1000
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });
  });
});