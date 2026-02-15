"use client";

import React, { useRef, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Send, Image } from "lucide-react";
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

interface DMChatInputProps {
  /**
   * Room ID for Matrix messaging
   */
  roomId: string;
  
  /**
   * Display name for the conversation
   */
  name?: string;
}

const formSchema = z.object({
  content: z.string().min(1)
});

export function DMChatInput({ roomId, name = "user" }: DMChatInputProps) {
  const { onOpen } = useModal();
  const router = useRouter();
  const { client, isReady } = useMatrixClient();
  
  // Mentions functionality
  const mentions = useMentions(roomId);
  
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
    
    // Handle mention detection
    if (inputRef.current) {
      mentions.handleInputChange(value, selectionStart, inputRef.current);
    }
  }, [form, mentions]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      if (client && isReady) {
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
            } else {
              // Skip unknown mention types for DMs
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
          };
        }
        
        // Send the message via Matrix
        await client.sendMessage(roomId, messageContent);
        
        // Reset form
        form.reset();
        mentions.closeAutocomplete();
      }
    } catch (error) {
      console.error("Failed to send DM:", error);
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
          if (client && isReady) {
            // Send GIF via Matrix
            const messageContent: any = {
              msgtype: "m.text",
              body: gifUrl, // Send GIF URL as message body
              format: "org.matrix.custom.html",
              formatted_body: `<img src="${gifUrl}" alt="GIF" style="max-width: 300px; max-height: 300px;" />`,
            };
            
            await client.sendMessage(roomId, messageContent);
          }
        } catch (error) {
          console.error("Failed to send GIF:", error);
        } finally {
          setIsLoading(false);
        }
      }
    });
  }, [roomId, client, isReady, isLoading, onOpen]);

  const placeholder = `Message @${name}`;

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
                        onOpen("messageFile", { roomId });
                      }}
                      className="absolute top-7 left-8 h-[24px] w-[24px] bg-zinc-500 dark:bg-zinc-400 hover:bg-zinc-600 dark:hover:bg-zinc-300 transition rounded-full p-1 flex items-center justify-center"
                    >
                      <Plus className="text-white dark:text-[#313338]" />
                    </button>
                    
                    {/* Main input */}
                    <Input
                      ref={inputRef}
                      placeholder={placeholder}
                      disabled={isLoading || !isReady}
                      className="px-14 py-6 bg-zinc-200/90 dark:bg-zinc-700/75 border-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-zinc-600 dark:text-zinc-200 pr-20"
                      value={field.value}
                      onChange={handleInputChange}
                      onKeyPress={handleKeyPress}
                    />
                    
                    {/* Right side controls */}
                    <div className="absolute top-7 right-8 flex items-center gap-2">
                      {/* GIF picker button */}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleGifClick}
                        disabled={isLoading}
                        className="h-6 w-6 p-0 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition"
                        title="Add GIF"
                      >
                        <Image className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
                      </Button>
                      
                      {/* Emoji picker */}
                      <EmojiPicker
                        onChange={(emoji: string) => {
                          const newValue = `${field.value} ${emoji}`;
                          form.setValue("content", newValue);
                          
                          // Update mentions
                          if (inputRef.current) {
                            inputRef.current.value = newValue;
                            mentions.handleInputChange(newValue, newValue.length, inputRef.current);
                          }
                        }}
                      />
                      
                      {/* Send button */}
                      <Button
                        type="submit"
                        size="sm"
                        disabled={isLoading || !field.value.trim()}
                        className="h-6 w-6 p-0 bg-indigo-600 hover:bg-indigo-700"
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </FormControl>
              </FormItem>
            )}
          />
        </form>
      </Form>

      {/* Mention autocomplete (user mentions only for DMs) */}
      <MentionAutocomplete
        members={mentions.members}
        query={mentions.mentionQuery}
        position={mentions.autocompletePosition}
        visible={mentions.showAutocomplete && mentions.mentionQuery !== "" && mentions.currentMentionRange?.type === "user"}
        onSelect={mentions.handleUserSelect}
        onClose={mentions.closeAutocomplete}
      />
    </>
  );
}