"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Edit, FileIcon, ImageIcon, VideoIcon, MusicIcon, Download, Plus, MessageSquare, Check, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { MatrixEvent } from "matrix-js-sdk";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { MessageActions } from "./message-actions";
import { useModal } from "@/hooks/use-modal-store";
import { useThreads } from "@/hooks/use-threads";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { useMessageEdit } from "@/hooks/use-message-edit";

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
function getMessageContent(event: MatrixEvent): { text: string; isMarkdown: boolean; hasFormattedBody: boolean; formattedBody?: string; isRedacted: boolean } {
  const content = event.getContent();
  
  // Check if the message has been redacted (deleted)
  const isRedacted = event.isRedacted();
  if (isRedacted) {
    return {
      text: "Message deleted",
      isMarkdown: false,
      hasFormattedBody: false,
      isRedacted: true
    };
  }
  
  // Handle different message types
  if (content.msgtype === "m.text") {
    // Check if the message has formatted content (HTML/markdown)
    const hasFormatted = content.format === "org.matrix.custom.html" && content.formatted_body;
    return {
      text: content.body || "",
      isMarkdown: !hasFormatted, // Use markdown if no HTML formatting
      hasFormattedBody: hasFormatted,
      formattedBody: content.formatted_body,
      isRedacted: false
    };
  } else if (content.msgtype === "m.emote") {
    return {
      text: `*${content.body}*`,
      isMarkdown: true,
      hasFormattedBody: false,
      isRedacted: false
    };
  }
  
  return {
    text: content.body || "[Message]",
    isMarkdown: false,
    hasFormattedBody: false,
    isRedacted: false
  };
}

/**
 * Parse and highlight @mentions in message text
 */
function parseMentions(text: string, currentUserId?: string): JSX.Element[] {
  if (!text) return [];
  
  const mentionRegex = /@(\w+)/g;
  const parts: JSX.Element[] = [];
  let lastIndex = 0;
  let match;
  let partIndex = 0;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    const beforeText = text.substring(lastIndex, match.index);
    const mentionText = match[0]; // Full @username
    const username = match[1];
    const isCurrentUser = currentUserId?.includes(username);
    
    // Add text before mention
    if (beforeText) {
      parts.push(
        <span key={`text-${partIndex++}`}>{beforeText}</span>
      );
    }
    
    // Add highlighted mention
    parts.push(
      <span
        key={`mention-${partIndex++}`}
        className={cn(
          "px-1 py-0.5 rounded text-sm font-medium",
          isCurrentUser
            ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-800"
            : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 cursor-pointer"
        )}
        title={`Mentioned user: ${username}`}
      >
        {mentionText}
      </span>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after last mention
  const remainingText = text.substring(lastIndex);
  if (remainingText) {
    parts.push(
      <span key={`text-${partIndex++}`}>{remainingText}</span>
    );
  }
  
  // If no mentions found, return original text
  if (parts.length === 0) {
    parts.push(<span key="original">{text}</span>);
  }
  
  return parts;
}

/**
 * Parse Matrix HTML formatted body to highlight mentions
 */
function parseFormattedMentions(formattedBody: string, currentUserId?: string): JSX.Element {
  // For Matrix HTML formatted body with mentions, we need to safely render HTML
  // while highlighting mention links
  
  // Simple approach: look for Matrix mention links and highlight them
  const mentionLinkRegex = /<a href="https:\/\/matrix\.to\/#\/(@[^"]+)"[^>]*>([^<]+)<\/a>/g;
  let processedHtml = formattedBody;
  
  // Replace Matrix mention links with our highlighted spans
  processedHtml = processedHtml.replace(mentionLinkRegex, (match, userId, displayText) => {
    const isCurrentUser = userId === currentUserId;
    const highlightClass = isCurrentUser
      ? "px-1 py-0.5 rounded text-sm font-medium bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-800"
      : "px-1 py-0.5 rounded text-sm font-medium bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 cursor-pointer";
    
    return `<span class="${highlightClass}" title="Mentioned user: ${displayText}">${displayText}</span>`;
  });
  
  return (
    <div 
      className="inline"
      dangerouslySetInnerHTML={{ __html: processedHtml }}
    />
  );
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
 * Gets reactions for a message from Matrix event relations
 * @param event The original message event
 * @param client Optional Matrix client to fetch relations
 */
