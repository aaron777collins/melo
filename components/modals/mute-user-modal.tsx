"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { VolumeX, AlertTriangle, Clock } from "lucide-react";

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useModal } from "@/hooks/use-modal-store";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { createModerationService } from "@/lib/matrix/moderation";
import { toast } from "sonner";

// Duration options in milliseconds
const MUTE_DURATIONS = {
  "5m": 5 * 60 * 1000,
  "1h": 1 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "permanent": 0
};

const muteFormSchema = z.object({
  reason: z.string().max(500, { message: "Reason must be less than 500 characters" }).optional(),
  duration: z.enum(["5m", "1h", "24h", "7d", "permanent"]).default("1h")
});

export function MuteUserModal() {
  const { isOpen, onClose, type, data } = useModal();
  const { client } = useMatrixClient();
  const [isLoading, setIsLoading] = useState(false);

  const isModalOpen = isOpen && type === "muteUser";
  const { targetUser, serverId, roomId } = data;

  const form = useForm({
    resolver: zodResolver(muteFormSchema),
    defaultValues: {
      reason: "",
      duration: "1h" as const
    }
  });

  const selectedDuration = form.watch("duration");
  const isPermanent = (selectedDuration as string) === "permanent";

  const onSubmit = async (values: z.infer<typeof muteFormSchema>) => {
    if (!client || !targetUser || !serverId) {
      toast.error("Missing required data for mute operation");
      return;
    }

    try {
      setIsLoading(true);
      
      const moderationService = createModerationService(client);
      const currentUserId = client.getUserId()!;
      
      // Convert duration
      const durationMs = MUTE_DURATIONS[values.duration];
      
      // Use serverId as roomId (Matrix Space acts as the main room)
      const result = await moderationService.muteUser(
        serverId,
        currentUserId,
        targetUser.id,
        { 
          reason: values.reason || undefined,
          duration: durationMs
        }
      );

      if (result.success) {
        const durationText = values.duration === "permanent" ? "permanently" : `for ${getDurationLabel(values.duration)}`;
        toast.success(`${targetUser.name} has been muted ${durationText}`);
        form.reset();
        onClose();
        
        // Log scheduled unmute for timed mutes
        if (durationMs > 0) {
          console.log(`Scheduled unmute for ${targetUser.name} in ${durationMs}ms`);
        }
      } else {
        toast.error(result.error || "Failed to mute user");
      }
    } catch (error) {
      console.error("Error muting user:", error);
      toast.error("An unexpected error occurred while muting the user");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  if (!targetUser) {
    return null;
  }

  const getDurationLabel = (duration: string) => {
    switch (duration) {
      case "5m": return "5 Minutes";
      case "1h": return "1 Hour";
      case "24h": return "24 Hours";
      case "7d": return "7 Days";
      case "permanent": return "Permanent";
      default: return duration;
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white dark:bg-zinc-900 text-black dark:text-white p-0 overflow-hidden max-w-md">
        <DialogHeader className="pt-8 px-6">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full">
              <VolumeX className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          
          <DialogTitle className="text-2xl text-center font-bold">
            Mute User
          </DialogTitle>
          
          <DialogDescription className="text-center text-zinc-500 dark:text-zinc-400">
            Prevent this user from sending messages in this server.
          </DialogDescription>
        </DialogHeader>

        {/* User Info */}
        <div className="px-6 py-4">
          <div className="flex items-center gap-3 p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarImage src={targetUser.avatarUrl} alt={targetUser.name} />
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold">
                {targetUser.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {targetUser.name}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                {targetUser.id}
              </p>
            </div>
          </div>
        </div>

        {/* Warning Message */}
        <div className="px-6 py-4">
          <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-900/50 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                This action will prevent the user from sending messages
              </p>
              <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                {isPermanent
                  ? "They will not be able to send messages until unmuted by a moderator."
                  : `They will not be able to send messages for ${getDurationLabel(selectedDuration)}.`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Mute Duration */}
            <div className="px-6">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Mute Duration
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-zinc-100 dark:bg-zinc-800 border-0 focus-visible:ring-0 text-black dark:text-white focus-visible:ring-offset-0">
                          <SelectValue placeholder="Select mute duration" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="5m">5 Minutes</SelectItem>
                        <SelectItem value="1h">1 Hour</SelectItem>
                        <SelectItem value="24h">24 Hours</SelectItem>
                        <SelectItem value="7d">7 Days</SelectItem>
                        <SelectItem value="permanent">Permanent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Mute Reason */}
            <div className="px-6">
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Reason (optional)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        disabled={isLoading}
                        placeholder="Explain why you're muting this user..."
                        className="bg-zinc-100 dark:bg-zinc-800 border-0 focus-visible:ring-0 text-black dark:text-white focus-visible:ring-offset-0 resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter className="bg-gray-100 dark:bg-zinc-800 px-6 py-4">
              <div className="flex items-center justify-end gap-2 w-full">
                <Button
                  disabled={isLoading}
                  onClick={handleClose}
                  variant="ghost"
                  type="button"
                >
                  Cancel
                </Button>
                <Button 
                  disabled={isLoading} 
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {isLoading ? "Muting..." : `Mute User ${!isPermanent ? `(${getDurationLabel(selectedDuration)})` : ""}`}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}