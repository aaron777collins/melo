/**
 * Message Component
 * 
 * Individual message display with Discord-style formatting and grouping.
 * Handles all message types (text, media, system events) with proper
 * user information, timestamps, and hover interactions.
 * 
 * @example Basic usage
 * ```tsx
 * <Message
 *   event={matrixEvent}
 *   roomId="!room:matrix.org"
 *   isGrouped={false}
 *   currentUserId="@user:matrix.org"
 * />
 * ```
 * 
 * @example Grouped message
 * ```tsx
 * <Message
 *   event={matrixEvent}
 *   roomId="!room:matrix.org"
 *   isGrouped={true}
 *   currentUserId="@user:matrix.org"
 * />
 * ```
 */

"use client";

import React, { useState, useCallback, useMemo } from "react";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { MatrixEvent } from "matrix-js-sdk";
import { User, Bot, Crown, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageActions } from "./message-actions";
import { MessageAttachment } from "./message-attachment";
import { useMxcUrl } from "@/hooks/use-mxc-url";
import { useRoom } from "@/hooks/use-room";

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface MessageProps {
  /** Matrix event representing the message */
  event: MatrixEvent;
  /** Room ID where the message was sent */
  roomId: string;
  /** Whether this message is grouped with the previous message */
  isGrouped?: boolean;
  /** Current user's Matrix ID for permission checking */
  currentUserId?: string;
  /** Whether to show hover actions */
  showActions?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Callback when reply is clicked */
  onReply?: (event: MatrixEvent) => void;
  /** Callback when edit is clicked */
  onEdit?: (event: MatrixEvent) => void;
  /** Callback when reaction is added */
  onReaction?: (emoji: string) => void;
}

export interface UserInfo {
  /** Display name */
  displayName: string;
  /** Avatar URL (mxc format) */
  avatarUrl?: string | null;
  /** User's role/power level */
  powerLevel: number;
  /** Whether user is a bot */
  isBot: boolean;
  /** User ID for fallback display */
  userId: string;
}

export interface ParsedMessageContent {
  /** Raw text content */
  text: string;
  /** Formatted HTML content (if available) */
  html?: string;
  /** Whether content contains markdown */
  hasMarkdown: boolean;
  /** File attachments */
  attachments: Array<{
    mxcUrl: string;
    filename: string;
    mimetype?: string;
    size?: number;
    thumbnailMxcUrl?: string;
  }>;
  /** Message type (text, image, file, etc.) */
  msgtype: string;
}

// =============================================================================
// Constants
// =============================================================================

/** Message grouping time threshold (5 minutes) */
const MESSAGE_GROUPING_THRESHOLD = 5 * 60 * 1000; // 5 minutes in ms

/** Power level role mapping */
const POWER_LEVEL_ROLES = {
  100: { name: 'Admin', icon: Crown, color: 'text-red-500' },
  50: { name: 'Moderator', icon: Shield, color: 'text-blue-500' },
  0: { name: 'Member', icon: User, color: 'text-zinc-500' },
} as const;

