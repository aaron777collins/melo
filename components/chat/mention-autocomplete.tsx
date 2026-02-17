"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {  RoomMember  } from "@/lib/matrix/matrix-sdk-exports";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// =============================================================================
// Types & Interfaces
// =============================================================================

interface MentionUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
  username: string; // Matrix ID without @
}

interface MentionAutocompleteProps {
  /**
   * Array of room members to search from
   */
  members: RoomMember[];
  
  /**
   * Current search query (the text after @)
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
   * Callback when a user is selected
   */
  onSelect: (user: MentionUser) => void;
  
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
 * Converts RoomMember to MentionUser with proper username extraction
 */
function roomMemberToMentionUser(member: RoomMember): MentionUser {
  const userId = member.userId;
  const displayName = member.name || member.rawDisplayName || userId;
  
  // Extract username from Matrix ID (@username:domain.com -> username)
  const username = userId.startsWith("@") ? userId.split(":")[0].substring(1) : userId;
  
  return {
    id: userId,
    displayName,
    username,
    avatarUrl: member.getAvatarUrl(
      // TODO: Get homeserver URL from Matrix client
      "https://matrix.org",
      32,
      32,
      "crop",
      false,
      false
    ) || undefined,
  };
}

/**
 * Filters and sorts members based on search query
 */
function filterMembers(members: RoomMember[], query: string, maxResults: number = 10): MentionUser[] {
  if (!query.trim()) {
    // If no query, return recent/active members (for now, just first N members)
    return members
      .slice(0, maxResults)
      .map(roomMemberToMentionUser);
  }

  const normalizedQuery = query.toLowerCase().trim();
  
  // Convert to MentionUser and filter
  const mentionUsers = members
    .map(roomMemberToMentionUser)
    .filter(user => {
      // Search in both display name and username
      const displayNameMatch = user.displayName.toLowerCase().includes(normalizedQuery);
      const usernameMatch = user.username.toLowerCase().includes(normalizedQuery);
      return displayNameMatch || usernameMatch;
    });

  // Sort by relevance
  mentionUsers.sort((a, b) => {
    const aDisplayStart = a.displayName.toLowerCase().startsWith(normalizedQuery);
    const bDisplayStart = b.displayName.toLowerCase().startsWith(normalizedQuery);
    const aUsernameStart = a.username.toLowerCase().startsWith(normalizedQuery);
    const bUsernameStart = b.username.toLowerCase().startsWith(normalizedQuery);

    // Prioritize exact starts
    if (aDisplayStart && !bDisplayStart) return -1;
    if (!aDisplayStart && bDisplayStart) return 1;
    if (aUsernameStart && !bUsernameStart) return -1;
    if (!aUsernameStart && bUsernameStart) return 1;

    // Then by display name
    return a.displayName.localeCompare(b.displayName);
  });

  return mentionUsers.slice(0, maxResults);
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Autocomplete dropdown for @user mentions
 * 
 * Provides a searchable list of room members that appears when typing @ in chat.
 * Supports keyboard navigation and mouse selection.
 */
export function MentionAutocomplete({
  members,
  query,
  position,
  visible,
  onSelect,
  onClose,
  maxResults = 10,
}: MentionAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Filter members based on query
  const filteredUsers = filterMembers(members, query, maxResults);
  
  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!visible || filteredUsers.length === 0) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredUsers.length - 1 ? prev + 1 : 0
        );
        break;
        
      case "ArrowUp":
        event.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredUsers.length - 1
        );
        break;
        
      case "Enter":
        event.preventDefault();
        if (filteredUsers[selectedIndex]) {
          onSelect(filteredUsers[selectedIndex]);
        }
        break;
        
      case "Escape":
        event.preventDefault();
        onClose();
        break;
    }
  }, [visible, filteredUsers, selectedIndex, onSelect, onClose]);

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

  if (!visible || filteredUsers.length === 0) {
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
        Members
      </div>
      
      {/* Member list */}
      <div className="max-h-60 overflow-y-auto">
        {filteredUsers.map((user, index) => (
          <button
            key={user.id}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors",
              selectedIndex === index && "bg-indigo-100 dark:bg-indigo-900/50"
            )}
            onClick={() => onSelect(user)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            {/* Avatar */}
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatarUrl} alt={user.displayName} />
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold text-xs">
                {user.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            {/* User info */}
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {user.displayName}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                @{user.username}
              </span>
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