"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Room } from "matrix-js-sdk";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// =============================================================================
// Types & Interfaces
// =============================================================================

interface ChannelMention {
  id: string;
  name: string;
  topic?: string;
  type: "text" | "voice" | "announcement";
}

interface ChannelAutocompleteProps {
  /**
   * Array of Matrix rooms to search from
   */
  rooms: Room[];
  
  /**
   * Current search query (the text after #)
   */
  query: string;
  
  /**
   * Position to show the autocomplete dropdown
   */
  position: {
    top: number;
    left: number;
  };
  
  /**
   * Whether the autocomplete is visible
   */
  visible: boolean;
  
  /**
   * Callback when a channel is selected
   */
  onSelect: (channel: ChannelMention) => void;
  
  /**
   * Callback when autocomplete should be closed
   */
  onClose: () => void;
  
  /**
   * Maximum number of results to show
   * @default 10
   */
  maxResults?: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Converts a Matrix Room to a ChannelMention
 */
function roomToChannelMention(room: Room): ChannelMention {
  // Determine channel type based on room state
  let type: ChannelMention['type'] = "text";
  const createEvent = room.currentState.getStateEvents("m.room.create", "");
  const roomType = createEvent?.getContent()?.type;
  
  switch (roomType) {
    case "m.space.voice":
      type = "voice";
      break;
    case "m.space.announcement":
      type = "announcement";
      break;
    default:
      type = "text";
  }
  
  return {
    id: room.roomId,
    name: room.name || room.canonicalAlias || "Unnamed Channel",
    topic: room.currentState.getStateEvents("m.room.topic", "")[0]?.getContent()?.topic,
    type
  };
}

/**
 * Filters and sorts channels based on search query
 */
function filterChannels(rooms: Room[], query: string, maxResults: number = 10): ChannelMention[] {
  if (!query.trim()) {
    // If no query, return first N rooms
    return rooms
      .slice(0, maxResults)
      .map(roomToChannelMention);
  }

  const normalizedQuery = query.toLowerCase().trim();
  
  // Convert to ChannelMention and filter
  const channelMentions = rooms
    .map(roomToChannelMention)
    .filter(channel => {
      const nameMatch = channel.name.toLowerCase().includes(normalizedQuery);
      const topicMatch = channel.topic?.toLowerCase().includes(normalizedQuery) || false;
      return nameMatch || topicMatch;
    });

  // Sort by relevance
  channelMentions.sort((a, b) => {
    const aNameStart = a.name.toLowerCase().startsWith(normalizedQuery);
    const bNameStart = b.name.toLowerCase().startsWith(normalizedQuery);
    const aTopicStart = a.topic?.toLowerCase().startsWith(normalizedQuery) || false;
    const bTopicStart = b.topic?.toLowerCase().startsWith(normalizedQuery) || false;

    // Prioritize exact name starts
    if (aNameStart && !bNameStart) return -1;
    if (!aNameStart && bNameStart) return 1;
    
    // Then prioritize topic matches
    if (aTopicStart && !bTopicStart) return -1;
    if (!aTopicStart && bTopicStart) return 1;

    // Then by name
    return a.name.localeCompare(b.name);
  });

  return channelMentions.slice(0, maxResults);
}

// Icon for different channel types
const ChannelTypeIcon = {
  text: "#",
  voice: "🔊",
  announcement: "📢"
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * Autocomplete dropdown for #channel mentions
 * 
 * Provides a searchable list of rooms that appears when typing # in chat.
 * Supports keyboard navigation and mouse selection.
 */
export function ChannelAutocomplete({
  rooms,
  query,
  position,
  visible,
  onSelect,
  onClose,
  maxResults = 10,
}: ChannelAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Filter rooms based on query
  const filteredChannels = filterChannels(rooms, query, maxResults);
  
  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!visible || filteredChannels.length === 0) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredChannels.length - 1 ? prev + 1 : 0
        );
        break;
        
      case "ArrowUp":
        event.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredChannels.length - 1
        );
        break;
        
      case "Enter":
        event.preventDefault();
        if (filteredChannels[selectedIndex]) {
          onSelect(filteredChannels[selectedIndex]);
        }
        break;
        
      case "Escape":
        event.preventDefault();
        onClose();
        break;
    }
  }, [visible, filteredChannels, selectedIndex, onSelect, onClose]);

  // Set up keyboard event listeners
  useEffect(() => {
    if (visible) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [visible, handleKeyDown]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [visible, onClose]);

  if (!visible || filteredChannels.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed z-50 min-w-[280px] max-w-[400px] bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 py-2",
        "animate-in fade-in-0 zoom-in-95 duration-100"
      )}
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {/* Header */}
      <div className="px-3 py-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide border-b border-zinc-100 dark:border-zinc-700">
        Channels
      </div>
      
      {/* Channel list */}
      <div className="max-h-60 overflow-y-auto">
        {filteredChannels.map((channel, index) => (
          <button
            key={channel.id}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors",
              selectedIndex === index && "bg-indigo-100 dark:bg-indigo-900/50"
            )}
            onClick={() => onSelect(channel)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            {/* Channel icon */}
            <Avatar className="h-8 w-8 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
              <AvatarFallback className="font-bold text-xs">
                {ChannelTypeIcon[channel.type]}
              </AvatarFallback>
            </Avatar>
            
            {/* Channel info */}
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-2">
                {ChannelTypeIcon[channel.type]}
                {channel.name}
              </span>
              {channel.topic && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                  {channel.topic}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
      
      {/* Footer hint */}
      <div className="px-3 py-1 text-xs text-zinc-400 dark:text-zinc-500 border-t border-zinc-100 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 rounded-b-lg">
        ↑↓ navigate • Enter select • Esc close
      </div>
    </div>
  );
}