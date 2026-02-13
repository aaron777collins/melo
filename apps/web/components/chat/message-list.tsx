/**
 * MessageList Component
 * 
 * Virtual scrolling message list with Discord-style message grouping and interactions.
 * Performance-optimized for large message histories with smooth scrolling and 
 * load-on-demand pagination.
 * 
 * @example Basic usage
 * ```tsx
 * <MessageList
 *   roomId="!room:matrix.org"
 *   currentUserId="@user:matrix.org"
 * />
 * ```
 * 
 * @example With event handlers
 * ```tsx
 * <MessageList
 *   roomId="!room:matrix.org"
 *   currentUserId="@user:matrix.org"
 *   onReply={(event) => setReplyingTo(event)}
 *   onEdit={(event) => setEditingMessage(event)}
 *   onReaction={(emoji) => console.log('Reaction:', emoji)}
 * />
 * ```
 */

"use client";

import React, { 
  useRef, 
  useCallback, 
  useMemo, 
  useEffect, 
  useState,
  forwardRef,
  useImperativeHandle
} from "react";
import { FixedSizeList as List, ListChildComponentProps } from "react-window";
import { MatrixEvent } from "matrix-js-sdk";
import { Loader2, AlertCircle, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRoomMessages } from "@/hooks/use-room-messages";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import { Message, shouldGroupMessages } from "./message";
import type { MessageProps } from "./message";

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface MessageListProps {
  /** Matrix room ID to display messages for */
  roomId: string;
  /** Current user's Matrix ID for permission checking */
  currentUserId?: string;
  /** Height of the message list container */
  height?: number | string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show message actions on hover */
  showActions?: boolean;
  /** Callback when reply is clicked */
  onReply?: (event: MatrixEvent) => void;
  /** Callback when edit is clicked */
  onEdit?: (event: MatrixEvent) => void;
  /** Callback when reaction is added */
  onReaction?: (emoji: string) => void;
  /** Whether to auto-scroll to bottom on new messages */
  autoScrollToBottom?: boolean;
  /** Custom loading component */
  loadingComponent?: React.ComponentType;
  /** Custom empty state component */
  emptyComponent?: React.ComponentType;
  /** Custom error component */
  errorComponent?: React.ComponentType<{ error: Error; onRetry: () => void }>;
}

export interface MessageListRef {
  /** Scroll to bottom of the list */
  scrollToBottom: () => void;
  /** Scroll to a specific message by event ID */
  scrollToMessage: (eventId: string) => void;
  /** Get current scroll position info */
  getScrollInfo: () => {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
    isAtBottom: boolean;
  };
}

interface MessageWithMetadata extends MatrixEvent {
  /** Whether this message is grouped with the previous one */
  _isGrouped: boolean;
  /** Calculated height for virtual scrolling */
  _estimatedHeight: number;
  /** Index in the message list */
  _index: number;
}

// =============================================================================
// Constants
// =============================================================================

/** Estimated heights for different message types (for virtual scrolling) */
const MESSAGE_HEIGHTS = {
  FULL: 72, // Message with avatar and header
  GROUPED: 28, // Grouped message (content only)
  WITH_ATTACHMENT: 120, // Message with media attachment
  WITH_LONG_TEXT: 100, // Message with multiple lines
} as const;

/** Virtual scrolling configuration */
const VIRTUAL_CONFIG = {
  OVERSCAN_COUNT: 5, // Extra items to render outside viewport
  ITEM_SIZE: MESSAGE_HEIGHTS.FULL, // Default item size
  THRESHOLD_DISTANCE: 100, // Distance from bottom to trigger auto-scroll
} as const;

/** Scroll behavior constants */
const SCROLL_BEHAVIOR = {
  SMOOTH: 'smooth' as ScrollBehavior,
  AUTO: 'auto' as ScrollBehavior,
  NEW_MESSAGE_THRESHOLD: 100, // px from bottom to auto-scroll
} as const;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Estimate message height for virtual scrolling
 */
function estimateMessageHeight(event: MatrixEvent, isGrouped: boolean): number {
  const content = event.getContent();
  const msgtype = content.msgtype || 'm.text';
  const body = content.body || '';
  
  // Base height
  let height = isGrouped ? MESSAGE_HEIGHTS.GROUPED : MESSAGE_HEIGHTS.FULL;
  
  // Add height for attachments
  if (msgtype !== 'm.text' && msgtype !== 'm.emote' && msgtype !== 'm.notice') {
    height += 100; // Space for media attachments
  }
  
  // Add height for long text content
  const lineCount = Math.ceil(body.length / 60); // Rough estimate
  if (lineCount > 2) {
    height += (lineCount - 2) * 20; // ~20px per additional line
  }
  
  return height;
}

/**
 * Process messages for virtual scrolling with grouping metadata
 */
