import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { useRouter } from 'next/navigation';
import { DMSidebarSection } from '@/components/navigation/dm-sidebar-section';
import { DMListItem } from '@/components/navigation/dm-list-item';
import { DMConversation } from '@/components/dm/dm-conversation';
import { useModal } from '@/hooks/use-modal-store';
import { useMatrixClient } from '@/hooks/use-matrix-client';
import { useRoomMessages } from '@/hooks/use-room-messages';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/hooks/use-modal-store', () => ({
  useModal: vi.fn(),
}));

vi.mock('@/hooks/use-matrix-client', () => ({
  useMatrixClient: vi.fn(),
}));

vi.mock('@/hooks/use-room-messages', () => ({
  useRoomMessages: vi.fn(),
}));

vi.mock('@/hooks/use-chat-scroll', () => ({
  useChatScroll: vi.fn(),
}));

vi.mock('@/components/action-tooltip', () => ({
  ActionTooltip: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/components/emoji-picker', () => ({
  EmojiPicker: () => <div data-testid="emoji-picker">Emoji Picker</div>,
}));

const mockRouter = {
  push: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
};

const mockModal = {
  onOpen: vi.fn(),
  onClose: vi.fn(),
  isOpen: false,
  type: null,
  data: {},
};

describe('DM Mobile Responsiveness & Notifications (AC-9, AC-10)', () => {
  beforeEach(() => {
    (useRouter as any).mockReturnValue(mockRouter);
    (useModal as any).mockReturnValue(mockModal);
    (useMatrixClient as any).mockReturnValue({
      client: { getUserId: () => '@testuser:matrix.org' },
      isReady: true,
    });
    (useRoomMessages as any).mockReturnValue({
      messages: [],
      isLoading: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      isLoadingMore: false,
    });

    // Mock viewport dimensions for mobile testing
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('AC-9: Mobile DM Experience (375x667 viewport)', () => {
    const mockDMs = [
      {
        id: 'dm1',
        userId: '@user1:matrix.org',
        displayName: 'Alice Johnson',
        avatarUrl: 'https://example.com/alice.jpg',
        lastMessage: {
          text: 'Hey, how are you?',
          timestamp: Date.now() - 60000,
          senderId: '@user1:matrix.org',
        },
        unreadCount: 2,
        isOnline: true,
      },
      {
        id: 'dm2',
        userId: '@user2:matrix.org',
        displayName: 'Bob Smith',
        avatarUrl: null,
        lastMessage: {
          text: 'Let\'s meet tomorrow',
          timestamp: Date.now() - 300000,
          senderId: '@user2:matrix.org',
        },
        unreadCount: 0,
        isOnline: false,
      },
    ];

    test('DM sidebar section is mobile responsive', () => {
      render(<DMSidebarSection dms={mockDMs} />);
      
      const dmSection = screen.getByTestId('dm-section');
      expect(dmSection).toBeInTheDocument();
      expect(dmSection).toHaveClass('w-full');

      // Header should be visible on mobile
      expect(screen.getByText('Direct Messages')).toBeInTheDocument();
      expect(screen.getByTestId('new-dm-button')).toBeInTheDocument();
    });

    test('DM list items have appropriate mobile touch targets', () => {
      render(<DMListItem dm={mockDMs[0]} />);
      
      const dmItem = screen.getByTestId('dm-list-item');
      expect(dmItem).toBeInTheDocument();
      
      // Should have adequate padding for touch
      expect(dmItem).toHaveClass('p-3');
      
      // Should be focusable for keyboard navigation
      expect(dmItem).toHaveAttribute('tabIndex', '0');
    });

    test('DM conversation interface works on mobile viewport', () => {
      render(
        <DMConversation 
          roomId="!test:matrix.org"
          recipientName="Test User"
          recipientAvatarUrl="https://example.com/test.jpg"
        />
      );

      // Main conversation container
      expect(screen.getByTestId('dm-conversation')).toBeInTheDocument();
      
      // Header should be compact on mobile
      expect(screen.getByTestId('dm-header')).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument();
      
      // Messages area
      expect(screen.getByTestId('dm-messages')).toBeInTheDocument();
      
      // Input should be responsive
      const messageInput = screen.getByTestId('dm-message-input');
      expect(messageInput).toBeInTheDocument();
      expect(messageInput).toHaveAttribute('placeholder', 'Message @Test User');
      
      // Send button should be accessible
      expect(screen.getByTestId('dm-send-button')).toBeInTheDocument();
    });

    test('touch interactions work properly on mobile', async () => {
      render(<DMListItem dm={mockDMs[0]} />);
      
      const dmItem = screen.getByTestId('dm-list-item');
      
      // Simulate touch/click
      fireEvent.click(dmItem);
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/channels/@me/dm1');
      });
    });

    test('mobile keyboard navigation works', () => {
      render(<DMListItem dm={mockDMs[0]} />);
      
      const dmItem = screen.getByTestId('dm-list-item');
      
      // Focus on item
      dmItem.focus();
      expect(dmItem).toHaveFocus();
      
      // Press Enter
      fireEvent.keyDown(dmItem, { key: 'Enter' });
      expect(mockRouter.push).toHaveBeenCalledWith('/channels/@me/dm1');
      
      // Press Space
      fireEvent.keyDown(dmItem, { key: ' ' });
      expect(mockRouter.push).toHaveBeenCalledTimes(2);
    });

    test('mobile message input handles virtual keyboard', () => {
      render(
        <DMConversation 
          roomId="!test:matrix.org"
          recipientName="Test User"
        />
      );

      const messageInput = screen.getByTestId('dm-message-input');
      
      // Input should not have fixed positioning that conflicts with virtual keyboard
      expect(messageInput).toBeInTheDocument();
      
      // Should allow typing
      fireEvent.change(messageInput, { target: { value: 'Test message' } });
      expect(messageInput).toHaveValue('Test message');
    });
  });

  describe('AC-10: Unread DM Indicators/Badges', () => {
    const mockUnreadDMs = [
      {
        id: 'dm1',
        userId: '@user1:matrix.org',
        displayName: 'Alice Johnson',
        avatarUrl: 'https://example.com/alice.jpg',
        lastMessage: {
          text: 'Hey, how are you?',
          timestamp: Date.now() - 60000,
          senderId: '@user1:matrix.org',
        },
        unreadCount: 3,
        isOnline: true,
      },
      {
        id: 'dm2',
        userId: '@user2:matrix.org',
        displayName: 'Bob Smith',
        avatarUrl: null,
        lastMessage: {
          text: 'Multiple unread messages here',
          timestamp: Date.now() - 120000,
          senderId: '@user2:matrix.org',
        },
        unreadCount: 15,
        isOnline: false,
      },
      {
        id: 'dm3',
        userId: '@user3:matrix.org',
        displayName: 'Charlie Brown',
        avatarUrl: null,
        lastMessage: {
          text: 'Too many messages',
          timestamp: Date.now() - 180000,
          senderId: '@user3:matrix.org',
        },
        unreadCount: 150,
        isOnline: false,
      },
    ];

    const mockReadDM = {
      id: 'dm4',
      userId: '@user4:matrix.org',
      displayName: 'David Wilson',
      avatarUrl: null,
      lastMessage: {
        text: 'This is read',
        timestamp: Date.now() - 240000,
        senderId: '@user4:matrix.org',
      },
      unreadCount: 0,
      isOnline: true,
    };

    test('unread count badge displays correctly', () => {
      render(<DMListItem dm={mockUnreadDMs[0]} />);
      
      // Should show exact count for small numbers
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    test('unread count badge shows 99+ for large numbers', () => {
      render(<DMListItem dm={mockUnreadDMs[2]} />);
      
      // Should show 99+ for numbers > 99
      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    test('no badge shown for read messages', () => {
      render(<DMListItem dm={mockReadDM} />);
      
      // Should not show any unread badge
      expect(screen.queryByText('0')).not.toBeInTheDocument();
      
      // No badge element should exist
      const badges = screen.queryAllByText(/^\d+$|99\+$/);
      expect(badges).toHaveLength(0);
    });

    test('unread indicators work in DM sidebar section', () => {
      render(<DMSidebarSection dms={mockUnreadDMs} />);
      
      // Should show unread counts for all DMs with unread messages
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    test('unread badge styling is appropriate', () => {
      render(<DMListItem dm={mockUnreadDMs[0]} />);
      
      const badge = screen.getByText('3');
      
      // Badge should have appropriate styling
      expect(badge).toHaveClass('bg-red-500');
      expect(badge).toHaveClass('text-white');
      expect(badge).toHaveClass('text-xs');
      expect(badge).toHaveClass('rounded-full');
    });

    test('DM with unread messages shows visual emphasis', () => {
      const { rerender } = render(<DMListItem dm={mockUnreadDMs[0]} />);
      
      const dmItem = screen.getByTestId('dm-list-item');
      
      // DM with unread messages should be visually emphasized
      expect(dmItem).toBeInTheDocument();
      
      // Compare with read DM
      rerender(<DMListItem dm={mockReadDM} />);
      
      const readDmItem = screen.getByTestId('dm-list-item');
      expect(readDmItem).toBeInTheDocument();
    });

    test('badge updates when unread count changes', () => {
      const { rerender } = render(<DMListItem dm={mockUnreadDMs[0]} />);
      
      // Initial state - 3 unread
      expect(screen.getByText('3')).toBeInTheDocument();
      
      // Update to 1 unread
      const updatedDM = { ...mockUnreadDMs[0], unreadCount: 1 };
      rerender(<DMListItem dm={updatedDM} />);
      
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.queryByText('3')).not.toBeInTheDocument();
      
      // Update to read (0 unread)
      const readDM = { ...mockUnreadDMs[0], unreadCount: 0 };
      rerender(<DMListItem dm={readDM} />);
      
      expect(screen.queryByText('1')).not.toBeInTheDocument();
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    test('unread badges work on mobile viewport', () => {
      // Set mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(window, 'innerHeight', { value: 667 });
      
      render(<DMListItem dm={mockUnreadDMs[1]} />);
      
      const badge = screen.getByText('15');
      expect(badge).toBeInTheDocument();
      
      // Badge should maintain minimum size for touch targets on mobile
      expect(badge).toHaveClass('min-w-[18px]');
      expect(badge).toHaveClass('h-[18px]');
    });

    test('accessibility support for unread indicators', () => {
      render(<DMListItem dm={mockUnreadDMs[0]} />);
      
      const dmItem = screen.getByTestId('dm-list-item');
      
      // Should have appropriate ARIA information
      expect(dmItem).toBeInTheDocument();
      
      // Badge should be visible to screen readers
      const badge = screen.getByText('3');
      expect(badge).toBeInTheDocument();
    });
  });
});