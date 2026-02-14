"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSpaces } from "@/hooks/use-spaces";
import { SpaceNavItem, SpaceChannel } from "@/lib/matrix/types/space";
import { Room } from "matrix-js-sdk";
import { useMatrix } from "@/components/providers/matrix-provider";
import { getDMsWithInfo, DirectMessageRoom } from "@/services/matrix-dm";

// =============================================================================
// Types
// =============================================================================

/**
 * Types of destinations in the quick switcher
 */
export type QuickSwitcherItemType = "space" | "channel" | "dm";

/**
 * A searchable item in the quick switcher
 */
export interface QuickSwitcherItem {
  /** Unique identifier */
  id: string;
  /** Type of item */
  type: QuickSwitcherItemType;
  /** Display name */
  name: string;
  /** Parent space name (for channels) */
  spaceName?: string;
  /** Space ID (for channels) */
  spaceId?: string;
  /** Avatar URL */
  avatarUrl?: string | null;
  /** Whether item has unread messages */
  hasUnread?: boolean;
  /** Number of unread mentions */
  mentionCount?: number;
  /** Navigation URL */
  url: string;
  /** Match score for search (0-1, higher = better) */
  score?: number;
}

/**
 * Recent destination for prioritization
 */
interface RecentDestination {
  /** Item ID */
  id: string;
  /** Type of destination */
  type: QuickSwitcherItemType;
  /** Last visited timestamp */
  timestamp: number;
  /** Navigation URL */
  url: string;
}

/**
 * Return type for the hook
 */
interface UseQuickSwitcherReturn {
  /** Search query */
  query: string;
  /** Set search query */
  setQuery: (query: string) => void;
  /** Filtered and sorted items */
  filteredItems: QuickSwitcherItem[];
  /** Currently selected index */
  selectedIndex: number;
  /** Set selected index */
  setSelectedIndex: (index: number) => void;
  /** Navigate to selected item */
  navigateToSelected: () => void;
  /** Navigate to specific item */
  navigateToItem: (item: QuickSwitcherItem) => void;
  /** Handle keyboard navigation */
  handleKeyDown: (event: React.KeyboardEvent) => void;
  /** Loading state */
  isLoading: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const RECENT_DESTINATIONS_KEY = "quickSwitcher:recentDestinations";
const MAX_RECENT_DESTINATIONS = 10;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Simple fuzzy search implementation
 */
function fuzzyMatch(query: string, text: string): { matches: boolean; score: number } {
  if (!query) return { matches: true, score: 1 };
  
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Exact match gets highest score
  if (textLower.includes(queryLower)) {
    const exactScore = queryLower.length / textLower.length;
    return { matches: true, score: exactScore };
  }
  
  // Character-by-character fuzzy matching
  let queryIndex = 0;
  let matches = 0;
  let consecutiveMatches = 0;
  let maxConsecutiveMatches = 0;
  
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
      matches++;
      consecutiveMatches++;
      maxConsecutiveMatches = Math.max(maxConsecutiveMatches, consecutiveMatches);
    } else {
      consecutiveMatches = 0;
    }
  }
  
  const matchesAll = queryIndex === queryLower.length;
  if (!matchesAll) return { matches: false, score: 0 };
  
  // Score based on match ratio and consecutive character bonus
  const matchRatio = matches / queryLower.length;
  const consecutiveBonus = maxConsecutiveMatches / queryLower.length;
  const lengthPenalty = 1 - (textLower.length - queryLower.length) / textLower.length;
  
  const score = (matchRatio * 0.4) + (consecutiveBonus * 0.4) + (Math.max(0, lengthPenalty) * 0.2);
  
  return { matches: true, score: Math.max(0, Math.min(1, score)) };
}

/**
 * Load recent destinations from localStorage
 */
