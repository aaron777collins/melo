/**
 * Unit Tests for DeleteChannelModal Component
 * Following TDD approach - these tests define the expected behavior
 * before implementation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DeleteChannelModal } from '@/components/modals/delete-channel-modal';

// Import mocks from setup
import { mockUseModal, mockRouterPush, mockRouterRefresh } from './setup';

// Mock deleteRoom function - this is what the component actually uses
const mockDeleteRoom = vi.fn();
vi.mock('@/lib/matrix/delete-room', () => ({
  deleteRoom: (options: any) => mockDeleteRoom(options),
}));

// Mock toast for testing error display
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastLoading = vi.fn().mockReturnValue('loading-toast-id');
const mockToastDismiss = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: {
      error: mockToastError,
      success: mockToastSuccess,
      loading: mockToastLoading,
      dismiss: mockToastDismiss,
    },
  }),
}));

describe('DeleteChannelModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    
    // Reset router mocks
    mockRouterPush.mockClear();
    mockRouterRefresh.mockClear();
    
    // Reset deleteRoom mock - default to successful deletion
    mockDeleteRoom.mockClear();
    mockDeleteRoom.mockResolvedValue({ success: true });
    
    // Reset toast mocks
    mockToastError.mockClear();
    mockToastSuccess.mockClear();
    mockToastLoading.mockClear();
    mockToastDismiss.mockClear();
    
    // Configure modal mock for delete channel
    mockUseModal.mockReturnValue({
      isOpen: true,
      onClose: mockOnClose,
      type: 'deleteChannel',
      data: {
        channel: {
          id: 'test-channel-id',
          name: 'general'
        },
        server: {
          id: 'test-server-id',
          name: 'Test Server'
        }
      }
    });
  });

  describe('Modal Rendering', () => {
    it('should render when modal is open with deleteChannel type', () => {
      render(<DeleteChannelModal />);
      
      expect(screen.getByRole('heading', { name: 'Delete Channel' })).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete this channel/)).toBeInTheDocument();
      expect(screen.getByText('#general')).toBeInTheDocument();
    });

    it('should not render when modal is closed', () => {
      mockUseModal.mockReturnValue({
        isOpen: false,
        onClose: mockOnClose,
        type: 'deleteChannel',
        data: {}
      });
      
      render(<DeleteChannelModal />);
      
      expect(screen.queryByRole('heading', { name: 'Delete Channel' })).not.toBeInTheDocument();
    });

    it('should not render when modal type is different', () => {
      mockUseModal.mockReturnValue({
        isOpen: true,
        onClose: mockOnClose,
        type: 'leaveServer',
        data: {}
      });
      
      render(<DeleteChannelModal />);
      
      expect(screen.queryByRole('heading', { name: 'Delete Channel' })).not.toBeInTheDocument();
    });
  });

  describe('Name Confirmation Input', () => {
    it('should display channel name prominently', () => {
      render(<DeleteChannelModal />);
      
      expect(screen.getByText('#general')).toBeInTheDocument();
      expect(screen.getByText(/channel will be permanently deleted/)).toBeInTheDocument();
    });

    it('should show input field for name confirmation', () => {
      render(<DeleteChannelModal />);
      
      const input = screen.getByPlaceholderText('Type channel name to confirm');
      expect(input).toBeInTheDocument();
      // HTML inputs default to type="text" even without explicit attribute
      expect(input.tagName.toLowerCase()).toBe('input');
    });

    it('should show helper text for name requirement', () => {
      render(<DeleteChannelModal />);
      
      // Look for the text across multiple elements
      expect(screen.getByText(/Type.*to confirm deletion/)).toBeInTheDocument();
      expect(screen.getByText('"general"')).toBeInTheDocument();
    });
  });

  describe('Delete Button State Management', () => {
    it('should have delete button disabled initially', () => {
      render(<DeleteChannelModal />);
      
      const deleteButton = screen.getByRole('button', { name: 'Delete Channel' });
      expect(deleteButton).toBeDisabled();
    });

    it('should keep delete button disabled for incorrect name', async () => {
      render(<DeleteChannelModal />);
      
      const input = screen.getByPlaceholderText('Type channel name to confirm');
      const deleteButton = screen.getByRole('button', { name: 'Delete Channel' });
      
      fireEvent.change(input, { target: { value: 'wrong-name' } });
      
      await waitFor(() => {
        expect(deleteButton).toBeDisabled();
      });
    });

    it('should enable delete button when correct name is entered', async () => {
      render(<DeleteChannelModal />);
      
      const input = screen.getByPlaceholderText('Type channel name to confirm');
      const deleteButton = screen.getByRole('button', { name: 'Delete Channel' });
      
      fireEvent.change(input, { target: { value: 'general' } });
      
      await waitFor(() => {
        expect(deleteButton).not.toBeDisabled();
      });
    });

    it('should be case sensitive for name matching', async () => {
      render(<DeleteChannelModal />);
      
      const input = screen.getByPlaceholderText('Type channel name to confirm');
      const deleteButton = screen.getByRole('button', { name: 'Delete Channel' });
      
      fireEvent.change(input, { target: { value: 'General' } });
      
      await waitFor(() => {
        expect(deleteButton).toBeDisabled();
      });
    });
  });

  describe('Warning Messages', () => {
    it('should display warning about irreversible action', () => {
      render(<DeleteChannelModal />);
      
      expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument();
      expect(screen.getByText(/All messages and history will be permanently lost/)).toBeInTheDocument();
    });

    it('should style warning text appropriately', () => {
      render(<DeleteChannelModal />);
      
      const warningElement = screen.getByText(/This action cannot be undone/);
      expect(warningElement).toHaveClass('text-red-400');
    });
  });

  describe('Cancel Functionality', () => {
    it('should close modal when cancel button is clicked', () => {
      render(<DeleteChannelModal />);
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Matrix Integration', () => {
    it('should call deleteRoom with correct options on successful deletion', async () => {
      render(<DeleteChannelModal />);
      
      const input = screen.getByPlaceholderText('Type channel name to confirm');
      const deleteButton = screen.getByRole('button', { name: 'Delete Channel' });
      
      fireEvent.change(input, { target: { value: 'general' } });
      await waitFor(() => expect(deleteButton).not.toBeDisabled());
      
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(mockDeleteRoom).toHaveBeenCalledWith({
          roomId: 'test-channel-id',
          spaceId: 'test-server-id'
        });
      });
    });

    it('should close modal and navigate after successful deletion', async () => {
      mockDeleteRoom.mockResolvedValue({ success: true });
      
      render(<DeleteChannelModal />);
      
      const input = screen.getByPlaceholderText('Type channel name to confirm');
      const deleteButton = screen.getByRole('button', { name: 'Delete Channel' });
      
      fireEvent.change(input, { target: { value: 'general' } });
      await waitFor(() => expect(deleteButton).not.toBeDisabled());
      
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
        expect(mockRouterRefresh).toHaveBeenCalled();
        expect(mockRouterPush).toHaveBeenCalledWith('/servers/test-server-id');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing channel data gracefully', () => {
      mockUseModal.mockReturnValue({
        isOpen: true,
        onClose: mockOnClose,
        type: 'deleteChannel',
        data: {}
      });
      
      render(<DeleteChannelModal />);
      
      // The text "this channel" appears in a span with "#this channel"
      expect(screen.getByText('#this channel')).toBeInTheDocument();
    });

    it('should handle space channels correctly', () => {
      mockUseModal.mockReturnValue({
        isOpen: true,
        onClose: mockOnClose,
        type: 'deleteChannel',
        data: {
          spaceChannel: {
            roomId: 'space-channel-id',
            name: 'space-channel'
          },
          space: {
            id: 'space-id'
          }
        }
      });
      
      render(<DeleteChannelModal />);
      
      expect(screen.getByText('#space-channel')).toBeInTheDocument();
    });

    it('should handle missing Matrix client', async () => {
      // Mock deleteRoom to return client not available error
      mockDeleteRoom.mockResolvedValue({
        success: false,
        error: {
          code: 'CLIENT_NOT_AVAILABLE',
          message: 'Matrix client not initialized. Please try again.',
          retryable: true
        }
      });
      
      render(<DeleteChannelModal />);
      
      const input = screen.getByPlaceholderText('Type channel name to confirm');
      const deleteButton = screen.getByRole('button', { name: 'Delete Channel' });
      
      fireEvent.change(input, { target: { value: 'general' } });
      await waitFor(() => expect(deleteButton).not.toBeDisabled());
      
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          'Failed to delete channel: Matrix client not initialized. Please try again.',
          expect.objectContaining({
            action: expect.any(Object),
            duration: 10000
          })
        );
      });
    });
  });
});