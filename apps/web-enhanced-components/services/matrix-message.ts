/**
 * Matrix Message Service
 *
 * Service layer for Matrix message operations.
 * Provides sending, editing, deleting, and reaction functionality
 * with full Matrix SDK integration.
 */

import { 
  Room, 
  MatrixEvent, 
  EventType, 
  RelationType,
  MsgType,
  IContent,
  ISendEventResponse
} from "matrix-js-sdk";
import { getClient } from "../../../lib/matrix/client";
import { uploadMedia } from "../../../lib/matrix/media";
import type { MxcUrl } from "../../../lib/matrix/types/media";

// =============================================================================
// Types
// =============================================================================

/**
 * Message content structure for text messages
 */
export interface TextMessageContent {
  msgtype: MsgType.Text;
  body: string;
  format?: string;
  formatted_body?: string;
}

/**
 * Message content structure for file messages
 */
export interface FileMessageContent {
  msgtype: MsgType;
  body: string;
  filename?: string;
  url: string;
  info?: {
    size?: number;
    mimetype?: string;
    w?: number;
    h?: number;
    duration?: number;
  };
}

/**
 * Unified message content type
 */
export type MessageContent = TextMessageContent | FileMessageContent;

/**
 * Reaction information
 */
export interface Reaction {
  eventId: string;
  emoji: string;
  userId: string;
  timestamp: Date;
}

/**
 * Message send options
 */
export interface SendOptions {
  /** Reply to another message */
  replyTo?: string;
  /** Thread ID for threaded messages */
  threadId?: string;
  /** Whether to send as markdown */
  markdown?: boolean;
}

/**
 * Message edit options
 */
export interface EditOptions {
  /** New plain text content */
  body: string;
  /** New formatted content (HTML/markdown) */
  formattedBody?: string;
  /** Reason for the edit */
  reason?: string;
}

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Custom error class for Message Service operations
 */
export class MessageServiceError extends Error {
  public readonly code: string;
  public readonly httpStatus?: number;

