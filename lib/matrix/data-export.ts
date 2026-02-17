/**
 * Matrix Data Export Service
 * 
 * GDPR-compliant data export functionality for exporting user messages, rooms, 
 * and profile data from Matrix in JSON or CSV formats with progress tracking.
 */

import {  MatrixClient, Room, MatrixEvent  } from "@/lib/matrix/matrix-sdk-exports";
import { getClient } from "./client";

// =============================================================================
// Types
// =============================================================================

export interface ExportProgress {
  /** Current phase of export */
  phase: 'initializing' | 'rooms' | 'messages' | 'profile' | 'finalizing' | 'complete';
  /** Current progress percentage (0-100) */
  percentage: number;
  /** Current operation description */
  message: string;
  /** Total estimated items to process */
  totalItems?: number;
  /** Currently processed items */
  processedItems?: number;
}

export interface UserProfileData {
  /** Matrix user ID */
  userId: string;
  /** Display name */
  displayName?: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Account creation date (estimated from oldest room) */
  accountCreated?: string;
  /** User presence information */
  presence?: {
    presence: string;
    lastActiveAgo?: number;
    statusMsg?: string;
  };
}

export interface RoomExportData {
  /** Room ID */
  roomId: string;
  /** Room name */
  name?: string;
  /** Room topic */
  topic?: string;
  /** Room type (direct message, group, etc.) */
  type: 'direct' | 'group' | 'space' | 'unknown';
  /** When user joined the room */
  joinedAt?: string;
  /** Room member count */
  memberCount: number;
  /** Whether the room is encrypted */
  isEncrypted: boolean;
  /** Room avatar URL */
  avatarUrl?: string;
  /** User's power level in the room */
  powerLevel: number;
}

export interface MessageExportData {
  /** Message event ID */
  eventId: string;
  /** Room ID where message was sent */
  roomId: string;
  /** Sender's Matrix user ID */
  sender: string;
  /** Sender's display name at time of message */
  senderDisplayName?: string;
  /** Message timestamp */
  timestamp: number;
  /** Formatted date string */
  date: string;
  /** Message type (text, image, file, etc.) */
  type: string;
  /** Message content */
  content: any;
  /** Plain text representation of message */
  plainText: string;
  /** Whether message was edited */
  edited: boolean;
  /** Whether message was redacted/deleted */
  redacted: boolean;
  /** Relation information (reply, edit, etc.) */
  relation?: {
    type: string;
    eventId?: string;
  };
}

export interface ExportData {
  /** Export metadata */
  export: {
    /** When export was created */
    createdAt: string;
    /** Export format */
    format: 'json' | 'csv';
    /** HAOS version */
    version: string;
    /** User ID who requested export */
    userId: string;
  };
  /** User profile data */
  profile: UserProfileData;
  /** Rooms user is/was a member of */
  rooms: RoomExportData[];
  /** All user's messages */
  messages: MessageExportData[];
  /** Export statistics */
  statistics: {
    totalRooms: number;
    totalMessages: number;
    dateRange: {
      earliest?: string;
      latest?: string;
    };
  };
}

export type ExportFormat = 'json' | 'csv';

// =============================================================================
// Progress Callback Type
// =============================================================================

export type ProgressCallback = (progress: ExportProgress) => void;

// =============================================================================
// Data Export Service
// =============================================================================

/**
 * Export all user data from Matrix
 */
