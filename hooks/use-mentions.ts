"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { RoomMember, Room } from "matrix-js-sdk";
import { useRoom } from "./use-room";
import { useSpaces } from "./use-spaces";

// =============================================================================
// Types & Interfaces
// =============================================================================

interface MentionUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
  username: string;
}

interface MentionChannel {
  id: string;
  name: string;
  type: "text" | "voice" | "announcement";
}

interface MentionRange {
  start: number;
  end: number;
  query: string;
  isActive: boolean;
  type: "user" | "channel";
}

interface UseMentionsReturn {
  /**
   * Whether the mention autocomplete should be shown
   */
  showAutocomplete: boolean;
  
  /**
   * Current mention query (text after @ or #)
   */
  mentionQuery: string;
  
  /**
   * Position for the autocomplete dropdown
   */
  autocompletePosition: {
    top: number;
    left: number;
  };
  
  /**
   * Array of room members for autocomplete
   */
  members: RoomMember[];
  
  /**
   * Array of rooms for channel autocomplete
   */
  rooms: Room[];
  
  /**
   * Handle input change to detect @ or # mentions
   */
  handleInputChange: (value: string, selectionStart: number, inputElement: HTMLInputElement) => void;
  
  /**
   * Handle user selection from autocomplete
   */
  handleUserSelect: (user: MentionUser) => void;
  
  /**
   * Handle channel selection from autocomplete
   */
  handleChannelSelect: (channel: MentionChannel) => void;
  
  /**
   * Close the autocomplete dropdown
   */
  closeAutocomplete: () => void;
  
  /**
   * Get the current input value with any pending mention replacements
   */
  getCurrentValue: () => string;
  
