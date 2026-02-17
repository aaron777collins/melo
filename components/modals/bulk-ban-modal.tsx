"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ban, AlertTriangle, Users, CheckCircle, XCircle, Clock } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useModal } from "@/hooks/use-modal-store";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { createModerationService, ModerationResult } from "@/lib/matrix/moderation";
import { useSecurityPrompt } from "@/hooks/use-security-prompt";
import { toast } from "sonner";

// Duration options in milliseconds
const BAN_DURATIONS = {
  "1h": 1 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "permanent": 0
};

const bulkBanFormSchema = z.object({
  reason: z.string().max(500, { message: "Reason must be less than 500 characters" }).optional(),
  duration: z.enum(["1h", "24h", "7d", "permanent"]).default("permanent")
});

interface BanResult {
  userId: string;
  name: string;
  success: boolean;
  error?: string;
}

export function BulkBanModal() {
  const { isOpen, onClose, type, data } = useModal();
  const { client } = useMatrixClient();
  const { requestDestructiveConfirmation } = useSecurityPrompt();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentUser, setCurrentUser] = useState<string>("");
  const [results, setResults] = useState<BanResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const isModalOpen = isOpen && type === "bulkBan";
  const { targetUsers, serverId, onBulkComplete } = data;

  const form = useForm({
    resolver: zodResolver(bulkBanFormSchema),
    defaultValues: {
      reason: "",
      duration: "permanent" as const
    }
  });

  const selectedDuration = form.watch("duration");

  const getDurationLabel = (duration: string) => {
    switch (duration) {
      case "1h": return "1 Hour";
      case "24h": return "24 Hours";
      case "7d": return "7 Days";
      case "permanent": return "Permanent";
      default: return duration;
    }
  };

  const onSubmit = async (values: z.infer<typeof bulkBanFormSchema>) => {
    if (!client || !targetUsers || targetUsers.length === 0 || !serverId) {
      toast.error("Missing required data for bulk ban operation");
      return;
    }

    // Show security confirmation before executing bulk ban
    const durationText = values.duration === "permanent" ? "permanently" : `for ${getDurationLabel(values.duration)}`;
    
    const consequences = [
      `${targetUsers.length} user${targetUsers.length > 1 ? 's' : ''} will be immediately removed from the server`,
      `They will be banned ${durationText}`,
      "They cannot rejoin unless unbanned by a moderator",
      "Their messages will remain visible",
      "This action will be logged in the audit log"
    ];

    if (values.reason) {
      consequences.push(`Ban reason: "${values.reason}"`);
    }

    requestDestructiveConfirmation(
      "Confirm Bulk Ban",
      `Are you sure you want to ban ${targetUsers.length} user${targetUsers.length > 1 ? 's' : ''} from this server?`,
      consequences,
      `Ban ${targetUsers.length} User${targetUsers.length > 1 ? 's' : ''} ${durationText === "permanently" ? "Permanently" : `for ${getDurationLabel(values.duration)}`}`,
      async () => {
        setIsLoading(true);
        setIsProcessing(true);
        setProgress(0);
        setResults([]);

        try {
          const moderationService = createModerationService(client);
          const currentUserId = client.getUserId()!;
          const banResults: BanResult[] = [];

          // Convert duration
          const durationMs = BAN_DURATIONS[values.duration];

          for (let i = 0; i < targetUsers.length; i++) {
            const user = targetUsers[i];
            setCurrentUser(user.name);
            setProgress(((i) / targetUsers.length) * 100);

            try {
              const result = await moderationService.banUser(
                serverId,
                currentUserId,
                user.id,
                { 
                  reason: values.reason || undefined,
                  duration: durationMs
                }
              );

              banResults.push({
                userId: user.id,
                name: user.name,
                success: result.success,
                error: result.error
              });

              // Small delay between bans to avoid overwhelming the server
              if (i < targetUsers.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 250));
              }
            } catch (error) {
              banResults.push({
                userId: user.id,
                name: user.name,
                success: false,
                error: error instanceof Error ? error.message : "Unknown error"
              });
            }
          }

          setProgress(100);
          setCurrentUser("");
          setResults(banResults);

          const successCount = banResults.filter(r => r.success).length;
          const failCount = banResults.filter(r => !r.success).length;

          if (successCount > 0 && failCount === 0) {
            toast.success(`Successfully banned ${successCount} user${successCount > 1 ? 's' : ''} ${durationText}`);
          } else if (successCount > 0) {
            toast.warning(`Banned ${successCount} user${successCount > 1 ? 's' : ''}, ${failCount} failed`);
          } else {
            toast.error("Failed to ban any users");
          }

          // Call success callback if provided
          if (onBulkComplete) {
            onBulkComplete();
          }

          return true;
        } catch (error) {
          console.error("Error during bulk ban:", error);
          toast.error("An unexpected error occurred during bulk ban operation");
          return false;
        } finally {
          setIsLoading(false);
          setIsProcessing(false);
        }
      },
      {
        icon: "warning"
      }
    );
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
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full">
              <Ban className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </div>
          
          <DialogTitle className="text-2xl text-center font-bold">
            Bulk Ban Users
          </DialogTitle>
          
          <DialogDescription className="text-center text-zinc-500 dark:text-zinc-400">
            {isProcessing
              ? "Banning users from the server..."
              : results.length > 0
              ? "Bulk ban operation completed"
              : `Ban ${targetUsers.length} user${targetUsers.length > 1 ? 's' : ''} from the server`
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
              Users to ban ({targetUsers.length})
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
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  This will ban {targetUsers.length} user{targetUsers.length > 1 ? 's' : ''} from the server
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
        )}

        {/* Form */}
        {!isProcessing && results.length === 0 && (
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
                          <SelectTrigger className="bg-zinc-100 dark:bg-zinc-800 border-0 focus-visible:ring-0 text-black dark:text-white focus-visible:ring-offset-0">
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
                          placeholder="Explain why you're banning these users..."
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
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isLoading ? "Starting..." : `Ban ${targetUsers.length} User${targetUsers.length > 1 ? 's' : ''} ${getDurationLabel(selectedDuration) !== "Permanent" ? `(${getDurationLabel(selectedDuration)})` : ""}`}
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