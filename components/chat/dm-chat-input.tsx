"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Send } from "lucide-react";
import { toast } from "sonner";

import {
  FormControl,
  Form,
  FormField,
  FormItem
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useModal } from "@/hooks/use-modal-store";
import { EmojiPicker } from "@/components/emoji-picker";
import { ActionTooltip } from "@/components/action-tooltip";
import { useMatrix } from "@/components/providers/matrix-provider";

// Import Matrix message service
import { sendMessage } from "../../apps/web/services/matrix-message";

interface DMChatInputProps {
  /** Matrix room ID for the DM */
  roomId: string;
}

const formSchema = z.object({
  content: z.string().min(1, "Message cannot be empty")
});

/**
 * Chat input for Direct Message conversations
 * 
 * Sends messages directly via Matrix SDK instead of REST API
 */
export function DMChatInput({ roomId }: DMChatInputProps) {
  const { onOpen } = useModal();
  const { client } = useMatrix();
  const [isSending, setIsSending] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { content: "" }
  });

  const isLoading = form.formState.isSubmitting || isSending;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!client || !roomId) {
      toast.error("Cannot send message - not connected");
      return;
    }

    try {
      setIsSending(true);

      // Send message via Matrix SDK
      await sendMessage(roomId, values.content);

      // Reset form
      form.reset();

      // Show success feedback
      toast.success("Message sent");
    } catch (error) {
      console.error("Failed to send DM:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.handleSubmit(onSubmit)();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="relative p-4 pb-6">
                  {/* File upload button */}
                  <ActionTooltip side="top" label="Attach file">
                    <button
                      type="button"
                      onClick={() =>
                        onOpen("messageFile", { 
                          apiUrl: `/api/socket/dm-messages`,
                          query: { roomId }
                        })
                      }
                      disabled={isLoading}
                      className="absolute top-7 left-8 h-[24px] w-[24px] bg-zinc-500 dark:bg-zinc-400 hover:bg-zinc-600 dark:hover:bg-zinc-300 transition rounded-full p-1 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="text-white dark:text-[#313338]" />
                    </button>
                  </ActionTooltip>

                  {/* Message input */}
                  <Input
                    {...field}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    disabled={isLoading}
                    className="px-14 py-6 bg-zinc-200/90 dark:bg-zinc-700/75 border-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-zinc-600 dark:text-zinc-200"
                  />

                  {/* Right side controls */}
                  <div className="absolute top-7 right-8 flex items-center gap-2">
                    {/* Emoji picker */}
                    <EmojiPicker
                      onChange={(emoji: string) =>
                        field.onChange(`${field.value} ${emoji}`)
                      }
                    />

                    {/* Send button (visible when there's content) */}
                    {field.value.trim() && (
                      <ActionTooltip side="top" label="Send message">
                        <Button
                          type="submit"
                          disabled={isLoading}
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </ActionTooltip>
                    )}
                  </div>
                </div>
              </FormControl>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}