"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

// =============================================================================
// Types & Interfaces
// =============================================================================

interface EmojiData {
  id: string;
  name: string;
  native: string;
  shortcodes: string;
  keywords: string[];
  category: string;
}

interface EmojiAutocompleteProps {
  /**
   * Array of filtered emojis to show
   */
  emojis: EmojiData[];
  
  /**
   * Current search query (the text after :)
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
   * Callback when an emoji is selected
   */
  onSelect: (emoji: EmojiData) => void;
  
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
 * Get category display name
 */
function getCategoryName(category: string): string {
  const categoryNames: Record<string, string> = {
    'people': 'People & Body',
    'nature': 'Animals & Nature',
    'foods': 'Food & Drink',
    'activity': 'Activities',
    'places': 'Travel & Places',
    'objects': 'Objects',
    'symbols': 'Symbols',
    'flags': 'Flags',
    'frequent': 'Frequently Used',
  };
  
  return categoryNames[category] || 'Emojis';
}

/**
 * Highlight matching text in emoji name
 */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  
  const normalizedQuery = query.toLowerCase();
  const normalizedText = text.toLowerCase();
  const index = normalizedText.indexOf(normalizedQuery);
  
  if (index === -1) return text;
  
  return (
    <>
      {text.substring(0, index)}
      <span className="bg-yellow-200 dark:bg-yellow-800 font-semibold">
        {text.substring(index, index + query.length)}
      </span>
      {text.substring(index + query.length)}
    </>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Autocomplete dropdown for :emoji: selection
 * 
 * Provides a searchable list of emojis that appears when typing : in chat.
 * Supports keyboard navigation and mouse selection.
 */
export function EmojiAutocomplete({
  emojis,
  query,
  position,
  visible,
  onSelect,
  onClose,
  maxResults = 10,
}: EmojiAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Limit emojis to maxResults - defensive programming
  const displayEmojis = (emojis || []).slice(0, maxResults);
  
  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!visible || displayEmojis.length === 0) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setSelectedIndex(prev => 
          prev < displayEmojis.length - 1 ? prev + 1 : 0
        );
        break;
        
      case "ArrowUp":
        event.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : displayEmojis.length - 1
        );
        break;
        
      case "Tab":
      case "Enter":
        event.preventDefault();
        if (displayEmojis[selectedIndex]) {
          onSelect(displayEmojis[selectedIndex]);
        }
        break;
        
      case "Escape":
        event.preventDefault();
        onClose();
        break;
    }
  }, [visible, displayEmojis, selectedIndex, onSelect, onClose]);

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

  if (!visible || displayEmojis.length === 0) {
    return null;
  }

  const headerText = query ? `Emojis matching "${query}"` : "Popular emojis";

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed z-50 min-w-[320px] max-w-[400px] bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 py-2",
        "animate-in fade-in-0 zoom-in-95 duration-100"
      )}
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {/* Header */}
      <div className="px-3 py-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide border-b border-zinc-100 dark:border-zinc-700">
        {headerText}
      </div>
      
      {/* Emoji list */}
      <div className="max-h-60 overflow-y-auto">
        {displayEmojis.map((emoji, index) => (
          <button
            key={emoji.id}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors",
              selectedIndex === index && "bg-indigo-100 dark:bg-indigo-900/50"
            )}
            onClick={() => onSelect(emoji)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            {/* Emoji */}
            <div className="text-xl leading-none w-6 h-6 flex items-center justify-center">
              {emoji.native}
            </div>
            
            {/* Emoji info */}
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {highlightMatch(emoji.name, query)}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                :{emoji.id}:
                {emoji.keywords.length > 0 && (
                  <>
                    {" • "}
                    {emoji.keywords.slice(0, 3).join(", ")}
                    {emoji.keywords.length > 3 && "..."}
                  </>
                )}
              </span>
            </div>
          </button>
        ))}
      </div>
      
      {/* Footer hint */}
      <div className="px-3 py-1 text-xs text-zinc-400 dark:text-zinc-500 border-t border-zinc-100 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 rounded-b-lg">
        ↑↓ navigate • Tab/Enter select • Esc close
      </div>
    </div>
  );
}