function loadRecentDestinations(): RecentDestination[] {
  try {
    const stored = localStorage.getItem(RECENT_DESTINATIONS_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("[useQuickSwitcher] Failed to load recent destinations:", error);
    return [];
  }
}

/**
 * Save recent destinations to localStorage
 */
function saveRecentDestinations(destinations: RecentDestination[]): void {
  try {
    const limited = destinations.slice(0, MAX_RECENT_DESTINATIONS);
    localStorage.setItem(RECENT_DESTINATIONS_KEY, JSON.stringify(limited));
  } catch (error) {
    console.warn("[useQuickSwitcher] Failed to save recent destinations:", error);
  }
}

/**
 * Add or update a recent destination
 */
function addRecentDestination(destinations: RecentDestination[], item: QuickSwitcherItem): RecentDestination[] {
  const existing = destinations.findIndex(d => d.id === item.id && d.type === item.type);
  const newDestination: RecentDestination = {
    id: item.id,
    type: item.type,
    timestamp: Date.now(),
    url: item.url,
  };
  
  if (existing >= 0) {
    // Update existing
    const updated = [...destinations];
    updated[existing] = newDestination;
    return updated.sort((a, b) => b.timestamp - a.timestamp);
  } else {
    // Add new
    return [newDestination, ...destinations].sort((a, b) => b.timestamp - a.timestamp);
  }
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for Discord-style Quick Switcher functionality
 * 
 * Provides fuzzy search across spaces and channels with recent destination priority.
 * Handles keyboard navigation and item selection.
 */
export function useQuickSwitcher(): UseQuickSwitcherReturn {
  const router = useRouter();
  const { spaces, isLoading: spacesLoading } = useSpaces();
  const { client, isReady } = useMatrix();
  
  // State
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentDestinations, setRecentDestinations] = useState<RecentDestination[]>([]);
  const [dmRooms, setDmRooms] = useState<DirectMessageRoom[]>([]);
  const [dmLoading, setDmLoading] = useState(true);
  
  // Load recent destinations on mount
  useEffect(() => {
    setRecentDestinations(loadRecentDestinations());
  }, []);

  // Load DM rooms
  useEffect(() => {
    const loadDMs = async () => {
      if (!client) {
        setDmLoading(false);
        return;
      }

      try {
        setDmLoading(true);
        const dms = await getDMsWithInfo();
        setDmRooms(dms);
      } catch (error) {
        console.error("Failed to load DMs for quick switcher:", error);
        setDmRooms([]);
      } finally {
        setDmLoading(false);
      }
    };

    loadDMs();
  }, [client, isReady]);
  
  // Generate all searchable items
  const allItems = useMemo((): QuickSwitcherItem[] => {
    const items: QuickSwitcherItem[] = [];
    
    // Add spaces (servers)
    spaces.forEach(space => {
      items.push({
        id: space.id,
        type: "space",
        name: space.name,
        avatarUrl: space.avatarUrl,
        hasUnread: space.hasUnread,
        mentionCount: space.mentionCount,
        url: `/servers/${space.id}`,
      });
      
      // TODO: Add channels from each space when Matrix room listing is available
      // For now, we'll only show spaces since channel data isn't readily available
      // in the current hook structure. This will be enhanced in future iterations
      // when Matrix sync provides full room hierarchies.
    });
    
    // Add DM rooms
    dmRooms.forEach(dmRoom => {
      items.push({
        id: dmRoom.roomId,
        type: "dm",
        name: dmRoom.otherUserDisplayName || dmRoom.otherUserId || "Unknown User",
        avatarUrl: dmRoom.otherUserAvatarUrl,
        hasUnread: dmRoom.getUnreadNotificationCount() > 0,
        mentionCount: dmRoom.getUnreadNotificationCount(),
        url: `/channels/@me/${dmRoom.roomId}`,
      });
    });
    
    return items;
  }, [spaces, dmRooms]);
  
  // Filter and sort items based on query and recency
  const filteredItems = useMemo((): QuickSwitcherItem[] => {
    if (!query.trim()) {
      // No query: show recent items first, then all items
      const recentIds = new Set(recentDestinations.map(r => `${r.type}:${r.id}`));
      const recentItems = recentDestinations
        .map(recent => allItems.find(item => item.id === recent.id && item.type === recent.type))
        .filter(Boolean) as QuickSwitcherItem[];
      
      const otherItems = allItems.filter(item => !recentIds.has(`${item.type}:${item.id}`));
      
      return [...recentItems, ...otherItems];
    }
    
    // With query: fuzzy search and sort by score
    const searchResults: QuickSwitcherItem[] = [];
    
    for (const item of allItems) {
      // Search in name and space name
      const nameMatch = fuzzyMatch(query, item.name);
      const spaceMatch = item.spaceName ? fuzzyMatch(query, item.spaceName) : { matches: false, score: 0 };
      
      if (nameMatch.matches || spaceMatch.matches) {
        // Use best match score, with slight bonus for name matches
        const score = Math.max(nameMatch.score, spaceMatch.score * 0.8);
        
        // Recent item bonus
        const isRecent = recentDestinations.some(r => r.id === item.id && r.type === item.type);
        const finalScore = isRecent ? score * 1.1 : score;
        
        searchResults.push({
          ...item,
          score: finalScore,
        });
      }
    }
    
    // Sort by score (highest first)
    return searchResults.sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [query, allItems, recentDestinations]);
  
  // Reset selected index when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);
  
  // Navigation functions
  const navigateToItem = useCallback((item: QuickSwitcherItem) => {
    // Update recent destinations
    const updated = addRecentDestination(recentDestinations, item);
    setRecentDestinations(updated);
    saveRecentDestinations(updated);
    
    // Navigate
    router.push(item.url);
  }, [router, recentDestinations]);
  
  const navigateToSelected = useCallback(() => {
    const selected = filteredItems[selectedIndex];
    if (selected) {
      navigateToItem(selected);
    }
  }, [filteredItems, selectedIndex, navigateToItem]);
  
  // Keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredItems.length);
        break;
        
      case "ArrowUp":
        event.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
        break;
        
      case "Enter":
        event.preventDefault();
        navigateToSelected();
        break;
        
      case "Escape":
        event.preventDefault();
        // Modal close is handled by the modal component
        break;
    }
  }, [filteredItems.length, navigateToSelected]);
  
  return {
    query,
    setQuery,
    filteredItems,
    selectedIndex,
    setSelectedIndex,
    navigateToSelected,
    navigateToItem,
    handleKeyDown,
    isLoading: spacesLoading || !isReady,
  };
}