function processMessagesForVirtualization(messages: MatrixEvent[]): MessageWithMetadata[] {
  return messages.map((event, index) => {
    const previousEvent = index > 0 ? messages[index - 1] : null;
    const isGrouped = shouldGroupMessages(event, previousEvent);
    const estimatedHeight = estimateMessageHeight(event, isGrouped);
    
    const processedEvent = event as MessageWithMetadata;
    processedEvent._isGrouped = isGrouped;
    processedEvent._estimatedHeight = estimatedHeight;
    processedEvent._index = index;
    
    return processedEvent;
  });
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Virtual list item renderer
 */
interface MessageListItemProps extends ListChildComponentProps {
  data: {
    messages: MessageWithMetadata[];
    roomId: string;
    currentUserId?: string;
    showActions: boolean;
    onReply?: (event: MatrixEvent) => void;
    onEdit?: (event: MatrixEvent) => void;
    onReaction?: (emoji: string) => void;
  };
}

const MessageListItem = React.memo(function MessageListItem({ 
  index, 
  style, 
  data 
}: MessageListItemProps) {
  const { messages, roomId, currentUserId, showActions, onReply, onEdit, onReaction } = data;
  const message = messages[index];
  
  if (!message) {
    return (
      <div style={style} className="flex items-center justify-center p-4">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Message not found</span>
      </div>
    );
  }
  
  return (
    <div style={style}>
      <Message
        event={message}
        roomId={roomId}
        isGrouped={message._isGrouped}
        currentUserId={currentUserId}
        showActions={showActions}
        onReply={onReply}
        onEdit={onEdit}
        onReaction={onReaction}
      />
    </div>
  );
});

/**
 * Loading spinner component
 */
function DefaultLoadingComponent() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-zinc-500 dark:text-zinc-400" />
      <span className="ml-2 text-sm text-zinc-500 dark:text-zinc-400">Loading messages...</span>
    </div>
  );
}

/**
 * Empty state component
 */
function DefaultEmptyComponent() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-6xl mb-4">💬</div>
      <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 mb-2">
        No messages yet
      </h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Be the first to start the conversation!
      </p>
    </div>
  );
}

/**
 * Error state component
 */
function DefaultErrorComponent({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
      <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 mb-2">
        Failed to load messages
      </h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
        {error.message}
      </p>
      <Button onClick={onRetry} variant="outline" size="sm">
        Try Again
      </Button>
    </div>
  );
}

/**
 * Load more messages button
 */
function LoadMoreButton({ 
  hasMore, 
  isLoadingMore, 
  onLoadMore 
}: {
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}) {
  if (!hasMore) return null;
  
  return (
    <div className="flex justify-center py-4">
      <Button
        onClick={onLoadMore}
        disabled={isLoadingMore}
        variant="ghost"
        size="sm"
        className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
      >
        {isLoadingMore ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Loading older messages...
          </>
        ) : (
          'Load older messages'
        )}
      </Button>
    </div>
  );
}

/**
 * Jump to bottom button
 */
