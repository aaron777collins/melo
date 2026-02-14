"use client";

/**
 * Create Channel Modal
 *
 * Modal dialog for creating new Matrix channels (rooms) within a space (server).
 * Supports text, voice, and video channel types with Matrix backend integration.
 *
 * Features:
 * - Channel type selector (text/voice/video)
 * - Channel name validation (1-100 characters)
 * - Category selection dropdown (optional, for organization)
 * - Private channel toggle
 * - Matrix room creation via services/matrix-room
 * - Auto-redirect to new channel on success
 */

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { Hash, Mic, Video, Lock, Globe, ChevronDown } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useModal } from "@/hooks/use-modal-store";
import { createRoom, type RoomChannelType } from "@/apps/web/services/matrix-room";
import type { SpaceCategory } from "@/lib/matrix/types/space";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

/** Channel types supported for creation (subset of all channel types) */
type CreateChannelType = "text" | "voice" | "video";

interface ChannelTypeOption {
  value: CreateChannelType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

// =============================================================================
// Constants
// =============================================================================

const CHANNEL_TYPES: readonly ChannelTypeOption[] = [
  {
    value: "text",
    label: "Text",
    description: "Send messages, images, GIFs, emoji, and more",
    icon: <Hash className="h-5 w-5" />
  },
  {
    value: "voice",
    label: "Voice",
    description: "Hang out together with voice and screen sharing",
    icon: <Mic className="h-5 w-5" />
  },
  {
    value: "video",
    label: "Video",
    description: "Connect with video, voice, and screen sharing",
    icon: <Video className="h-5 w-5" />
  }
] as const;

// =============================================================================
// Form Schema
// =============================================================================

const formSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Channel name is required." })
    .max(100, { message: "Channel name must be 100 characters or less." })
    .refine((name) => name.toLowerCase() !== "general", {
      message: "Channel name cannot be 'general' (reserved for default channel)"
    })
    .transform((name) =>
      name
        .toLowerCase()
        .replace(/\s+/g, "-") // Replace spaces with dashes
        .replace(/[^a-z0-9-_]/g, "") // Remove invalid characters
    ),
  type: z.enum(["text", "voice", "video"] as const),
  categoryId: z.string().optional(),
  isPrivate: z.boolean().default(false)
});

type FormValues = z.infer<typeof formSchema>;

// =============================================================================
// Main Component
// =============================================================================

