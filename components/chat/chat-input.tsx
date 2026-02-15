"use client";

import React, { useRef, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Send } from "lucide-react";
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
import { EmojiPicker } from "@/components/emoji-picker";
import { MentionAutocomplete } from "./mention-autocomplete";
import { ChannelAutocomplete } from "./channel-autocomplete";

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
  const { onOpen } = useModal();
  const router = useRouter();
  const { client, isReady } = useMatrixClient();
  
  // Mentions functionality (only if roomId provided)
  const mentions = useMentions(roomId || "");
  
  // Form state
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { content: "" }
  });

  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle input changes for mention detection
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const selectionStart = event.target.selectionStart || 0;
    
    // Update form state
    form.setValue("content", value);
    
    // Handle mention detection (only if Matrix-based)
    if (roomId && inputRef.current) {
      mentions.handleInputChange(value, selectionStart, inputRef.current);
    }
  }, [form, roomId, mentions]);

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
            
            let mentionHtml;
            if (mention.type === "user") {
              mentionHtml = `<a href="https://matrix.to/#/${mention.userId}">${mention.displayName}</a>`;
            } else if (mention.type === "channel") {
              mentionHtml = `<a href="#/channels/${mention.channelId}">#${mention.displayName}</a>`;
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

  const isMatrixMode = Boolean(roomId && client && isReady);
  const placeholder = `Message ${type === "conversation" ? name : "#" + name}`;

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative p-4 pb-6">
                    {/* File attachment button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isMatrixMode) {
                          // Matrix-based file upload
                          onOpen("messageFile", { roomId });
                        } else {
                          // Legacy API file upload
                          onOpen("messageFile", { apiUrl, query });
                        }
                      }}
                      className="absolute top-7 left-8 h-[24px] w-[24px] bg-zinc-500 dark:bg-zinc-400 hover:bg-zinc-600 dark:hover:bg-zinc-300 transition rounded-full p-1 flex items-center justify-center"
                    >
                      <Plus className="text-white dark:text-[#313338]" />
                    </button>
                    
                    {/* Main input */}
                    <Input
                      ref={inputRef}
                      placeholder={placeholder}
                      disabled={isLoading || (isMatrixMode && !isReady)}
                      className="px-14 py-6 bg-zinc-200/90 dark:bg-zinc-700/75 border-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-zinc-600 dark:text-zinc-200 pr-20"
                      value={field.value}
                      onChange={handleInputChange}
                      onKeyPress={handleKeyPress}
                    />
                    
                    {/* Right side controls */}
                    <div className="absolute top-7 right-8 flex items-center gap-2">
                      {/* Emoji picker */}
                      <EmojiPicker
                        onChange={(emoji: string) => {
                          const newValue = `${field.value} ${emoji}`;
                          form.setValue("content", newValue);
                          
                          // Update mentions if in Matrix mode
                          if (roomId && inputRef.current) {
                            inputRef.current.value = newValue;
                            mentions.handleInputChange(newValue, newValue.length, inputRef.current);
                          }
                        }}
                      />
                      
                      {/* Send button (Matrix mode only) */}
                      {isMatrixMode && (
                        <Button
                          type="submit"
                          size="sm"
                          disabled={isLoading || !field.value.trim()}
                          className="h-6 w-6 p-0 bg-indigo-600 hover:bg-indigo-700"
                        >
                          <Send className="h-3 w-3" />
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
            visible={mentions.showAutocomplete && mentions.mentionQuery !== "" && currentMentionRange?.type === "user"}
            onSelect={mentions.handleUserSelect}
            onClose={mentions.closeAutocomplete}
          />
          
          <ChannelAutocomplete
            rooms={mentions.rooms}
            query={mentions.mentionQuery}
            position={mentions.autocompletePosition}
            visible={mentions.showAutocomplete && mentions.mentionQuery !== "" && currentMentionRange?.type === "channel"}
            onSelect={mentions.handleChannelSelect}
            onClose={mentions.closeAutocomplete}
          />
        </>
      )}
    </>
  );
}