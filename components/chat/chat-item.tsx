"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { Edit, FileIcon, ImageIcon, VideoIcon, MusicIcon, Download, Plus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { MatrixEvent } from "matrix-js-sdk";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
// TODO: Migrate from apps/web-enhanced-components
// import MessageActions from "../../apps/web/components/chat/message-actions";
import { useModal } from "@/hooks/use-modal-store";

// =============================================================================
// Types & Interfaces
// =============================================================================

interface ChatItemProps {
  /**
   * Matrix event containing the message data
   */
  event: MatrixEvent;
  
  /**
   * Whether this is the first message in a group (shows avatar and username)
   */
  isFirstInGroup: boolean;
  
  /**
   * Whether this message is from the current user
   */
  isCurrentUser: boolean;
  
  /**
   * Current user's Matrix ID for permission checks
   */
  currentUserId?: string;
  
  /**
   * Room ID for Matrix operations
   */
  roomId: string;
  
  /**
   * Callback when reply is clicked
   */
  onReply?: (event: MatrixEvent) => void;
  
  /**
   * Callback when edit is clicked 
   */
  onEdit?: (event: MatrixEvent) => void;
}

interface MessageAttachment {
  type: 'image' | 'video' | 'audio' | 'file';
  url?: string;
  filename: string;
  size?: number;
  mimetype?: string;
  thumbnailUrl?: string;
}

interface MessageReaction {
  emoji: string;
  count: number;
  userReacted: boolean;
  users: string[];
}

// =============================================================================
// Constants
// =============================================================================

const DATE_FORMAT = "d MMM yyyy, HH:MM";
const TIME_FORMAT = "HH:mm";

// =============================================================================
// Helper Functions
// =============================================================================

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
 * Gets avatar URL for a Matrix user (placeholder for now)
 */
function getAvatarUrl(event: MatrixEvent): string | undefined {
  // TODO: Implement proper avatar URL extraction from Matrix user profile
  // For now, return undefined to use fallback initials
  return undefined;
}

/**
 * Gets message content from Matrix event with proper type handling
 */
function getMessageContent(event: MatrixEvent): { text: string; isMarkdown: boolean } {
  const content = event.getContent();
  
  // Handle different message types
  if (content.msgtype === "m.text") {
    // Check if the message has formatted content (HTML/markdown)
    const hasFormatted = content.format === "org.matrix.custom.html" && content.formatted_body;
    return {
      text: content.body || "",
      isMarkdown: !hasFormatted // Use markdown if no HTML formatting
    };
  } else if (content.msgtype === "m.emote") {
    return {
      text: `*${content.body}*`,
      isMarkdown: true
    };
  }
  
  return {
    text: content.body || "[Message]",
    isMarkdown: false
  };
}

/**
 * Extracts attachment information from Matrix event
 */
function getAttachment(event: MatrixEvent): MessageAttachment | null {
  const content = event.getContent();
  
  if (!content.msgtype || content.msgtype === "m.text" || content.msgtype === "m.emote") {
    return null;
  }
  
  const info = content.info || {};
  let type: MessageAttachment['type'] = 'file';
  
  if (content.msgtype === "m.image") type = 'image';
  else if (content.msgtype === "m.video") type = 'video';
  else if (content.msgtype === "m.audio") type = 'audio';
  
  return {
    type,
    url: content.url, // mxc:// URL
    filename: content.body || "attachment",
    size: info.size,
    mimetype: info.mimetype,
    thumbnailUrl: info.thumbnail_url
  };
}

/**
 * Checks if a message was edited
 */
function isMessageEdited(event: MatrixEvent): boolean {
  // Check if the event has edit relations
  const relations = event.getRelation();
  return relations?.rel_type === "m.replace" || false;
}

/**
 * Gets reactions for a message (placeholder for now)
 */
function getMessageReactions(event: MatrixEvent): MessageReaction[] {
  // TODO: Implement proper reaction extraction from Matrix event
  // This would involve checking for m.annotation relations
  return [];
}

/**
 * Formats file size for display
 */
