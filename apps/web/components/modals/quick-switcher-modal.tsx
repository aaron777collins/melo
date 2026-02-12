"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Hash, Users, MessageCircle, ChevronRight } from "lucide-react";
import Image from "next/image";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useModal } from "@/hooks/use-modal-store";
import { useQuickSwitcher, QuickSwitcherItem } from "@/apps/web/hooks/use-quick-switcher";
import { cn } from "@/lib/utils";
import { getSpaceInitials } from "@/lib/matrix/types/space";

/**
 * Get icon for quick switcher item type
 */
function getItemIcon(item: QuickSwitcherItem) {
  switch (item.type) {
    case "space":
      return <Users className="h-4 w-4 text-gray-400" />;
    case "channel":
      return <Hash className="h-4 w-4 text-gray-400" />;
    case "dm":
      return <MessageCircle className="h-4 w-4 text-gray-400" />;
    default:
      return <Hash className="h-4 w-4 text-gray-400" />;
  }
}

/**
 * Get display text for item type
 */
function getItemTypeText(item: QuickSwitcherItem): string {
  switch (item.type) {
    case "space":
      return "Server";
    case "channel":
      return "Channel";
    case "dm":
      return "Direct Message";
    default:
      return "";
  }
}

/**
 * Quick Switcher Item Component
 */
interface QuickSwitcherItemComponentProps {
  item: QuickSwitcherItem;
  isSelected: boolean;
  onSelect: (item: QuickSwitcherItem) => void;
  onMouseEnter: () => void;
}

function QuickSwitcherItemComponent({
  item,
  isSelected,
  onSelect,
  onMouseEnter,
}: QuickSwitcherItemComponentProps) {
  const initials = getSpaceInitials(item.name);
  
  return (
    <button
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors",
        "hover:bg-gray-100 dark:hover:bg-gray-800",
        isSelected && "bg-indigo-50 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800"
      )}
      onClick={() => onSelect(item)}
      onMouseEnter={onMouseEnter}
    >
      {/* Avatar or Icon */}
      <div className="relative flex-shrink-0">
        {item.avatarUrl ? (
          <div className="relative w-8 h-8 rounded-full overflow-hidden">
            <Image
              fill
              src={item.avatarUrl}
              alt={item.name}
              className="object-cover"
            />
          </div>
        ) : item.type === "space" ? (
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center">
            <span className="text-white text-sm font-medium">{initials}</span>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
            {getItemIcon(item)}
          </div>
        )}
        
        {/* Unread indicator */}
        {item.hasUnread && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
        )}
        
        {/* Mention badge */}
        {(item.mentionCount ?? 0) > 0 && (
          <div className="absolute -bottom-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {(item.mentionCount ?? 0) > 9 ? "9+" : item.mentionCount}
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {item.name}
          </span>
          {item.spaceName && (
            <>
              <ChevronRight className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {item.spaceName}
              </span>
            </>
          )}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {getItemTypeText(item)}
        </div>
      </div>
      
      {/* Search score indicator (dev mode) */}
      {process.env.NODE_ENV === "development" && item.score && (
        <div className="text-xs text-gray-400 font-mono">
          {Math.round(item.score * 100)}%
        </div>
      )}
    </button>
  );
}

/**
 * Discord-style Quick Switcher Modal
 * 
 * Features:
 * - Fuzzy search across servers/channels
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Recent destinations priority
 * - Unread/mention indicators
 * - Auto-focus search input
 */
export function QuickSwitcherModal() {
  const { isOpen, onClose, type } = useModal();
  const {
    query,
    setQuery,
    filteredItems,
    selectedIndex,
    setSelectedIndex,
    navigateToSelected,
    navigateToItem,
    handleKeyDown,
    isLoading,
  } = useQuickSwitcher();
  
  const searchRef = useRef<HTMLInputElement>(null);
  const [hasInteractedWithMouse, setHasInteractedWithMouse] = useState(false);
  
  const isModalOpen = isOpen && type === "quickSwitcher";
  
  // Focus search input when modal opens
  useEffect(() => {
    if (isModalOpen && searchRef.current) {
      searchRef.current.focus();
      setQuery(""); // Clear search on open
      setHasInteractedWithMouse(false);
    }
  }, [isModalOpen, setQuery]);
  
  // Handle selection and close modal
  const handleSelect = (item: QuickSwitcherItem) => {
    navigateToItem(item);
    onClose();
  };
  
  const handleEnterKey = () => {
    navigateToSelected();
    onClose();
  };
  
  // Handle keyboard events
  const handleKeyDownWithClose = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleEnterKey();
      return;
    }
    
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    
    // Reset mouse interaction flag on keyboard use
    if (["ArrowDown", "ArrowUp"].includes(event.key)) {
      setHasInteractedWithMouse(false);
    }
    
    handleKeyDown(event);
  };
  
  // Handle mouse interaction
  const handleMouseEnterItem = (index: number) => {
    setHasInteractedWithMouse(true);
    setSelectedIndex(index);
  };
  
  const maxHeight = "calc(100vh - 200px)"; // Leave space for margins
  
  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-gray-900 p-0 max-w-2xl border-0 shadow-2xl overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Search Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDownWithClose}
                placeholder="Where would you like to go?"
                className={cn(
                  "pl-10 pr-4 py-3 border-0 bg-gray-50 dark:bg-gray-800",
                  "focus:bg-white dark:focus:bg-gray-700 focus:ring-1 focus:ring-indigo-500",
                  "placeholder:text-gray-500 dark:placeholder:text-gray-400",
                  "text-base"
                )}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>
          
          {/* Results */}
          <div className="flex-1 overflow-hidden" style={{ maxHeight }}>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500 dark:text-gray-400">Loading...</div>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <Search className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
                <div className="text-gray-500 dark:text-gray-400 text-sm text-center">
                  {query.trim() ? (
                    <>
                      No results for <span className="font-medium">"{query}"</span>
                    </>
                  ) : (
                    "No servers or channels available"
                  )}
                </div>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="p-2">
                  {!query.trim() && (
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Recent
                    </div>
                  )}
                  <div className="space-y-1">
                    {filteredItems.map((item, index) => (
                      <QuickSwitcherItemComponent
                        key={`${item.type}-${item.id}`}
                        item={item}
                        isSelected={selectedIndex === index && !hasInteractedWithMouse}
                        onSelect={handleSelect}
                        onMouseEnter={() => handleMouseEnterItem(index)}
                      />
                    ))}
                  </div>
                </div>
              </ScrollArea>
            )}
          </div>
          
          {/* Footer */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded font-mono">↑↓</kbd>
                  <span>Navigate</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded font-mono">↵</kbd>
                  <span>Select</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded font-mono">esc</kbd>
                  <span>Close</span>
                </div>
              </div>
              {filteredItems.length > 0 && (
                <div>{filteredItems.length} result{filteredItems.length !== 1 ? "s" : ""}</div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}