/** Bot user patterns */
const BOT_PATTERNS = [
  /bot$/i,
  /^bot/i,
  /_bot_/i,
  /bridge/i,
  /webhook/i,
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Determines if two messages should be grouped together
 */
export function shouldGroupMessages(
  currentEvent: MatrixEvent,
  previousEvent?: MatrixEvent | null
): boolean {
  if (!previousEvent || !currentEvent) return false;
  
  // Must be from same sender
  if (currentEvent.getSender() !== previousEvent.getSender()) return false;
  
  // Must be within time threshold
  const currentTime = currentEvent.getTs();
  const previousTime = previousEvent.getTs();
  const timeDiff = currentTime - previousTime;
  
  if (timeDiff > MESSAGE_GROUPING_THRESHOLD) return false;
  
  // Must be message events (not state changes, etc.)
  const currentType = currentEvent.getType();
  const previousType = previousEvent.getType();
  
  if (currentType !== 'm.room.message' || previousType !== 'm.room.message') {
    return false;
  }
  
  return true;
}

/**
 * Parse message content from Matrix event
 */
function parseMessageContent(event: MatrixEvent): ParsedMessageContent {
  const content = event.getContent();
  const msgtype = content.msgtype || 'm.text';
  
  let text = content.body || '';
  let html = content.formatted_body;
  let hasMarkdown = content.format === 'org.matrix.custom.html' && !!html;
  let attachments: ParsedMessageContent['attachments'] = [];
  
  // Handle file attachments
  if (msgtype === 'm.file' || msgtype === 'm.image' || msgtype === 'm.video' || msgtype === 'm.audio') {
    const url = content.url;
    const info = content.info || {};
    
    if (url) {
      attachments.push({
        mxcUrl: url,
        filename: content.filename || content.body || 'Unknown file',
        mimetype: info.mimetype,
        size: info.size,
        thumbnailMxcUrl: info.thumbnail_url
      });
    }
  }
  
  return {
    text,
    html,
    hasMarkdown,
    attachments,
    msgtype
  };
}

/**
 * Get user information from room member
 */
function getUserInfo(event: MatrixEvent, room: any): UserInfo {
  const userId = event.getSender() || '';
  const member = room?.getMember(userId);
  
  const displayName = member?.name || member?.rawDisplayName || userId.split(':')[0].substring(1);
  const avatarUrl = member?.getAvatarUrl(null, 32, 32, 'scale') || null;
  const powerLevel = room?.getMember(userId)?.powerLevel || 0;
  
  // Check if user is a bot
  const isBot = BOT_PATTERNS.some(pattern => pattern.test(displayName)) ||
    BOT_PATTERNS.some(pattern => pattern.test(userId));
  
  return {
    displayName,
    avatarUrl,
    powerLevel,
    isBot,
    userId
  };
}

/**
 * Format timestamp for display
 */
function formatMessageTimestamp(timestamp: number): {
  relative: string;
  absolute: string;
  fullDate: string;
} {
  const date = new Date(timestamp);
  
  let relative: string;
  if (isToday(date)) {
    relative = format(date, 'HH:mm');
  } else if (isYesterday(date)) {
    relative = `Yesterday at ${format(date, 'HH:mm')}`;
  } else {
    relative = format(date, 'MMM d');
  }
  
  const absolute = format(date, 'MMM d, yyyy \'at\' HH:mm');
  const fullDate = format(date, 'EEEE, MMMM d, yyyy \'at\' h:mm a');
  
  return { relative, absolute, fullDate };
}

/**
 * Get role information from power level
 */
function getRoleInfo(powerLevel: number) {
  // Find the highest role the user qualifies for
  const sortedRoles = Object.entries(POWER_LEVEL_ROLES).sort(([a], [b]) => Number(b) - Number(a));
  
  for (const [level, role] of sortedRoles) {
    if (powerLevel >= Number(level)) {
      return role;
    }
  }
  
  return POWER_LEVEL_ROLES[0]; // Default to member
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * User avatar with fallback
 */
function MessageAvatar({ 
  userInfo, 
  className 
}: { 
  userInfo: UserInfo; 
  className?: string;
}) {
  const avatarHttpUrl = useMxcUrl(userInfo.avatarUrl);
  const fallbackText = userInfo.displayName.substring(0, 2).toUpperCase();
  
  return (
    <Avatar className={cn("h-8 w-8", className)}>
      <AvatarImage 
        src={avatarHttpUrl || undefined} 
        alt={userInfo.displayName}
      />
      <AvatarFallback className="bg-indigo-500 text-white text-xs font-medium">
        {fallbackText}
      </AvatarFallback>
    </Avatar>
  );
}

/**
 * User name with role badge
 */
function MessageUserName({ 
  userInfo,
  timestamp,
  className 
}: { 
  userInfo: UserInfo;
  timestamp: number;
  className?: string;
}) {
  const roleInfo = getRoleInfo(userInfo.powerLevel);
  const RoleIcon = roleInfo.icon;
  const timeInfo = formatMessageTimestamp(timestamp);
  
  return (
    <div className={cn("flex items-center space-x-2 mb-1", className)}>
      {/* Display Name */}
      <span className={cn(
        "font-medium text-sm hover:underline cursor-pointer",
        userInfo.isBot ? "text-purple-500 dark:text-purple-400" : "text-zinc-800 dark:text-zinc-200"
      )}>
        {userInfo.displayName}
      </span>
      
      {/* Bot Badge */}
      {userInfo.isBot && (
        <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 rounded">
          <Bot className="h-3 w-3 inline mr-1" />
          BOT
        </span>
      )}
      
      {/* Role Badge (for non-default roles) */}
      {userInfo.powerLevel > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <span className={cn(
                "px-1.5 py-0.5 text-xs font-medium rounded flex items-center space-x-1",
                "bg-zinc-100 dark:bg-zinc-800",
                roleInfo.color
              )}>
                <RoleIcon className="h-3 w-3" />
                <span>{roleInfo.name}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Power Level: {userInfo.powerLevel}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {/* Timestamp */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300">
              {timeInfo.relative}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {timeInfo.fullDate}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

/**
 * Message content renderer
 */
function MessageContent({ 
  content, 
  className 
}: { 
  content: ParsedMessageContent;
  className?: string;
}) {
  return (
    <div className={cn("message-content", className)}>
      {/* Text Content */}
      {content.text && (
        <div className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
          {content.hasMarkdown && content.html ? (
            <div 
              dangerouslySetInnerHTML={{ __html: content.html }}
              className="prose prose-sm dark:prose-invert max-w-none
                         prose-p:my-1 prose-code:bg-zinc-200 dark:prose-code:bg-zinc-700
                         prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                         prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-800
                         prose-blockquote:border-l-zinc-400 dark:prose-blockquote:border-l-zinc-500"
            />
          ) : (
            <div className="whitespace-pre-wrap break-words">
              {content.text}
            </div>
          )}
        </div>
      )}
      
      {/* Attachments */}
      {content.attachments.map((attachment, index) => (
        <MessageAttachment
          key={`${attachment.mxcUrl}-${index}`}
          mxcUrl={attachment.mxcUrl}
          filename={attachment.filename}
          mimetype={attachment.mimetype}
          size={attachment.size}
          thumbnailMxcUrl={attachment.thumbnailMxcUrl}
          className="mt-2"
        />
      ))}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Message - Individual message display with Discord-style formatting
 * 
 * Features:
 * - Message grouping (consecutive messages from same user)
 * - User avatar with fallback 
 * - Display name with role-based colors and badges
 * - Timestamp (relative/absolute, hover for full details)
 * - Rich text support with Markdown rendering
 * - Media attachments (images, videos, files)
 * - Hover actions (react, reply, edit, delete)
 * - Bot user detection and badges
 * - Power level role indicators
 * 
 * Handles all Matrix message types and provides Discord-like UX.
 */
export function Message({
  event,
  roomId,
  isGrouped = false,
  currentUserId,
  showActions = true,
  className,
  onReply,
  onEdit,
  onReaction
}: MessageProps) {
  const [showHoverActions, setShowHoverActions] = useState(false);
  const { room } = useRoom(roomId);
  
  // =============================================================================
  // Derived Data
  // =============================================================================
  
  const userInfo = useMemo(() => getUserInfo(event, room), [event, room]);
  const messageContent = useMemo(() => parseMessageContent(event), [event]);
  const timestamp = event.getTs();
  const eventId = event.getId();
  
  // Don't render if no event ID (should not happen)
  if (!eventId) {
    return null;
  }
  
  // =============================================================================
  // Event Handlers
  // =============================================================================
  
  const handleMouseEnter = useCallback(() => {
    if (showActions) {
      setShowHoverActions(true);
    }
  }, [showActions]);
  
  const handleMouseLeave = useCallback(() => {
    setShowHoverActions(false);
  }, []);
  
  // =============================================================================
  // Render
  // =============================================================================
  
  if (isGrouped) {
    // Grouped message (no avatar/username, just content)
    return (
      <div
        className={cn(
          "group relative flex space-x-3 px-4 py-0.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors",
          className
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Empty avatar space for alignment */}
        <div className="w-8 flex-shrink-0" />
        
        {/* Message content */}
        <div className="flex-1 min-w-0">
          <MessageContent content={messageContent} />
        </div>
        
        {/* Hover actions */}
        {showActions && (
          <MessageActions
            event={event}
            roomId={roomId}
            show={showHoverActions}
            currentUserId={currentUserId}
            onReply={onReply}
            onEdit={onEdit}
            onReaction={onReaction}
          />
        )}
      </div>
    );
  }
  
  // Full message with avatar and user info
  return (
    <div
      className={cn(
        "group relative flex space-x-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors",
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <MessageAvatar userInfo={userInfo} />
      </div>
      
      {/* Message content */}
      <div className="flex-1 min-w-0">
        <MessageUserName 
          userInfo={userInfo} 
          timestamp={timestamp} 
        />
        <MessageContent content={messageContent} />
      </div>
      
      {/* Hover actions */}
      {showActions && (
        <MessageActions
          event={event}
          roomId={roomId}
          show={showHoverActions}
          currentUserId={currentUserId}
          onReply={onReply}
          onEdit={onEdit}
          onReaction={onReaction}
        />
      )}
    </div>
  );
}

// =============================================================================
// Exports
// =============================================================================

export default Message;
export type { MessageProps, UserInfo, ParsedMessageContent };