async function getMessageReactions(event: MatrixEvent, client?: any): Promise<MessageReaction[]> {
  if (!client) {
    console.warn("No Matrix client available for reaction extraction");
    return [];
  }

  try {
    // Fetch all m.reaction annotations for this event
    const relations = await client.getRelations(
      event.getRoomId(),
      event.getId(),
      "m.annotation",
      "m.reaction"
    );

    // Group reactions by emoji
    const reactionMap = new Map<string, MessageReaction>();

    for (const rel of relations.chunk) {
      const reactionKey = rel.content['m.relates_to'].key;
      const sender = rel.sender;

      if (!reactionMap.has(reactionKey)) {
        reactionMap.set(reactionKey, {
          emoji: reactionKey,
          count: 0,
          userReacted: false,
          users: []
        });
      }

      const reaction = reactionMap.get(reactionKey)!;
      reaction.count++;
      reaction.users.push(sender);
    }

    // Convert map to array and mark if current user reacted
    const currentUserId = client.getUserId();
    return Array.from(reactionMap.values()).map(reaction => ({
      ...reaction,
      userReacted: reaction.users.includes(currentUserId)
    }));
  } catch (error) {
    console.error("Error fetching message reactions:", error);
    return [];
  }
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
  
  // Thread functionality
  const { getThreadInfo, hasThread } = useThreads(roomId);
  const threadInfo = getThreadInfo(event.getId() || "");
  
  // Require the Matrix client for reaction operations
  const { client: matrixClient } = useMatrixClient();
  
  // Message editing functionality
  const { 
    editState, 
    startEditing, 
    cancelEditing, 
    saveEdit, 
    updateContent, 
    canEditMessage,
    isMessageEdited: checkIfEdited
  } = useMessageEdit(roomId);
  
  const timestamp = new Date(event.getTs());
  const displayName = getDisplayName(event);
  const avatarUrl = getAvatarUrl(event);
  const { text: content, isMarkdown, hasFormattedBody, formattedBody } = getMessageContent(event);
  const attachment = getAttachment(event);
  const isRedacted = event.isRedacted();
  
  // Check if message is edited and if currently being edited
  const isEdited = checkIfEdited(event);
  const isCurrentlyEditing = editState.isEditing && editState.event?.getId() === event.getId();
  
  // Reactions need to be loaded asynchronously
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  
  // Load reactions when component mounts or event changes
  useEffect(() => {
    const loadReactions = async () => {
      if (matrixClient) {
        try {
          const loadedReactions = await getMessageReactions(event, matrixClient);
          setReactions(loadedReactions);
        } catch (error) {
          console.error("Failed to load reactions:", error);
        }
      }
    };
    void loadReactions();
  }, [event, matrixClient]);

  // Open emoji picker and send reaction
  const handleAddReaction = () => {
    if (!matrixClient) {
      console.error("Matrix client not available");
      return;
    }

    // Open emoji picker modal 
    onOpen("emojiPicker", {
      onSelect: async (selectedEmoji: string) => {
        try {
          // Send Matrix reaction event
          // Use type assertion since m.reaction isn't in TimelineEvents but is valid
          await matrixClient.sendEvent(roomId, "m.reaction" as any, {
            "m.relates_to": {
              event_id: event.getId(),
              key: selectedEmoji,
              rel_type: "m.annotation"
            }
          });
        } catch (error) {
          console.error("Failed to send reaction:", error);
          // TODO: Show user-friendly error toast
        }
      }
    });
  };
  
  // Toggle (add/remove) a reaction
  const handleToggleReaction = async (emoji: string) => {
    if (!matrixClient) {
      console.error("Matrix client not available");
      return;
    }

    try {
      // First, check if current user already reacted
      const userReacted = reactions.some(
        r => r.emoji === emoji && r.userReacted
      );

      if (userReacted) {
        // Remove reaction by sending an empty string relation
        // This is a Matrix-compliant way of removing a reaction
        // Use type assertion since m.reaction isn't in TimelineEvents but is valid
        await matrixClient.sendEvent(roomId, "m.reaction" as any, {
          "m.relates_to": {
            event_id: event.getId(),
            key: emoji,
            rel_type: "m.annotation"
          }
        });
      } else {
        // Add reaction
        // Use type assertion since m.reaction isn't in TimelineEvents but is valid
        await matrixClient.sendEvent(roomId, "m.reaction" as any, {
          "m.relates_to": {
            event_id: event.getId(),
            key: emoji,
            rel_type: "m.annotation"
          }
        });
      }
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
      // TODO: Show user-friendly error toast
    }
  };
  
  // Handle starting message edit
  const handleStartEdit = () => {
    if (canEditMessage(event)) {
      startEditing(event);
    }
  };
  
  // Handle saving edited message
  const handleSaveEdit = async () => {
    const success = await saveEdit();
    if (!success) {
      // TODO: Show error toast
      console.error("Failed to save message edit");
    }
  };
  
  // Handle keyboard shortcuts in edit mode
  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEditing();
    }
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
        {isCurrentlyEditing ? (
          // Inline editing interface
          <div className="space-y-2">
            <div className="relative">
              <Input
                value={editState.content}
                onChange={(e) => updateContent(e.target.value)}
                onKeyDown={handleEditKeyDown}
                placeholder="Edit message..."
                className="pr-20 text-sm"
                disabled={editState.isSaving}
                autoFocus
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-green-100 dark:hover:bg-green-900/20"
                        onClick={handleSaveEdit}
                        disabled={editState.isSaving}
                      >
                        <Check className="h-3 w-3 text-green-600" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Save (Enter)</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900/20"
                        onClick={cancelEditing}
                        disabled={editState.isSaving}
                      >
                        <X className="h-3 w-3 text-red-600" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Cancel (Escape)</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Press Enter to save • Escape to cancel
            </p>
          </div>
        ) : (
          // Normal message display
          <div className={cn(
            "text-sm leading-relaxed",
            isRedacted 
              ? "text-zinc-400 dark:text-zinc-500 italic" 
              : "text-zinc-700 dark:text-zinc-300"
          )}>
            {isRedacted ? (
              // Deleted message placeholder
              <p className="italic">{content}</p>
            ) : hasFormattedBody && formattedBody ? (
              // Matrix HTML formatted content (may contain mentions)
              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1">
                {parseFormattedMentions(formattedBody, currentUserId)}
              </div>
            ) : isMarkdown ? (
              // Markdown content with mention highlighting
              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-code:bg-zinc-200 dark:prose-code:bg-zinc-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-800">
                <ReactMarkdown
                  components={{
                    // Custom components for better Discord-style rendering
                    p: ({ children }) => (
                      <p className="my-1">
                        {typeof children === 'string' 
                          ? parseMentions(children, currentUserId)
                          : children
                        }
                      </p>
                    ),
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
              // Plain text with mention highlighting
              <p>{parseMentions(content, currentUserId)}</p>
            )}
          </div>
        )}
        
        {/* Attachment Display */}
        {attachment && !isRedacted && <AttachmentDisplay attachment={attachment} />}
        
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
        {!isRedacted && (
          <ReactionButtons
            reactions={reactions}
            onAddReaction={handleAddReaction}
            onToggleReaction={handleToggleReaction}
          />
        )}
        
        {/* Thread Indicator */}
        {threadInfo && threadInfo.replyCount > 0 && (
          <div className="mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
              onClick={() => onOpen("threadView", { 
                originalEventId: event.getId()!, 
                roomId 
              })}
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              {threadInfo.replyCount} {threadInfo.replyCount === 1 ? 'reply' : 'replies'}
              {threadInfo.userParticipated && (
                <span className="ml-1 text-xs">•</span>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Message Actions */}
      {!isRedacted && (
        <MessageActions
          event={event}
          roomId={roomId}
          show={showActions}
          currentUserId={currentUserId}
          onReply={onReply}
          onEdit={handleStartEdit}
          onReaction={(emoji) => {
            // Handle reaction via existing handler
            handleAddReaction();
          }}
        />
      )}
    </div>
  );
}