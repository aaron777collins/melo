"use client";

import React, { useRef, useState, useCallback, useId } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Send, Image } from "lucide-react";
import axios from "axios";
import qs from "query-string";
import { useRouter } from "next/navigation";

import {
  FormControl,
  Form,
  FormField,
  FormItem
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useModal } from "@/hooks/use-modal-store";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { useMentions } from "@/hooks/use-mentions";
import { useEmojiAutocomplete } from "@/hooks/use-emoji-autocomplete";
import { useAccessibility } from "@/src/hooks/use-accessibility";
import { EmojiPicker } from "@/components/emoji-picker";
import { MentionAutocomplete } from "./mention-autocomplete";
import { ChannelAutocomplete } from "./channel-autocomplete";
import { EmojiAutocomplete } from "./emoji-autocomplete";
import { createAriaLabel } from "@/src/lib/accessibility";

interface ChatInputProps {
  /**
   * Room ID for Matrix messaging (takes precedence over API URL)
   */
  roomId?: string;
  
  /**
   * Legacy API URL for non-Matrix messaging
   * @deprecated Use roomId for Matrix-based messaging
   */
  apiUrl?: string;
  
  /**
   * Legacy query parameters for API
   * @deprecated Use roomId for Matrix-based messaging
   */
  query?: Record<string, any>;
  
  /**
   * Display name for the channel/conversation
   */
  name: string;
  
  /**
   * Type of conversation
   */
  type: "conversation" | "channel";
}

const formSchema = z.object({
  content: z.string().min(1)
});

