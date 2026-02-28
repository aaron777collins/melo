/**
 * Unit Tests for Matrix Room Deletion Utility
 * Following TDD approach - RED phase (tests should FAIL initially)
 * 
 * Testing:
 * - Matrix room deletion API integration
 * - Error handling and retries
 * - Success scenarios
 * - Edge cases
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteRoom, DeleteRoomOptions, DeleteRoomError } from '@/lib/matrix/delete-room';

// Mock Matrix client
const mockMatrixClient = {
  leave: vi.fn(),
  forget: vi.fn(),
  sendStateEvent: vi.fn(),
  getUserId: vi.fn().mockReturnValue('@testuser:matrix.test.com')
};

// Mock getClient function
vi.mock('@/lib/matrix/client', () => ({
  getClient: vi.fn(() => mockMatrixClient)
}));

describe('Matrix Room Deletion Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Successful Deletion', () => {
    it('should successfully delete a room with leave + forget pattern', async () => {
      // Arrange
      const options: DeleteRoomOptions = {
        roomId: '!test-room:matrix.test.com',
        spaceId: '!test-space:matrix.test.com'
      };

      mockMatrixClient.leave.mockResolvedValue({});
      mockMatrixClient.forget.mockResolvedValue({});
      mockMatrixClient.sendStateEvent.mockResolvedValue({});

      // Act
      const result = await deleteRoom(options);

      // Assert
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockMatrixClient.leave).toHaveBeenCalledWith('!test-room:matrix.test.com');
      expect(mockMatrixClient.forget).toHaveBeenCalledWith('!test-room:matrix.test.com');
      expect(mockMatrixClient.sendStateEvent).toHaveBeenCalledWith(
        '!test-space:matrix.test.com',
        'm.space.child',
        {},
        '!test-room:matrix.test.com'
      );
    });

    it('should work without space when spaceId is not provided', async () => {
      // Arrange
      const options: DeleteRoomOptions = {
        roomId: '!test-room:matrix.test.com'
      };

      mockMatrixClient.leave.mockResolvedValue({});
      mockMatrixClient.forget.mockResolvedValue({});

      // Act
      const result = await deleteRoom(options);

      // Assert
      expect(result.success).toBe(true);
      expect(mockMatrixClient.leave).toHaveBeenCalledWith('!test-room:matrix.test.com');
      expect(mockMatrixClient.forget).toHaveBeenCalledWith('!test-room:matrix.test.com');
      expect(mockMatrixClient.sendStateEvent).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle Matrix client not available', async () => {
      // Arrange
      const { getClient } = await import('@/lib/matrix/client');
      vi.mocked(getClient).mockReturnValueOnce(null);

      const options: DeleteRoomOptions = {
        roomId: '!test-room:matrix.test.com'
      };

      // Act
      const result = await deleteRoom(options);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CLIENT_NOT_AVAILABLE');
      expect(result.error?.message).toContain('Matrix client not initialized');
      expect(result.error?.retryable).toBe(true);
    });

    it('should handle leave room failure', async () => {
      // Arrange
      const options: DeleteRoomOptions = {
        roomId: '!test-room:matrix.test.com'
      };

      const leaveError = new Error('Failed to leave room');
      mockMatrixClient.leave.mockRejectedValue(leaveError);

      // Act
      const result = await deleteRoom(options);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('LEAVE_FAILED');
      expect(result.error?.message).toContain('Failed to leave room');
      expect(result.error?.retryable).toBe(true);
      expect(result.error?.originalError).toBe(leaveError);
    });

    it('should handle forget room failure', async () => {
      // Arrange
      const options: DeleteRoomOptions = {
        roomId: '!test-room:matrix.test.com'
      };

      mockMatrixClient.leave.mockResolvedValue({});
      const forgetError = new Error('Failed to forget room');
      mockMatrixClient.forget.mockRejectedValue(forgetError);

      // Act
      const result = await deleteRoom(options);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FORGET_FAILED');
      expect(result.error?.message).toContain('Failed to forget room');
      expect(result.error?.retryable).toBe(true);
    });

    it('should handle space removal failure gracefully', async () => {
      // Arrange
      const options: DeleteRoomOptions = {
        roomId: '!test-room:matrix.test.com',
        spaceId: '!test-space:matrix.test.com'
      };

      mockMatrixClient.leave.mockResolvedValue({});
      mockMatrixClient.forget.mockResolvedValue({});
      mockMatrixClient.sendStateEvent.mockRejectedValue(new Error('Space removal failed'));

      // Act
      const result = await deleteRoom(options);

      // Assert - Space removal failure should not fail the entire operation
      expect(result.success).toBe(true);
      expect(result.warning).toContain('Failed to remove channel from space');
    });

    it('should handle permission errors as non-retryable', async () => {
      // Arrange
      const options: DeleteRoomOptions = {
        roomId: '!test-room:matrix.test.com'
      };

      const permissionError = new Error('M_FORBIDDEN: You do not have permission to delete this room');
      mockMatrixClient.leave.mockRejectedValue(permissionError);

      // Act
      const result = await deleteRoom(options);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.retryable).toBe(false);
      expect(result.error?.code).toBe('LEAVE_FAILED');
    });
  });

  describe('Input Validation', () => {
    it('should validate roomId is provided', async () => {
      // Act & Assert
      await expect(deleteRoom({ roomId: '' })).rejects.toThrow('roomId is required');
    });

    it('should validate roomId format', async () => {
      // Act & Assert  
      await expect(deleteRoom({ roomId: 'invalid-room-id' })).rejects.toThrow('Invalid room ID format');
    });

    it('should validate spaceId format when provided', async () => {
      // Act & Assert
      await expect(deleteRoom({ 
        roomId: '!valid:matrix.test.com', 
        spaceId: 'invalid-space-id' 
      })).rejects.toThrow('Invalid space ID format');
    });
  });

  describe('URL Decoding', () => {
    it('should handle URL-encoded room IDs', async () => {
      // Arrange
      const encodedRoomId = '%21test-room%3Amatrix.test.com';
      const decodedRoomId = '!test-room:matrix.test.com';
      const options: DeleteRoomOptions = {
        roomId: encodedRoomId
      };

      mockMatrixClient.leave.mockResolvedValue({});
      mockMatrixClient.forget.mockResolvedValue({});

      // Act
      await deleteRoom(options);

      // Assert
      expect(mockMatrixClient.leave).toHaveBeenCalledWith(decodedRoomId);
      expect(mockMatrixClient.forget).toHaveBeenCalledWith(decodedRoomId);
    });

    it('should handle URL-encoded space IDs', async () => {
      // Arrange
      const encodedSpaceId = '%21test-space%3Amatrix.test.com';
      const decodedSpaceId = '!test-space:matrix.test.com';
      const options: DeleteRoomOptions = {
        roomId: '!test-room:matrix.test.com',
        spaceId: encodedSpaceId
      };

      mockMatrixClient.leave.mockResolvedValue({});
      mockMatrixClient.forget.mockResolvedValue({});
      mockMatrixClient.sendStateEvent.mockResolvedValue({});

      // Act
      await deleteRoom(options);

      // Assert
      expect(mockMatrixClient.sendStateEvent).toHaveBeenCalledWith(
        decodedSpaceId,
        'm.space.child',
        {},
        '!test-room:matrix.test.com'
      );
    });
  });
});

// Type tests
describe('DeleteRoomError Type', () => {
  it('should have proper error structure', () => {
    const error: DeleteRoomError = {
      code: 'LEAVE_FAILED',
      message: 'Test error',
      retryable: true
    };

    expect(error.code).toBe('LEAVE_FAILED');
    expect(error.message).toBe('Test error');
    expect(error.retryable).toBe(true);
  });
});

describe('DeleteRoomOptions Type', () => {
  it('should require roomId and allow optional spaceId', () => {
    const minimalOptions: DeleteRoomOptions = {
      roomId: '!test:matrix.test.com'
    };

    const fullOptions: DeleteRoomOptions = {
      roomId: '!test:matrix.test.com',
      spaceId: '!space:matrix.test.com'
    };

    expect(minimalOptions.roomId).toBeDefined();
    expect(fullOptions.spaceId).toBeDefined();
  });
});