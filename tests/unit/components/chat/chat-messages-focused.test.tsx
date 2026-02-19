import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatMessages } from '@/components/chat/chat-messages';

// Mock the hooks
vi.mock('@/hooks/use-room-messages', () => ({
  useRoomMessages: vi.fn()
}));

vi.mock('@/hooks/use-chat-scroll', () => ({
  useChatScroll: vi.fn()
}));

// Mock the child components
vi.mock('@/components/chat/chat-welcome', () => ({
  ChatWelcome: ({ name, type }: { name: string; type: string }) => (
    <div data-testid="chat-welcome">Welcome to {name} ({type})</div>
  )
}));

vi.mock('@/components/chat/chat-item', () => ({
  ChatItem: (props: any) => (
    <div data-testid="chat-item" data-message-id={props.id} data-content={props.content}>
      {props.content}
    </div>
  )
}));

const defaultProps = {
  name: "general",
  member: { userId: "test-user" },
  chatId: "room123",
  apiUrl: "/api/channels",
  socketUrl: "ws://localhost:3000",
  socketQuery: { serverId: "server123" },
  paramKey: "channelId" as const,
  paramValue: "channel123",
  type: "channel" as const,
};

describe('ChatMessages Focused Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    // Mock loading state
    vi.mocked(require('@/hooks/use-room-messages').useRoomMessages).mockReturnValue({
      messages: null,
      isLoading: true,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      isLoadingMore: false,
    });

    render(<ChatMessages {...defaultProps} />);

    expect(screen.getByTestId('loader')).toBeInTheDocument();
    expect(screen.getByText('Loading messages...')).toBeInTheDocument();
  });

  it('renders error state correctly', () => {
    // Mock error state
    vi.mocked(require('@/hooks/use-room-messages').useRoomMessages).mockReturnValue({
      messages: null,
      isLoading: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: new Error('Test error'),
      isLoadingMore: false,
    });

    render(<ChatMessages {...defaultProps} />);

    expect(screen.getByTestId('server-crash')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong!')).toBeInTheDocument();
  });

  it('renders welcome message when no messages', () => {
    // Mock empty state
    vi.mocked(require('@/hooks/use-room-messages').useRoomMessages).mockReturnValue({
      messages: [],
      isLoading: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      isLoadingMore: false,
    });

    render(<ChatMessages {...defaultProps} />);

    expect(screen.getByTestId('chat-welcome')).toBeInTheDocument();
    expect(screen.getByText('Welcome to general (channel)')).toBeInTheDocument();
  });

  it('renders messages correctly', () => {
    // Mock message with proper Matrix event structure
    const mockMessage = {
      getId: () => 'msg1',
      getContent: () => ({ body: 'Hello world' }),
      getSender: () => '@user:example.com',
      getTs: () => Date.now(),
      isRedacted: () => false,
    };

    vi.mocked(require('@/hooks/use-room-messages').useRoomMessages).mockReturnValue({
      messages: [mockMessage],
      isLoading: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      isLoadingMore: false,
    });

    render(<ChatMessages {...defaultProps} />);

    expect(screen.getByTestId('chat-item')).toBeInTheDocument();
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders pagination button when hasMore is true', () => {
    const mockFetchNextPage = vi.fn();
    
    vi.mocked(require('@/hooks/use-room-messages').useRoomMessages).mockReturnValue({
      messages: [],
      isLoading: false,
      hasMore: true,
      loadMore: mockFetchNextPage,
      error: null,
      isLoadingMore: false,
    });

    render(<ChatMessages {...defaultProps} />);

    expect(screen.getByRole('button', { name: /load previous messages/i })).toBeInTheDocument();
  });
});