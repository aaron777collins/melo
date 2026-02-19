"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserX, AlertTriangle, Users } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useModal } from "@/hooks/use-modal-store";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { createModerationService } from "@/lib/matrix/moderation";
import { toast } from "sonner";

const bulkKickFormSchema = z.object({
  reason: z.string().max(500, { message: "Reason must be less than 500 characters" }).optional()
});

export function BulkKickUsersModal() {
  const { isOpen, onClose, type, data } = useModal();
  const { client } = useMatrixClient();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const isModalOpen = isOpen && type === "bulkKickUsers";
  const { targetUsers = [], serverId, onSuccess } = data;

  const form = useForm({
    resolver: zodResolver(bulkKickFormSchema),
    defaultValues: {
      reason: ""
    }
  });

  const onSubmit = async (values: z.infer<typeof bulkKickFormSchema>) => {
    if (!client || !targetUsers.length || !serverId) {
      toast.error("Missing required data for bulk kick operation");
      return;
    }

    try {
      setIsLoading(true);
      setErrors([]);
      
      const moderationService = createModerationService(client);
      const currentUserId = client.getUserId()!;
      
      // Execute kicks in parallel
      const kickPromises = targetUsers.map(async (user) => {
        try {
          const result = await moderationService.kickUser(
            serverId,
            currentUserId,
            user.id,
            { reason: values.reason || undefined }
          );
          
          if (!result.success) {
            return { user, error: result.error || "Unknown error" };
          }
          return { user, success: true };
        } catch (error) {
          return { user, error: error instanceof Error ? error.message : "Unknown error" };
        }
      });

      const results = await Promise.all(kickPromises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => r.error);

      if (successful.length > 0) {
        toast.success(`Successfully kicked ${successful.length} user${successful.length === 1 ? '' : 's'}`);
      }

      if (failed.length > 0) {
        const errorMessages = failed.map(f => `${f.user.name}: ${f.error}`);
        setErrors(errorMessages);
        toast.error(`Failed to kick ${failed.length} user${failed.length === 1 ? '' : 's'}`);
      }

      // If any were successful, call onSuccess callback
      if (successful.length > 0 && onSuccess) {
        onSuccess();
      }

      // Close modal if all were successful
      if (failed.length === 0) {
        form.reset();
        onClose();
      }

    } catch (error) {
      console.error("Error in bulk kick:", error);
      toast.error("An unexpected error occurred during bulk kick operation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setErrors([]);
    onClose();
  };

  if (!targetUsers.length) {
    return null;
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#313338] text-white border-zinc-700 p-0 overflow-hidden max-w-lg">
        <DialogHeader className="pt-8 px-6">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-full">
              <UserX className="h-8 w-8 text-red-400" />
            </div>
          </div>
          
          <DialogTitle className="text-2xl text-center font-bold">
            Bulk Kick Users
          </DialogTitle>
          
          <DialogDescription className="text-center text-zinc-500 dark:text-zinc-400">
            Are you sure you want to kick these {targetUsers.length} user{targetUsers.length === 1 ? '' : 's'} from the server?
          </DialogDescription>
        </DialogHeader>

        {/* Users List */}
        <div className="px-6 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-zinc-500" />
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Users to kick:
            </span>
            <Badge variant="outline" className="text-xs">
              {targetUsers.length}
            </Badge>
          </div>
          
          <ScrollArea className="h-32 bg-[#2B2D31] rounded-lg p-3">
            <div className="space-y-2">
              {targetUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold text-xs">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {user.id}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Warning Message */}
        <div className="px-6 py-4">
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                This action will remove {targetUsers.length} user{targetUsers.length === 1 ? '' : 's'} from the server
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                They can rejoin if they have an invite link or are invited again.
              </p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {errors.length > 0 && (
          <div className="px-6 py-4">
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                Some kicks failed:
              </p>
              <ScrollArea className="h-20">
                <div className="space-y-1">
                  {errors.map((error, index) => (
                    <p key={index} className="text-xs text-red-700 dark:text-red-300">
                      {error}
                    </p>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

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
                        placeholder="Explain why you're kicking these users..."
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
                  {isLoading ? "Kicking..." : `Kick ${targetUsers.length} User${targetUsers.length === 1 ? '' : 's'}`}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}