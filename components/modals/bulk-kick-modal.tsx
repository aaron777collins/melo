"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserX, AlertTriangle, Users, CheckCircle, XCircle } from "lucide-react";

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
import { Progress } from "@/components/ui/progress";
import { useModal } from "@/hooks/use-modal-store";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { createModerationService, ModerationResult } from "@/lib/matrix/moderation";
import { toast } from "sonner";

const bulkKickFormSchema = z.object({
  reason: z.string().max(500, { message: "Reason must be less than 500 characters" }).optional()
});

interface KickResult {
  userId: string;
  name: string;
  success: boolean;
  error?: string;
}

export function BulkKickModal() {
  const { isOpen, onClose, type, data } = useModal();
  const { client } = useMatrixClient();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentUser, setCurrentUser] = useState<string>("");
  const [results, setResults] = useState<KickResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const isModalOpen = isOpen && type === "bulkKick";
  const { targetUsers, serverId, onBulkComplete } = data;

  const form = useForm({
    resolver: zodResolver(bulkKickFormSchema),
    defaultValues: {
      reason: ""
    }
  });

  const onSubmit = async (values: z.infer<typeof bulkKickFormSchema>) => {
    if (!client || !targetUsers || targetUsers.length === 0 || !serverId) {
      toast.error("Missing required data for bulk kick operation");
      return;
    }

    setIsLoading(true);
    setIsProcessing(true);
    setProgress(0);
    setResults([]);

    try {
      const moderationService = createModerationService(client);
      const currentUserId = client.getUserId()!;
      const kickResults: KickResult[] = [];

      for (let i = 0; i < targetUsers.length; i++) {
        const user = targetUsers[i];
        setCurrentUser(user.name);
        setProgress(((i) / targetUsers.length) * 100);

        try {
          const result = await moderationService.kickUser(
            serverId,
            currentUserId,
            user.id,
            { reason: values.reason || undefined }
          );

          kickResults.push({
            userId: user.id,
            name: user.name,
            success: result.success,
            error: result.error
          });

          // Small delay between kicks to avoid overwhelming the server
          if (i < targetUsers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 250));
          }
        } catch (error) {
          kickResults.push({
            userId: user.id,
            name: user.name,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }

      setProgress(100);
      setCurrentUser("");
      setResults(kickResults);

      const successCount = kickResults.filter(r => r.success).length;
      const failCount = kickResults.filter(r => !r.success).length;

      if (successCount > 0 && failCount === 0) {
        toast.success(`Successfully kicked ${successCount} user${successCount > 1 ? 's' : ''}`);
      } else if (successCount > 0) {
        toast.warning(`Kicked ${successCount} user${successCount > 1 ? 's' : ''}, ${failCount} failed`);
      } else {
        toast.error("Failed to kick any users");
      }

      // Call success callback if provided
      if (onBulkComplete) {
        onBulkComplete();
      }
    } catch (error) {
      console.error("Error during bulk kick:", error);
      toast.error("An unexpected error occurred during bulk kick operation");
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (isProcessing) {
      return; // Don't allow closing during processing
    }
    form.reset();
    setProgress(0);
    setCurrentUser("");
    setResults([]);
    onClose();
  };

  const handleComplete = () => {
    handleClose();
  };

  if (!targetUsers || targetUsers.length === 0) {
    return null;
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white dark:bg-zinc-900 text-black dark:text-white p-0 overflow-hidden max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader className="pt-8 px-6">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
              <UserX className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          
          <DialogTitle className="text-2xl text-center font-bold">
            Bulk Kick Users
          </DialogTitle>
          
          <DialogDescription className="text-center text-zinc-500 dark:text-zinc-400">
            {isProcessing
              ? "Kicking users from the server..."
              : results.length > 0
              ? "Bulk kick operation completed"
              : `Kick ${targetUsers.length} user${targetUsers.length > 1 ? 's' : ''} from the server`
            }
          </DialogDescription>
        </DialogHeader>

        {/* Progress Section */}
        {isProcessing && (
          <div className="px-6 py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">Progress</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              {currentUser && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Currently processing: <span className="font-medium">{currentUser}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Results Section */}
        {results.length > 0 && (
          <div className="px-6 py-4 max-h-60 overflow-y-auto">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Results ({results.filter(r => r.success).length}/{results.length} successful)
            </h3>
            <div className="space-y-2">
              {results.map((result) => (
                <div 
                  key={result.userId}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    result.success 
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50'
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{result.name}</p>
                    {result.error && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {result.error}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User List (when not processing/completed) */}
        {!isProcessing && results.length === 0 && (
          <div className="px-6 py-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users to kick ({targetUsers.length})
            </h3>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
              {targetUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3 p-3 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-semibold">
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
          </div>
        )}

        {/* Warning Message */}
        {!isProcessing && results.length === 0 && (
          <div className="px-6 py-4">
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  This will remove {targetUsers.length} user{targetUsers.length > 1 ? 's' : ''} from the server
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  They can rejoin if they have an invite link or are invited again.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        {!isProcessing && results.length === 0 && (
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
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    {isLoading ? "Starting..." : `Kick ${targetUsers.length} User${targetUsers.length > 1 ? 's' : ''}`}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        )}

        {/* Complete Button */}
        {results.length > 0 && (
          <DialogFooter className="bg-gray-100 dark:bg-zinc-800 px-6 py-4">
            <div className="flex items-center justify-end gap-2 w-full">
              <Button 
                onClick={handleComplete}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Complete
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}