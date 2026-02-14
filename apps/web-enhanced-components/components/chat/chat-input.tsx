"use client";

import React, { useState, useRef, useCallback, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import { Plus, Send, Hash, AtSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EmojiPicker } from '@/components/emoji-picker';
import { useModal } from '@/hooks/use-modal-store';
import { useTypingIndicator } from '@/hooks/use-typing-indicator';
import { sendMessage } from '../../services/matrix-message';
import type { MxcUrl } from '../../../../lib/matrix/types/media';

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface ChatInputProps {
  /** Matrix room ID to send messages to */
  roomId: string;
  /** Channel/room name for placeholder text */
  name: string;
  /** Type of chat (channel or direct message) */
  type: 'conversation' | 'channel';
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Callback when a message is sent */
  onMessageSent?: (content: string) => void;
  /** Callback when a file is attached */
  onFileAttached?: (mxcUrl: MxcUrl, fileName: string) => void;
}

// =============================================================================
// Constants
// =============================================================================

const MAX_MESSAGE_LENGTH = 4000; // Discord's limit
const MIN_TEXTAREA_HEIGHT = 44; // Single line height
const MAX_TEXTAREA_HEIGHT = 200; // Maximum before scroll

// Slash commands that will be supported (preparation for future implementation)
const SLASH_COMMANDS = [
  { command: '/me', description: 'Send an action message' },
  { command: '/shrug', description: 'Add ¯\\_(ツ)_/¯ to your message' },
  { command: '/tableflip', description: 'Add (╯°□°）╯︵ ┻━┻ to your message' },
  { command: '/unflip', description: 'Add ┬─┬ ノ( ゜-゜ノ) to your message' },
];

// =============================================================================
// Main Component
// =============================================================================

/**
 * ChatInput - Discord-style message input composer
 * 
 * Features:
 * - Multi-line textarea with auto-resize
 * - File attachment button (opens FileUpload modal)
 * - Emoji picker integration
 * - Send on Enter (Shift+Enter for newline)
 * - Typing indicator integration
 * - Matrix message service integration
 * - Slash command preparation
 */
export function ChatInput({
  roomId,
  name,
  type,
  disabled = false,
  className,
  onMessageSent,
  onFileAttached
}: ChatInputProps) {
  // =============================================================================
  // State Management
  // =============================================================================

  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  // =============================================================================
  // Refs and Hooks
  // =============================================================================

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { onOpen } = useModal();
  const { setTyping } = useTypingIndicator(roomId);

  // =============================================================================
  // Auto-resize Textarea
  // =============================================================================

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Calculate new height based on content
    const newHeight = Math.max(
      MIN_TEXTAREA_HEIGHT,
      Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)
    );
    
    textarea.style.height = `${newHeight}px`;
  }, []);

  // =============================================================================
  // Content Change Handler
  // =============================================================================

  const handleContentChange = useCallback(async (event: ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = event.target.value;
    
    // Enforce character limit
    if (newContent.length > MAX_MESSAGE_LENGTH) {
      return;
    }

    setContent(newContent);
    
    // Auto-resize textarea
    adjustTextareaHeight();

    // Handle typing indicator
    const isCurrentlyTyping = newContent.trim().length > 0;
    
    if (isCurrentlyTyping !== isComposing) {
      setIsComposing(isCurrentlyTyping);
      try {
        await setTyping(isCurrentlyTyping);
      } catch (error) {
        console.warn('[ChatInput] Failed to send typing indicator:', error);
      }
    }
  }, [adjustTextareaHeight, isComposing, setTyping]);

  // =============================================================================
  // Message Submission
  // =============================================================================

  const handleSubmit = useCallback(async () => {
    const messageContent = content.trim();
    
    if (!messageContent || isSending) {
      return;
    }

    setIsSending(true);

    try {
      // Stop typing indicator before sending
      if (isComposing) {
        setIsComposing(false);
        await setTyping(false);
      }

      // Handle slash commands (basic preprocessing)
      let processedContent = messageContent;
      
      if (messageContent.startsWith('/me ')) {
        // Convert /me to action format (future enhancement)
        processedContent = messageContent.substring(4);
      } else if (messageContent === '/shrug') {
        processedContent = '¯\\_(ツ)_/¯';
      } else if (messageContent === '/tableflip') {
        processedContent = '(╯°□°）╯︵ ┻━┻';
      } else if (messageContent === '/unflip') {
        processedContent = '┬─┬ ノ( ゜-゜ノ)';
      }

      // Send message via Matrix service
      const eventId = await sendMessage(roomId, processedContent, {
        markdown: true // Enable markdown formatting
      });

      // Clear input on successful send
      setContent('');
      adjustTextareaHeight();
      
      // Callback
      onMessageSent?.(processedContent);

      // Focus textarea after sending
      textareaRef.current?.focus();

    } catch (error) {
      console.error('[ChatInput] Failed to send message:', error);
      // TODO: Show error toast to user
    } finally {
      setIsSending(false);
    }
  }, [content, isSending, isComposing, setTyping, roomId, adjustTextareaHeight, onMessageSent]);

  // =============================================================================
  // Keyboard Event Handlers
  // =============================================================================

  const handleKeyDown = useCallback(async (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter') {
      if (event.shiftKey) {
        // Shift+Enter: insert newline (default behavior)
        return;
      } else {
        // Enter: send message
        event.preventDefault();
        await handleSubmit();
      }
    }

    if (event.key === 'Escape') {
      // Clear input on Escape
      setContent('');
      adjustTextareaHeight();
      
      // Stop typing indicator
      if (isComposing) {
        setIsComposing(false);
        await setTyping(false);
      }
    }
  }, [handleSubmit, adjustTextareaHeight, isComposing, setTyping]);

  // =============================================================================
  // File Attachment Handler
  // =============================================================================

  const handleFileAttachment = useCallback(() => {
    onOpen('messageFile', { 
      roomId,
      onFileUploaded: (mxcUrl: string, file: File) => {
        onFileAttached?.(mxcUrl as MxcUrl, file.name);
      }
    });
  }, [onOpen, roomId, onFileAttached]);

  // =============================================================================
  // Emoji Selection Handler
  // =============================================================================

  const handleEmojiSelect = useCallback((emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const newContent = content.substring(0, start) + emoji + content.substring(end);
    
    setContent(newContent);
    
    // Set cursor position after emoji
    setTimeout(() => {
      const newPosition = start + emoji.length;
      textarea.setSelectionRange(newPosition, newPosition);
      textarea.focus();
    }, 0);

    // Adjust height after emoji insertion
    setTimeout(adjustTextareaHeight, 0);
  }, [content, adjustTextareaHeight]);

  // =============================================================================
  // Effect: Focus on Mount
  // =============================================================================

  useEffect(() => {
    // Focus textarea when component mounts
    textareaRef.current?.focus();
  }, []);

  // =============================================================================
  // Effect: Cleanup Typing on Unmount
  // =============================================================================

  useEffect(() => {
    return () => {
      // Stop typing indicator when component unmounts
      if (isComposing) {
        setTyping(false).catch(error => 
          console.warn('[ChatInput] Failed to clear typing on unmount:', error)
        );
      }
    };
  }, [isComposing, setTyping]);

  // =============================================================================
  // Effect: Initialize Textarea Height
  // =============================================================================

  useEffect(() => {
    adjustTextareaHeight();
  }, [adjustTextareaHeight]);

  // =============================================================================
  // Render Helpers
  // =============================================================================

  const getPlaceholder = () => {
    if (type === 'conversation') {
      return `Message ${name}`;
    } else {
      return `Message #${name}`;
    }
  };

  const getCharacterCount = () => {
    if (content.length > MAX_MESSAGE_LENGTH * 0.8) {
      return `${content.length}/${MAX_MESSAGE_LENGTH}`;
    }
    return null;
  };

  const isOverLimit = content.length > MAX_MESSAGE_LENGTH;
  const canSend = content.trim().length > 0 && !isOverLimit && !isSending;

  // =============================================================================
  // Main Render
  // =============================================================================

  return (
    <div className={cn('px-4 pb-6', className)}>
      <div className="flex flex-col">
        {/* Character count warning (when approaching limit) */}
        {getCharacterCount() && (
          <div className="flex justify-end mb-2">
            <span className={cn(
              'text-xs',
              isOverLimit ? 'text-red-500' : 'text-yellow-500'
            )}>
              {getCharacterCount()}
            </span>
          </div>
        )}

        {/* Main input container */}
        <div className="relative">
          {/* File attachment button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleFileAttachment}
            disabled={disabled || isSending}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 h-6 w-6 p-0 bg-zinc-500 hover:bg-zinc-600 dark:bg-zinc-400 dark:hover:bg-zinc-300 rounded-full"
          >
            <Plus className="h-4 w-4 text-white dark:text-[#313338]" />
          </Button>

          {/* Text input area */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            disabled={disabled || isSending}
            className={cn(
              'w-full resize-none rounded-lg border-none outline-none',
              'px-14 py-3 text-sm',
              'bg-zinc-200/90 dark:bg-zinc-700/75',
              'text-zinc-600 dark:text-zinc-200',
              'placeholder:text-zinc-500 dark:placeholder:text-zinc-400',
              'focus:ring-0 focus:outline-none',
              'transition-all duration-200',
              isOverLimit && 'text-red-500',
              'overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-400 dark:scrollbar-thumb-zinc-600'
            )}
            style={{
              minHeight: MIN_TEXTAREA_HEIGHT,
              maxHeight: MAX_TEXTAREA_HEIGHT,
              height: MIN_TEXTAREA_HEIGHT
            }}
            rows={1}
          />

          {/* Right side buttons container */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            {/* Emoji picker */}
            <div className="flex items-center">
              <EmojiPicker onChange={handleEmojiSelect} />
            </div>

            {/* Send button (only show when there's content) */}
            {canSend && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSubmit}
                disabled={!canSend}
                className="h-6 w-6 p-0 bg-indigo-500 hover:bg-indigo-600 rounded-full text-white"
              >
                <Send className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Typing hint */}
        <div className="mt-2 px-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            <strong>Enter</strong> to send • <strong>Shift + Enter</strong> for new line
            {type === 'channel' && ' • '}
            {type === 'channel' && (
              <span>
                Start with <Hash className="inline h-3 w-3" /> for channels or <AtSign className="inline h-3 w-3" /> for users
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ChatInput;