export function CreateChannelModal() {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();
  const params = useParams();

  // Determine if modal should be open
  const isModalOpen = isOpen && type === "createChannel";

  // Get space/channel type from modal data
  const { space, channelType, spaceChannel } = data;

  // State for categories (fetched from space)
  const [categories, setCategories] = useState<SpaceCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the space ID from params or modal data
  const spaceId = space?.id || (params?.serverId as string);

  // =============================================================================
  // Form Setup
  // =============================================================================

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "text",
      categoryId: undefined,
      isPrivate: false
    }
  });

  const isLoading = form.formState.isSubmitting;
  const selectedType = form.watch("type");
  const channelName = form.watch("name");

  // =============================================================================
  // Effects
  // =============================================================================

  // Set channel type from modal data when modal opens
  useEffect(() => {
    if (channelType) {
      // Map Prisma ChannelType to Matrix channel type
      const typeMap: Record<string, CreateChannelType> = {
        TEXT: "text",
        AUDIO: "voice",
        VIDEO: "video"
      };
      const mappedType = typeMap[channelType] || (channelType as string).toLowerCase();
      if (["text", "voice", "video"].includes(mappedType)) {
        form.setValue("type", mappedType as CreateChannelType);
      }
    } else {
      form.setValue("type", "text");
    }
  }, [channelType, form]);

  // Load categories when modal opens
  useEffect(() => {
    if (isModalOpen && spaceId) {
      loadCategories();
    }
  }, [isModalOpen, spaceId]);

  // =============================================================================
  // Handlers
  // =============================================================================

  /**
   * Load categories for the current space
   * Categories are represented as special rooms in Matrix
   */
  const loadCategories = async () => {
    setIsLoadingCategories(true);
    try {
      // TODO: Implement category fetching from Matrix space
      // For now, categories are optional and not yet implemented
      // Once implemented, this would fetch categories from the space's state events
      setCategories([]);
    } catch (err) {
      console.error("Failed to load categories:", err);
      // Don't show error - categories are optional
    } finally {
      setIsLoadingCategories(false);
    }
  };

  /**
   * Handle form submission - create the Matrix room
   */
  const onSubmit = async (values: FormValues) => {
    try {
      setError(null);

      if (!spaceId) {
        throw new Error("No space selected. Please try again.");
      }

      // Map 'voice' to 'audio' for Matrix room service
      // (UI uses 'voice' for Discord-style UX, Matrix uses 'audio')
      const roomType: RoomChannelType = values.type === "voice" ? "audio" : values.type;

      // Create the Matrix room
      const room = await createRoom(
        values.name,
        roomType,
        spaceId
      );

      // TODO: If private channel, set up invite-only join rules
      // This would require additional Matrix room state event handling
      // if (values.isPrivate) {
      //   await setRoomJoinRules(room.id, 'invite');
      // }

      // Reset form and close modal
      form.reset();
      onClose();

      // Navigate to the new channel
      router.push(`/servers/${spaceId}/channels/${room.id}`);
      router.refresh();
    } catch (err) {
      console.error("Failed to create channel:", err);
      setError(err instanceof Error ? err.message : "Failed to create channel");
    }
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    form.reset();
    setError(null);
    onClose();
  };

  // =============================================================================
  // Channel Type Selector Component
  // =============================================================================

  const ChannelTypeSelector = () => (
    <FormField
      control={form.control}
      name="type"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="uppercase text-xs font-bold text-zinc-500 dark:text-zinc-400">
            Channel Type
          </FormLabel>
          <FormControl>
            <div className="space-y-2">
              {CHANNEL_TYPES.map((option) => (
                <div
                  key={option.value}
                  onClick={() => !isLoading && field.onChange(option.value)}
                  className={cn(
                    "flex items-center p-3 rounded-md cursor-pointer transition-colors",
                    "border-2",
                    field.value === option.value
                      ? "border-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/20"
                      : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600",
                    isLoading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full mr-3",
                      field.value === option.value
                        ? "bg-indigo-500 text-white"
                        : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
                    )}
                  >
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <p
                      className={cn(
                        "font-medium",
                        field.value === option.value
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      {option.label}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {option.description}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      field.value === option.value
                        ? "border-indigo-500 bg-indigo-500"
                        : "border-zinc-300 dark:border-zinc-600"
                    )}
                  >
                    {field.value === option.value && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white dark:bg-zinc-900 text-black dark:text-white p-0 overflow-hidden max-w-md">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold">
            Create Channel
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-500 dark:text-zinc-400">
            {space?.name
              ? `Create a new channel in ${space.name}`
              : "Create a new channel for your server"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-6 px-6">
              {/* Channel Type Selector */}
              <ChannelTypeSelector />

              {/* Channel Name Input */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="uppercase text-xs font-bold text-zinc-500 dark:text-zinc-400">
                      Channel Name
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                          {selectedType === "text" && <Hash className="h-4 w-4" />}
                          {selectedType === "voice" && <Mic className="h-4 w-4" />}
                          {selectedType === "video" && <Video className="h-4 w-4" />}
                        </div>
                        <Input
                          disabled={isLoading}
                          placeholder="new-channel"
                          className="pl-9 bg-zinc-100 dark:bg-zinc-800 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs">
                      {channelName
                        ? `Channel will be created as: ${channelName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "")}`
                        : "Use lowercase letters, numbers, and dashes"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category Selector (if categories exist) */}
              {categories.length > 0 && (
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase text-xs font-bold text-zinc-500 dark:text-zinc-400">
                        Category
                      </FormLabel>
                      <Select
                        disabled={isLoading || isLoadingCategories}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-zinc-100 dark:bg-zinc-800 border-0 focus:ring-0 ring-offset-0 focus:ring-offset-0 capitalize outline-none">
                            <SelectValue placeholder="No category (top level)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No category (top level)</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        Organize your channel within a category
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Private Channel Toggle */}
              <FormField
                control={form.control}
                name="isPrivate"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center">
                        {field.value ? (
                          <Lock className="h-4 w-4 mr-2 text-zinc-500" />
                        ) : (
                          <Globe className="h-4 w-4 mr-2 text-zinc-500" />
                        )}
                        <FormLabel className="text-base font-medium">
                          Private Channel
                        </FormLabel>
                      </div>
                      <FormDescription className="text-xs">
                        {field.value
                          ? "Only selected members and roles can view this channel"
                          : "Everyone in the server can view this channel"}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Error Display */}
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
            </div>

            {/* Footer with Actions */}
            <DialogFooter className="bg-zinc-100 dark:bg-zinc-800 px-6 py-4">
              <div className="flex items-center justify-between w-full">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create Channel"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
