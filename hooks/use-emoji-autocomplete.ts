"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import data from "@emoji-mart/data";

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

interface EmojiRange {
  start: number;
  end: number;
  query: string;
  isActive: boolean;
}

interface UseEmojiAutocompleteReturn {
  /**
   * Whether the emoji autocomplete should be shown
   */
  showAutocomplete: boolean;
  
  /**
   * Current emoji query (text after :)
   */
  emojiQuery: string;
  
  /**
   * Position for the autocomplete dropdown
   */
  autocompletePosition: {
    top: number;
    left: number;
  };
  
  /**
   * Array of filtered emojis for autocomplete
   */
  filteredEmojis: EmojiData[];
  
  /**
   * Current emoji range being typed
   */
  currentEmojiRange: EmojiRange | null;
  
  /**
   * Handle input change to detect : emoji triggers
   */
  handleInputChange: (value: string, selectionStart: number, inputElement: HTMLInputElement) => void;
  
  /**
   * Handle emoji selection from autocomplete
   */
  handleEmojiSelect: (emoji: EmojiData) => void;
  
  /**
   * Close the autocomplete dropdown
   */
  closeAutocomplete: () => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert emoji-mart data format to our EmojiData interface
 */
function processEmojiData(): EmojiData[] {
  const emojis: EmojiData[] = [];
  
  // Access emoji data from emoji-mart
  const categories = (data as any).categories;
  const emojiData = (data as any).emojis;
  
  if (!emojiData) return emojis;
  
  Object.keys(emojiData).forEach(emojiId => {
    const emoji = emojiData[emojiId];
    
    if (emoji.skins && emoji.skins[0]) {
      const skin = emoji.skins[0];
      emojis.push({
        id: emojiId,
        name: emoji.name || emojiId,
        native: skin.native || '',
        shortcodes: `:${emoji.id}:`,
        keywords: emoji.keywords || [],
        category: emoji.category || 'people',
      });
    }
  });
  
  return emojis;
}

/**
 * Find : symbols and their positions in text for emoji triggers
 */
function findEmojiTriggers(text: string, cursorPosition: number): EmojiRange | null {
  // Look backwards from cursor to find the nearest :
  let start = -1;
  for (let i = cursorPosition - 1; i >= 0; i--) {
    const char = text[i];
    
    // Found trigger symbol
    if (char === ":") {
      start = i;
      break;
    }
    
    // Hit whitespace or newline - stop looking
    if (char === " " || char === "\n" || char === "\t") {
      break;
    }
  }
  
  if (start === -1) return null;
  
  // Find the end of the emoji (next space, : or end of string)
  let end = cursorPosition;
  for (let i = start + 1; i < text.length; i++) {
    const char = text[i];
    if (char === " " || char === "\n" || char === "\t" || char === ":") {
      end = i;
      break;
    }
    end = i + 1;
  }
  
  // Extract the query (everything after : symbol)
  const query = text.substring(start + 1, cursorPosition);
  
  // Validate that cursor is within this emoji range and query doesn't contain special chars
  const isActive = cursorPosition > start && cursorPosition <= end && 
                   !query.includes(" ") && !query.includes("\n");
  
  return {
    start,
    end,
    query,
    isActive,
  };
}

/**
 * Calculate position for autocomplete dropdown relative to input
 */
function calculateAutocompletePosition(
  inputElement: HTMLInputElement,
  emojiStart: number
): { top: number; left: number } {
  const inputRect = inputElement.getBoundingClientRect();
  
  // Create a temporary span to measure text width up to emoji start
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
  
  // Measure text up to the : symbol
  const textBeforeEmoji = inputElement.value.substring(0, emojiStart);
  tempSpan.textContent = textBeforeEmoji;
  
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
 * Filter emojis based on query with fuzzy matching
 */
function filterEmojis(emojis: EmojiData[], query: string, maxResults: number = 10): EmojiData[] {
  if (!query.trim()) {
    // If no query, return most popular emojis
    const popularEmojis = [
      'grinning', 'grin', 'joy', 'smiley', 'smile', 'sweat_smile',
      'laughing', 'wink', 'blush', 'yum', 'heart_eyes', 'smirk',
      'unamused', 'sweat', 'pensive', 'confused', 'confounded', 'kissing_heart',
      'heart', 'broken_heart', 'two_hearts', 'sparkling_heart',
      'thumbsup', 'thumbsdown', 'ok_hand', 'fist', 'v', 'wave',
      'fire', 'tada', '100', 'thinking_face', 'eyes', 'raised_hands'
    ];
    
    return emojis
      .filter(emoji => popularEmojis.includes(emoji.id))
      .slice(0, maxResults);
  }

  const normalizedQuery = query.toLowerCase().trim();
  
  // Filter emojis that match the query
  const matchingEmojis = emojis.filter(emoji => {
    // Check name match
    const nameMatch = emoji.name.toLowerCase().includes(normalizedQuery);
    
    // Check shortcode match (without the colons)
    const shortcodeMatch = emoji.id.toLowerCase().includes(normalizedQuery);
    
    // Check keywords match
    const keywordMatch = emoji.keywords.some(keyword => 
      keyword.toLowerCase().includes(normalizedQuery)
    );
    
    return nameMatch || shortcodeMatch || keywordMatch;
  });

  // Sort by relevance
  matchingEmojis.sort((a, b) => {
    const aNameStartsWith = a.name.toLowerCase().startsWith(normalizedQuery);
    const bNameStartsWith = b.name.toLowerCase().startsWith(normalizedQuery);
    const aIdStartsWith = a.id.toLowerCase().startsWith(normalizedQuery);
    const bIdStartsWith = b.id.toLowerCase().startsWith(normalizedQuery);

    // Prioritize exact starts with name
    if (aNameStartsWith && !bNameStartsWith) return -1;
    if (!aNameStartsWith && bNameStartsWith) return 1;
    
    // Then prioritize exact starts with id 
    if (aIdStartsWith && !bIdStartsWith) return -1;
    if (!aIdStartsWith && bIdStartsWith) return 1;

    // Then by name alphabetically
    return a.name.localeCompare(b.name);
  });

  return matchingEmojis.slice(0, maxResults);
}

/**
 * Replace emoji range in text with actual emoji
 */
function replaceEmoji(
  text: string,
  emojiRange: EmojiRange,
  emoji: EmojiData
): { newText: string; newCursorPos: number } {
  const before = text.substring(0, emojiRange.start);
  const after = text.substring(emojiRange.end);
  
  const newText = before + emoji.native + after;
  const newCursorPos = before.length + emoji.native.length;
  
  return { newText, newCursorPos };
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for handling :emoji: autocomplete in chat input
 * 
 * Provides autocomplete functionality with fuzzy search through emoji data
 */
export function useEmojiAutocomplete(): UseEmojiAutocompleteReturn {
  // Process emoji data once
  const allEmojis = useMemo(() => processEmojiData(), []);
  
  // State
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [emojiQuery, setEmojiQuery] = useState("");
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [currentValue, setCurrentValue] = useState("");
  const [currentEmojiRange, setCurrentEmojiRange] = useState<EmojiRange | null>(null);
  
  // Refs
  const inputElementRef = useRef<HTMLInputElement | null>(null);
  
  // Filter emojis based on current query
  const filteredEmojis = useMemo(() => {
    return filterEmojis(allEmojis, emojiQuery);
  }, [allEmojis, emojiQuery]);
  
  // =============================================================================
  // Event Handlers
  // =============================================================================
  
  /**
   * Handle input changes to detect and manage emoji triggers
   */
  const handleInputChange = useCallback((
    value: string, 
    selectionStart: number, 
    inputElement: HTMLInputElement
  ) => {
    setCurrentValue(value);
    inputElementRef.current = inputElement;
    
    // Find emoji trigger at cursor position
    const emojiRange = findEmojiTriggers(value, selectionStart);
    
    if (emojiRange && emojiRange.isActive) {
      // Active emoji trigger found
      setCurrentEmojiRange(emojiRange);
      setEmojiQuery(emojiRange.query);
      
      // Calculate autocomplete position
      const position = calculateAutocompletePosition(inputElement, emojiRange.start);
      setAutocompletePosition(position);
      setShowAutocomplete(true);
    } else {
      // No active emoji trigger
      setCurrentEmojiRange(null);
      setEmojiQuery("");
      setShowAutocomplete(false);
    }
  }, []);
  
  /**
   * Handle emoji selection from autocomplete
   */
  const handleEmojiSelect = useCallback((emoji: EmojiData) => {
    if (!currentEmojiRange || !inputElementRef.current) return;
    
    // Replace the emoji range with the actual emoji
    const { newText, newCursorPos } = replaceEmoji(
      currentValue,
      currentEmojiRange,
      emoji
    );
    
    // Update input value and cursor position
    const inputElement = inputElementRef.current;
    inputElement.value = newText;
    inputElement.setSelectionRange(newCursorPos, newCursorPos);
    
    // Update state
    setCurrentValue(newText);
    setShowAutocomplete(false);
    setCurrentEmojiRange(null);
    setEmojiQuery("");
    
    // Focus back on input
    inputElement.focus();
    
    // Trigger input event to notify parent components
    const event = new Event("input", { bubbles: true });
    inputElement.dispatchEvent(event);
  }, [currentValue, currentEmojiRange]);
  
  /**
   * Close the autocomplete dropdown
   */
  const closeAutocomplete = useCallback(() => {
    setShowAutocomplete(false);
    setCurrentEmojiRange(null);
    setEmojiQuery("");
  }, []);
  
  // =============================================================================
  // Return Value
  // =============================================================================
  
  return {
    showAutocomplete,
    emojiQuery,
    autocompletePosition,
    filteredEmojis,
    currentEmojiRange,
    handleInputChange,
    handleEmojiSelect,
    closeAutocomplete,
  };
}