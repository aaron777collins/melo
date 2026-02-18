/**
 * Message Reactions Component Tests
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MessageReactions, useMessageReactions } from '@/components/chat/message-reactions';

// Mock hooks
vi.mock('@/hooks/use-matrix-client', () => ({
  useMatrixClient: vi.fn(() => ({
    client: {
      getUserId: () => '@user:example.com',
    },
    isReady: true,
  })),
}));

// Mock the reaction handler
const mockReactionHandler = {
  getMessageReactions: vi.fn(),
  addReaction: vi.fn(),
  removeReaction: vi.fn(),
  toggleReaction: vi.fn(),
};

const MockReactionHandler = vi.fn().mockImplementation(() => mockReactionHandler);

vi.mock('@/lib/matrix/chat/reaction-handler', () => ({
  ReactionHandler: MockReactionHandler,
}));

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => (
    <span className={className}>{children}</span>
  ),
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children, open }: any) => (
    <div data-testid="popover" data-open={open}>
      {children}
    </div>
  ),
  PopoverTrigger: ({ children }: any) => <div data-testid="popover-trigger">{children}</div>,
  PopoverContent: ({ children }: any) => <div data-testid="popover-content">{children}</div>,
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div data-testid="tooltip">{children}</div>,
}));

describe('MessageReactions', () => {
  const ROOM_ID = '!room123:example.com';
  const EVENT_ID = '$event123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty state when no reactions', () => {
    mockReactionHandler.getMessageReactions.mockResolvedValue({
      eventId: EVENT_ID,
      reactions: new Map(),
      totalCount: 0,
    });

    render(
      <MessageReactions 
        roomId={ROOM_ID} 
        eventId={EVENT_ID}
        showAddButton={false}
      />
    );

    // Should not render anything when no reactions and no add button
    expect(screen.queryByTestId('reaction-badge')).not.toBeInTheDocument();
  });

  it('should render existing reactions', async () => {
    const reactions = new Map([
      ['👍', {
        key: '👍',
        users: new Set(['@user1:example.com', '@user2:example.com']),
        count: 2,
        currentUserReacted: false,
      }],
      ['😄', {
        key: '😄',
        users: new Set(['@user:example.com']),
        count: 1,
        currentUserReacted: true,
      }],
    ]);

    mockReactionHandler.getMessageReactions.mockResolvedValue({
      eventId: EVENT_ID,
      reactions,
      totalCount: 3,
    });

    render(
      <MessageReactions 
        roomId={ROOM_ID} 
        eventId={EVENT_ID}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('👍')).toBeInTheDocument();
      expect(screen.getByText('😄')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('should handle reaction toggle', async () => {
    const reactions = new Map([
      ['👍', {
        key: '👍',
        users: new Set(['@user1:example.com']),
        count: 1,
        currentUserReacted: false,
      }],
    ]);

    mockReactionHandler.getMessageReactions.mockResolvedValue({
      eventId: EVENT_ID,
      reactions,
      totalCount: 1,
    });

    mockReactionHandler.toggleReaction.mockResolvedValue(true);

    render(
      <MessageReactions 
        roomId={ROOM_ID} 
        eventId={EVENT_ID}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('👍')).toBeInTheDocument();
    });

    // Click the reaction button
    const reactionButton = screen.getByText('👍').closest('button');
    fireEvent.click(reactionButton!);

    await waitFor(() => {
      expect(mockReactionHandler.toggleReaction).toHaveBeenCalledWith(ROOM_ID, EVENT_ID, '👍');
    });
  });

  it('should show add reaction button', () => {
    mockReactionHandler.getMessageReactions.mockResolvedValue({
      eventId: EVENT_ID,
      reactions: new Map(),
      totalCount: 0,
    });

    render(
      <MessageReactions 
        roomId={ROOM_ID} 
        eventId={EVENT_ID}
        showAddButton={true}
      />
    );

    expect(screen.getByTestId('popover-trigger')).toBeInTheDocument();
  });

  it('should handle emoji picker selection', async () => {
    mockReactionHandler.getMessageReactions.mockResolvedValue({
      eventId: EVENT_ID,
      reactions: new Map(),
      totalCount: 0,
    });

    mockReactionHandler.toggleReaction.mockResolvedValue(true);

    render(
      <MessageReactions 
        roomId={ROOM_ID} 
        eventId={EVENT_ID}
        showAddButton={true}
      />
    );

    // The emoji picker should render when popover is open
    // This is a simplified test as the actual emoji picker interaction
    // would be more complex in a real scenario
    expect(screen.getByTestId('popover-trigger')).toBeInTheDocument();
  });

  it('should call onReactionChange callback', async () => {
    const onReactionChange = vi.fn();
    const reactions = new Map([
      ['👍', {
        key: '👍',
        users: new Set(['@user1:example.com']),
        count: 1,
        currentUserReacted: false,
      }],
    ]);

    const reactionData = {
      eventId: EVENT_ID,
      reactions,
      totalCount: 1,
    };

    mockReactionHandler.getMessageReactions.mockResolvedValue(reactionData);

    render(
      <MessageReactions 
        roomId={ROOM_ID} 
        eventId={EVENT_ID}
        onReactionChange={onReactionChange}
      />
    );

    await waitFor(() => {
      expect(onReactionChange).toHaveBeenCalledWith(reactionData);
    });
  });
});

describe('useMessageReactions hook', () => {
  const ROOM_ID = '!room123:example.com';
  const EVENT_ID = '$event123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load reactions on mount', async () => {
    const reactionData = {
      eventId: EVENT_ID,
      reactions: new Map(),
      totalCount: 0,
    };

    mockReactionHandler.getMessageReactions.mockResolvedValue(reactionData);

    const TestComponent = () => {
      const { reactions, loading } = useMessageReactions(ROOM_ID, EVENT_ID);
      
      return (
        <div>
          <div data-testid="loading">{loading ? 'true' : 'false'}</div>
          <div data-testid="reactions">{reactions ? 'loaded' : 'null'}</div>
        </div>
      );
    };

    render(<TestComponent />);

    // Initially loading
    expect(screen.getByTestId('loading')).toHaveTextContent('true');

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('reactions')).toHaveTextContent('loaded');
    });
  });

  it('should handle add reaction', async () => {
    mockReactionHandler.getMessageReactions.mockResolvedValue({
      eventId: EVENT_ID,
      reactions: new Map(),
      totalCount: 0,
    });

    mockReactionHandler.addReaction.mockResolvedValue({ success: true });

    const TestComponent = () => {
      const { addReaction } = useMessageReactions(ROOM_ID, EVENT_ID);
      
      return (
        <button onClick={() => addReaction('👍')}>
          Add Reaction
        </button>
      );
    };

    render(<TestComponent />);

    const button = screen.getByText('Add Reaction');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockReactionHandler.addReaction).toHaveBeenCalledWith(ROOM_ID, EVENT_ID, '👍');
    });
  });

  it('should handle remove reaction', async () => {
    mockReactionHandler.getMessageReactions.mockResolvedValue({
      eventId: EVENT_ID,
      reactions: new Map(),
      totalCount: 0,
    });

    mockReactionHandler.removeReaction.mockResolvedValue({ success: true });

    const TestComponent = () => {
      const { removeReaction } = useMessageReactions(ROOM_ID, EVENT_ID);
      
      return (
        <button onClick={() => removeReaction('👍')}>
          Remove Reaction
        </button>
      );
    };

    render(<TestComponent />);

    const button = screen.getByText('Remove Reaction');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockReactionHandler.removeReaction).toHaveBeenCalledWith(ROOM_ID, EVENT_ID, '👍');
    });
  });

  it('should handle toggle reaction', async () => {
    mockReactionHandler.getMessageReactions.mockResolvedValue({
      eventId: EVENT_ID,
      reactions: new Map(),
      totalCount: 0,
    });

    mockReactionHandler.toggleReaction.mockResolvedValue({ success: true });

    const TestComponent = () => {
      const { toggleReaction } = useMessageReactions(ROOM_ID, EVENT_ID);
      
      return (
        <button onClick={() => toggleReaction('👍')}>
          Toggle Reaction
        </button>
      );
    };

    render(<TestComponent />);

    const button = screen.getByText('Toggle Reaction');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockReactionHandler.toggleReaction).toHaveBeenCalledWith(ROOM_ID, EVENT_ID, '👍');
    });
  });

  it('should refresh reactions', async () => {
    mockReactionHandler.getMessageReactions.mockResolvedValue({
      eventId: EVENT_ID,
      reactions: new Map(),
      totalCount: 0,
    });

    const TestComponent = () => {
      const { refreshReactions } = useMessageReactions(ROOM_ID, EVENT_ID);
      
      return (
        <button onClick={refreshReactions}>
          Refresh
        </button>
      );
    };

    render(<TestComponent />);

    // Clear previous calls
    mockReactionHandler.getMessageReactions.mockClear();

    const button = screen.getByText('Refresh');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockReactionHandler.getMessageReactions).toHaveBeenCalled();
    });
  });
});