  /**
   * Parse message content to extract mention data for sending
   */
  parseMentions: (content: string) => {
    text: string;
    mentions: Array<{
      userId?: string;
      channelId?: string;
      displayName: string;
      offset: number;
      length: number;
      type: "user" | "channel";
    }>;
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Find @ and # symbols and their positions in text
 */
function findMentionTriggers(text: string, cursorPosition: number): MentionRange | null {
  // Look backwards from cursor to find the nearest @ or #
  let start = -1;
  let type: MentionRange['type'] = 'user';
  for (let i = cursorPosition - 1; i >= 0; i--) {
    const char = text[i];
    
    // Found trigger symbol
    if (char === "@" || char === "#") {
      start = i;
      type = char === "@" ? "user" : "channel";
      break;
    }
    
    // Hit whitespace or newline - stop looking
    if (char === " " || char === "\n" || char === "\t") {
      break;
    }
  }
  
  if (start === -1) return null;
  
  // Find the end of the mention (next space or end of string)
  let end = cursorPosition;
  for (let i = start + 1; i < text.length; i++) {
    const char = text[i];
    if (char === " " || char === "\n" || char === "\t") {
      end = i;
      break;
    }
    end = i + 1;
  }
  
  // Extract the query (everything after trigger symbol)
  const query = text.substring(start + 1, cursorPosition);
  
  // Validate that cursor is within this mention
  const isActive = cursorPosition > start && cursorPosition <= end;
  
  return {
    start,
    end,
    query,
    isActive,
    type,
  };
}

/**
 * Calculate position for autocomplete dropdown relative to input
 */
function calculateAutocompletePosition(
  inputElement: HTMLInputElement,
  mentionStart: number
): { top: number; left: number } {
  const inputRect = inputElement.getBoundingClientRect();
  
  // Create a temporary span to measure text width up to mention start
  const tempSpan = document.createElement("span");
  const computedStyle = window.getComputedStyle(inputElement);
  
  // Copy relevant styles
  tempSpan.style.font = computedStyle.font;
  tempSpan.style.fontSize = computedStyle.fontSize;
  tempSpan.style.fontFamily = computedStyle.fontFamily;
  tempSpan.style.fontWeight = computedStyle.fontWeight;
  tempSpan.style.letterSpacing = computedStyle.letterSpacing;
  tempSpan.style.visibility = "hidden";
  tempSpan.style.position = "absolute";
  tempSpan.style.whiteSpace = "pre";
  
  // Measure text up to the @ or # symbol
  const textBeforeMention = inputElement.value.substring(0, mentionStart);
  tempSpan.textContent = textBeforeMention;
  
  document.body.appendChild(tempSpan);
  const textWidth = tempSpan.offsetWidth;
  document.body.removeChild(tempSpan);
  
  // Calculate position
  const paddingLeft = parseInt(computedStyle.paddingLeft, 10) || 0;
  const left = inputRect.left + paddingLeft + textWidth;
  const top = inputRect.bottom + 4; // 4px gap below input
  
  return { top, left };
}

/**
 * Replace mention in text with formatted mention
 */
function replaceMention(
  text: string,
  mentionRange: MentionRange,
  item: MentionUser | MentionChannel
): { newText: string; newCursorPos: number } {
  const before = text.substring(0, mentionRange.start);
  const after = text.substring(mentionRange.end);
  const mentionText = mentionRange.type === "user" 
    ? `@${(item as MentionUser).username}` 
    : `#${(item as MentionChannel).name}`;
  
  const newText = before + mentionText + after;
  const newCursorPos = before.length + mentionText.length;
  
  return { newText, newCursorPos };
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for handling @user and #channel mentions in chat input
 * 
 * Provides autocomplete functionality, position calculation, and mention parsing
 * for Matrix-based mentions in chat messages.
 */
export function useMentions(roomId: string): UseMentionsReturn {
  const { members } = useRoom(roomId);
  // TODO: Implement space functionality when useSpace hook is available
  const space = null;
  
  // State
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [currentValue, setCurrentValue] = useState("");
  const [currentMentionRange, setCurrentMentionRange] = useState<MentionRange | null>(null);
  
  // Refs
  const inputElementRef = useRef<HTMLInputElement | null>(null);
  
  // Filter to only joined members (exclude banned, left, etc.)
  const activeMembers = useMemo(() => {
    return members.filter(member => member.membership === "join");
  }, [members]);

  // Get relevant rooms for channel mentions
  const spaceRooms = useMemo(() => {
    if (!space) return [];
    // TODO: Add filter for space-related rooms
    return space.getJoinedRooms().filter(room => {
      // You might want more sophisticated filtering 
      // based on room type, permissions, etc.
      return room.roomId !== roomId;
    });
  }, [space, roomId]);
  
  // =============================================================================
  // Event Handlers
  // =============================================================================
  
  /**
   * Handle input changes to detect and manage mentions
   */
  const handleInputChange = useCallback((
    value: string, 
    selectionStart: number, 
    inputElement: HTMLInputElement
  ) => {
    setCurrentValue(value);
    inputElementRef.current = inputElement;
    
    // Find mention at cursor position
    const mentionRange = findMentionTriggers(value, selectionStart);
    
    if (mentionRange && mentionRange.isActive) {
      // Active mention found
      setCurrentMentionRange(mentionRange);
      setMentionQuery(mentionRange.query);
      
      // Calculate autocomplete position
      const position = calculateAutocompletePosition(inputElement, mentionRange.start);
      setAutocompletePosition(position);
      setShowAutocomplete(true);
    } else {
      // No active mention
      setCurrentMentionRange(null);
      setMentionQuery("");
      setShowAutocomplete(false);
    }
  }, []);
  
  /**
   * Handle user selection from autocomplete
   */
  const handleUserSelect = useCallback((user: MentionUser) => {
    if (!currentMentionRange || !inputElementRef.current) return;
    
    // Ensure the current mention is a user
    if (currentMentionRange.type !== "user") return;
    
    // Replace the mention in the text
    const { newText, newCursorPos } = replaceMention(
      currentValue,
      currentMentionRange,
      user
    );
    
    // Update input value and cursor position
    const inputElement = inputElementRef.current;
    inputElement.value = newText;
    inputElement.setSelectionRange(newCursorPos, newCursorPos);
    
    // Update state
    setCurrentValue(newText);
    setShowAutocomplete(false);
    setCurrentMentionRange(null);
    setMentionQuery("");
    
    // Focus back on input
    inputElement.focus();
    
    // Trigger input event to notify parent components
    const event = new Event("input", { bubbles: true });
    inputElement.dispatchEvent(event);
  }, [currentValue, currentMentionRange]);
  
  /**
   * Handle channel selection from autocomplete
   */
  const handleChannelSelect = useCallback((channel: MentionChannel) => {
    if (!currentMentionRange || !inputElementRef.current) return;
    
    // Ensure the current mention is a channel
    if (currentMentionRange.type !== "channel") return;
    
    // Replace the mention in the text
    const { newText, newCursorPos } = replaceMention(
      currentValue,
      currentMentionRange,
      channel
    );
    
    // Update input value and cursor position
    const inputElement = inputElementRef.current;
    inputElement.value = newText;
    inputElement.setSelectionRange(newCursorPos, newCursorPos);
    
    // Update state
    setCurrentValue(newText);
    setShowAutocomplete(false);
    setCurrentMentionRange(null);
    setMentionQuery("");
    
    // Focus back on input
    inputElement.focus();
    
    // Trigger input event to notify parent components
    const event = new Event("input", { bubbles: true });
    inputElement.dispatchEvent(event);
  }, [currentValue, currentMentionRange]);
  
  /**
   * Close the autocomplete dropdown
   */
  const closeAutocomplete = useCallback(() => {
    setShowAutocomplete(false);
    setCurrentMentionRange(null);
    setMentionQuery("");
  }, []);
  
  /**
   * Get current input value
   */
  const getCurrentValue = useCallback(() => {
    return currentValue;
  }, [currentValue]);
  
  /**
   * Parse message content to extract mentions for Matrix sending
   */
  const parseMentions = useCallback((content: string) => {
    const mentions: Array<{
      userId?: string;
      channelId?: string;
      displayName: string;
      offset: number;
      length: number;
      type: "user" | "channel";
    }> = [];
    
    // Find all @username and #channel patterns
    const userMentionRegex = /@(\w+)/g;
    const channelMentionRegex = /#(\w+)/g;
    let match;
    
    // Find user mentions
    while ((match = userMentionRegex.exec(content)) !== null) {
      const username = match[1];
      const mentionText = match[0]; // Full @username
      
      // Find the corresponding user in room members
      const user = activeMembers.find(member => {
        const memberUsername = member.userId.startsWith("@") 
          ? member.userId.split(":")[0].substring(1)
          : member.userId;
        return memberUsername === username;
      });
      
      if (user) {
        mentions.push({
          userId: user.userId,
          displayName: user.name || user.rawDisplayName || user.userId,
          offset: match.index!,
          length: mentionText.length,
          type: "user",
        });
      }
    }
    
    // Find channel mentions
    while ((match = channelMentionRegex.exec(content)) !== null) {
      const channelName = match[1];
      const mentionText = match[0]; // Full #channelname
      
      // Find the corresponding channel
      const channel = spaceRooms.find(room => 
        (room.name || "").toLowerCase().replace(/\s+/g, "-") === channelName.toLowerCase()
      );
      
      if (channel) {
        mentions.push({
          channelId: channel.roomId,
          displayName: channel.name || "Unnamed Channel",
          offset: match.index!,
          length: mentionText.length,
          type: "channel",
        });
      }
    }
    
    return {
      text: content,
      mentions,
    };
  }, [activeMembers, spaceRooms]);
  
  // =============================================================================
  // Return Value
  // =============================================================================
  
  return {
    showAutocomplete,
    mentionQuery,
    autocompletePosition,
    members: activeMembers,
    rooms: spaceRooms,
    handleInputChange,
    handleUserSelect,
    handleChannelSelect,
    closeAutocomplete,
    getCurrentValue,
    parseMentions,
  };
}