function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
}

/**
 * Converts Matrix mxc:// URL to HTTP URL
 */
function mxcToHttp(mxcUrl?: string, homeserver?: string): string | undefined {
  if (!mxcUrl || !mxcUrl.startsWith("mxc://")) return undefined;
  
  // Extract server and media ID from mxc://server.com/mediaId
  const parts = mxcUrl.replace("mxc://", "").split("/");
  if (parts.length !== 2) return undefined;
  
  const [serverName, mediaId] = parts;
  
  // TODO: Get homeserver from Matrix client context
  const baseUrl = homeserver || "https://matrix.org";
  return `${baseUrl}/_matrix/media/r0/download/${serverName}/${mediaId}`;
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Attachment display component
 */
function AttachmentDisplay({ attachment }: { attachment: MessageAttachment }) {
  const httpUrl = mxcToHttp(attachment.url);
  
  if (attachment.type === 'image' && httpUrl) {
    return (
      <div className="mt-2 max-w-md">
        <div className="relative group cursor-pointer rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          <img
            src={httpUrl}
            alt={attachment.filename}
            className="w-full h-auto max-h-96 object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          {attachment.filename}
          {attachment.size && ` • ${formatFileSize(attachment.size)}`}
        </p>
      </div>
    );
  }
  
  if (attachment.type === 'video' && httpUrl) {
    return (
      <div className="mt-2 max-w-md">
        <div className="relative rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          <video
            src={httpUrl}
            controls
            className="w-full h-auto max-h-96"
            preload="metadata"
          />
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          {attachment.filename}
          {attachment.size && ` • ${formatFileSize(attachment.size)}`}
        </p>
      </div>
    );
  }
  
  if (attachment.type === 'audio' && httpUrl) {
    return (
      <div className="mt-2 max-w-md">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <MusicIcon className="h-8 w-8 text-zinc-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
              {attachment.filename}
            </p>
            {attachment.size && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {formatFileSize(attachment.size)}
              </p>
            )}
          </div>
          <audio src={httpUrl} controls className="w-48" />
        </div>
      </div>
    );
  }
  
  // Generic file attachment
  return (
    <div className="mt-2 max-w-md">
      <div className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
        <FileIcon className="h-8 w-8 text-zinc-500" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
            {attachment.filename}
          </p>
          {attachment.size && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {formatFileSize(attachment.size)}
            </p>
          )}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

/**
 * Reaction buttons component
 */
function ReactionButtons({ 
  reactions, 
  onAddReaction, 
  onToggleReaction 
}: { 
  reactions: MessageReaction[];
  onAddReaction: () => void;
  onToggleReaction: (emoji: string) => void;
}) {
  if (reactions.length === 0) {
    return (
      <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700"
                onClick={onAddReaction}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Reaction
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add a reaction</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 mt-1 flex-wrap">
      {reactions.map((reaction) => (
        <TooltipProvider key={reaction.emoji}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-6 px-2 text-xs rounded-full border",
                  reaction.userReacted
                    ? "bg-indigo-100 dark:bg-indigo-900 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300"
                    : "border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                )}
                onClick={() => onToggleReaction(reaction.emoji)}
              >
                <span className="mr-1">{reaction.emoji}</span>
                <span>{reaction.count}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {reaction.users.length > 0 && reaction.users.join(", ")} reacted with {reaction.emoji}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-200 dark:hover:bg-zinc-700"
              onClick={onAddReaction}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add a reaction</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Individual chat message item with Discord-style design
 */
export function ChatItem({
  event,
  isFirstInGroup,
  isCurrentUser,
  currentUserId,
  roomId,
  onReply,
  onEdit
}: ChatItemProps) {
  const { onOpen } = useModal();
  const [showReactions, setShowReactions] = useState(false);
  const [showActions, setShowActions] = useState(false);
  
  const timestamp = new Date(event.getTs());
  const displayName = getDisplayName(event);
  const avatarUrl = getAvatarUrl(event);
  const { text: content, isMarkdown } = getMessageContent(event);
  const attachment = getAttachment(event);
  const isEdited = isMessageEdited(event);
  const reactions = getMessageReactions(event);
  
  // Handle reaction actions (placeholders for now)
  const handleAddReaction = () => {
    // TODO: Implement reaction picker modal
    console.log("Add reaction to message:", event.getId());
  };
  
  const handleToggleReaction = (emoji: string) => {
    // TODO: Implement reaction toggle via Matrix SDK
    console.log("Toggle reaction:", emoji, "on message:", event.getId());
  };
  
  return (
    <div 
      className={cn(
        "relative group flex items-start gap-x-2 p-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors",
        isCurrentUser && "bg-indigo-100/10 dark:bg-indigo-900/10"
      )}
      onMouseEnter={() => {
        setShowReactions(true);
        setShowActions(true);
      }}
      onMouseLeave={() => {
        setShowReactions(false);
        setShowActions(false);
      }}
    >
      {/* Avatar Column */}
      <div className="flex-shrink-0">
        {isFirstInGroup ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className="cursor-pointer hover:drop-shadow-md transition"
                  onClick={() => onOpen("userProfile", { 
                    userId: event.getSender()!, 
                    spaceId: roomId 
                  })}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={avatarUrl} alt={displayName} />
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold text-sm">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <p className="font-semibold">{displayName}</p>
                  <p className="text-xs text-zinc-400">{event.getSender()}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div className="h-10 w-10 flex items-center justify-center">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
              {format(timestamp, TIME_FORMAT)}
            </span>
          </div>
        )}
      </div>
      
      {/* Content Column */}
      <div className="flex flex-col w-full min-w-0">
        {/* Message Header (only for first in group) */}
        {isFirstInGroup && (
          <div className="flex items-baseline gap-x-2 mb-1">
            <p className="font-semibold text-sm hover:underline cursor-pointer text-zinc-900 dark:text-zinc-100">
              {displayName}
            </p>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {format(timestamp, DATE_FORMAT)}
            </span>
            {isEdited && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
                      <Edit className="h-3 w-3" />
                      <span>(edited)</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>This message was edited</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}
        
        {/* Message Content */}
        <div className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
          {isMarkdown ? (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-code:bg-zinc-200 dark:prose-code:bg-zinc-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-800">
            <ReactMarkdown
              components={{
                // Custom components for better Discord-style rendering
                p: ({ children }) => <p className="my-1">{children}</p>,
                code: ({ children, className, ...props }) => {
                  const match = /language-(\w+)/.exec(className || '');
                  // If no language class and it's short, treat as inline
                  const isCodeBlock = match || (typeof children === 'string' && children.includes('\n'));
                  
                  if (!isCodeBlock) {
                    return (
                      <code 
                        className="bg-zinc-200 dark:bg-zinc-700 px-1 py-0.5 rounded text-sm font-mono" 
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className={`font-mono text-sm ${className || ''}`} {...props}>
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => (
                  <pre className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-md overflow-x-auto">
                    {children}
                  </pre>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-zinc-300 dark:border-zinc-600 pl-4 italic">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
            </div>
          ) : (
            <p>{content}</p>
          )}
        </div>
        
        {/* Attachment Display */}
        {attachment && <AttachmentDisplay attachment={attachment} />}
        
        {/* Edited Indicator (for non-first messages in group) */}
        {!isFirstInGroup && isEdited && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                  <Edit className="h-3 w-3" />
                  <span>(edited)</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>This message was edited</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {/* Reactions */}
        <ReactionButtons
          reactions={reactions}
          onAddReaction={handleAddReaction}
          onToggleReaction={handleToggleReaction}
        />
      </div>

      {/* TODO: Restore MessageActions after apps/web migration */}
      {/* <MessageActions
        event={event}
        roomId={roomId}
        show={showActions}
        currentUserId={currentUserId}
        onReply={onReply}
        onEdit={onEdit}
        onReaction={(emoji) => {
          // Handle reaction via existing handler
          handleAddReaction();
        }}
      /> */}
    </div>
  );
}