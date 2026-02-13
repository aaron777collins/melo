/**
 * ChatInterface Component
 * 
 * Complete Discord-style chat interface that combines all message components
 * into a cohesive experience. Includes header, message list, and input area.
 * 
 * @example Basic usage
 * ```tsx
 * <ChatInterface
 *   roomId="!room:matrix.org"
 *   currentUserId="@user:matrix.org"
 * />
 * ```
 * 
 * @example With customization
 * ```tsx
 * <ChatInterface
 *   roomId="!room:matrix.org"
 *   currentUserId="@user:matrix.org"
 *   showMemberList={true}
 *   onMemberListToggle={() => setShowMembers(!showMembers)}
 *   height="calc(100vh - 64px)"
 * />
 * ```
 */

"use client";

import React, { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { MatrixEvent } from "matrix-js-sdk";
import { cn } from "@/lib/utils";
import { useRoom } from "@/hooks/use-room";
import { ChatHeader } from "./chat-header";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import type { MessageListRef } from "./message-list";
import type { ChannelType } from "@/lib/matrix/types/space";
import type { MxcUrl } from "@/lib/matrix/types/media";

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface ChatInterfaceProps {
  /** Matrix room ID for the chat */
  roomId: string;
  /** Current user's Matrix ID */
  currentUserId?: string;
  /** Height of the entire chat interface */
  height?: number | string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show message actions on hover */
  showActions?: boolean;
  /** Whether the member list sidebar is visible */
  showMemberList?: boolean;
  /** Callback when member list toggle is clicked */
  onMemberListToggle?: () => void;
  /** Whether the search panel is visible */
  showSearch?: boolean;
  /** Callback when search toggle is clicked */
  onSearchToggle?: () => void;
  /** Whether the pins panel is visible */
  showPins?: boolean;
  /** Callback when pins toggle is clicked */
  onPinsToggle?: () => void;
  /** Whether the user can manage this channel/room */
  canManage?: boolean;
  /** Override channel type (for display) */
  channelType?: ChannelType;
  /** Override channel name (for display) */
  channelName?: string;
}

export interface ChatState {
  /** Message being replied to */
  replyingTo: MatrixEvent | null;
  /** Message being edited */
  editingMessage: MatrixEvent | null;
  /** Whether input is disabled */
  inputDisabled: boolean;
  /** Typing indicator users */
  typingUsers: string[];
}

// =============================================================================
// Constants
// =============================================================================

/** Header height for layout calculations */
const HEADER_HEIGHT = 64; // px

/** Input area height for layout calculations */  
const INPUT_HEIGHT = 120; // px (approximate with padding)

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate message list height based on container height
 */
function calculateMessageListHeight(totalHeight: number | string): string {
  if (typeof totalHeight === 'string') {
    if (totalHeight === '100vh') {
      return `calc(100vh - ${HEADER_HEIGHT + INPUT_HEIGHT}px)`;
    }
    return `calc(${totalHeight} - ${HEADER_HEIGHT + INPUT_HEIGHT}px)`;
  }
  
  return `${totalHeight - HEADER_HEIGHT - INPUT_HEIGHT}px`;
}

/**
 * Get channel type from room data
 */
function getChannelTypeFromRoom(room: any): ChannelType {
  if (!room) return 'text';
  
  // Check for LiveKit configuration (voice/video)
  const liveKitConfig = room.currentState?.getStateEvents('io.element.livekit', '');
  if (liveKitConfig) {
    return 'video'; // Default to video for LiveKit rooms
  }
  
  // Check power levels for announcement channels
  const powerLevels = room.currentState?.getStateEvents('m.room.power_levels', '');
  if (powerLevels) {
    const eventsDefault = powerLevels.getContent()?.events_default || 0;
    const usersDefault = powerLevels.getContent()?.users_default || 0;
    
    if (eventsDefault > usersDefault) {
      return 'announcement';
    }
  }
  
  return 'text';
}

/**
 * Check if user can manage the room
 */
function canUserManageRoom(room: any, userId?: string): boolean {
  if (!room || !userId) return false;
  
  const member = room.getMember(userId);
  if (!member) return false;
  
  const powerLevel = member.powerLevel || 0;
  return powerLevel >= 50; // Moderator level or higher
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * ChatInterface - Complete Discord-style chat experience
 * 
 * Features:
 * - Responsive layout with header, messages, and input
 * - Virtual scrolling message list for performance
 * - Discord-style message grouping and interactions
 * - File upload and emoji picker integration
 * - Message actions (reply, edit, delete, reactions)
 * - Typing indicators and real-time updates
 * - Auto-scroll to bottom for new messages
 * - Customizable sidebar toggles
 * - Error handling and loading states
 * 
 * Combines all chat components into a cohesive interface.
 */
export function ChatInterface({
  roomId,
  currentUserId,
  height = '100vh',
  className,
  showActions = true,
  showMemberList = false,
  onMemberListToggle,
  showSearch = false,
  onSearchToggle,
  showPins = false,
  onPinsToggle,
  canManage,
  channelType: overrideChannelType,
  channelName: overrideChannelName
}: ChatInterfaceProps) {
  // =============================================================================
  // Refs and State
  // =============================================================================
  
  const messageListRef = useRef<MessageListRef>(null);
  
  const [chatState, setChatState] = useState<ChatState>({
    replyingTo: null,
    editingMessage: null,
    inputDisabled: false,
    typingUsers: []
  });
  
  // =============================================================================
  // Hooks and Data
  // =============================================================================
  
  const { room, members, isLoading: roomLoading } = useRoom(roomId);
  
  // Derived room information
  const roomInfo = useMemo(() => {
    if (room) {
      return {
        name: overrideChannelName || room.name || 'Unknown Channel',
        type: overrideChannelType || getChannelTypeFromRoom(room),
        canManage: canManage ?? canUserManageRoom(room, currentUserId),
        memberCount: members.filter(m => m.membership === 'join').length
      };
    }
    
    return {
      name: overrideChannelName || 'Loading...',
      type: overrideChannelType || 'text' as ChannelType,
      canManage: canManage ?? false,
      memberCount: 0
    };
  }, [room, members, overrideChannelName, overrideChannelType, canManage, currentUserId]);
  
  // =============================================================================
  // Event Handlers
  // =============================================================================
  
  const handleReply = useCallback((event: MatrixEvent) => {
    setChatState(prev => ({
      ...prev,
      replyingTo: event,
      editingMessage: null // Clear editing when replying
    }));
    
    // Focus the input (ChatInput handles this internally)
  }, []);
  
  const handleEdit = useCallback((event: MatrixEvent) => {
    setChatState(prev => ({
      ...prev,
      editingMessage: event,
      replyingTo: null // Clear replying when editing
    }));
    
    // Focus the input (ChatInput handles this internally)
  }, []);
  
  const handleReaction = useCallback((emoji: string) => {
    console.log('Reaction added:', emoji);
    // Reaction handling is done by MessageActions component
  }, []);
  
  const handleMessageSent = useCallback((content: string) => {
    // Clear reply/edit state after sending
    setChatState(prev => ({
      ...prev,
      replyingTo: null,
      editingMessage: null
    }));
    
    // Auto-scroll to bottom after sending
    setTimeout(() => {
      messageListRef.current?.scrollToBottom();
    }, 100);
  }, []);
  
  const handleFileAttached = useCallback((mxcUrl: MxcUrl, fileName: string) => {
    console.log('File attached:', fileName, mxcUrl);
    
    // Auto-scroll to bottom after file attachment
    setTimeout(() => {
      messageListRef.current?.scrollToBottom();
    }, 100);
  }, []);
  
  const handleCancelReply = useCallback(() => {
    setChatState(prev => ({
      ...prev,
      replyingTo: null
    }));
  }, []);
  
  const handleCancelEdit = useCallback(() => {
    setChatState(prev => ({
      ...prev,
      editingMessage: null
    }));
  }, []);
  
  // =============================================================================
  // Layout Calculations
  // =============================================================================
  
  const messageListHeight = useMemo(() => 
    calculateMessageListHeight(height), 
    [height]
  );
  
  // =============================================================================
  // Render Helpers
  // =============================================================================
  
  const renderReplyPreview = () => {
    if (!chatState.replyingTo) return null;
    
    const replyContent = chatState.replyingTo.getContent();
    const replySender = chatState.replyingTo.getSender();
    const replyText = replyContent.body || '';
    
    return (
      <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-l-4 border-indigo-500">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
              Replying to <span className="font-medium">{replySender}</span>
            </p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 truncate">
              {replyText}
            </p>
          </div>
          <button
            onClick={handleCancelReply}
            className="ml-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            ✕
          </button>
        </div>
      </div>
    );
  };
  
  const renderEditPreview = () => {
    if (!chatState.editingMessage) return null;
    
    const editContent = chatState.editingMessage.getContent();
    const editText = editContent.body || '';
    
    return (
      <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">
              Editing message
            </p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 truncate">
              {editText}
            </p>
          </div>
          <button
            onClick={handleCancelEdit}
            className="ml-2 text-amber-400 hover:text-amber-600 dark:hover:text-amber-300"
          >
            ✕
          </button>
        </div>
      </div>
    );
  };
  
  // =============================================================================
  // Main Render
  // =============================================================================
  
  return (
    <div 
      className={cn(
        "flex flex-col bg-white dark:bg-zinc-900",
        className
      )}
      style={{ height }}
    >
      {/* Chat Header */}
      <ChatHeader
        roomId={roomId}
        name={roomInfo.name}
        type={roomInfo.type}
        canManage={roomInfo.canManage}
        showMemberList={showMemberList}
        onToggleMemberList={onMemberListToggle}
        showSearch={showSearch}
        onToggleSearch={onSearchToggle}
        showPins={showPins}
        onTogglePins={onPinsToggle}
      />
      
      {/* Message List */}
      <MessageList
        ref={messageListRef}
        roomId={roomId}
        currentUserId={currentUserId}
        height={messageListHeight}
        showActions={showActions}
        onReply={handleReply}
        onEdit={handleEdit}
        onReaction={handleReaction}
        autoScrollToBottom={true}
        className="flex-1"
      />
      
      {/* Reply/Edit Preview */}
      {renderReplyPreview()}
      {renderEditPreview()}
      
      {/* Chat Input */}
      <ChatInput
        roomId={roomId}
        name={roomInfo.name}
        type={roomInfo.type === 'text' ? 'channel' : 'conversation'}
        disabled={chatState.inputDisabled || roomLoading}
        onMessageSent={handleMessageSent}
        onFileAttached={handleFileAttached}
        className="border-t border-zinc-200 dark:border-zinc-700"
      />
    </div>
  );
}

// =============================================================================
// Exports
// =============================================================================

export default ChatInterface;