"use client";

import React, { useRef, useEffect, useState, useCallback, ElementRef } from "react";
import { Send, Loader2, X, ArrowDown, MessageSquare } from "lucide-react";
import { format } from "date-fns";

import { MsgType } from "matrix-js-sdk";

import { useRoomMessages, type MatrixEvent } from "@/hooks/use-room-messages";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface CallChatSidebarProps {
  /**
   * Matrix room ID to display/send messages for
   */
  roomId: string;
  
  /**
   * Called when user wants to close the chat
   */
  onClose?: () => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

interface ChatMessageProps {
  event: MatrixEvent;
  isCurrentUser: boolean;
  isFirstInGroup: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const TIME_FORMAT = "HH:mm";
const MESSAGE_GROUP_THRESHOLD = 2 * 60 * 1000; // 2 minutes

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract display name from Matrix user ID
 */
function getDisplayName(userId: string): string {
  // Format: @username:server.com -> username
  const match = userId.match(/^@([^:]+):/);
  return match ? match[1] : userId;
}

/**
 * Get initials from display name for avatar
 */
function getInitials(name: string): string {
  return name.substring(0, 2).toUpperCase();
}

/**
 * Get message body text from Matrix event
 */
function getMessageBody(event: MatrixEvent): string {
  const content = event.getContent();
  return content.body || "";
}

/**
 * Check if event is a text message
 */
function isTextMessage(event: MatrixEvent): boolean {
  const content = event.getContent();
  return content.msgtype === MsgType.Text || content.msgtype === MsgType.Notice;
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Individual chat message in compact format for call sidebar
 */
function ChatMessage({ event, isCurrentUser, isFirstInGroup }: ChatMessageProps) {
  const senderId = event.getSender() || "";
  const displayName = getDisplayName(senderId);
  const timestamp = new Date(event.getTs());
  const body = getMessageBody(event);

  // Handle different message types
  if (!isTextMessage(event)) {
    const content = event.getContent();
    const msgType = content.msgtype;
    
    // Show placeholder for non-text messages
    if (msgType === "m.image") {
      return (
        <div className="px-3 py-1 text-xs text-zinc-500 italic">
          {displayName} sent an image
        </div>
      );
    }
    if (msgType === "m.file") {
      return (
        <div className="px-3 py-1 text-xs text-zinc-500 italic">
          {displayName} sent a file
        </div>
      );
    }
    // Skip other non-text types
    return null;
  }

  return (
    <div 
      className={cn(
        "group px-3 hover:bg-zinc-700/30 transition-colors",
        isFirstInGroup ? "pt-2" : "pt-0.5"
      )}
    >
      {/* Show sender name and time only for first message in group */}
      {isFirstInGroup && (
        <div className="flex items-center gap-2 mb-0.5">
          {/* Mini avatar */}
          <div 
            className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium",
              isCurrentUser 
                ? "bg-indigo-600 text-white" 
                : "bg-zinc-600 text-zinc-200"
            )}
          >
            {getInitials(displayName)}
          </div>
          
          <span 
            className={cn(
              "text-xs font-medium",
              isCurrentUser ? "text-indigo-400" : "text-zinc-300"
            )}
          >
            {isCurrentUser ? "You" : displayName}
          </span>
          
          <span className="text-[10px] text-zinc-500">
            {format(timestamp, TIME_FORMAT)}
          </span>
        </div>
      )}
      
      {/* Message body */}
      <div className={cn("text-sm text-zinc-200 break-words", isFirstInGroup ? "ml-7" : "ml-7")}>
        {body}
      </div>
    </div>
  );
}

/**
 * Empty state when no messages
 */
function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
      <div className="w-12 h-12 rounded-full bg-zinc-700/50 flex items-center justify-center mb-3">
        <MessageSquare className="w-6 h-6 text-zinc-400" />
      </div>
      <h4 className="text-sm font-medium text-zinc-300 mb-1">No messages yet</h4>
      <p className="text-xs text-zinc-500">
        Send a message to start chatting during the call
      </p>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Chat sidebar for voice/video calls
 * Displays messages from the channel and allows sending new messages during calls
 */
export function CallChatSidebar({ roomId, onClose, className }: CallChatSidebarProps) {
  const messagesEndRef = useRef<ElementRef<"div">>(null);
  const messagesContainerRef = useRef<ElementRef<"div">>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const { client, isReady } = useMatrixClient();
  const { messages, isLoading, error } = useRoomMessages(roomId);
  
  const currentUserId = client?.getUserId() || "";

  // ==========================================================================
  // Scroll Management
  // ==========================================================================

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? "smooth" : "auto" 
    });
    setShowScrollToBottom(false);
    setAutoScroll(true);
  }, []);

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const scrolledFromBottom = scrollHeight - scrollTop - clientHeight;

    // Show scroll to bottom when scrolled up more than 100px
    setShowScrollToBottom(scrolledFromBottom > 100);
    // Disable auto-scroll if user has scrolled up
    setAutoScroll(scrolledFromBottom <= 100);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && messages.length > 0) {
      scrollToBottom(false);
    }
  }, [messages.length, autoScroll, scrollToBottom]);

  // ==========================================================================
  // Message Sending
  // ==========================================================================

  const sendMessage = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || !client || !isReady || isSending) return;

    setIsSending(true);
    try {
      await client.sendMessage(roomId, {
        msgtype: MsgType.Text,
        body: text,
      });
      setInputValue("");
      setAutoScroll(true);
      inputRef.current?.focus();
    } catch (err) {
      console.error("[CallChatSidebar] Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  }, [inputValue, client, isReady, isSending, roomId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // ==========================================================================
  // Message Grouping (for compact display)
  // ==========================================================================

  const getIsFirstInGroup = useCallback((index: number): boolean => {
    if (index === 0) return true;
    
    const current = messages[index];
    const previous = messages[index - 1];
    
    // Different sender = new group
    if (current.getSender() !== previous.getSender()) return true;
    
    // More than 2 minutes apart = new group
    if (current.getTs() - previous.getTs() > MESSAGE_GROUP_THRESHOLD) return true;
    
    return false;
  }, [messages]);

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div 
      className={cn(
        "flex flex-col h-full bg-zinc-800 border-l border-zinc-700",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-white">In-Call Chat</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full p-4 text-center">
            <p className="text-sm text-red-400">
              Failed to load messages
            </p>
          </div>
        ) : messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="py-2">
            {messages.map((event, index) => (
              <ChatMessage
                key={event.getId()}
                event={event}
                isCurrentUser={event.getSender() === currentUserId}
                isFirstInGroup={getIsFirstInGroup(index)}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      {showScrollToBottom && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
          <button
            onClick={() => scrollToBottom()}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-full shadow-lg transition-colors"
          >
            <ArrowDown className="w-3 h-3" />
            New messages
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-zinc-700">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            disabled={!isReady || isSending}
            className={cn(
              "flex-1 bg-zinc-700 border-none rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-400",
              "focus:outline-none focus:ring-2 focus:ring-indigo-500/50",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim() || !isReady || isSending}
            className={cn(
              "p-2 rounded-lg transition-colors",
              inputValue.trim() && isReady && !isSending
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
            )}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
