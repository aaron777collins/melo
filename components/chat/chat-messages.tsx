"use client";

import React, { Fragment, useRef, ElementRef, useCallback, useEffect, useState } from "react";
import { Loader2, ServerCrash, ArrowDown } from "lucide-react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";

import { ChatWelcome } from "@/components/chat/chat-welcome";
import { useRoomMessages } from "@/hooks/use-room-messages";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { MatrixEvent } from "matrix-js-sdk";

// =============================================================================
// Types & Interfaces
// =============================================================================

interface ChatMessagesProps {
  /**
   * The Matrix room ID to display messages for
   */
  roomId: string;
  
  /**
   * Room name for the welcome message
   */
  roomName: string;
  
  /**
   * Type of room for welcome message styling
   */
  type: "channel" | "conversation";
  
  /**
   * Current user's Matrix ID
   */
  currentUserId?: string;
}

interface MessageGroupProps {
  /**
   * First message in the group (determines sender and timestamp)
   */
  firstMessage: MatrixEvent;
  
  /**
   * All messages from the same sender within time threshold
   */
  messages: MatrixEvent[];
  
  /**
   * Whether this is the current user's message
   */
  isCurrentUser: boolean;
}

interface DateSeparatorProps {
  date: Date;
}

interface MessageItemProps {
  event: MatrixEvent;
  isFirstInGroup: boolean;
  isCurrentUser: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const DATE_FORMAT = "d MMM yyyy, HH:mm";
const DATE_SEPARATOR_FORMAT = "EEEE, MMMM d, yyyy";
const MESSAGE_GROUP_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds
const NEW_MESSAGE_THRESHOLD = 50; // Show "new messages" indicator after 50 messages

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Groups consecutive messages from the same sender within time threshold
 */
function groupMessages(messages: MatrixEvent[]): MatrixEvent[][] {
  if (messages.length === 0) return [];

  const groups: MatrixEvent[][] = [];
  let currentGroup: MatrixEvent[] = [messages[0]];
  
  for (let i = 1; i < messages.length; i++) {
    const currentMessage = messages[i];
    const previousMessage = messages[i - 1];
    
    const sameUser = currentMessage.getSender() === previousMessage.getSender();
    const timeGap = currentMessage.getTs() - previousMessage.getTs();
    const withinTimeThreshold = timeGap <= MESSAGE_GROUP_THRESHOLD;
    
    if (sameUser && withinTimeThreshold) {
      currentGroup.push(currentMessage);
    } else {
      groups.push([...currentGroup]);
      currentGroup = [currentMessage];
    }
  }
  
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }
  
  return groups;
}

/**
 * Determines if messages need a date separator between them
 */
function needsDateSeparator(prevMessage: MatrixEvent | null, currentMessage: MatrixEvent): boolean {
  if (!prevMessage) return true;
  
  const prevDate = new Date(prevMessage.getTs());
  const currentDate = new Date(currentMessage.getTs());
  
  return !isSameDay(prevDate, currentDate);
}

/**
 * Formats date for the date separator
 */
function formatDateSeparator(date: Date): string {
  if (isToday(date)) {
    return "Today";
  } else if (isYesterday(date)) {
    return "Yesterday";
  } else {
    return format(date, DATE_SEPARATOR_FORMAT);
  }
}

/**
 * Gets display name for a Matrix user
 */
function getDisplayName(event: MatrixEvent): string {
  const sender = event.getSender();
  if (!sender) return "Unknown User";
  
  // Try to get display name from event content or sender
  const displayName = event.getStateKey() || sender;
  
  // Extract username from Matrix ID (@username:domain.com -> username)
  if (displayName.startsWith("@")) {
    const username = displayName.split(":")[0].substring(1);
    return username;
  }
  
  return displayName;
}

/**
 * Gets avatar URL for a Matrix user
 */
function getAvatarUrl(event: MatrixEvent): string | undefined {
  // For now, return undefined - avatar implementation will be added later
  // This is where we'd extract avatar from Matrix event or user profile
  return undefined;
}

/**
 * Gets message content from Matrix event
 */
