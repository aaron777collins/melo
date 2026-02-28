"use client";

import React, { useRef, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ServerCrash, Send, Plus, Image, MessageCircle, User } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import {
  FormControl,
  Form,
  FormField,
  FormItem
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useMatrixClient } from '@/hooks/use-matrix-client';
import { useRoomMessages } from '@/hooks/use-room-messages';
import { useChatScroll } from '@/hooks/use-chat-scroll';
import { ChatItem } from '@/components/chat/chat-item';
import { EmojiPicker } from '@/components/emoji-picker';
import { useModal } from '@/hooks/use-modal-store';
import { useDMReadReceipt } from '@/hooks/use-dm-unread';

interface DMConversationProps {
  roomId: string;
  recipientName: string;
  recipientAvatarUrl?: string;
}

const formSchema = z.object({
  content: z.string().min(1)
});

const DATE_FORMAT = "d MMM yyyy, HH:mm";

/**
 * DM Conversation Component
 * 
 * Covers AC-4 and AC-5 from US-P2-04:
 * - AC-4: Complete DM conversation interface (history, input, send)
 * - AC-5: Send DM message functionality
 * 
 * Features:
 * - Message history display with Matrix integration
 * - Message input with send functionality  
 * - Real-time message updates
 * - Loading and error states
 * - Mobile-responsive design
 * - Accessibility support
 */
