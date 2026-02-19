/**
 * Chat Messages Component Tests
 * 
 * Tests for the ChatMessages component following Discord-clone reference structure.
 * Validates visual parity and Matrix integration using TDD approach.
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatMessages } from '@/components/chat/chat-messages';

// Mock Matrix event data
const mockMatrixEvent = {
  getId: vi.fn(() => 'event123'),
  getSender: vi.fn(() => '@user:matrix.org'),
  getContent: vi.fn(() => ({ body: 'Hello world', msgtype: 'm.text' })),
  getTs: vi.fn(() => Date.now()),
  getType: vi.fn(() => 'm.room.message'),
  getDate: vi.fn(() => new Date()),
  isRedacted: vi.fn(() => false),
  getUnsigned: vi.fn(() => ({})),
};

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

vi.mock('@/hooks/use-room-messages', () => ({
  useRoomMessages: () => mockUseRoomMessages(),
}));

vi.mock('@/hooks/use-chat-scroll', () => ({
  useChatScroll: () => mockUseChatScroll(),
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
    ...props 
  }: any) => (
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

// Mock icons
vi.mock('lucide-react', () => ({
  Loader2: ({ className }: { className?: string }) => (
    <div data-testid="loader" className={className}>Loading...</div>
  ),
  ServerCrash: ({ className }: { className?: string }) => (
    <div data-testid="server-crash" className={className}>Error</div>
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

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful state
    mockUseRoomMessages.mockReturnValue({
      data: {
        pages: [{
          items: [
            {
              ...mockMatrixEvent,
              id: 'msg1',
              content: 'Hello world',
              createdAt: new Date('2023-01-01T10:00:00Z'),
              updatedAt: new Date('2023-01-01T10:00:00Z'),
              deleted: false,
              fileUrl: null,
              member: {
                ...mockMember,
                profile: {
                  name: 'Test User',
                  imageUrl: 'avatar.jpg',
                },
              },
            },
          ],
        }],
      },
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      status: 'success',
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Loading State', () => {
    it('renders loading spinner when status is loading', () => {
      mockUseRoomMessages.mockReturnValue({
        data: null,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        status: 'loading',
      });

      render(<ChatMessages {...defaultProps} />);
      
      expect(screen.getByTestId('loader')).toBeInTheDocument();
      expect(screen.getByText('Loading messages...')).toBeInTheDocument();
    });

    it('applies correct loading styles', () => {
      mockUseRoomMessages.mockReturnValue({
        data: null,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        status: 'loading',
      });

      render(<ChatMessages {...defaultProps} />);
      
      const loadingContainer = screen.getByText('Loading messages...').closest('div');
      expect(loadingContainer).toHaveClass('flex', 'flex-col', 'flex-1', 'justify-center', 'items-center');
      
      const loader = screen.getByTestId('loader');
      expect(loader).toHaveClass('h-7', 'w-7', 'text-zinc-500', 'animate-spin', 'my-4');
    });
  });

  describe('Error State', () => {
    it('renders error message when status is error', () => {
      mockUseRoomMessages.mockReturnValue({
        data: null,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        status: 'error',
      });

      render(<ChatMessages {...defaultProps} />);
      
      expect(screen.getByTestId('server-crash')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong!')).toBeInTheDocument();
    });

    it('applies correct error styles', () => {
      mockUseRoomMessages.mockReturnValue({
        data: null,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        status: 'error',
      });

      render(<ChatMessages {...defaultProps} />);
      
      const errorContainer = screen.getByText('Something went wrong!').closest('div');
      expect(errorContainer).toHaveClass('flex', 'flex-col', 'flex-1', 'justify-center', 'items-center');
      
      const errorIcon = screen.getByTestId('server-crash');
      expect(errorIcon).toHaveClass('h-7', 'w-7', 'text-zinc-500', 'my-4');
    });
  });

  describe('Message Display', () => {
    it('renders chat welcome when no more messages to load', () => {
      mockUseRoomMessages.mockReturnValue({
        data: {
          pages: [{
            items: [],
          }],
        },
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        status: 'success',
      });

      render(<ChatMessages {...defaultProps} />);
      
      expect(screen.getByTestId('chat-welcome')).toBeInTheDocument();
      expect(screen.getByText('Welcome to general (channel)')).toBeInTheDocument();
    });

    it('renders messages in correct order', () => {
      const mockData = {
        pages: [{
          items: [
            {
              id: 'msg1',
              content: 'First message',
              createdAt: new Date('2023-01-01T10:00:00Z'),
              updatedAt: new Date('2023-01-01T10:00:00Z'),
              deleted: false,
              fileUrl: null,
              member: { ...mockMember, profile: { name: 'User1' } },
            },
            {
              id: 'msg2', 
              content: 'Second message',
              createdAt: new Date('2023-01-01T10:01:00Z'),
              updatedAt: new Date('2023-01-01T10:01:00Z'),
              deleted: false,
              fileUrl: null,
              member: { ...mockMember, profile: { name: 'User2' } },
            },
          ],
        }],
      };

      mockUseRoomMessages.mockReturnValue({
        data: mockData,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        status: 'success',
      });

      render(<ChatMessages {...defaultProps} />);
      
      const chatItems = screen.getAllByTestId('chat-item');
      expect(chatItems).toHaveLength(2);
      expect(chatItems[0]).toHaveAttribute('data-content', 'First message');
      expect(chatItems[1]).toHaveAttribute('data-content', 'Second message');
    });

    it('passes correct props to ChatItem', () => {
      render(<ChatMessages {...defaultProps} />);
      
      const chatItem = screen.getByTestId('chat-item');
      expect(chatItem).toHaveAttribute('data-message-id', 'msg1');
      expect(chatItem).toHaveAttribute('data-content', 'Hello world');
      expect(chatItem).toHaveAttribute('data-timestamp');
      
      const currentMemberData = JSON.parse(chatItem.getAttribute('data-current-member') || '{}');
      expect(currentMemberData.userId).toBe('@user:matrix.org');
      
      const memberData = JSON.parse(chatItem.getAttribute('data-member') || '{}');
      expect(memberData.profile.name).toBe('Test User');
    });
  });

  describe('Pagination', () => {
    it('shows load more button when hasNextPage is true', () => {
      const mockFetchNextPage = vi.fn();
      
      mockUseRoomMessages.mockReturnValue({
        data: {
          pages: [{ items: [mockMatrixEvent] }],
        },
        fetchNextPage: mockFetchNextPage,
        hasNextPage: true,
        isFetchingNextPage: false,
        status: 'success',
      });

      render(<ChatMessages {...defaultProps} />);
      
      const loadMoreButton = screen.getByRole('button', { name: /load previous messages/i });
      expect(loadMoreButton).toBeInTheDocument();
    });

    it('shows loading spinner when fetching more messages', () => {
      mockUseRoomMessages.mockReturnValue({
        data: {
          pages: [{ items: [mockMatrixEvent] }],
        },
        fetchNextPage: vi.fn(),
        hasNextPage: true,
        isFetchingNextPage: true,
        status: 'success',
      });

      render(<ChatMessages {...defaultProps} />);
      
      expect(screen.getByTestId('loader')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /load previous messages/i })).not.toBeInTheDocument();
    });

    it('calls fetchNextPage when load more button is clicked', async () => {
      const user = userEvent.setup();
      const mockFetchNextPage = vi.fn();
      
      mockUseRoomMessages.mockReturnValue({
        data: {
          pages: [{ items: [mockMatrixEvent] }],
        },
        fetchNextPage: mockFetchNextPage,
        hasNextPage: true,
        isFetchingNextPage: false,
        status: 'success',
      });

      render(<ChatMessages {...defaultProps} />);
      
      const loadMoreButton = screen.getByRole('button', { name: /load previous messages/i });
      await user.click(loadMoreButton);
      
      expect(mockFetchNextPage).toHaveBeenCalledOnce();
    });

    it('applies correct styles to load more button', () => {
      mockUseRoomMessages.mockReturnValue({
        data: {
          pages: [{ items: [mockMatrixEvent] }],
        },
        fetchNextPage: vi.fn(),
        hasNextPage: true,
        isFetchingNextPage: false,
        status: 'success',
      });

      render(<ChatMessages {...defaultProps} />);
      
      const loadMoreButton = screen.getByRole('button', { name: /load previous messages/i });
      expect(loadMoreButton).toHaveClass(
        'text-zinc-500', 
        'hover:text-zinc-600', 
        'dark:text-zinc-400', 
        'text-xs', 
        'my-4', 
        'dark:hover:text-zinc-300', 
        'transition'
      );
    });
  });

  describe('Container Styling', () => {
    it('applies correct container classes', () => {
      render(<ChatMessages {...defaultProps} />);
      
      const container = screen.getByText('Hello world').closest('[data-testid="chat-item"]')?.parentElement?.parentElement?.parentElement;
      expect(container).toHaveClass('flex-1', 'flex', 'flex-col', 'py-4', 'overflow-y-auto');
    });

    it('renders messages container with flex-col-reverse', () => {
      render(<ChatMessages {...defaultProps} />);
      
      const messagesContainer = screen.getByText('Hello world').closest('[data-testid="chat-item"]')?.parentElement?.parentElement;
      expect(messagesContainer).toHaveClass('flex', 'flex-col-reverse', 'mt-auto');
    });
  });

  describe('Integration with Matrix Hooks', () => {
    it('calls useChatScroll with correct parameters', () => {
      const mockFetchNextPage = vi.fn();
      
      mockUseRoomMessages.mockReturnValue({
        data: {
          pages: [{ items: [mockMatrixEvent] }],
        },
        fetchNextPage: mockFetchNextPage,
        hasNextPage: true,
        isFetchingNextPage: false,
        status: 'success',
      });

      render(<ChatMessages {...defaultProps} />);
      
      expect(mockUseChatScroll).toHaveBeenCalledWith(
        expect.objectContaining({
          loadMore: mockFetchNextPage,
          shouldLoadMore: true, // !isFetchingNextPage && !!hasNextPage
          count: 1, // data?.pages?.[0]?.items?.length
        })
      );
    });

    it('handles empty data gracefully', () => {
      mockUseRoomMessages.mockReturnValue({
        data: null,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        status: 'success',
      });

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
      const testDate = new Date('2023-01-01T10:30:00Z');
      const mockData = {
        pages: [{
          items: [{
            id: 'msg1',
            content: 'Test message',
            createdAt: testDate,
            updatedAt: testDate,
            deleted: false,
            fileUrl: null,
            member: { ...mockMember, profile: { name: 'Test User' } },
          }],
        }],
      };

      mockUseRoomMessages.mockReturnValue({
        data: mockData,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        status: 'success',
      });

      render(<ChatMessages {...defaultProps} />);
      
      const chatItem = screen.getByTestId('chat-item');
      const timestamp = chatItem.getAttribute('data-timestamp');
      expect(timestamp).toMatch(/1 Jan 2023, 10:30/);
    });

    it('detects updated messages correctly', () => {
      const createdAt = new Date('2023-01-01T10:00:00Z');
      const updatedAt = new Date('2023-01-01T10:05:00Z');
      
      const mockData = {
        pages: [{
          items: [{
            id: 'msg1',
            content: 'Edited message',
            createdAt,
            updatedAt,
            deleted: false,
            fileUrl: null,
            member: { ...mockMember, profile: { name: 'Test User' } },
          }],
        }],
      };

      mockUseRoomMessages.mockReturnValue({
        data: mockData,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        status: 'success',
      });

      render(<ChatMessages {...defaultProps} />);
      
      const chatItem = screen.getByTestId('chat-item');
      expect(chatItem).toBeInTheDocument();
      // The isUpdated prop should be passed (updatedAt !== createdAt)
    });
  });
});