export async function exportUserData(
  format: ExportFormat = 'json',
  onProgress?: ProgressCallback
): Promise<ExportData> {
  const client = await getClient();
  if (!client) {
    throw new Error("Matrix client not available");
  }

  const userId = client.getUserId();
  if (!userId) {
    throw new Error("User ID not available");
  }

  updateProgress({ phase: 'initializing', percentage: 0, message: 'Initializing export...' }, onProgress);

  try {
    // Collect profile data
    updateProgress({ phase: 'profile', percentage: 10, message: 'Collecting profile data...' }, onProgress);
    const profile = await collectProfileData(client, userId);

    // Collect rooms data
    updateProgress({ phase: 'rooms', percentage: 20, message: 'Collecting rooms data...' }, onProgress);
    const rooms = await collectRoomsData(client, onProgress);

    // Collect messages from all rooms
    updateProgress({ phase: 'messages', percentage: 40, message: 'Collecting messages...', totalItems: rooms.length, processedItems: 0 }, onProgress);
    const messages = await collectMessagesData(client, rooms, onProgress);

    // Finalize export
    updateProgress({ phase: 'finalizing', percentage: 90, message: 'Finalizing export...' }, onProgress);

    const exportData: ExportData = {
      export: {
        createdAt: new Date().toISOString(),
        format,
        version: process.env.NEXT_PUBLIC_APP_VERSION || 'dev',
        userId,
      },
      profile,
      rooms,
      messages,
      statistics: {
        totalRooms: rooms.length,
        totalMessages: messages.length,
        dateRange: calculateDateRange(messages),
      },
    };

    updateProgress({ phase: 'complete', percentage: 100, message: 'Export completed!' }, onProgress);

    return exportData;
  } catch (error) {
    console.error("Failed to export user data:", error);
    throw new Error(`Failed to export user data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert export data to downloadable blob
 */
export function exportDataToBlob(data: ExportData, format: ExportFormat): Blob {
  switch (format) {
    case 'json':
      return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    case 'csv':
      return exportDataToCsvBlob(data);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Trigger download of export data
 */
export function downloadExportData(data: ExportData, format: ExportFormat, filename?: string): void {
  const blob = exportDataToBlob(data, format);
  const url = URL.createObjectURL(blob);
  
  const defaultFilename = `haos-data-export-${data.export.userId.replace('@', '').replace(':', '_')}-${new Date().toISOString().split('T')[0]}.${format}`;
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Update progress and call callback if provided
 */
function updateProgress(progress: ExportProgress, onProgress?: ProgressCallback): void {
  if (onProgress) {
    onProgress(progress);
  }
}

/**
 * Collect user profile data
 */
async function collectProfileData(client: MatrixClient, userId: string): Promise<UserProfileData> {
  try {
    const profile = await client.getProfileInfo(userId);
    const user = client.getUser(userId);
    
    return {
      userId,
      displayName: profile.displayname || undefined,
      avatarUrl: profile.avatar_url || undefined,
      presence: user ? {
        presence: user.presence || 'unknown',
        lastActiveAgo: user.lastActiveAgo,
        statusMsg: user.presenceStatusMsg || undefined,
      } : undefined,
    };
  } catch (error) {
    console.warn("Failed to collect some profile data:", error);
    return { userId };
  }
}

/**
 * Collect rooms data
 */
async function collectRoomsData(client: MatrixClient, onProgress?: ProgressCallback): Promise<RoomExportData[]> {
  const rooms = client.getVisibleRooms();
  const roomsData: RoomExportData[] = [];

  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    updateProgress({
      phase: 'rooms',
      percentage: 20 + (i / rooms.length) * 15,
      message: `Processing room ${i + 1}/${rooms.length}: ${room.name || room.roomId}`,
    }, onProgress);

    try {
      const roomData: RoomExportData = {
        roomId: room.roomId,
        name: room.name || undefined,
        topic: room.currentState.getStateEvents('m.room.topic', '')?.getContent()?.topic || undefined,
        type: determineRoomType(room),
        joinedAt: getUserJoinDate(room, client.getUserId()!),
        memberCount: room.getJoinedMemberCount(),
        isEncrypted: client.isRoomEncrypted(room.roomId),
        avatarUrl: room.getAvatarUrl(client.getHomeserverUrl(), 256, 256, 'scale') || undefined,
        powerLevel: room.currentState.getStateEvents('m.room.power_levels', '')?.getContent()?.users?.[client.getUserId()!] || 0,
      };

      roomsData.push(roomData);
    } catch (error) {
      console.warn(`Failed to collect data for room ${room.roomId}:`, error);
      // Still add basic room data
      roomsData.push({
        roomId: room.roomId,
        name: room.name || undefined,
        type: 'unknown',
        memberCount: 0,
        isEncrypted: false,
        powerLevel: 0,
      });
    }
  }

  return roomsData;
}

/**
 * Collect messages data from all rooms
 */
async function collectMessagesData(
  client: MatrixClient, 
  rooms: RoomExportData[],
  onProgress?: ProgressCallback
): Promise<MessageExportData[]> {
  const allMessages: MessageExportData[] = [];
  
  for (let i = 0; i < rooms.length; i++) {
    const roomData = rooms[i];
    updateProgress({
      phase: 'messages',
      percentage: 40 + (i / rooms.length) * 45,
      message: `Collecting messages from: ${roomData.name || roomData.roomId}`,
      totalItems: rooms.length,
      processedItems: i,
    }, onProgress);

    try {
      const room = client.getRoom(roomData.roomId);
      if (!room) continue;

      const timeline = room.getLiveTimeline();
      const events = timeline.getEvents().filter((event) => 
        event.getType() === 'm.room.message' && 
        event.getSender() === client.getUserId()
      );

      for (const event of events) {
        try {
          const messageData: MessageExportData = {
            eventId: event.getId()!,
            roomId: roomData.roomId,
            sender: event.getSender()!,
            senderDisplayName: event.sender?.name,
            timestamp: event.getTs(),
            date: new Date(event.getTs()).toISOString(),
            type: event.getContent().msgtype || 'unknown',
            content: event.getContent(),
            plainText: extractPlainText(event),
            edited: !!event.replacingEvent(),
            redacted: event.isRedacted(),
            relation: extractRelation(event),
          };

          allMessages.push(messageData);
        } catch (error) {
          console.warn(`Failed to process message ${event.getId()}:`, error);
        }
      }
    } catch (error) {
      console.warn(`Failed to collect messages from room ${roomData.roomId}:`, error);
    }
  }

  // Sort messages by timestamp
  allMessages.sort((a, b) => a.timestamp - b.timestamp);

  return allMessages;
}

/**
 * Determine room type based on room properties
 */
function determineRoomType(room: Room): 'direct' | 'group' | 'space' | 'unknown' {
  // Check if it's a space
  const roomType = room.currentState.getStateEvents('m.room.create', '')?.getContent()?.type;
  if (roomType === 'm.space') {
    return 'space';
  }

  // Check if it's a direct message room
  const isDirect = room.getDMInviter() !== null || room.getJoinedMemberCount() === 2;
  if (isDirect) {
    return 'direct';
  }

  // Default to group for multi-member rooms
  if (room.getJoinedMemberCount() > 2) {
    return 'group';
  }

  return 'unknown';
}

/**
 * Get the date when user joined a room
 */
function getUserJoinDate(room: Room, userId: string): string | undefined {
  const memberEvent = room.currentState.getStateEvents('m.room.member', userId);
  if (memberEvent?.getTs()) {
    return new Date(memberEvent.getTs()).toISOString();
  }
  return undefined;
}

/**
 * Extract plain text from message event
 */
function extractPlainText(event: MatrixEvent): string {
  const content = event.getContent();
  
  if (content.body) {
    return content.body;
  }
  
  switch (content.msgtype) {
    case 'm.text':
    case 'm.notice':
    case 'm.emote':
      return content.body || '';
    case 'm.image':
      return `[Image: ${content.body || 'Untitled'}]`;
    case 'm.file':
      return `[File: ${content.body || content.filename || 'Untitled'}]`;
    case 'm.audio':
      return `[Audio: ${content.body || 'Untitled'}]`;
    case 'm.video':
      return `[Video: ${content.body || 'Untitled'}]`;
    default:
      return `[${content.msgtype || 'Unknown message type'}]`;
  }
}

/**
 * Extract relation information from message event
 */
function extractRelation(event: MatrixEvent): MessageExportData['relation'] | undefined {
  const content = event.getContent();
  const relation = content['m.relates_to'];
  
  if (!relation) return undefined;

  if (relation.rel_type === 'm.replace') {
    return { type: 'edit', eventId: relation.event_id };
  }
  
  if (relation.rel_type === 'm.thread') {
    return { type: 'thread', eventId: relation.event_id };
  }
  
  if (relation['m.in_reply_to']?.event_id) {
    return { type: 'reply', eventId: relation['m.in_reply_to'].event_id };
  }

  return undefined;
}

/**
 * Calculate date range from messages
 */
function calculateDateRange(messages: MessageExportData[]): { earliest?: string; latest?: string } {
  if (messages.length === 0) return {};

  const timestamps = messages.map(m => m.timestamp).sort((a, b) => a - b);
  
  return {
    earliest: new Date(timestamps[0]).toISOString(),
    latest: new Date(timestamps[timestamps.length - 1]).toISOString(),
  };
}

/**
 * Convert export data to CSV blob
 */
function exportDataToCsvBlob(data: ExportData): Blob {
  const csvSections: string[] = [];

  // Export metadata
  csvSections.push('# HAOS Data Export');
  csvSections.push(`# Created: ${data.export.createdAt}`);
  csvSections.push(`# User: ${data.export.userId}`);
  csvSections.push(`# Format: CSV`);
  csvSections.push('');

  // Profile data
  csvSections.push('# Profile Data');
  csvSections.push('Field,Value');
  csvSections.push(`User ID,"${data.profile.userId}"`);
  if (data.profile.displayName) csvSections.push(`Display Name,"${escapeCsvValue(data.profile.displayName)}"`);
  if (data.profile.avatarUrl) csvSections.push(`Avatar URL,"${data.profile.avatarUrl}"`);
  csvSections.push('');

  // Rooms data
  csvSections.push('# Rooms');
  csvSections.push('Room ID,Name,Type,Member Count,Encrypted,Power Level,Joined At');
  for (const room of data.rooms) {
    csvSections.push([
      `"${room.roomId}"`,
      `"${escapeCsvValue(room.name || '')}"`,
      room.type,
      room.memberCount,
      room.isEncrypted,
      room.powerLevel,
      `"${room.joinedAt || ''}"`
    ].join(','));
  }
  csvSections.push('');

  // Messages data  
  csvSections.push('# Messages');
  csvSections.push('Date,Room ID,Room Name,Sender,Display Name,Type,Plain Text');
  for (const message of data.messages) {
    const room = data.rooms.find(r => r.roomId === message.roomId);
    csvSections.push([
      `"${message.date}"`,
      `"${message.roomId}"`,
      `"${escapeCsvValue(room?.name || '')}"`,
      `"${message.sender}"`,
      `"${escapeCsvValue(message.senderDisplayName || '')}"`,
      message.type,
      `"${escapeCsvValue(message.plainText)}"`
    ].join(','));
  }

  const csvContent = csvSections.join('\n');
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
}

/**
 * Escape CSV values to handle commas and quotes
 */
function escapeCsvValue(value: string): string {
  if (typeof value !== 'string') return String(value);
  // Replace quotes with double quotes and handle line breaks
  return value.replace(/"/g, '""').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}