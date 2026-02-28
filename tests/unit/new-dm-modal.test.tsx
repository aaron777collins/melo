/**
 * TDD Tests for New DM Modal Component
 * 
 * PHASE 1: RED - Tests written FIRST (these should FAIL initially)
 * 
 * Tests cover:
 * - AC-2: New DM modal with user search interface
 * - AC-3: User selection creates/opens DM conversation
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewDMModal } from '@/components/modals/new-dm-modal';
import { useMatrixClient } from '@/hooks/use-matrix-client';
import { useRouter } from 'next/navigation';
import { useModal } from '@/hooks/use-modal-store';
import { toast } from 'sonner';

// Mock useMatrixClient hook
vi.mock('@/hooks/use-matrix-client', () => ({
  useMatrixClient: () => ({
    client: {
      searchUserDirectory: vi.fn(),
      createRoom: vi.fn(),
      getUserId: vi.fn(),
      getHomeserverUrl: vi.fn(),
    },
    isReady: true,
  }),
}));

// Mock router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock useModal hook
vi.mock('@/hooks/use-modal-store', () => ({
  useModal: () => ({
    onClose: vi.fn(),
  }),
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('NewDMModal', () => {
  let mockClient: any;
  let mockPush: any;
  let mockOnClose: any;
  let mockToastSuccess: any;
  let mockToastError: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Get the mocked functions from the mocked modules
    const matrixClient = (useMatrixClient as any)();
    mockClient = matrixClient.client;
    
    const router = (useRouter as any)();
    mockPush = router.push;
    
    const modal = (useModal as any)();
    mockOnClose = modal.onClose;
    
    mockToastSuccess = (toast as any).success;
    mockToastError = (toast as any).error;
    
    // Setup default mock implementations
    mockClient.getUserId.mockReturnValue('@testuser:dev2.aaroncollins.info');
    mockClient.getHomeserverUrl.mockReturnValue('https://dev2.aaroncollins.info');
    mockClient.searchUserDirectory.mockResolvedValue({
      results: [
        {
          user_id: '@alice:dev2.aaroncollins.info',
          display_name: 'Alice Cooper',
          avatar_url: 'mxc://dev2.aaroncollins.info/avatar1',
        },
        {
          user_id: '@bob:dev2.aaroncollins.info', 
          display_name: 'Bob Smith',
          avatar_url: null,
        },
        {
          user_id: '@charlie:dev2.aaroncollins.info',
          display_name: 'Charlie Brown',
          avatar_url: 'mxc://dev2.aaroncollins.info/avatar3',
        }
      ],
      limited: false,
    });
    mockClient.createRoom.mockResolvedValue({
      room_id: '!newdm123:dev2.aaroncollins.info',
    });
  });

  // AC-2: New DM modal with user search interface
  describe('AC-2: Modal with User Search Interface', () => {
    it('should render modal with search input', () => {
      render(<NewDMModal isOpen={true} />);
      
      // Modal should be visible
      expect(screen.getByTestId('new-dm-modal')).toBeInTheDocument();
      
      // Should have header
      expect(screen.getByText('New Direct Message')).toBeInTheDocument();
      
      // Should have search input
      const searchInput = screen.getByPlaceholderText('Search for users...');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    it('should have close button', () => {
      render(<NewDMModal isOpen={true} />);
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeInTheDocument();
    });

    it('should close modal when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<NewDMModal isOpen={true} />);
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not render modal when isOpen is false', () => {
      render(<NewDMModal isOpen={false} />);
      
      expect(screen.queryByTestId('new-dm-modal')).not.toBeInTheDocument();
    });

    it('should have empty state message initially', () => {
      render(<NewDMModal isOpen={true} />);
      
      expect(screen.getByText(/Type to search for users/i)).toBeInTheDocument();
    });
  });

  describe('User Search Functionality', () => {
    it('should perform Matrix user directory search when typing', async () => {
      const user = userEvent.setup();
      render(<NewDMModal isOpen={true} />);
      
      const searchInput = screen.getByPlaceholderText('Search for users...');
      await user.type(searchInput, 'alice');
      
      // Debounced search should be called
      await waitFor(() => {
        expect(mockClient.searchUserDirectory).toHaveBeenCalledWith({
          search_term: 'alice',
          limit: 10,
        });
      }, { timeout: 1000 });
    });

    it('should display search results', async () => {
      const user = userEvent.setup();
      render(<NewDMModal isOpen={true} />);
      
      const searchInput = screen.getByPlaceholderText('Search for users...');
      await user.type(searchInput, 'alice');
      
      // Wait for search results
      await waitFor(() => {
        expect(screen.getByTestId('user-search-results')).toBeInTheDocument();
      });
      
      // Should show user results
      expect(screen.getByText('Alice Cooper')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
    });

    it('should show user avatars in search results', async () => {
      const user = userEvent.setup();
      render(<NewDMModal isOpen={true} />);
      
      const searchInput = screen.getByPlaceholderText('Search for users...');
      await user.type(searchInput, 'alice');
      
      await waitFor(() => {
        expect(screen.getByTestId('user-search-results')).toBeInTheDocument();
      });
      
      // Should have user avatars
      const userItems = screen.getAllByTestId(/^user-result-/);
      expect(userItems).toHaveLength(3);
    });

    it('should handle search errors gracefully', async () => {
      mockClient.searchUserDirectory.mockRejectedValue(new Error('Network error'));
      
      const user = userEvent.setup();
      render(<NewDMModal isOpen={true} />);
      
      const searchInput = screen.getByPlaceholderText('Search for users...');
      await user.type(searchInput, 'alice');
      
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Failed to search users. Please try again.');
      });
    });

    it('should show no results message when no users found', async () => {
      mockClient.searchUserDirectory.mockResolvedValue({
        results: [],
        limited: false,
      });
      
      const user = userEvent.setup();
      render(<NewDMModal isOpen={true} />);
      
      const searchInput = screen.getByPlaceholderText('Search for users...');
      await user.type(searchInput, 'nonexistent');
      
      await waitFor(() => {
        expect(screen.getByText(/No users found/i)).toBeInTheDocument();
      });
    });

    it('should filter out self from search results', async () => {
      mockClient.searchUserDirectory.mockResolvedValue({
        results: [
          {
            user_id: '@testuser:dev2.aaroncollins.info', // This is the current user
            display_name: 'Test User',
            avatar_url: null,
          },
          {
            user_id: '@alice:dev2.aaroncollins.info',
            display_name: 'Alice Cooper', 
            avatar_url: 'mxc://dev2.aaroncollins.info/avatar1',
          }
        ],
        limited: false,
      });
      
      const user = userEvent.setup();
      render(<NewDMModal isOpen={true} />);
      
      const searchInput = screen.getByPlaceholderText('Search for users...');
      await user.type(searchInput, 'test');
      
      await waitFor(() => {
        expect(screen.getByTestId('user-search-results')).toBeInTheDocument();
      });
      
      // Should only show Alice, not the current user
      expect(screen.getByText('Alice Cooper')).toBeInTheDocument();
      expect(screen.queryByText('Test User')).not.toBeInTheDocument();
    });
  });

  // AC-3: User selection creates/opens DM conversation
  describe('AC-3: User Selection Creates DM', () => {
    it('should create DM room when user is selected', async () => {
      const user = userEvent.setup();
      render(<NewDMModal isOpen={true} />);
      
      // Search for users first
      const searchInput = screen.getByPlaceholderText('Search for users...');
      await user.type(searchInput, 'alice');
      
      await waitFor(() => {
        expect(screen.getByTestId('user-search-results')).toBeInTheDocument();
      });
      
      // Click on a user
      const userButton = screen.getByTestId('user-result-@alice:dev2.aaroncollins.info');
      await user.click(userButton);
      
      // Should create DM room
      await waitFor(() => {
        expect(mockClient.createRoom).toHaveBeenCalledWith({
          is_direct: true,
          invite: ['@alice:dev2.aaroncollins.info'],
          preset: 'private_chat',
        });
      });
    });

    it('should show loading state during DM creation', async () => {
      // Make createRoom take time to resolve
      mockClient.createRoom.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ room_id: '!test:dev2.aaroncollins.info' }), 100))
      );
      
      const user = userEvent.setup();
      render(<NewDMModal isOpen={true} />);
      
      // Search and select user
      const searchInput = screen.getByPlaceholderText('Search for users...');
      await user.type(searchInput, 'alice');
      
      await waitFor(() => {
        expect(screen.getByTestId('user-search-results')).toBeInTheDocument();
      });
      
      const userButton = screen.getByTestId('user-result-@alice:dev2.aaroncollins.info');
      await user.click(userButton);
      
      // Should show loading state
      expect(screen.getByText(/Creating conversation/i)).toBeInTheDocument();
    });

    it('should navigate to DM conversation after successful creation', async () => {
      const user = userEvent.setup();
      render(<NewDMModal isOpen={true} />);
      
      // Search and select user
      const searchInput = screen.getByPlaceholderText('Search for users...');
      await user.type(searchInput, 'alice');
      
      await waitFor(() => {
        expect(screen.getByTestId('user-search-results')).toBeInTheDocument();
      });
      
      const userButton = screen.getByTestId('user-result-@alice:dev2.aaroncollins.info');
      await user.click(userButton);
      
      // Wait for DM creation to complete
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/channels/@me/!newdm123:dev2.aaroncollins.info');
      });
      
      // Should close modal
      expect(mockOnClose).toHaveBeenCalled();
      
      // Should show success message
      expect(mockToastSuccess).toHaveBeenCalledWith('Direct message conversation created!');
    });

    it('should handle DM creation errors', async () => {
      mockClient.createRoom.mockRejectedValue(new Error('Permission denied'));
      
      const user = userEvent.setup();
      render(<NewDMModal isOpen={true} />);
      
      // Search and select user
      const searchInput = screen.getByPlaceholderText('Search for users...');
      await user.type(searchInput, 'alice');
      
      await waitFor(() => {
        expect(screen.getByTestId('user-search-results')).toBeInTheDocument();
      });
      
      const userButton = screen.getByTestId('user-result-@alice:dev2.aaroncollins.info');
      await user.click(userButton);
      
      // Should show error message
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Failed to create conversation. Please try again.');
      });
      
      // Modal should stay open on error
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should disable user selection during DM creation', async () => {
      // Make createRoom take time to resolve
      let resolveCreateRoom: (value: any) => void;
      const createRoomPromise = new Promise(resolve => {
        resolveCreateRoom = resolve;
      });
      mockClient.createRoom.mockReturnValue(createRoomPromise);
      
      const user = userEvent.setup();
      render(<NewDMModal isOpen={true} />);
      
      // Search and select user
      const searchInput = screen.getByPlaceholderText('Search for users...');
      await user.type(searchInput, 'alice');
      
      await waitFor(() => {
        expect(screen.getByTestId('user-search-results')).toBeInTheDocument();
      });
      
      const userButton = screen.getByTestId('user-result-@alice:dev2.aaroncollins.info');
      await user.click(userButton);
      
      // User buttons should be disabled during creation
      expect(userButton).toBeDisabled();
      
      // Resolve the promise to cleanup
      resolveCreateRoom!({ room_id: '!test:dev2.aaroncollins.info' });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support Enter key to select user', async () => {
      const user = userEvent.setup();
      render(<NewDMModal isOpen={true} />);
      
      // Search for users
      const searchInput = screen.getByPlaceholderText('Search for users...');
      await user.type(searchInput, 'alice');
      
      await waitFor(() => {
        expect(screen.getByTestId('user-search-results')).toBeInTheDocument();
      });
      
      // Focus first user and press Enter
      const userButton = screen.getByTestId('user-result-@alice:dev2.aaroncollins.info');
      userButton.focus();
      await user.keyboard('{Enter}');
      
      // Should create DM room
      await waitFor(() => {
        expect(mockClient.createRoom).toHaveBeenCalled();
      });
    });

    it('should support Escape key to close modal', async () => {
      const user = userEvent.setup();
      render(<NewDMModal isOpen={true} />);
      
      await user.keyboard('{Escape}');
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search term', async () => {
      const user = userEvent.setup();
      render(<NewDMModal isOpen={true} />);
      
      const searchInput = screen.getByPlaceholderText('Search for users...');
      await user.type(searchInput, '   ');
      
      // Should not perform search for whitespace
      expect(mockClient.searchUserDirectory).not.toHaveBeenCalled();
    });

    it('should debounce search requests', async () => {
      const user = userEvent.setup();
      render(<NewDMModal isOpen={true} />);
      
      const searchInput = screen.getByPlaceholderText('Search for users...');
      
      // Type quickly
      await user.type(searchInput, 'a');
      await user.type(searchInput, 'l');
      await user.type(searchInput, 'i');
      await user.type(searchInput, 'c');
      await user.type(searchInput, 'e');
      
      // Should only make one search call (debounced)
      await waitFor(() => {
        expect(mockClient.searchUserDirectory).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });
    });

    it('should handle Matrix API rate limiting', async () => {
      const rateLimitError = new Error('M_LIMIT_EXCEEDED');
      (rateLimitError as any).httpStatus = 429;
      mockClient.createRoom.mockRejectedValue(rateLimitError);
      
      const user = userEvent.setup();
      render(<NewDMModal isOpen={true} />);
      
      // Search and select user
      const searchInput = screen.getByPlaceholderText('Search for users...');
      await user.type(searchInput, 'alice');
      
      await waitFor(() => {
        expect(screen.getByTestId('user-search-results')).toBeInTheDocument();
      });
      
      const userButton = screen.getByTestId('user-result-@alice:dev2.aaroncollins.info');
      await user.click(userButton);
      
      // Should show rate limit specific error
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Rate limited. Please wait and try again.');
      });
    });
  });
});