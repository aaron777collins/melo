"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { MatrixEvent, EventType } from "matrix-js-sdk";

import { useMatrixClient } from "./use-matrix-client";

// =============================================================================
// Types
// =============================================================================

/**
 * Pinned message information
 */
export interface PinnedMessage {
  /**
   * Event ID of the pinned message
   */
  eventId: string;
  
  /**
   * The actual Matrix event
   */
  event: MatrixEvent | null;
  
  /**
   * Timestamp when the message was sent
   */
  timestamp: number;
  
  /**
   * User ID who sent the message
   */
  sender: string;
  
  /**
   * Message content (text body)
   */
  content: string;
  
  /**
   * Timestamp when the message was pinned
   */
  pinnedAt: number;
  
  /**
   * User ID who pinned the message
   */
  pinnedBy: string;
}

/**
 * Options for pin operations
 */
export interface PinOptions {
  /**
   * Maximum number of pinned messages to load
   */
  maxPins?: number;
  
  /**
   * Whether to include redacted messages
   */
  includeRedacted?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Matrix state event type for pinned messages
 */
const PINNED_EVENTS_TYPE = "m.room.pinned_events";

/**
 * Default maximum number of pinned messages
 */
const DEFAULT_MAX_PINS = 50;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract pinned event IDs from Matrix state event
 */
function extractPinnedEventIds(stateEvent: MatrixEvent | null): string[] {
  if (!stateEvent) return [];
  
  const content = stateEvent.getContent();
  return Array.isArray(content.pinned) ? content.pinned : [];
}

/**
 * Create pinned message info from Matrix event
 */
function createPinnedMessage(
  eventId: string,
  event: MatrixEvent | null,
  pinnedAt: number,
  pinnedBy: string
): PinnedMessage {
  return {
    eventId,
    event,
    timestamp: event?.getTs() || 0,
    sender: event?.getSender() || "",
    content: event?.getContent().body || "",
    pinnedAt,
    pinnedBy,
  };
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for managing pinned messages in a Matrix room
 */
export function usePins(roomId: string, options: PinOptions = {}) {
  const { client, isReady } = useMatrixClient();
  const { maxPins = DEFAULT_MAX_PINS, includeRedacted = false } = options;
  
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);
  const [loading, setLoading] = useState(false);
  
  const currentUserId = client?.getUserId();
  
  // =============================================================================
  // State Management
  // =============================================================================
  
  /**
   * Load pinned messages from room state
   */
  const loadPinnedMessages = useCallback(async () => {
    if (!client || !isReady || !roomId) return;
    
    setLoading(true);
    
    try {
      const room = client.getRoom(roomId);
      if (!room) {
        setLoading(false);
        return;
      }
      
      // Get the pinned events state
      const pinnedEventsState = room.currentState.getStateEvents(PINNED_EVENTS_TYPE, "");
      const pinnedEventIds = extractPinnedEventIds(pinnedEventsState);
      
      if (pinnedEventIds.length === 0) {
        setPinnedMessages([]);
        setLoading(false);
        return;
      }
      
      // Get the actual events for each pinned event ID
      const pinnedMessages: PinnedMessage[] = [];
      
      for (const eventId of pinnedEventIds.slice(0, maxPins)) {
        try {
          // Try to get the event from room timeline first
          let event = room.findEventById(eventId);
          
          // If not found in timeline, try to fetch it
          if (!event) {
            const response = await client.fetchRoomEvent(roomId, eventId);
            if (response) {
              event = new MatrixEvent(response);
            }
          }
          
          // Skip redacted messages unless includeRedacted is true
          if (!includeRedacted && event?.isRedacted()) {
            continue;
          }
          
          const pinInfo = createPinnedMessage(
            eventId,
            event ?? null,
            pinnedEventsState?.getTs() || Date.now(),
            pinnedEventsState?.getSender() || ""
          );
          
          pinnedMessages.push(pinInfo);
        } catch (error) {
          console.warn(`Failed to load pinned message ${eventId}:`, error);
          
          // Still add placeholder for missing messages
          const pinInfo = createPinnedMessage(
            eventId,
            null,
            pinnedEventsState?.getTs() || Date.now(),
            pinnedEventsState?.getSender() || ""
          );
          
          pinnedMessages.push(pinInfo);
        }
      }
      
      // Sort by pin timestamp (most recent first)
      pinnedMessages.sort((a, b) => b.pinnedAt - a.pinnedAt);
      
      setPinnedMessages(pinnedMessages);
    } catch (error) {
      console.error("Failed to load pinned messages:", error);
      setPinnedMessages([]);
    }
    
    setLoading(false);
  }, [client, isReady, roomId, maxPins, includeRedacted]);
  
  // =============================================================================
  // Pin Actions
  // =============================================================================
  
  /**
   * Pin a message
   */
  const pinMessage = useCallback(async (eventId: string): Promise<boolean> => {
    if (!client || !roomId || !eventId) return false;
    
    try {
      const room = client.getRoom(roomId);
      if (!room) return false;
      
      // Get current pinned events
      const pinnedEventsState = room.currentState.getStateEvents(PINNED_EVENTS_TYPE, "");
      const currentPins = extractPinnedEventIds(pinnedEventsState);
      
      // Check if already pinned
      if (currentPins.includes(eventId)) {
        console.log("Message is already pinned");
        return true;
      }
      
      // Add to pinned events
      const newPins = [...currentPins, eventId];
      
      // Send state event to update pinned messages
      await client.sendStateEvent(roomId, PINNED_EVENTS_TYPE as any, {
        pinned: newPins
      }, "");
      
      // Reload pinned messages
      setTimeout(() => {
        loadPinnedMessages();
      }, 500);
      
      return true;
    } catch (error) {
      console.error("Failed to pin message:", error);
      return false;
    }
  }, [client, roomId, loadPinnedMessages]);
  
  /**
   * Unpin a message
   */
  const unpinMessage = useCallback(async (eventId: string): Promise<boolean> => {
    if (!client || !roomId || !eventId) return false;
    
    try {
      const room = client.getRoom(roomId);
      if (!room) return false;
      
      // Get current pinned events
      const pinnedEventsState = room.currentState.getStateEvents(PINNED_EVENTS_TYPE, "");
      const currentPins = extractPinnedEventIds(pinnedEventsState);
      
      // Remove from pinned events
      const newPins = currentPins.filter(pin => pin !== eventId);
      
      // Send state event to update pinned messages
      await client.sendStateEvent(roomId, PINNED_EVENTS_TYPE as any, {
        pinned: newPins
      }, "");
      
      // Reload pinned messages
      setTimeout(() => {
        loadPinnedMessages();
      }, 500);
      
      return true;
    } catch (error) {
      console.error("Failed to unpin message:", error);
      return false;
    }
  }, [client, roomId, loadPinnedMessages]);
  
  /**
   * Check if a message is pinned
   */
  const isPinned = useCallback((eventId: string): boolean => {
    return pinnedMessages.some(pin => pin.eventId === eventId);
  }, [pinnedMessages]);
  
  /**
   * Get pin info for a specific message
   */
  const getPinInfo = useCallback((eventId: string): PinnedMessage | null => {
    return pinnedMessages.find(pin => pin.eventId === eventId) || null;
  }, [pinnedMessages]);
  
  /**
   * Check if current user can pin messages (requires power level)
   */
  const canPin = useCallback((): boolean => {
    if (!client || !roomId || !currentUserId) return false;
    
    try {
      const room = client.getRoom(roomId);
      if (!room) return false;
      
      // Get user's power level
      const powerLevelEvent = room.currentState.getStateEvents("m.room.power_levels", "");
      if (!powerLevelEvent) return false;
      
      const powerLevels = powerLevelEvent.getContent();
      const userLevel = powerLevels.users?.[currentUserId] || powerLevels.users_default || 0;
      const requiredLevel = powerLevels.events?.[PINNED_EVENTS_TYPE] || powerLevels.state_default || 50;
      
      return userLevel >= requiredLevel;
    } catch (error) {
      console.error("Failed to check pin permissions:", error);
      return false;
    }
  }, [client, roomId, currentUserId]);
  
  // =============================================================================
  // Effects
  // =============================================================================
  
  /**
   * Load pinned messages when room or client changes
   */
  useEffect(() => {
    if (isReady && roomId) {
      loadPinnedMessages();
    }
  }, [isReady, roomId, loadPinnedMessages]);
  
  /**
   * Listen for room state updates to refresh pinned messages
   */
  useEffect(() => {
    if (!client || !isReady || !roomId) return;
    
    const room = client.getRoom(roomId);
    if (!room) return;
    
    const handleStateUpdate = (event: MatrixEvent) => {
      // Only refresh if it's a pinned events update
      if (event.getType() === PINNED_EVENTS_TYPE) {
        loadPinnedMessages();
      }
    };
    
    room.on("Room.state" as any, handleStateUpdate);
    
    return () => {
      room.off("Room.state" as any, handleStateUpdate);
    };
  }, [client, isReady, roomId, loadPinnedMessages]);
  
  // =============================================================================
  // Memoized Values
  // =============================================================================
  
  const pinCount = useMemo(() => pinnedMessages.length, [pinnedMessages]);
  
  const hasPins = useMemo(() => pinnedMessages.length > 0, [pinnedMessages]);
  
  const sortedPins = useMemo(() => {
    return [...pinnedMessages].sort((a, b) => b.timestamp - a.timestamp);
  }, [pinnedMessages]);
  
  // =============================================================================
  // Return Interface
  // =============================================================================
  
  return {
    // Data
    pinnedMessages,
    sortedPins,
    pinCount,
    hasPins,
    loading,
    
    // Methods
    pinMessage,
    unpinMessage,
    isPinned,
    getPinInfo,
    canPin,
    loadPinnedMessages,
    
    // Utils
    extractPinnedEventIds,
  };
}