export function ChatInput({ roomId, apiUrl, query, name, type }: ChatInputProps) {
  const modalHook = useModal() || {};
  const { onOpen = () => {} } = modalHook;
  const router = useRouter();
  const matrixClientHook = useMatrixClient() || {};
  const { client = null, isReady = false } = matrixClientHook;
  const accessibilityHook = useAccessibility() || {};
  const { announce = () => {}, effectivePreferences = {} } = accessibilityHook;
  
  // Generate unique IDs for accessibility
  const inputId = useId();
  const attachmentButtonId = useId();
  const gifButtonId = useId();
  const sendButtonId = useId();
  
  // Mentions functionality (only if roomId provided) - defensive
  const mentionsHook = useMentions(roomId || "") || {};
  const mentions = {
    filteredMembers: [],
    filteredRooms: [],
    selectedMentionIndex: -1,
    handleMentionSelect: () => {},
    handleMentionKeyDown: () => {},
    ...mentionsHook
  };
  
  // Emoji autocomplete functionality - defensive
  const emojiAutocompleteHook = useEmojiAutocomplete() || {};
  const emojiAutocomplete = {
    emojiSuggestions: [],
    selectedEmojiIndex: -1,
    handleEmojiSelect: () => {},
    handleEmojiKeyDown: () => {},
    ...emojiAutocompleteHook
  };
  
  // Form state
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { content: "" }
  });

  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle input changes for mention and emoji detection
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const selectionStart = event.target.selectionStart || 0;
    
    // Update form state
    form.setValue("content", value);
    
    // Handle mention detection (only if Matrix-based and handler exists)
    if (roomId && inputRef.current && typeof mentions.handleInputChange === 'function') {
      mentions.handleInputChange(value, selectionStart, inputRef.current);
    }
    
    // Handle emoji detection (if handler exists)
    if (inputRef.current && typeof emojiAutocomplete.handleInputChange === 'function') {
      emojiAutocomplete.handleInputChange(value, selectionStart, inputRef.current);
    }
  }, [form, roomId, mentions, emojiAutocomplete]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      if (roomId && client && isReady) {
        // Matrix-based message sending with mention support
        const { text, mentions: parsedMentions } = mentions.parseMentions(values.content);
        
        // Create base message content
        const messageContent: any = {
          msgtype: "m.text",
          body: text,
        };
        
        // Add Matrix-compliant mentions if any exist
        if (parsedMentions.length > 0) {
          // Create formatted body with HTML mentions
          let formattedBody = text;
          let offset = 0;
          
          for (const mention of parsedMentions) {
            const beforeMention = formattedBody.substring(0, mention.offset + offset);
            const afterMention = formattedBody.substring(mention.offset + offset + mention.length);

            let mentionHtml: string;
            if (mention.type === "user") {
              mentionHtml = `<a href="https://matrix.to/#/${mention.userId}">${mention.displayName}</a>`;
            } else if (mention.type === "channel") {
              mentionHtml = `<a href="#/channels/${mention.channelId}">#${mention.displayName}</a>`;
            } else {
              // Skip unknown mention types
              continue;
            }
            
            formattedBody = beforeMention + mentionHtml + afterMention;
            offset += mentionHtml.length - mention.length;
          }
          
          messageContent.format = "org.matrix.custom.html";
          messageContent.formatted_body = formattedBody;
          
          // Add Matrix spec mentions
          messageContent["m.mentions"] = {
            user_ids: parsedMentions
              .filter(m => m.type === "user")
              .map(m => m.userId || ""),
            room_ids: parsedMentions
              .filter(m => m.type === "channel")
              .map(m => m.channelId || ""),
          };
        }
        
        // Send the message via Matrix
        await client.sendMessage(roomId, messageContent);
        
        // Announce message sent for screen readers
        announce(`Message sent to ${type === "conversation" ? name : "#" + name}`, 'polite');
        
        // Optional: Send notifications to mentioned users/channels
        for (const mention of parsedMentions) {
          console.log(`Mentioned ${mention.type}: ${mention.displayName} (${mention.type === "user" ? mention.userId : mention.channelId})`);
        }
        
        // Reset form
        form.reset();
        mentions.closeAutocomplete();
        
      } else if (apiUrl && query) {
        // Legacy API-based sending
        const url = qs.stringifyUrl({
          url: apiUrl,
          query
        });

        await axios.post(url, values);
        form.reset();
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      // TODO: Show user-friendly error toast
    } finally {
      setIsLoading(false);
    }
  };

  // Handle key press for submit
  const handleKeyPress = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.handleSubmit(onSubmit)();
    }
  }, [form, onSubmit]);

  // Handle GIF selection using modal
  const handleGifClick = useCallback(() => {
    onOpen("gifPicker", {
      onGifSelect: async (gifUrl: string) => {
        if (isLoading) return;
        
        setIsLoading(true);
        
        try {
          if (roomId && client && isReady) {
            // Send GIF via Matrix
            const messageContent: any = {
              msgtype: "m.text",
              body: gifUrl, // Send GIF URL as message body
              format: "org.matrix.custom.html",
              formatted_body: `<img src="${gifUrl}" alt="GIF" style="max-width: 300px; max-height: 300px;" />`,
            };
            
            await client.sendMessage(roomId, messageContent);
          } else if (apiUrl && query) {
            // Legacy API-based sending
            const url = qs.stringifyUrl({
              url: apiUrl,
              query
            });

            await axios.post(url, { content: gifUrl });
            router.refresh();
          }
        } catch (error) {
          console.error("Failed to send GIF:", error);
        } finally {
          setIsLoading(false);
        }
      }
    });
  }, [roomId, client, isReady, apiUrl, query, isLoading, router, onOpen]);

  const isMatrixMode = Boolean(roomId && client && isReady);
  const placeholder = `Message ${type === "conversation" ? name : "#" + name}`;

  return (
    <>
      <Form {...form}>
        <form 
          onSubmit={form.handleSubmit(onSubmit)}
          role="form"
          aria-label={`Message input for ${type === "conversation" ? name : "#" + name}`}
        >
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className={`relative p-4 pb-6 ${effectivePreferences.enhancedFocus ? 'keyboard-navigable' : ''}`}>
                    {/* File attachment button - Discord-clone exact styling on desktop, mobile-optimized touch targets */}
                    <button
                      id={attachmentButtonId}
                      type="button"
                      onClick={() => {
                        if (isMatrixMode) {
                          // Matrix-based file upload
                          onOpen("messageFile", { roomId });
                        } else {
                          // Legacy API file upload
                          onOpen("messageFile", { apiUrl, query });
                        }
                        announce("File attachment dialog opened", 'polite');
                      }}
                      disabled={isLoading}
                      className="absolute top-5 left-5 md:top-7 md:left-8 h-[44px] w-[44px] md:h-[24px] md:w-[24px] bg-[#4f5660] dark:bg-[#b5bac1] hover:bg-[#0f1419] dark:hover:bg-[#ffffff] active:bg-[#0f1419] dark:active:bg-[#ffffff] transition rounded-full p-2 md:p-1 flex items-center justify-center focus-enhanced"
                      aria-label="Attach file to message"
                      title="Attach file"
                      style={{ touchAction: 'manipulation' }}
                    >
                      <Plus className="h-5 w-5 md:h-4 md:w-4 text-[#ffffff] dark:text-[#1e1f22]" aria-hidden="true" />
                    </button>
                    
                    {/* Main input - Discord-clone exact styling on desktop (px-14 py-6), mobile-optimized */}
                    <Input
                      id={inputId}
                      ref={inputRef}
                      placeholder={placeholder}
                      disabled={isLoading || (isMatrixMode && !isReady)}
                      className={`px-14 py-6 bg-[#e3e5e8] dark:bg-[#313338] border-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-[#0f1419] dark:text-[#dbdee1] ${effectivePreferences.highContrast ? 'high-contrast-input' : ''}`}
                      value={field.value}
                      onChange={handleInputChange}
                      onKeyPress={handleKeyPress}
                      aria-label={`Type message for ${type === "conversation" ? name : "#" + name}`}
                      aria-describedby={`${inputId}-help`}
                      role="textbox"
                      aria-multiline="false"
                      aria-autocomplete="list"
                      aria-expanded={mentions.showAutocomplete || emojiAutocomplete.showAutocomplete}
                      style={{ 
                        fontSize: '16px', // Prevents zoom on iOS
                        touchAction: 'manipulation' 
                      }}
                    />
                    
                    {/* Screen reader help text */}
                    <div id={`${inputId}-help`} className="sr-only">
                      Press Enter to send message. Use @ for mentions, : for emojis. Use Tab to navigate to other controls.
                    </div>
                    
                    {/* Right side controls - Discord-clone exact positioning (top-7 right-8) */}
                    <div className="absolute top-7 right-8 flex items-center gap-2" role="toolbar" aria-label="Message formatting tools">
                      {/* GIF picker button */}
                      <Button
                        id={gifButtonId}
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleGifClick}
                        disabled={isLoading}
                        className="h-11 w-11 md:h-8 md:w-8 p-0 hover:bg-[#e3e5e8] dark:hover:bg-[#2b2d31] active:bg-[#e3e5e8] dark:active:bg-[#2b2d31] transition-colors rounded-lg md:rounded focus-enhanced"
                        aria-label="Add GIF to message"
                        title="Add GIF"
                        style={{ touchAction: 'manipulation' }}
                      >
                        <Image className="h-5 w-5 md:h-4 md:w-4 text-[#4f5660] dark:text-[#b5bac1]" aria-hidden="true" />
                      </Button>
                      
                      {/* Emoji picker */}
                      <div 
                        role="button" 
                        aria-label="Add emoji to message" 
                        tabIndex={0}
                        className="h-11 w-11 md:h-8 md:w-8 p-0 hover:bg-[#e3e5e8] dark:hover:bg-[#2b2d31] active:bg-[#e3e5e8] dark:active:bg-[#2b2d31] transition-colors rounded-lg md:rounded flex items-center justify-center"
                        style={{ touchAction: 'manipulation' }}
                      >
                        <EmojiPicker
                          onChange={(emoji: string) => {
                            const newValue = `${field.value} ${emoji}`;
                            form.setValue("content", newValue);
                            
                            // Update mentions if in Matrix mode and handler exists
                            if (roomId && inputRef.current && typeof mentions.handleInputChange === 'function') {
                              inputRef.current.value = newValue;
                              mentions.handleInputChange(newValue, newValue.length, inputRef.current);
                            }
                            
                            announce(`Added emoji ${emoji}`, 'polite');
                          }}
                        />
                      </div>
                      
                      {/* Send button (Matrix mode only) */}
                      {isMatrixMode && (
                        <Button
                          id={sendButtonId}
                          type="submit"
                          size="sm"
                          disabled={isLoading || !field.value.trim()}
                          className="h-11 w-11 md:h-8 md:w-8 p-0 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-gray-400 transition-colors rounded-lg md:rounded focus-enhanced"
                          aria-label={`Send message to ${type === "conversation" ? name : "#" + name}`}
                          title="Send message (Enter)"
                          style={{ touchAction: 'manipulation' }}
                        >
                          <Send className="h-5 w-5 md:h-3 md:w-3" aria-hidden="true" />
                          {isLoading && <span className="sr-only">Sending message...</span>}
                        </Button>
                      )}
                    </div>
                  </div>
                </FormControl>
              </FormItem>
            )}
          />
        </form>
      </Form>

      {/* Mention autocomplete (Matrix mode only) */}
      {isMatrixMode && (
        <>
          <MentionAutocomplete
            members={mentions.members}
            query={mentions.mentionQuery}
            position={mentions.autocompletePosition}
            visible={mentions.showAutocomplete && mentions.mentionQuery !== "" && mentions.currentMentionRange?.type === "user"}
            onSelect={mentions.handleUserSelect}
            onClose={mentions.closeAutocomplete}
          />
          
          <ChannelAutocomplete
            rooms={mentions.rooms}
            query={mentions.mentionQuery}
            position={mentions.autocompletePosition}
            visible={mentions.showAutocomplete && mentions.mentionQuery !== "" && mentions.currentMentionRange?.type === "channel"}
            onSelect={mentions.handleChannelSelect}
            onClose={mentions.closeAutocomplete}
          />
        </>
      )}

      {/* Emoji autocomplete (always available) */}
      <EmojiAutocomplete
        emojis={emojiAutocomplete.filteredEmojis}
        query={emojiAutocomplete.emojiQuery}
        position={emojiAutocomplete.autocompletePosition}
        visible={emojiAutocomplete.showAutocomplete}
        onSelect={emojiAutocomplete.handleEmojiSelect}
        onClose={emojiAutocomplete.closeAutocomplete}
      />
    </>
  );
}