export function DMConversation({ 
  roomId, 
  recipientName, 
  recipientAvatarUrl 
}: DMConversationProps) {
  const { client, isReady } = useMatrixClient();
  const { onOpen } = useModal();
  
  // Mark DM as read when component mounts/roomId changes
  useDMReadReceipt(roomId);

  // Matrix room messages
  const { 
    messages, 
    isLoading, 
    hasMore, 
    loadMore, 
    error, 
    isLoadingMore 
  } = useRoomMessages(roomId);

  // Form for message input
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { content: "" }
  });

  // Local state for input value (for better test compatibility)
  const [messageContent, setMessageContent] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Refs for scrolling
  const chatRef = useRef<React.ElementRef<"div">>(null);
  const bottomRef = useRef<React.ElementRef<"div">>(null);

  // Get current user ID for message ownership detection
  const currentUserId = client?.getUserId();

  // Convert Matrix messages to display format
  const convertedMessages = React.useMemo(() => {
    if (!messages || messages.length === 0) return [];
    
    return messages.map((event: any) => ({
      id: event.getId?.() || 'unknown',
      content: event.getContent?.()?.body || '',
      fileUrl: event.getContent?.()?.url || null,
      deleted: event.isRedacted?.() || false,
      createdAt: new Date(event.getTs?.() || Date.now()),
      updatedAt: new Date(event.getTs?.() || Date.now()),
      member: {
        userId: event.getSender?.() || '',
        profile: {
          name: event.getSender?.()?.split(':')[0]?.substring(1) || 'Unknown User',
          imageUrl: null,
        },
      },
    }));
  }, [messages]);

  // Auto-scroll behavior
  useChatScroll({
    chatRef,
    bottomRef,
    loadMore: loadMore,
    shouldLoadMore: !isLoadingMore && !!hasMore,
    count: convertedMessages.length
  });

  // Send message function
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!client || !isReady || isSendingMessage) return;
    
    const content = values.content?.trim();
    if (!content) return;
    
    setIsSendingMessage(true);
    
    try {
      // Create message content
      const messageContent = {
        msgtype: "m.text",
        body: content,
      };

      // Send the message via Matrix
      await client.sendMessage(roomId, messageContent);
      
      // Reset form and local state
      form.reset();
      setMessageContent("");
      
      // Show success (optional)
      // toast.success('Message sent');
      
    } catch (error) {
      console.error('Failed to send DM:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Handle input changes manually for better test compatibility
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setMessageContent(value);
    form.setValue("content", value);
  }, [form]);

  // Handle key press for Enter to send
  const handleKeyPress = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit({ content: messageContent });
    }
  }, [messageContent, onSubmit]);

  // Handle form submission
  const handleFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ content: messageContent });
  }, [messageContent, onSubmit]);

  // Loading state
  if (isLoading) {
    return (
      <div 
        data-testid="dm-conversation"
        className="flex flex-col h-full bg-white dark:bg-[#36393f]"
      >
        <div className="flex flex-col flex-1 justify-center items-center">
          <Loader2 className="h-7 w-7 text-zinc-500 animate-spin my-4" />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Loading messages...
          </p>
        </div>
      </div>
    );
  }

  // Error state  
  if (error) {
    return (
      <div 
        data-testid="dm-conversation"
        className="flex flex-col h-full bg-white dark:bg-[#36393f]"
      >
        <div className="flex flex-col flex-1 justify-center items-center">
          <ServerCrash className="h-7 w-7 text-zinc-500 my-4" />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Something went wrong!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      data-testid="dm-conversation"
      className="flex flex-col h-full bg-white dark:bg-[#36393f]"
    >
      {/* DM Header */}
      <div 
        data-testid="dm-header"
        className="flex items-center px-4 py-3 border-b border-zinc-200 dark:border-zinc-700"
      >
        {/* Recipient Avatar */}
        <Avatar className="w-8 h-8 mr-3">
          <AvatarImage src={recipientAvatarUrl} alt={recipientName} />
          <AvatarFallback className="bg-indigo-500 text-white text-sm">
            {recipientName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        {/* Recipient Name */}
        <div className="flex-1">
          <h1 className="font-semibold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
            <User className="h-4 w-4" />
            {recipientName}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Direct Message
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        data-testid="dm-messages"
        className="flex-1 flex flex-col overflow-y-auto"
        ref={chatRef}
      >
        {!hasMore && <div className="flex-1" />}
        
        {/* Load more button */}
        {hasMore && (
          <div className="flex justify-center">
            {isLoadingMore ? (
              <Loader2 className="h-6 w-6 text-zinc-500 animate-spin my-4" />
            ) : (
              <button
                onClick={() => loadMore()}
                className="text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 text-xs my-4 dark:hover:text-zinc-300 transition"
              >
                Load previous messages
              </button>
            )}
          </div>
        )}

        {/* Welcome message for empty conversation */}
        {!hasMore && convertedMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <MessageCircle className="w-16 h-16 text-zinc-400 mb-4" />
            <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              This is the beginning of your conversation with {recipientName}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
              Start the conversation by sending a message below.
            </p>
          </div>
        )}

        {/* Messages */}
        <div data-testid="messages-container" className="flex flex-col-reverse mt-auto px-4">
          {convertedMessages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 ${
                message.member.userId === currentUserId ? 'justify-end' : ''
              }`}
            >
              {message.member.userId !== currentUserId && (
                <Avatar className="w-8 h-8">
                  <AvatarImage src={message.member.profile.imageUrl || undefined} />
                  <AvatarFallback className="bg-blue-500 text-white text-xs">
                    {message.member.profile.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div className={`flex flex-col ${message.member.userId === currentUserId ? 'items-end' : ''} max-w-[70%]`}>
                <div className={`rounded-lg px-3 py-2 ${
                  message.member.userId === currentUserId 
                    ? 'bg-indigo-500 text-white' 
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                }`}>
                  <p className="text-sm">{message.content}</p>
                </div>
                
                <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {format(message.createdAt, DATE_FORMAT)}
                </span>
              </div>
              
              {message.member.userId === currentUserId && (
                <Avatar className="w-8 h-8">
                  <AvatarImage src={message.member.profile.imageUrl || undefined} />
                  <AvatarFallback className="bg-green-500 text-white text-xs">
                    {message.member.profile.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
        </div>
        
        <div ref={bottomRef} />
      </div>

      {/* Message Input - Mobile optimized */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 pb-safe-area-inset-bottom">
        <form onSubmit={handleFormSubmit}>
          <div className="relative">
            {/* File attachment button */}
            <button
              type="button"
              onClick={() => onOpen("messageFile", { roomId })}
              disabled={isSendingMessage || !isReady}
              className="absolute top-1/2 left-3 transform -translate-y-1/2 h-6 w-6 bg-zinc-500 dark:bg-zinc-400 hover:bg-zinc-600 dark:hover:bg-zinc-300 transition rounded-full p-1 flex items-center justify-center disabled:opacity-50"
            >
              <Plus className="h-3 w-3 text-white dark:text-zinc-800" />
            </button>

            {/* Message input */}
            <Input
              data-testid="dm-message-input"
              placeholder={`Message @${recipientName}`}
              disabled={isSendingMessage || !isReady}
              className="pl-12 pr-20 py-3 bg-zinc-100 dark:bg-zinc-700 border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-zinc-900 dark:text-zinc-100 touch-manipulation min-h-[44px]"
              value={messageContent}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              aria-label={`Type message for ${recipientName}`}
              autoComplete="off"
              // Mobile-specific attributes
              autoCapitalize="sentences"
              autoCorrect="on"
              spellCheck="true"
              inputMode="text"
            />

            {/* Right side controls */}
            <div className="absolute top-1/2 right-3 transform -translate-y-1/2 flex items-center space-x-2">
              {/* GIF button */}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onOpen("gifPicker")}
                disabled={isSendingMessage || !isReady}
                className="h-6 w-6 p-0 hover:bg-zinc-200 dark:hover:bg-zinc-600"
              >
                <Image className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
              </Button>

              {/* Emoji picker */}
              <div className="h-6 w-6 flex items-center justify-center">
                <EmojiPicker
                  onChange={(emoji: string) => {
                    const newValue = `${messageContent} ${emoji}`;
                    setMessageContent(newValue);
                    form.setValue("content", newValue);
                  }}
                />
              </div>

              {/* Send button */}
              <Button
                data-testid="dm-send-button"
                type="submit"
                size="sm"
                disabled={isSendingMessage || !messageContent.trim() || !isReady}
                className="h-8 w-8 p-0 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-400 transition-colors touch-manipulation active:scale-95 min-h-[32px] min-w-[32px]"
                aria-label={`Send message to ${recipientName}`}
              >
                {isSendingMessage ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}