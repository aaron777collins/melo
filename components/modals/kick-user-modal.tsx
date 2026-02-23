"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserX, AlertTriangle } from "lucide-react";

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
import { useModal } from "@/hooks/use-modal-store";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { createModerationService } from "@/lib/matrix/moderation";
import { toast } from "sonner";

const kickFormSchema = z.object({
  reason: z.string().max(500, { message: "Reason must be less than 500 characters" }).optional()
});

export function KickUserModal() {
  const { isOpen, onClose, type, data } = useModal();
  const { client } = useMatrixClient();
  const [isLoading, setIsLoading] = useState(false);

  const isModalOpen = isOpen && type === "kickUser";
  const { targetUser, serverId, roomId } = data;

  const form = useForm({
    resolver: zodResolver(kickFormSchema),
    defaultValues: {
      reason: ""
    }
  });

  const onSubmit = async (values: z.infer<typeof kickFormSchema>) => {
    if (!client || !targetUser || !serverId) {
      toast.error("Missing required data for kick operation");
      return;
    }

    try {
      setIsLoading(true);
      
      const moderationService = createModerationService(client);
      const currentUserId = client.getUserId()!;
      
      // Use serverId as roomId (Matrix Space acts as the main room)
      const result = await moderationService.kickUser(
        serverId,
        currentUserId,
        targetUser.id,
        { reason: values.reason || undefined }
      );

      if (result.success) {
        toast.success(`${targetUser.name} has been kicked from the server`);
        form.reset();
        onClose();
      } else {
        toast.error(result.error || "Failed to kick user");
      }
    } catch (error) {
      console.error("Error kicking user:", error);
      toast.error("An unexpected error occurred while kicking the user");
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

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="bg-[#313338] text-white border-zinc-700 p-0 overflow-hidden max-w-md"
        data-testid="kick-user-modal"
      >
        <DialogHeader className="pt-8 px-6">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-full">
              <UserX className="h-8 w-8 text-red-400" />
            </div>
          </div>
          
          <DialogTitle className="text-2xl text-center font-bold">
            Kick User
          </DialogTitle>
          
          <DialogDescription className="text-center text-zinc-500 dark:text-zinc-400">
            Are you sure you want to kick this user from the server?
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
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                This action will remove the user from the server
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                They can rejoin if they have an invite link or are invited again.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        placeholder="Explain why you're kicking this user..."
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
                  data-testid="kick-cancel-button"
                >
                  Cancel
                </Button>
                <Button 
                  disabled={isLoading} 
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  data-testid="kick-confirm-button"
                >
                  {isLoading ? "Kicking..." : "Kick User"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}