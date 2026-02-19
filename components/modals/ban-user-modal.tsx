"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ban, AlertTriangle, Clock } from "lucide-react";

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
import { useSecurityPrompt } from "@/hooks/use-security-prompt";
import { toast } from "sonner";

// Duration options in milliseconds
const BAN_DURATIONS = {
  "1h": 1 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "permanent": 0
};

const banFormSchema = z.object({
  reason: z.string().max(500, { message: "Reason must be less than 500 characters" }).optional(),
  duration: z.enum(["1h", "24h", "7d", "permanent"]).default("permanent")
});

export function BanUserModal() {
  const { isOpen, onClose, type, data } = useModal();
  const { client } = useMatrixClient();
  const { requestDestructiveConfirmation } = useSecurityPrompt();
  const [isLoading, setIsLoading] = useState(false);

  const isModalOpen = isOpen && type === "banUser";
  const { targetUser, serverId, roomId } = data;

  const form = useForm({
    resolver: zodResolver(banFormSchema),
    defaultValues: {
      reason: "",
      duration: "permanent" as const
    }
  });

  const selectedDuration = form.watch("duration");

  const onSubmit = async (values: z.infer<typeof banFormSchema>) => {
    if (!client || !targetUser || !serverId) {
      toast.error("Missing required data for ban operation");
      return;
    }

    // Show security confirmation before executing the ban
    const durationText = values.duration === "permanent" ? "permanently" : `for ${getDurationLabel(values.duration)}`;
    
    const consequences = [
      `${targetUser.name} will be immediately removed from the server`,
      `They will be banned ${durationText}`,
      "They cannot rejoin unless unbanned by a moderator",
      "Their messages will remain visible",
      "This action will be logged in the audit log"
    ];

    if (values.reason) {
      consequences.push(`Ban reason: "${values.reason}"`);
    }

    requestDestructiveConfirmation(
      "Confirm User Ban",
      `Are you sure you want to ban "${targetUser.name}" from this server?`,
      consequences,
      `Ban ${durationText === "permanently" ? "Permanently" : `for ${getDurationLabel(values.duration)}`}`,
      async () => {
        try {
          setIsLoading(true);
          
          const moderationService = createModerationService(client);
          const currentUserId = client.getUserId()!;
          
          // Convert duration
          const durationMs = BAN_DURATIONS[values.duration];
          
          // Use serverId as roomId (Matrix Space acts as the main room)
          const result = await moderationService.banUser(
            serverId,
            currentUserId,
            targetUser.id,
            { 
              reason: values.reason || undefined,
              duration: durationMs
            }
          );

          if (result.success) {
            toast.success(`${targetUser.name} has been banned ${durationText}`);
            form.reset();
            onClose();
            return true;
          } else {
            toast.error(result.error || "Failed to ban user");
            return false;
          }
        } catch (error) {
          console.error("Error banning user:", error);
          toast.error("An unexpected error occurred while banning the user");
          return false;
        } finally {
          setIsLoading(false);
        }
      },
      {
        icon: "warning"
      }
    );
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
      case "1h": return "1 Hour";
      case "24h": return "24 Hours";
      case "7d": return "7 Days";
      case "permanent": return "Permanent";
      default: return duration;
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#313338] text-white border-zinc-700 p-0 overflow-hidden max-w-md">
        <DialogHeader className="pt-8 px-6">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-full">
              <Ban className="h-8 w-8 text-red-400" />
            </div>
          </div>
          
          <DialogTitle className="text-2xl text-center font-bold">
            Ban User
          </DialogTitle>
          
          <DialogDescription className="text-center text-zinc-500 dark:text-zinc-400">
            Ban this user from the server. They will be unable to rejoin.
          </DialogDescription>
        </DialogHeader>

        {/* User Info */}
        <div className="px-6 py-4">
          <div className="flex items-center gap-3 p-4 bg-[#2B2D31] rounded-lg">
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
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                This action will ban the user from the server
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {selectedDuration === "permanent" 
                  ? "They will not be able to rejoin unless unbanned by a moderator."
                  : `They will not be able to rejoin for ${getDurationLabel(selectedDuration)} unless unbanned earlier.`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Ban Duration */}
            <div className="px-6">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Ban Duration
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-[#2B2D31] border-0 focus-visible:ring-0 text-white focus-visible:ring-offset-0">
                          <SelectValue placeholder="Select ban duration" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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

            {/* Ban Reason */}
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
                        placeholder="Explain why you're banning this user..."
                        className="bg-[#2B2D31] border-0 focus-visible:ring-0 text-white focus-visible:ring-offset-0 resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter className="bg-[#2B2D31] px-6 py-4">
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
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isLoading ? "Banning..." : `Ban User ${getDurationLabel(selectedDuration) !== "Permanent" ? `(${getDurationLabel(selectedDuration)})` : ""}`}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}