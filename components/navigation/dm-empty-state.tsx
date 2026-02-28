"use client";

import React from 'react';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DMEmptyStateProps {
  className?: string;
}

/**
 * DM Empty State Component
 * 
 * Displayed when user has no DM conversations yet.
 * Provides encouraging message and guidance for starting first DM.
 * Following Discord's empty state pattern with helpful suggestions.
 */
export function DMEmptyState({ className }: DMEmptyStateProps) {
  const handleStartConversation = () => {
    // Placeholder for future new DM functionality
    console.log('Start conversation clicked');
  };

  return (
    <div 
      data-testid="dm-empty-state"
      className={cn(
        "flex flex-col items-center justify-center py-8 text-center",
        className
      )}
    >
      {/* Icon */}
      <MessageCircle 
        className="h-10 w-10 text-zinc-600 mb-2"
        data-testid="empty-state-icon"
      />
      
      {/* Primary message */}
      <p className="text-sm text-zinc-400 mb-3">
        No direct messages yet
      </p>
      
      {/* Helpful guidance */}
      <button
        onClick={handleStartConversation}
        className="text-xs text-indigo-400 hover:text-indigo-300 transition"
      >
        Start a conversation
      </button>
      
      {/* Additional guidance */}
      <div className="mt-4 px-4">
        <p className="text-xs text-zinc-500 mb-2">
          Click the + button above to start a new DM
        </p>
        <p className="text-xs text-zinc-500">
          Find users in servers to start conversations with them
        </p>
      </div>
    </div>
  );
}