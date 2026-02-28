/**
 * Chat Messages Component Tests
 * 
 * Tests for the ChatMessages component following Discord-clone reference structure.
 * Validates visual parity and Matrix integration using TDD approach.
 * 
 * The component uses useRoomMessages hook which returns Matrix event objects.
 * These are internally converted to a Discord-compatible format for rendering.
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatMessages } from '@/components/chat/chat-messages';

// Factory to create Matrix event mocks
const createMockMatrixEvent = (overrides: {
  id?: string;
  sender?: string;
  body?: string;
  timestamp?: number;
  isRedacted?: boolean;
  url?: string;
} = {}) => ({
  getId: vi.fn(() => overrides.id ?? 'event123'),
  getSender: vi.fn(() => overrides.sender ?? '@user:matrix.org'),
  getContent: vi.fn(() => ({ 
    body: overrides.body ?? 'Hello world', 
    msgtype: 'm.text',
    url: overrides.url ?? null,
  })),
  getTs: vi.fn(() => overrides.timestamp ?? Date.now()),
  getType: vi.fn(() => 'm.room.message'),
  getDate: vi.fn(() => new Date(overrides.timestamp ?? Date.now())),
  isRedacted: vi.fn(() => overrides.isRedacted ?? false),
  getUnsigned: vi.fn(() => ({})),
});

const mockMember = {
  userId: '@user:matrix.org',
  user: {
    displayName: 'Test User',
    avatarUrl: 'avatar.jpg',
  },
};

// Mock hooks
const mockUseRoomMessages = vi.fn();
const mockUseChatScroll = vi.fn();
const mockLoadMore = vi.fn();

vi.mock('@/hooks/use-room-messages', () => ({
  useRoomMessages: (...args: unknown[]) => mockUseRoomMessages(...args),
}));

vi.mock('@/hooks/use-chat-scroll', () => ({
  useChatScroll: (opts: unknown) => mockUseChatScroll(opts),
}));

// Mock UI components
vi.mock('@/components/chat/chat-welcome', () => ({
  ChatWelcome: ({ name, type }: { name: string; type: string }) => (
    <div data-testid="chat-welcome">Welcome to {name} ({type})</div>
  ),
}));

vi.mock('@/components/chat/chat-item', () => ({
  ChatItem: ({ 
    currentMember, 
    member, 
    id, 
    content, 
    timestamp,
  }: {
    currentMember: unknown;
    member: unknown;
    id: string;
    content: string;
    timestamp: string;
  }) => (
    <div 
      data-testid="chat-item" 
      data-message-id={id}
      data-content={content}
      data-timestamp={timestamp}
      data-current-member={JSON.stringify(currentMember)}
      data-member={JSON.stringify(member)}
    >
      {content}
    </div>
  ),
}));

// Mock icons - return proper React elements
vi.mock('lucide-react', () => ({
  Loader2: ({ className, 'data-testid': testId }: { className?: string; 'data-testid'?: string }) => (
    <div data-testid={testId || 'loader'} className={className}>Loading...</div>
  ),
  ServerCrash: ({ className, 'data-testid': testId }: { className?: string; 'data-testid'?: string }) => (
    <div data-testid={testId || 'server-crash'} className={className}>Error</div>
  ),
}));

describe('ChatMessages', () => {
  const defaultProps = {
    name: 'general',
    member: mockMember,
    chatId: 'room123',
    apiUrl: '/api/messages',
    socketUrl: '/api/socket',
    socketQuery: { serverId: 'server123' },
    paramKey: 'channelId' as const,
    paramValue: 'channel123',
    type: 'channel' as const,
  };

  // Helper to create default hook return values
  const createDefaultHookReturn = (overrides: {
    messages?: ReturnType<typeof createMockMatrixEvent>[];
    isLoading?: boolean;
    hasMore?: boolean;
    error?: Error | null;
    isLoadingMore?: boolean;
  } = {}) => ({
    messages: overrides.messages ?? [createMockMatrixEvent()],
    isLoading: overrides.isLoading ?? false,
    hasMore: overrides.hasMore ?? false,
    loadMore: mockLoadMore,
    error: overrides.error ?? null,
    isLoadingMore: overrides.isLoadingMore ?? false,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful state with one message
    mockUseRoomMessages.mockReturnValue(createDefaultHookReturn());
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Loading State', () => {
    it('renders loading spinner when status is loading', () => {
      mockUseRoomMessages.mockReturnValue(createDefaultHookReturn({
        messages: [],
        isLoading: true,
      }));

      render(<ChatMessages {...defaultProps} />);
      
      expect(screen.getByTestId('loader')).toBeInTheDocument();
      expect(screen.getByText('Loading messages...')).toBeInTheDocument();
    });

    it('applies correct loading styles', () => {
      mockUseRoomMessages.mockReturnValue(createDefaultHookReturn({
        messages: [],
        isLoading: true,
      }));

      render(<ChatMessages {...defaultProps} />);
      
      const loadingContainer = screen.getByTestId('loading-messages');
      expect(loadingContainer).toHaveClass('flex', 'flex-col', 'flex-1', 'justify-center', 'items-center');
      
      const loader = screen.getByTestId('loader');
      expect(loader).toHaveClass('h-7', 'w-7', 'text-zinc-500', 'animate-spin', 'my-4');
    });
  });

  describe('Error State', () => {
    it('renders error message when status is error', () => {
      mockUseRoomMessages.mockReturnValue(createDefaultHookReturn({
        messages: [],
        error: new Error('Connection failed'),
      }));

      render(<ChatMessages {...defaultProps} />);
      
      expect(screen.getByTestId('server-crash')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong!')).toBeInTheDocument();
    });

    it('applies correct error styles', () => {
      mockUseRoomMessages.mockReturnValue(createDefaultHookReturn({
        messages: [],
        error: new Error('Connection failed'),
      }));

      render(<ChatMessages {...defaultProps} />);
      
      const errorContainer = screen.getByTestId('error-messages');
      expect(errorContainer).toHaveClass('flex', 'flex-col', 'flex-1', 'justify-center', 'items-center');
      
      const errorIcon = screen.getByTestId('server-crash');
      expect(errorIcon).toHaveClass('h-7', 'w-7', 'text-zinc-500', 'my-4');
    });
  });

  describe('Message Display', () => {
    it('renders chat welcome when no more messages to load', () => {
      mockUseRoomMessages.mockReturnValue(createDefaultHookReturn({
        messages: [],
        hasMore: false,
      }));

      render(<ChatMessages {...defaultProps} />);
      
      expect(screen.getByTestId('chat-welcome')).toBeInTheDocument();
      expect(screen.getByText('Welcome to general (channel)')).toBeInTheDocument();
    });

    it('renders messages in correct order', () => {
      const mockMessages = [
        createMockMatrixEvent({ id: 'msg1', body: 'First message', timestamp: 1672567200000 }),
        createMockMatrixEvent({ id: 'msg2', body: 'Second message', timestamp: 1672567260000 }),
      ];

      mockUseRoomMessages.mockReturnValue(createDefaultHookReturn({
        messages: mockMessages,
      }));

      render(<ChatMessages {...defaultProps} />);
      
      const chatItems = screen.getAllByTestId('chat-item');
      expect(chatItems).toHaveLength(2);
      expect(chatItems[0]).toHaveAttribute('data-content', 'First message');
      expect(chatItems[1]).toHaveAttribute('data-content', 'Second message');
    });

    it('passes correct props to ChatItem', () => {
      const mockEvent = createMockMatrixEvent({ 
        id: 'msg1', 
        body: 'Hello world',
        sender: '@testuser:matrix.org',
      });
      
      mockUseRoomMessages.mockReturnValue(createDefaultHookReturn({
        messages: [mockEvent],
      }));

      render(<ChatMessages {...defaultProps} />);
      
      const chatItem = screen.getByTestId('chat-item');
      expect(chatItem).toHaveAttribute('data-message-id', 'msg1');
      expect(chatItem).toHaveAttribute('data-content', 'Hello world');
      expect(chatItem).toHaveAttribute('data-timestamp');
      
      const currentMemberData = JSON.parse(chatItem.getAttribute('data-current-member') || '{}');
      expect(currentMemberData.userId).toBe('@user:matrix.org');
      
      const memberData = JSON.parse(chatItem.getAttribute('data-member') || '{}');
      expect(memberData.userId).toBe('@testuser:matrix.org');
    });
  });

  describe('Pagination', () => {
    it('shows load more button when hasNextPage is true', () => {
      mockUseRoomMessages.mockReturnValue(createDefaultHookReturn({
        messages: [createMockMatrixEvent()],
        hasMore: true,
      }));

      render(<ChatMessages {...defaultProps} />);
      
      const loadMoreButton = screen.getByRole('button', { name: /load previous messages/i });
      expect(loadMoreButton).toBeInTheDocument();
    });

    it('shows loading spinner when fetching more messages', () => {
      mockUseRoomMessages.mockReturnValue(createDefaultHookReturn({
        messages: [createMockMatrixEvent()],
        hasMore: true,
        isLoadingMore: true,
      }));

      render(<ChatMessages {...defaultProps} />);
      
      // When fetching more, the pagination loader should appear (not the main loader)
      expect(screen.getByTestId('pagination-loader')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /load previous messages/i })).not.toBeInTheDocument();
    });

    it('calls fetchNextPage when load more button is clicked', async () => {
      const user = userEvent.setup();
      
      mockUseRoomMessages.mockReturnValue(createDefaultHookReturn({
        messages: [createMockMatrixEvent()],
        hasMore: true,
      }));

      render(<ChatMessages {...defaultProps} />);
      
      const loadMoreButton = screen.getByRole('button', { name: /load previous messages/i });
      await user.click(loadMoreButton);
      
      expect(mockLoadMore).toHaveBeenCalledOnce();
    });

    it('applies correct styles to load more button', () => {
      mockUseRoomMessages.mockReturnValue(createDefaultHookReturn({
        messages: [createMockMatrixEvent()],
        hasMore: true,
      }));

      render(<ChatMessages {...defaultProps} />);
      
      const loadMoreButton = screen.getByRole('button', { name: /load previous messages/i });
      expect(loadMoreButton).toHaveClass(
        'text-zinc-500', 
        'text-xs', 
        'my-4', 
        'transition'
      );
    });
  });

  describe('Container Styling', () => {
    it('applies correct container classes', () => {
      mockUseRoomMessages.mockReturnValue(createDefaultHookReturn({
        messages: [createMockMatrixEvent()],
      }));

      render(<ChatMessages {...defaultProps} />);
      
      const container = screen.getByTestId('chat-messages-container');
      expect(container).toHaveClass('flex-1', 'flex', 'flex-col', 'py-4', 'overflow-y-auto');
    });

    it('renders messages container with flex-col-reverse', () => {
      mockUseRoomMessages.mockReturnValue(createDefaultHookReturn({
        messages: [createMockMatrixEvent()],
      }));

      render(<ChatMessages {...defaultProps} />);
      
      const messagesContainer = screen.getByTestId('messages-container');
      expect(messagesContainer).toHaveClass('flex', 'flex-col-reverse', 'mt-auto');
    });
  });

  describe('Integration with Matrix Hooks', () => {
    it('calls useChatScroll with correct parameters', () => {
      mockUseRoomMessages.mockReturnValue(createDefaultHookReturn({
        messages: [createMockMatrixEvent()],
        hasMore: true,
      }));

      render(<ChatMessages {...defaultProps} />);
      
      expect(mockUseChatScroll).toHaveBeenCalledWith(
        expect.objectContaining({
          loadMore: mockLoadMore,
          shouldLoadMore: true, // !isFetchingNextPage && !!hasNextPage
          count: 1, // data?.pages?.[0]?.items?.length
        })
      );
    });

    it('handles empty data gracefully', () => {
      mockUseRoomMessages.mockReturnValue(createDefaultHookReturn({
        messages: [],
      }));

      render(<ChatMessages {...defaultProps} />);
      
      expect(mockUseChatScroll).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 0,
        })
      );
    });
  });

  describe('Message Formatting', () => {
    it('formats message timestamps correctly', () => {
      // Use a fixed timestamp: Jan 1, 2023 10:30:00 UTC
      const testTimestamp = new Date('2023-01-01T10:30:00Z').getTime();
      const mockEvent = createMockMatrixEvent({ 
        id: 'msg1', 
        body: 'Test message',
        timestamp: testTimestamp,
      });

      mockUseRoomMessages.mockReturnValue(createDefaultHookReturn({
        messages: [mockEvent],
      }));

      render(<ChatMessages {...defaultProps} />);
      
      const chatItem = screen.getByTestId('chat-item');
      const timestamp = chatItem.getAttribute('data-timestamp');
      // The format is "d MMM yyyy, HH:mm" - may vary by timezone
      expect(timestamp).toMatch(/1 Jan 2023/);
    });

    it('handles deleted messages', () => {
      const mockEvent = createMockMatrixEvent({ 
        id: 'msg1', 
        body: 'Deleted message',
        isRedacted: true,
      });

      mockUseRoomMessages.mockReturnValue(createDefaultHookReturn({
        messages: [mockEvent],
      }));

      render(<ChatMessages {...defaultProps} />);
      
      const chatItem = screen.getByTestId('chat-item');
      expect(chatItem).toBeInTheDocument();
      // The deleted flag should be passed to ChatItem
    });
  });
});