function JumpToBottomButton({ 
  visible, 
  onClick 
}: {
  visible: boolean;
  onClick: () => void;
}) {
  if (!visible) return null;
  
  return (
    <div className="absolute bottom-4 right-4 z-10">
      <Button
        onClick={onClick}
        size="sm"
        className="rounded-full h-10 w-10 p-0 bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg"
      >
        <ArrowDown className="h-4 w-4" />
      </Button>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * MessageList - Virtual scrolling message list with Discord-style grouping
 * 
 * Features:
 * - Virtual scrolling for performance with large message histories
 * - Message grouping (consecutive messages from same user)
 * - Smooth scrolling with load-on-demand pagination
 * - Auto-scroll to bottom for new messages
 * - Jump to bottom button when scrolled up
 * - Loading states and error handling
 * - Customizable components and callbacks
 * 
 * Uses react-window for efficient rendering of large lists.
 */
export const MessageList = forwardRef<MessageListRef, MessageListProps>(function MessageList({
  roomId,
  currentUserId,
  height = '100%',
  className,
  showActions = true,
  onReply,
  onEdit,
  onReaction,
  autoScrollToBottom = true,
  loadingComponent: LoadingComponent = DefaultLoadingComponent,
  emptyComponent: EmptyComponent = DefaultEmptyComponent,
  errorComponent: ErrorComponent = DefaultErrorComponent
}, ref) {
  // =============================================================================
  // Hooks and State
  // =============================================================================
  
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  
  const { 
    messages, 
    isLoading, 
    hasMore, 
    loadMore, 
    error, 
    isLoadingMore 
  } = useRoomMessages(roomId, {
    initialBatchSize: 50,
    paginationBatchSize: 25,
    autoScrollToBottom: false // We handle this manually
  });
  
  // Process messages for virtual scrolling
  const processedMessages = useMemo(() => 
    processMessagesForVirtualization(messages), 
    [messages]
  );
  
  // =============================================================================
  // Scroll Management
  // =============================================================================
  
  const scrollToBottom = useCallback((behavior: ScrollBehavior = SCROLL_BEHAVIOR.SMOOTH) => {
    if (listRef.current && processedMessages.length > 0) {
      listRef.current.scrollToItem(processedMessages.length - 1, 'end');
    }
  }, [processedMessages.length]);
  
  const scrollToMessage = useCallback((eventId: string) => {
    const messageIndex = processedMessages.findIndex(msg => msg.getId() === eventId);
    if (messageIndex !== -1 && listRef.current) {
      listRef.current.scrollToItem(messageIndex, 'center');
    }
  }, [processedMessages]);
  
  const getScrollInfo = useCallback(() => {
    if (!containerRef.current) {
      return {
        scrollTop: 0,
        scrollHeight: 0,
        clientHeight: 0,
        isAtBottom: false
      };
    }
    
    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - VIRTUAL_CONFIG.THRESHOLD_DISTANCE;
    
    return { scrollTop, scrollHeight, clientHeight, isAtBottom };
  }, []);
  
  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    scrollToBottom,
    scrollToMessage,
    getScrollInfo
  }), [scrollToBottom, scrollToMessage, getScrollInfo]);
  
  // =============================================================================
  // Event Handlers
  // =============================================================================
  
  const handleScroll = useCallback(() => {
    const scrollInfo = getScrollInfo();
    setShowJumpToBottom(!scrollInfo.isAtBottom);
    setIsUserScrolling(!scrollInfo.isAtBottom);
  }, [getScrollInfo]);
  
  const handleJumpToBottom = useCallback(() => {
    scrollToBottom(SCROLL_BEHAVIOR.SMOOTH);
    setIsUserScrolling(false);
  }, [scrollToBottom]);
  
  const handleLoadMore = useCallback(async () => {
    if (hasMore && !isLoadingMore) {
      await loadMore();
    }
  }, [hasMore, isLoadingMore, loadMore]);
  
  const handleRetry = useCallback(() => {
    window.location.reload(); // Simple retry - reload the page
  }, []);
  
  // =============================================================================
  // Effects
  // =============================================================================
  
  // Auto-scroll to bottom for new messages
  useEffect(() => {
    if (autoScrollToBottom && !isUserScrolling && processedMessages.length > 0) {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        scrollToBottom(SCROLL_BEHAVIOR.AUTO);
      }, 100);
    }
  }, [processedMessages.length, autoScrollToBottom, isUserScrolling, scrollToBottom]);
  
  // =============================================================================
  // Virtual List Configuration
  // =============================================================================
  
  const itemData = useMemo(() => ({
    messages: processedMessages,
    roomId,
    currentUserId,
    showActions,
    onReply,
    onEdit,
    onReaction
  }), [processedMessages, roomId, currentUserId, showActions, onReply, onEdit, onReaction]);
  
  // Dynamic item size function
  const getItemSize = useCallback((index: number) => {
    const message = processedMessages[index];
    return message?._estimatedHeight || VIRTUAL_CONFIG.ITEM_SIZE;
  }, [processedMessages]);
  
  // =============================================================================
  // Render States
  // =============================================================================
  
  if (error) {
    return (
      <div className={cn("flex-1 flex items-center justify-center", className)}>
        <ErrorComponent error={error} onRetry={handleRetry} />
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className={cn("flex-1 flex items-center justify-center", className)}>
        <LoadingComponent />
      </div>
    );
  }
  
  if (processedMessages.length === 0) {
    return (
      <div className={cn("flex-1 flex items-center justify-center", className)}>
        <EmptyComponent />
      </div>
    );
  }
  
  // =============================================================================
  // Main Render
  // =============================================================================
  
  return (
    <div 
      ref={containerRef}
      className={cn(
        "flex-1 relative overflow-hidden bg-white dark:bg-zinc-900",
        className
      )}
      style={{ height }}
    >
      {/* Load more button at top */}
      <LoadMoreButton
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={handleLoadMore}
      />
      
      {/* Virtual message list */}
      <List
        ref={listRef}
        height={typeof height === 'string' ? '100%' : height}
        itemCount={processedMessages.length}
        itemSize={VIRTUAL_CONFIG.ITEM_SIZE}
        itemData={itemData}
        overscanCount={VIRTUAL_CONFIG.OVERSCAN_COUNT}
        onScroll={handleScroll}
        className="scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-600"
      >
        {MessageListItem}
      </List>
      
      {/* Jump to bottom button */}
      <JumpToBottomButton
        visible={showJumpToBottom}
        onClick={handleJumpToBottom}
      />
    </div>
  );
});

// =============================================================================
// Exports
// =============================================================================

export default MessageList;
export type { MessageListProps, MessageListRef };