  constructor(message: string, code = 'MESSAGE_ERROR', httpStatus?: number) {
    super(message);
    this.name = 'MessageServiceError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get the Matrix client instance and validate it's ready
 */
function getMatrixClient() {
  const client = getClient();
  if (!client) {
    throw new MessageServiceError('Matrix client not initialized', 'CLIENT_NOT_READY');
  }
  return client;
}

/**
 * Validate room exists and user has access
 */
async function validateRoom(roomId: string): Promise<Room> {
  const client = getMatrixClient();
  const room = client.getRoom(roomId);
  
  if (!room) {
    throw new MessageServiceError(`Room not found: ${roomId}`, 'ROOM_NOT_FOUND', 404);
  }
  
  // Check if user is a member
  const userId = client.getUserId();
  if (!userId) {
    throw new MessageServiceError('User not authenticated', 'USER_NOT_AUTHENTICATED', 401);
  }
  
  const member = room.getMember(userId);
  if (!member || member.membership !== 'join') {
    throw new MessageServiceError('User is not a member of this room', 'NOT_MEMBER', 403);
  }
  
  return room;
}

/**
 * Validate event exists and user can modify it
 */
async function validateEventForEdit(roomId: string, eventId: string): Promise<MatrixEvent> {
  const room = await validateRoom(roomId);
  const event = room.findEventById(eventId);
  
  if (!event) {
    throw new MessageServiceError(`Event not found: ${eventId}`, 'EVENT_NOT_FOUND', 404);
  }
  
  const client = getMatrixClient();
  const userId = client.getUserId();
  
  // Check if user is the sender
  if (event.getSender() !== userId) {
    throw new MessageServiceError('Can only edit your own messages', 'FORBIDDEN', 403);
  }
  
  // Check if event is a message
  if (event.getType() !== EventType.RoomMessage) {
    throw new MessageServiceError('Can only edit message events', 'INVALID_EVENT_TYPE', 400);
  }
  
  return event;
}

/**
 * Convert markdown to HTML if enabled
 */
function formatMessageContent(body: string, markdown = false): TextMessageContent {
  if (!markdown) {
    return {
      msgtype: MsgType.Text,
      body: body.trim()
    };
  }
  
  // Simple markdown conversion (in production, use a proper markdown parser)
  const formattedBody = body
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/~~(.*?)~~/g, '<del>$1</del>')
    .replace(/\n/g, '<br/>');
  
  return {
    msgtype: MsgType.Text,
    body: body.trim(),
    format: 'org.matrix.custom.html',
    formatted_body: formattedBody
  };
}

/**
 * Determine message type from file MIME type
 */
function getMsgTypeFromFile(file: File): MsgType {
  const mimeType = file.type;
  
  if (mimeType.startsWith('image/')) {
    return MsgType.Image;
  } else if (mimeType.startsWith('audio/')) {
    return MsgType.Audio;
  } else if (mimeType.startsWith('video/')) {
    return MsgType.Video;
  } else {
    return MsgType.File;
  }
}

/**
 * Create file message content from uploaded file
 */
function createFileMessageContent(file: File, mxcUrl: MxcUrl): FileMessageContent {
  const msgType = getMsgTypeFromFile(file);
  
  const content: FileMessageContent = {
    msgtype: msgType,
    body: file.name,
    filename: file.name,
    url: mxcUrl,
    info: {
      size: file.size,
      mimetype: file.type
    }
  };
  
  // Add dimensions for images/videos if available
  if (msgType === MsgType.Image || msgType === MsgType.Video) {
    // Note: In production, you'd extract actual dimensions from the file
    // For now, we'll leave w/h undefined and let the client handle it
  }
  
  return content;
}

// =============================================================================
// Core Message Functions
// =============================================================================

/**
 * Send a text message to a room
 * 
 * @param roomId - Matrix room ID
 * @param content - Message content (string or rich content)
 * @param options - Additional send options
 * @returns Promise resolving to the event ID of the sent message
 */
export async function sendMessage(
  roomId: string, 
  content: string | MessageContent,
  options: SendOptions = {}
): Promise<string> {
  try {
    const room = await validateRoom(roomId);
    const client = getMatrixClient();
    
    // Prepare message content
    let messageContent: IContent;
    
    if (typeof content === 'string') {
      messageContent = formatMessageContent(content, options.markdown);
    } else {
      messageContent = content;
    }
    
    // Add reply/thread information if specified
    if (options.replyTo) {
      const replyEvent = room.findEventById(options.replyTo);
      if (replyEvent) {
        messageContent['m.relates_to'] = {
          'm.in_reply_to': {
            event_id: options.replyTo
          }
        };
        
        // Add fallback text for clients that don't support replies
        if (messageContent.msgtype === MsgType.Text) {
          const originalSender = replyEvent.getSender() || 'Unknown User';
          const originalBody = replyEvent.getContent().body || '[No content]';
          messageContent.body = `> <${originalSender}> ${originalBody}\n\n${messageContent.body}`;
          
          if (messageContent.formatted_body) {
            const fallbackHtml = `<mx-reply><blockquote><a href="https://matrix.to/#/${roomId}/${options.replyTo}">In reply to</a> <a href="https://matrix.to/#/${originalSender}">${originalSender}</a><br/>${originalBody}</blockquote></mx-reply>`;
            messageContent.formatted_body = fallbackHtml + messageContent.formatted_body;
          }
        }
      }
    }
    
    // Add thread information if specified
    if (options.threadId) {
      messageContent['m.relates_to'] = {
        ...messageContent['m.relates_to'],
        rel_type: RelationType.Thread,
        event_id: options.threadId
      };
    }
    
    // Send the message  
    const response: ISendEventResponse = await client.sendEvent(
      roomId,
      EventType.RoomMessage,
      messageContent as any
    );
    
    if (!response.event_id) {
      throw new MessageServiceError('Failed to send message - no event ID returned', 'SEND_FAILED');
    }
    
    return response.event_id;
    
  } catch (error) {
    if (error instanceof MessageServiceError) {
      throw error;
    }
    
    throw new MessageServiceError(
      `Failed to send message: ${error instanceof Error ? error.message : String(error)}`,
      'SEND_FAILED'
    );
  }
}

/**
 * Send a file message to a room
 * 
 * @param roomId - Matrix room ID
 * @param file - File to upload and send
 * @param options - Additional send options
 * @returns Promise resolving to the event ID of the sent message
 */
export async function sendFile(
  roomId: string,
  file: File,
  options: SendOptions = {}
): Promise<string> {
  try {
    const room = await validateRoom(roomId);
    
    // Upload the file to Matrix content repository
    const mxcUrl = await uploadMedia(file);
    
    // Create file message content
    const messageContent = createFileMessageContent(file, mxcUrl);
    
    // Send as a regular message
    return await sendMessage(roomId, messageContent, options);
    
  } catch (error) {
    if (error instanceof MessageServiceError) {
      throw error;
    }
    
    throw new MessageServiceError(
      `Failed to send file: ${error instanceof Error ? error.message : String(error)}`,
      'FILE_SEND_FAILED'
    );
  }
}

/**
 * Edit an existing message
 * 
 * @param roomId - Matrix room ID
 * @param eventId - ID of the message event to edit
 * @param newContent - New message content
 * @param options - Edit options
 */
export async function editMessage(
  roomId: string,
  eventId: string,
  newContent: string,
  options: Partial<EditOptions> = {}
): Promise<void> {
  try {
    const event = await validateEventForEdit(roomId, eventId);
    const client = getMatrixClient();
    
    // Get the original content
    const originalContent = event.getContent();
    
    // Create new content with edit relation
    const editContent = formatMessageContent(newContent, true);
    
    const messageContent: IContent = {
      ...editContent,
      'm.new_content': {
        ...editContent
      },
      'm.relates_to': {
        rel_type: RelationType.Replace,
        event_id: eventId
      }
    };
    
    // Add edit reason if provided
    if (options.reason) {
      messageContent.reason = options.reason;
    }
    
    // Include fallback for clients that don't support edits
    messageContent.body = `* ${editContent.body}`;
    if (editContent.formatted_body) {
      messageContent.formatted_body = `* ${editContent.formatted_body}`;
    }
    
    // Send the edit event
    await client.sendEvent(roomId, EventType.RoomMessage, messageContent as any);
    
  } catch (error) {
    if (error instanceof MessageServiceError) {
      throw error;
    }
    
    throw new MessageServiceError(
      `Failed to edit message: ${error instanceof Error ? error.message : String(error)}`,
      'EDIT_FAILED'
    );
  }
}

/**
 * Delete (redact) a message
 * 
 * @param roomId - Matrix room ID
 * @param eventId - ID of the message event to delete
 * @param reason - Optional reason for deletion
 */
export async function deleteMessage(
  roomId: string,
  eventId: string,
  reason?: string
): Promise<void> {
  try {
    const event = await validateEventForEdit(roomId, eventId);
    const client = getMatrixClient();
    
    // Redact the message
    await client.redactEvent(roomId, eventId, reason);
    
  } catch (error) {
    if (error instanceof MessageServiceError) {
      throw error;
    }
    
    throw new MessageServiceError(
      `Failed to delete message: ${error instanceof Error ? error.message : String(error)}`,
      'DELETE_FAILED'
    );
  }
}

/**
 * Add a reaction to a message
 * 
 * @param roomId - Matrix room ID
 * @param eventId - ID of the message event to react to
 * @param emoji - Emoji reaction to add
 */
export async function addReaction(
  roomId: string,
  eventId: string,
  emoji: string
): Promise<void> {
  try {
    const room = await validateRoom(roomId);
    const client = getMatrixClient();
    
    // Validate that the target event exists
    const event = room.findEventById(eventId);
    if (!event) {
      throw new MessageServiceError(`Event not found: ${eventId}`, 'EVENT_NOT_FOUND', 404);
    }
    
    // Create reaction content
    const reactionContent: IContent = {
      'm.relates_to': {
        rel_type: RelationType.Annotation,
        event_id: eventId,
        key: emoji
      }
    };
    
    // Send the reaction
    await client.sendEvent(roomId, EventType.Reaction, reactionContent as any);
    
  } catch (error) {
    if (error instanceof MessageServiceError) {
      throw error;
    }
    
    throw new MessageServiceError(
      `Failed to add reaction: ${error instanceof Error ? error.message : String(error)}`,
      'REACTION_FAILED'
    );
  }
}

/**
 * Remove a reaction from a message
 * 
 * @param roomId - Matrix room ID
 * @param eventId - ID of the message event to remove reaction from
 * @param emoji - Emoji reaction to remove
 */
export async function removeReaction(
  roomId: string,
  eventId: string,
  emoji: string
): Promise<void> {
  try {
    const room = await validateRoom(roomId);
    const client = getMatrixClient();
    const userId = client.getUserId();
    
    if (!userId) {
      throw new MessageServiceError('User not authenticated', 'USER_NOT_AUTHENTICATED', 401);
    }
    
    // Find the reaction event to redact
    // Get all events related to this message
    const timeline = room.getLiveTimeline();
    const events = timeline.getEvents();
    
    // Find reaction events from this user with this emoji
    const reactionEvents = events.filter(event => 
      event.getType() === EventType.Reaction &&
      event.getSender() === userId &&
      event.getContent()?.['m.relates_to']?.event_id === eventId &&
      event.getContent()?.['m.relates_to']?.key === emoji
    );
    
    if (reactionEvents.length === 0) {
      throw new MessageServiceError('User has not reacted with this emoji', 'REACTION_NOT_FOUND', 404);
    }
    
    const userReaction = reactionEvents[0];
    
    // Redact the reaction event
    await client.redactEvent(roomId, userReaction.getId()!);
    
  } catch (error) {
    if (error instanceof MessageServiceError) {
      throw error;
    }
    
    throw new MessageServiceError(
      `Failed to remove reaction: ${error instanceof Error ? error.message : String(error)}`,
      'REACTION_REMOVAL_FAILED'
    );
  }
}

// =============================================================================
// Utility Functions for Message Management
// =============================================================================

/**
 * Get all reactions for a message
 * 
 * @param roomId - Matrix room ID
 * @param eventId - Message event ID
 * @returns Array of reaction information
 */
export async function getMessageReactions(roomId: string, eventId: string): Promise<Reaction[]> {
  try {
    const room = await validateRoom(roomId);
    
    // Get all events in the room timeline
    const timeline = room.getLiveTimeline();
    const events = timeline.getEvents();
    
    // Find all reaction events for this message
    const reactionEvents = events.filter(event =>
      event.getType() === EventType.Reaction &&
      event.getContent()?.['m.relates_to']?.event_id === eventId
    );
    
    const reactions: Reaction[] = [];
    
    for (const event of reactionEvents) {
      const content = event.getContent();
      const emoji = content['m.relates_to']?.key;
      
      if (emoji && event.getSender() && event.getId()) {
        reactions.push({
          eventId: event.getId()!,
          emoji,
          userId: event.getSender()!,
          timestamp: new Date(event.getTs())
        });
      }
    }
    
    return reactions;
    
  } catch (error) {
    if (error instanceof MessageServiceError) {
      throw error;
    }
    
    throw new MessageServiceError(
      `Failed to get reactions: ${error instanceof Error ? error.message : String(error)}`,
      'GET_REACTIONS_FAILED'
    );
  }
}

/**
 * Check if a message can be edited by the current user
 * 
 * @param roomId - Matrix room ID
 * @param eventId - Message event ID
 * @returns Whether the message can be edited
 */
export async function canEditMessage(roomId: string, eventId: string): Promise<boolean> {
  try {
    await validateEventForEdit(roomId, eventId);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if a message can be deleted by the current user
 * 
 * @param roomId - Matrix room ID  
 * @param eventId - Message event ID
 * @returns Whether the message can be deleted
 */
export async function canDeleteMessage(roomId: string, eventId: string): Promise<boolean> {
  try {
    const room = await validateRoom(roomId);
    const event = room.findEventById(eventId);
    
    if (!event) {
      return false;
    }
    
    const client = getMatrixClient();
    const userId = client.getUserId();
    
    // Can delete own messages or if user has sufficient power level
    if (event.getSender() === userId) {
      return true;
    }
    
    // Check if user has redaction power
    const powerLevels = room.currentState.getStateEvents(EventType.RoomPowerLevels, '');
    if (!powerLevels) {
      return false;
    }
    
    const content = powerLevels.getContent();
    const userPowerLevel = content.users?.[userId!] || content.users_default || 0;
    const requiredLevel = content.redact ?? 50;
    
    return userPowerLevel >= requiredLevel;
    
  } catch (error) {
    return false;
  }
}

// =============================================================================
// Exports
// =============================================================================

// All types and functions are exported at declaration above