function getMessageContent(event: MatrixEvent): string {
  const content = event.getContent();
  
  // Handle different message types
  if (content.msgtype === "m.text") {
    return content.body || "";
  } else if (content.msgtype === "m.emote") {
    return `*${content.body}*`;
  } else if (content.msgtype === "m.image") {
    return `📷 Image: ${content.body || "image"}`;
  } else if (content.msgtype === "m.file") {
    return `📄 File: ${content.body || "file"}`;
  } else if (content.msgtype === "m.audio") {
    return `🎵 Audio: ${content.body || "audio"}`;
  } else if (content.msgtype === "m.video") {
    return `🎥 Video: ${content.body || "video"}`;
  }
  
  return content.body || "[Message]";
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Date separator component
 */
function DateSeparator({ date }: DateSeparatorProps) {
  return (
    <div className="flex items-center my-4">
      <div className="flex-1 h-px bg-zinc-300 dark:bg-zinc-700" />
      <div className="px-3 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
        {formatDateSeparator(date)}
      </div>
      <div className="flex-1 h-px bg-zinc-300 dark:bg-zinc-700" />
    </div>
  );
}

/**
 * Individual message item component
 */
function MessageItem({ event, isFirstInGroup, isCurrentUser }: MessageItemProps) {
  const timestamp = new Date(event.getTs());
  const displayName = getDisplayName(event);
  const avatarUrl = getAvatarUrl(event);
  const content = getMessageContent(event);
  
  return (
    <div className={cn(
      "relative group flex items-start gap-x-2 p-2 hover:bg-black/5 dark:hover:bg-white/5",
      isCurrentUser && "bg-indigo-100/10"
    )}>
      {isFirstInGroup ? (
        <div className="cursor-pointer hover:drop-shadow-md transition">
          {avatarUrl ? (
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <img 
                src={avatarUrl} 
                alt={displayName}
                className="h-10 w-10 rounded-full object-cover"
              />
            </div>
          ) : (
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      ) : (
        <div className="h-10 w-10 flex items-center justify-center">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
            {format(timestamp, "HH:mm")}
          </span>
        </div>
      )}
      
      <div className="flex flex-col w-full">
        {isFirstInGroup && (
          <div className="flex items-baseline gap-x-2">
            <p className="font-semibold text-sm hover:underline cursor-pointer text-zinc-900 dark:text-zinc-100">
              {displayName}
            </p>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {format(timestamp, DATE_FORMAT)}
            </span>
          </div>
        )}
        
        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
          {content}
        </p>
      </div>
    </div>
  );
}

/**
 * Message group component - renders a group of consecutive messages from same sender
 */
function MessageGroup({ firstMessage, messages, isCurrentUser }: MessageGroupProps) {
  return (
    <div className="space-y-0.5">
      {messages.map((message, index) => (
        <MessageItem
          key={message.getId()}
          event={message}
          isFirstInGroup={index === 0}
          isCurrentUser={isCurrentUser}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Chat messages container with infinite scroll, date separators, and new message indicators
 */
export function ChatMessages({
  roomId,
  roomName,
  type,
  currentUserId
}: ChatMessagesProps) {
  const chatRef = useRef<ElementRef<"div">>(null);
  const bottomRef = useRef<ElementRef<"div">>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [lastSeenMessageIndex, setLastSeenMessageIndex] = useState(-1);

  // Use the Matrix-based hook instead of old Prisma hooks
  const { 
    messages, 
    isLoading, 
    hasMore, 
    loadMore, 
    error, 
    isLoadingMore 
  } = useRoomMessages(roomId);

  // =============================================================================
  // Scroll Management
  // =============================================================================

  const scrollToBottom = useCallback((smooth = true) => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ 
        behavior: smooth ? "smooth" : "auto" 
      });
      setShowScrollToBottom(false);
      setHasNewMessages(false);
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!chatRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = chatRef.current;
    const scrolledFromBottom = scrollHeight - scrollTop - clientHeight;

    // Show scroll to bottom button when user is scrolled up significantly
    setShowScrollToBottom(scrolledFromBottom > 100);

    // Load more messages when near the top
    if (scrollTop < 100 && hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [hasMore, isLoadingMore, loadMore]);

  // =============================================================================
  // New Message Detection
  // =============================================================================

  useEffect(() => {
    if (messages.length === 0) return;

    // If user is near bottom, auto-scroll to new messages
    if (!showScrollToBottom && chatRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatRef.current;
      const scrolledFromBottom = scrollHeight - scrollTop - clientHeight;
      
      if (scrolledFromBottom < 100) {
        scrollToBottom(false);
      } else if (messages.length > lastSeenMessageIndex + NEW_MESSAGE_THRESHOLD) {
        setHasNewMessages(true);
      }
    }

    setLastSeenMessageIndex(messages.length - 1);
  }, [messages.length, showScrollToBottom, scrollToBottom, lastSeenMessageIndex]);

  // Initial scroll to bottom when messages first load
  useEffect(() => {
    if (!isLoading && messages.length > 0 && lastSeenMessageIndex === -1) {
      setTimeout(() => scrollToBottom(false), 100);
    }
  }, [isLoading, messages.length, scrollToBottom, lastSeenMessageIndex]);

  // =============================================================================
  // Render Loading State
  // =============================================================================

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex flex-col flex-1 justify-center items-center">
        <Loader2 className="h-7 w-7 text-zinc-500 animate-spin my-4" />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Loading messages...
        </p>
      </div>
    );
  }

  // =============================================================================
  // Render Error State
  // =============================================================================

  if (error) {
    return (
      <div className="flex flex-col flex-1 justify-center items-center">
        <ServerCrash className="h-7 w-7 text-zinc-500 my-4" />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Something went wrong!
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
          {error.message}
        </p>
      </div>
    );
  }

  // =============================================================================
  // Prepare Message Data
  // =============================================================================

  const messageGroups = groupMessages(messages);

  // =============================================================================
  // Main Render
  // =============================================================================

  return (
    <div className="flex-1 flex flex-col relative">
      <div
        className="flex-1 flex flex-col py-4 overflow-y-auto"
        ref={chatRef}
        onScroll={handleScroll}
      >
        {/* Load More Button */}
        {hasMore && (
          <div className="flex justify-center mb-4">
            {isLoadingMore ? (
              <Loader2 className="h-6 w-6 text-zinc-500 animate-spin" />
            ) : (
              <Button
                onClick={() => loadMore()}
                variant="ghost"
                size="sm"
                className="text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300"
              >
                Load previous messages
              </Button>
            )}
          </div>
        )}

        {/* Welcome Message */}
        {!hasMore && messages.length === 0 && (
          <ChatWelcome name={roomName} type={type} />
        )}

        {/* Messages */}
        <div className="flex flex-col">
          {messageGroups.map((group, groupIndex) => {
            const firstMessage = group[0];
            const isCurrentUser = currentUserId ? firstMessage.getSender() === currentUserId : false;
            const previousGroup = groupIndex > 0 ? messageGroups[groupIndex - 1] : null;
            const previousMessage = previousGroup ? previousGroup[previousGroup.length - 1] : null;

            return (
              <Fragment key={`group-${groupIndex}`}>
                {/* Date Separator */}
                {needsDateSeparator(previousMessage, firstMessage) && (
                  <DateSeparator date={new Date(firstMessage.getTs())} />
                )}

                {/* Message Group */}
                <MessageGroup
                  firstMessage={firstMessage}
                  messages={group}
                  isCurrentUser={isCurrentUser}
                />
              </Fragment>
            );
          })}
        </div>

        <div ref={bottomRef} />
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollToBottom && (
        <div className="absolute bottom-4 right-4 z-10">
          <Button
            onClick={() => scrollToBottom()}
            size="sm"
            className={cn(
              "rounded-full shadow-lg",
              hasNewMessages && "bg-indigo-600 hover:bg-indigo-700 text-white"
            )}
          >
            <ArrowDown className="h-4 w-4 mr-1" />
            {hasNewMessages ? "New messages" : "Jump to present"}
          </Button>
        </div>
      )}
    </div>
  );
}