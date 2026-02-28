/**
 * Integration Tests for Enhanced Delete Channel Modal
 * Testing the modal integration with:
 * - Toast notifications (success/error)
 * - Retry functionality
 * - Matrix API integration
 * - Channel removal from navigation
 * 
 * Following TDD - these tests define the enhanced behavior before implementation
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Matrix delete room utility - using factory function instead of variable
vi.mock('@/lib/matrix/delete-room', () => ({
  deleteRoom: vi.fn()
}));

// Now import the rest
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeleteChannelModal } from '@/components/modals/delete-channel-modal';

// Import mocks from setup
import { mockUseModal, mockRouterPush, mockRouterRefresh } from './setup';

// Mock toast notifications
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  loading: vi.fn(),
  dismiss: vi.fn()
};

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

describe('Enhanced DeleteChannelModal Integration', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockRouterPush.mockClear();
    mockRouterRefresh.mockClear();
    mockToast.success.mockClear();
    mockToast.error.mockClear();
    mockToast.loading.mockClear();
    mockToast.dismiss.mockClear();
    
    mockUseModal.mockReturnValue({
      isOpen: true,
      onClose: mockOnClose,
      type: 'deleteChannel',
      data: {
        channel: {
          id: '%21test-room%3Amatrix.test.com', // URL-encoded
          name: 'general'
        },
        server: {
          id: '%21test-server%3Amatrix.test.com', // URL-encoded
          name: 'Test Server'
        }
      }
    });
  });

  describe('Successful Deletion with Toasts', () => {
    it('should show loading toast during deletion', async () => {
      // Arrange
      const { deleteRoom } = await import('@/lib/matrix/delete-room');
      const mockDeleteRoom = vi.mocked(deleteRoom);
      
      let resolveDelete: () => void;
      const deletePromise = new Promise<any>((resolve) => {
        resolveDelete = () => resolve({ success: true });
      });
      mockDeleteRoom.mockReturnValue(deletePromise);

      render(<DeleteChannelModal />);
      
      const input = screen.getByPlaceholderText('Type channel name to confirm');
      const deleteButton = screen.getByRole('button', { name: 'Delete Channel' });
      
      // Act - start deletion
      fireEvent.change(input, { target: { value: 'general' } });
      await waitFor(() => expect(deleteButton).not.toBeDisabled());
      fireEvent.click(deleteButton);

      // Assert - loading toast should be shown
      await waitFor(() => {
        expect(mockToast.loading).toHaveBeenCalledWith('Deleting channel...');
      });

      // Complete the deletion
      resolveDelete!();
      await waitFor(() => {
        expect(mockToast.dismiss).toHaveBeenCalled();
      });
    });

    it('should show success toast and close modal on successful deletion', async () => {
      // Arrange
      const { deleteRoom } = await import('@/lib/matrix/delete-room');
      const mockDeleteRoom = vi.mocked(deleteRoom);
      mockDeleteRoom.mockResolvedValue({ success: true });
      
      render(<DeleteChannelModal />);
      
      const input = screen.getByPlaceholderText('Type channel name to confirm');
      const deleteButton = screen.getByRole('button', { name: 'Delete Channel' });
      
      // Act
      fireEvent.change(input, { target: { value: 'general' } });
      await waitFor(() => expect(deleteButton).not.toBeDisabled());
      fireEvent.click(deleteButton);

      // Assert
      await waitFor(() => {
        expect(mockDeleteRoom).toHaveBeenCalledWith({
          roomId: '%21test-room%3Amatrix.test.com',
          spaceId: '%21test-server%3Amatrix.test.com'
        });
        expect(mockToast.success).toHaveBeenCalledWith('Channel deleted successfully');
        expect(mockOnClose).toHaveBeenCalled();
        expect(mockRouterRefresh).toHaveBeenCalled();
        expect(mockRouterPush).toHaveBeenCalledWith('/servers/%21test-server%3Amatrix.test.com');
      });
    });

    it('should show warning toast if space removal fails but deletion succeeds', async () => {
      // Arrange
      mockDeleteRoom.mockResolvedValue({ 
        success: true, 
        warning: 'Failed to remove channel from space: Permission denied' 
      });
      
      render(<DeleteChannelModal />);
      
      const input = screen.getByPlaceholderText('Type channel name to confirm');
      const deleteButton = screen.getByRole('button', { name: 'Delete Channel' });
      
      // Act
      fireEvent.change(input, { target: { value: 'general' } });
      await waitFor(() => expect(deleteButton).not.toBeDisabled());
      fireEvent.click(deleteButton);

      // Assert
      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Channel deleted successfully');
        // Should still navigate even with warning
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling with Retry', () => {
    it('should show error toast with retry button for retryable errors', async () => {
      // Arrange
      mockDeleteRoom.mockResolvedValue({
        success: false,
        error: {
          code: 'LEAVE_FAILED',
          message: 'Network timeout',
          retryable: true
        }
      });
      
      render(<DeleteChannelModal />);
      
      const input = screen.getByPlaceholderText('Type channel name to confirm');
      const deleteButton = screen.getByRole('button', { name: 'Delete Channel' });
      
      // Act
      fireEvent.change(input, { target: { value: 'general' } });
      await waitFor(() => expect(deleteButton).not.toBeDisabled());
      fireEvent.click(deleteButton);

      // Assert
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          'Failed to delete channel: Network timeout',
          expect.objectContaining({
            action: expect.objectContaining({
              label: 'Retry',
              onClick: expect.any(Function)
            }),
            duration: 10000 // Longer duration for errors with retry
          })
        );
      });
    });

    it('should show error toast without retry button for non-retryable errors', async () => {
      // Arrange
      mockDeleteRoom.mockResolvedValue({
        success: false,
        error: {
          code: 'LEAVE_FAILED',
          message: 'Permission denied',
          retryable: false
        }
      });
      
      render(<DeleteChannelModal />);
      
      const input = screen.getByPlaceholderText('Type channel name to confirm');
      const deleteButton = screen.getByRole('button', { name: 'Delete Channel' });
      
      // Act
      fireEvent.change(input, { target: { value: 'general' } });
      await waitFor(() => expect(deleteButton).not.toBeDisabled());
      fireEvent.click(deleteButton);

      // Assert
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          'Failed to delete channel: Permission denied',
          expect.objectContaining({
            duration: 8000
          })
        );
      });
      
      // Verify no retry action
      const errorCall = mockToast.error.mock.calls[0];
      expect(errorCall[1]?.action).toBeUndefined();
    });

    it('should handle retry functionality', async () => {
      // Arrange - first call fails, second succeeds
      mockDeleteRoom
        .mockResolvedValueOnce({
          success: false,
          error: {
            code: 'LEAVE_FAILED',
            message: 'Network timeout',
            retryable: true
          }
        })
        .mockResolvedValueOnce({ success: true });
      
      render(<DeleteChannelModal />);
      
      const input = screen.getByPlaceholderText('Type channel name to confirm');
      const deleteButton = screen.getByRole('button', { name: 'Delete Channel' });
      
      // Act - initial deletion attempt
      fireEvent.change(input, { target: { value: 'general' } });
      await waitFor(() => expect(deleteButton).not.toBeDisabled());
      fireEvent.click(deleteButton);

      // Wait for error toast
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });

      // Act - trigger retry from toast action
      const errorCall = mockToast.error.mock.calls[0];
      const retryAction = errorCall[1]?.action?.onClick;
      expect(retryAction).toBeDefined();
      
      if (retryAction) {
        retryAction();
      }

      // Assert - should succeed on retry
      await waitFor(() => {
        expect(mockDeleteRoom).toHaveBeenCalledTimes(2);
        expect(mockToast.success).toHaveBeenCalledWith('Channel deleted successfully');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing space ID gracefully', async () => {
      // Arrange - no server/space data
      mockUseModal.mockReturnValue({
        isOpen: true,
        onClose: mockOnClose,
        type: 'deleteChannel',
        data: {
          channel: {
            id: '!test-room:matrix.test.com',
            name: 'general'
          }
          // No server data
        }
      });

      mockDeleteRoom.mockResolvedValue({ success: true });
      
      render(<DeleteChannelModal />);
      
      const input = screen.getByPlaceholderText('Type channel name to confirm');
      const deleteButton = screen.getByRole('button', { name: 'Delete Channel' });
      
      // Act
      fireEvent.change(input, { target: { value: 'general' } });
      await waitFor(() => expect(deleteButton).not.toBeDisabled());
      fireEvent.click(deleteButton);

      // Assert - should call deleteRoom without spaceId
      await waitFor(() => {
        expect(mockDeleteRoom).toHaveBeenCalledWith({
          roomId: '!test-room:matrix.test.com'
          // No spaceId
        });
      });
    });

    it('should handle space channels correctly', async () => {
      // Arrange - space channel data
      mockUseModal.mockReturnValue({
        isOpen: true,
        onClose: mockOnClose,
        type: 'deleteChannel',
        data: {
          spaceChannel: {
            roomId: '!space-channel:matrix.test.com',
            name: 'space-general'
          },
          space: {
            id: '!parent-space:matrix.test.com'
          }
        }
      });

      mockDeleteRoom.mockResolvedValue({ success: true });
      
      render(<DeleteChannelModal />);
      
      const input = screen.getByPlaceholderText('Type channel name to confirm');
      const deleteButton = screen.getByRole('button', { name: 'Delete Channel' });
      
      // Act
      fireEvent.change(input, { target: { value: 'space-general' } });
      await waitFor(() => expect(deleteButton).not.toBeDisabled());
      fireEvent.click(deleteButton);

      // Assert
      await waitFor(() => {
        expect(mockDeleteRoom).toHaveBeenCalledWith({
          roomId: '!space-channel:matrix.test.com',
          spaceId: '!parent-space:matrix.test.com'
        });
      });
    });

    it('should prevent multiple deletion attempts', async () => {
      // Arrange
      let resolveDelete: () => void;
      const deletePromise = new Promise<any>((resolve) => {
        resolveDelete = () => resolve({ success: true });
      });
      mockDeleteRoom.mockReturnValue(deletePromise);

      render(<DeleteChannelModal />);
      
      const input = screen.getByPlaceholderText('Type channel name to confirm');
      const deleteButton = screen.getByRole('button', { name: 'Delete Channel' });
      
      // Act - rapid clicks
      fireEvent.change(input, { target: { value: 'general' } });
      await waitFor(() => expect(deleteButton).not.toBeDisabled());
      
      fireEvent.click(deleteButton);
      fireEvent.click(deleteButton);
      fireEvent.click(deleteButton);

      // Assert - only one deletion call
      await waitFor(() => {
        expect(mockDeleteRoom).toHaveBeenCalledTimes(1);
        expect(deleteButton).toBeDisabled(); // Should be disabled during loading
      });

      // Complete the deletion
      resolveDelete!();
    });
  });

  describe('Navigation', () => {
    it('should navigate to server root when no params available', async () => {
      // Arrange
      mockUseModal.mockReturnValue({
        isOpen: true,
        onClose: mockOnClose,
        type: 'deleteChannel',
        data: {
          channel: {
            id: '!test-room:matrix.test.com',
            name: 'general'
          }
          // No server or space data
        }
      });

      // Mock useParams to return empty
      const { useParams } = await import('next/navigation');
      vi.mocked(useParams).mockReturnValue({});

      mockDeleteRoom.mockResolvedValue({ success: true });
      
      render(<DeleteChannelModal />);
      
      const input = screen.getByPlaceholderText('Type channel name to confirm');
      const deleteButton = screen.getByRole('button', { name: 'Delete Channel' });
      
      // Act
      fireEvent.change(input, { target: { value: 'general' } });
      await waitFor(() => expect(deleteButton).not.toBeDisabled());
      fireEvent.click(deleteButton);

      // Assert - should navigate to home
      await waitFor(() => {
        expect(mockRouterPush).toHaveBeenCalledWith('/');
      });
    });
  });
});