"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { MatrixEvent, EventType, RelationType, MsgType } from "matrix-js-sdk";

import { useMatrixClient } from "./use-matrix-client";

// =============================================================================
// Types
// =============================================================================

/**
 * Thread metadata for a message
 */
export interface ThreadInfo {
  /**
   * Original event ID that started the thread
   */
  rootEventId: string;
  
  /**
   * Number of replies in this thread
   */
  replyCount: number;
  
  /**
   * Latest reply event (most recent message in thread)
   */
  latestReply?: MatrixEvent;
  
  /**
   * Participants in the thread (user IDs)
   */
  participants: string[];
  
  /**
   * Whether the current user has participated in this thread
   */
  userParticipated: boolean;
}

/**
 * Thread reply event
 */
export interface ThreadReply {
  event: MatrixEvent;
  timestamp: number;
  sender: string;
  content: string;
}

/**
 * Options for thread operations
 */
export interface ThreadOptions {
  /**
   * Maximum number of thread replies to load
   */
  maxReplies?: number;
  
  /**
   * Whether to include edited/redacted messages
   */
  includeEdited?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if an event is a thread reply
 */
function isThreadReply(event: MatrixEvent): boolean {
  const relation = event.getRelation();
  return relation?.rel_type === RelationType.Thread;
}

/**
 * Check if an event is a thread reply to a specific root event
 */
function isThreadReplyTo(event: MatrixEvent, rootEventId: string): boolean {
  const relation = event.getRelation();
  return relation?.rel_type === RelationType.Thread && relation.event_id === rootEventId;
}

/**
 * Extract thread info from a collection of events
 */
function extractThreadInfo(events: MatrixEvent[], rootEventId: string, currentUserId?: string): ThreadInfo {
  const threadReplies = events.filter(e => isThreadReplyTo(e, rootEventId));
  
  const participants = Array.from(new Set(
    threadReplies.map(e => e.getSender()).filter(Boolean) as string[]
  ));
  
  const latestReply = threadReplies
    .sort((a, b) => b.getTs() - a.getTs())[0];
  
  const userParticipated = currentUserId ? participants.includes(currentUserId) : false;
  
  return {
    rootEventId,
    replyCount: threadReplies.length,
    latestReply,
    participants,
    userParticipated,
  };
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for managing message threads
 */
export function useThreads(roomId: string, options: ThreadOptions = {}) {
  const { client, isReady } = useMatrixClient();
  const { maxReplies = 100, includeEdited = false } = options;
  
  const [threadInfos, setThreadInfos] = useState<Map<string, ThreadInfo>>(new Map());
  const [loading, setLoading] = useState(false);
  
  const currentUserId = client?.getUserId();
  
  // =============================================================================
  // Thread Analysis
  // =============================================================================
  
  /**
   * Analyze room events to identify threads
   */
  const analyzeThreads = useCallback(() => {
    if (!client || !isReady || !roomId) return;
    
    const room = client.getRoom(roomId);
    if (!room) return;
    
    const timeline = room.getLiveTimeline();
    const events = timeline.getEvents();
    
    // Find all messages that have thread replies
    const threadRootIds = new Set<string>();
    
    events.forEach(event => {
      if (isThreadReply(event)) {
        const relation = event.getRelation();
        if (relation?.event_id) {
          threadRootIds.add(relation.event_id);
        }
      }
    });
    
    // Build thread info for each thread
    const newThreadInfos = new Map<string, ThreadInfo>();
    
    threadRootIds.forEach(rootId => {
      const info = extractThreadInfo(events, rootId, currentUserId);
      if (info.replyCount > 0) {
        newThreadInfos.set(rootId, info);
      }
    });
    
    setThreadInfos(newThreadInfos);
  }, [client, isReady, roomId, currentUserId]);
  
  /**
   * Load thread replies for a specific thread
   */
  const loadThreadReplies = useCallback(async (rootEventId: string): Promise<ThreadReply[]> => {
    if (!client || !roomId) return [];
    
    const room = client.getRoom(roomId);
    if (!room) return [];
    
    const timeline = room.getLiveTimeline();
    const events = timeline.getEvents();
    
    const replies = events
      .filter(event => isThreadReplyTo(event, rootEventId))
      .filter(event => {
        if (!includeEdited && event.isRedacted()) return false;
        return event.getType() === EventType.RoomMessage;
      })
      .map(event => ({
        event,
        timestamp: event.getTs(),
        sender: event.getSender() || "",
        content: event.getContent().body || "",
      }))
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, maxReplies);
    
    return replies;
  }, [client, roomId, includeEdited, maxReplies]);
  
  // =============================================================================
  // Thread Actions
  // =============================================================================
  
  /**
   * Send a reply to a thread
   */
  const sendThreadReply = useCallback(async (rootEventId: string, content: string): Promise<boolean> => {
    if (!client || !roomId || !content.trim()) return false;
    
    try {
      await client.sendMessage(roomId, {
        msgtype: MsgType.Text,
        body: content.trim(),
        "m.relates_to": {
          rel_type: RelationType.Thread,
          event_id: rootEventId,
        },
      });
      
      // Refresh thread analysis after sending
      setTimeout(() => {
        analyzeThreads();
      }, 500);
      
      return true;
    } catch (error) {
      console.error("Failed to send thread reply:", error);
      return false;
    }
  }, [client, roomId, analyzeThreads]);
  
  /**
   * Get thread info for a specific message
   */
  const getThreadInfo = useCallback((eventId: string): ThreadInfo | null => {
    return threadInfos.get(eventId) || null;
  }, [threadInfos]);
  
  /**
   * Check if a message has thread replies
   */
  const hasThread = useCallback((eventId: string): boolean => {
    const info = threadInfos.get(eventId);
    return info ? info.replyCount > 0 : false;
  }, [threadInfos]);
  
  // =============================================================================
  // Effects
  // =============================================================================
  
  /**
   * Analyze threads when room or client changes
   */
  useEffect(() => {
    if (isReady && roomId) {
      analyzeThreads();
    }
  }, [isReady, roomId, analyzeThreads]);
  
  /**
   * Listen for new timeline events to update threads
   */
  useEffect(() => {
    if (!client || !isReady || !roomId) return;
    
    const room = client.getRoom(roomId);
    if (!room) return;
    
    const handleTimelineUpdate = () => {
      analyzeThreads();
    };
    
    room.on("Room.timeline" as any, handleTimelineUpdate);
    room.on("Room.timelineReset" as any, handleTimelineUpdate);
    
    return () => {
      room.off("Room.timeline" as any, handleTimelineUpdate);
      room.off("Room.timelineReset" as any, handleTimelineUpdate);
    };
  }, [client, isReady, roomId, analyzeThreads]);
  
  // =============================================================================
  // Memoized Values
  // =============================================================================
  
  const threadList = useMemo(() => {
    return Array.from(threadInfos.values()).sort((a, b) => {
      // Sort by latest activity (most recent reply)
      const aTime = a.latestReply?.getTs() || 0;
      const bTime = b.latestReply?.getTs() || 0;
      return bTime - aTime;
    });
  }, [threadInfos]);
  
  const threadCount = useMemo(() => threadInfos.size, [threadInfos]);
  
  // =============================================================================
  // Return Interface
  // =============================================================================
  
  return {
    // Data
    threadInfos: threadInfos,
    threadList,
    threadCount,
    loading,
    
    // Methods
    loadThreadReplies,
    sendThreadReply,
    getThreadInfo,
    hasThread,
    analyzeThreads,
    
    // Utils
    isThreadReply,
    isThreadReplyTo,
  };
}

// =============================================================================
// Type Exports
// =============================================================================

export type { ThreadInfo, ThreadReply, ThreadOptions };