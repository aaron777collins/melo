"use client";

import React, { useState, useEffect } from "react";
import { 
  Shield, 
  Trash2, 
  AlertTriangle, 
  History, 
  CheckSquare, 
  Square,
  X,
  FileText,
  Calendar,
  User
} from "lucide-react";
import { MatrixEvent } from "matrix-js-sdk";
import { format } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { createModerationService } from "@/lib/matrix/moderation";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface ModActionsProps {
  /**
   * Room ID for moderation actions
   */
  roomId: string;
  
  /**
   * Current user's Matrix ID
   */
  currentUserId?: string;
  
  /**
   * Whether the current user can moderate
   */
  canModerate: boolean;
  
  /**
   * Optional array of messages that can be selected for bulk operations
   */
  messages?: MatrixEvent[];
}

interface ModerationLog {
  action: string;
  moderatorId: string;
  targetUserId: string;
  eventId: string;
  roomId: string;
  reason: string;
  timestamp: string;
  isOwnMessage?: boolean;
  metadata?: any;
}

interface BulkDeleteState {
  isOpen: boolean;
  selectedMessages: Set<string>;
  reason: string;
  isProcessing: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Moderation actions component for room moderators.
 * Provides bulk message deletion and moderation logging functionality.
 */
export function ModActions({
  roomId,
  currentUserId,
  canModerate,
  messages = []
}: ModActionsProps) {
  const { client } = useMatrixClient();
  const [moderationService, setModerationService] = useState<ReturnType<typeof createModerationService> | null>(null);
  const [moderationLogs, setModerationLogs] = useState<ModerationLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [bulkDeleteState, setBulkDeleteState] = useState<BulkDeleteState>({
    isOpen: false,
    selectedMessages: new Set(),
    reason: "",
    isProcessing: false
  });

  // Initialize moderation service
  useEffect(() => {
    if (client) {
      setModerationService(createModerationService(client));
    }
  }, [client]);

  // Load moderation logs when component mounts or logs dialog opens
  useEffect(() => {
    if (showLogs && moderationService) {
      loadModerationLogs();
    }
  }, [showLogs, moderationService, roomId]); // Added roomId dependency

  // =============================================================================
  // Data Loading
  // =============================================================================

  /**
   * Load moderation logs from the room
   */
  const loadModerationLogs = async () => {
    if (!moderationService) return;

    try {
      const logs = await moderationService.getModerationLogs(roomId, 100);
      setModerationLogs(logs);
    } catch (error) {
      console.error("Failed to load moderation logs:", error);
      setModerationLogs([]);
    }
  };

  // =============================================================================
  // Bulk Delete Functionality
  // =============================================================================

  /**
   * Toggle message selection for bulk operations
   */
  const toggleMessageSelection = (eventId: string) => {
    setBulkDeleteState(prev => {
      const newSelected = new Set(prev.selectedMessages);
      if (newSelected.has(eventId)) {
        newSelected.delete(eventId);
      } else {
        newSelected.add(eventId);
      }
      return { ...prev, selectedMessages: newSelected };
    });
  };

  /**
   * Select all visible messages
   */
  const selectAllMessages = () => {
    const allEventIds = messages
      .map(msg => msg.getId())
      .filter((id): id is string => !!id);
    
    setBulkDeleteState(prev => ({
      ...prev,
      selectedMessages: new Set(allEventIds)
    }));
  };

  /**
   * Clear all selections
   */
  const clearSelection = () => {
    setBulkDeleteState(prev => ({
      ...prev,
      selectedMessages: new Set()
    }));
  };

  /**
   * Perform bulk message deletion
   */
  const performBulkDelete = async () => {
    if (!moderationService || !currentUserId) return;

    setBulkDeleteState(prev => ({ ...prev, isProcessing: true }));

    try {
      const eventIds = Array.from(bulkDeleteState.selectedMessages);
      const result = await moderationService.bulkDeleteMessages(
        roomId,
        eventIds,
        currentUserId,
        bulkDeleteState.reason || undefined
      );

      console.log(`Bulk delete completed: ${result.deletedCount}/${eventIds.length} messages deleted`);
      
      if (result.errors.length > 0) {
        console.warn("Some messages failed to delete:", result.errors);
        // TODO: Show detailed error information to user
      }

      // Close dialog and reset state
      setBulkDeleteState({
        isOpen: false,
        selectedMessages: new Set(),
        reason: "",
        isProcessing: false
      });

    } catch (error) {
      console.error("Bulk delete failed:", error);
      setBulkDeleteState(prev => ({ ...prev, isProcessing: false }));
      // TODO: Show error toast to user
    }
  };

  // =============================================================================
  // UI Helpers
  // =============================================================================

  /**
   * Format user ID for display
   */
  const formatUserId = (userId: string) => {
    if (userId.startsWith("@")) {
      return userId.split(":")[0].substring(1);
    }
    return userId;
  };

  /**
   * Get action display text
   */
  const getActionDisplayText = (action: string) => {
    switch (action) {
      case 'delete_message':
        return 'Message Deleted';
      case 'bulk_delete_messages':
        return 'Bulk Message Deletion';
      case 'kick':
        return 'User Kicked';
      case 'ban':
        return 'User Banned';
      default:
        return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  /**
   * Get action color class
   */
  const getActionColorClass = (action: string) => {
    switch (action) {
      case 'delete_message':
      case 'bulk_delete_messages':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300';
      case 'kick':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300';
      case 'ban':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  // Don't render if user can't moderate
  if (!canModerate) {
    return null;
  }

  const selectedCount = bulkDeleteState.selectedMessages.size;
  const hasSelection = selectedCount > 0;

  return (
    <>
      {/* Moderation Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Moderation Actions"
          >
            <Shield className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={() => setBulkDeleteState(prev => ({ ...prev, isOpen: true }))}
            className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Bulk Delete Messages
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={() => setShowLogs(true)}
          >
            <History className="h-4 w-4 mr-2" />
            View Moderation Logs
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Bulk Delete Modal */}
      <Dialog
        open={bulkDeleteState.isOpen}
        onOpenChange={(open) => 
          setBulkDeleteState(prev => ({ ...prev, isOpen: open }))
        }
      >
        <DialogContent className="max-w-2xl max-h-[80vh] bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Bulk Delete Messages
            </DialogTitle>
            <DialogDescription>
              Select messages to delete. This action cannot be undone and will be logged.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Selection Controls */}
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllMessages}
                  disabled={bulkDeleteState.isProcessing}
                >
                  <CheckSquare className="h-4 w-4 mr-1" />
                  Select All ({messages.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  disabled={bulkDeleteState.isProcessing || !hasSelection}
                >
                  <Square className="h-4 w-4 mr-1" />
                  Clear Selection
                </Button>
              </div>
              <Badge variant="outline" className="text-sm">
                {selectedCount} selected
              </Badge>
            </div>

            {/* Reason Input */}
            <div className="space-y-2">
              <Label htmlFor="deleteReason">
                Reason (optional)
              </Label>
              <Textarea
                id="deleteReason"
                placeholder="Enter reason for bulk deletion..."
                value={bulkDeleteState.reason}
                onChange={(e) =>
                  setBulkDeleteState(prev => ({ ...prev, reason: e.target.value }))
                }
                disabled={bulkDeleteState.isProcessing}
                rows={3}
              />
            </div>

            {/* Message Selection List */}
            <ScrollArea className="h-64 border rounded-md p-2">
              <div className="space-y-2">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <FileText className="h-8 w-8 mx-auto mb-2" />
                    <p>No messages available for selection</p>
                    <p className="text-sm">Messages will appear here when loaded</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const eventId = message.getId();
                    if (!eventId) return null;
                    
                    const content = message.getContent();
                    const sender = message.getSender();
                    const timestamp = message.getTs();
                    const isSelected = bulkDeleteState.selectedMessages.has(eventId);
                    const messageText = content.body || "[No content]";
                    
                    return (
                      <div
                        key={eventId}
                        className={cn(
                          "flex items-start gap-3 p-2 rounded cursor-pointer border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                          isSelected && "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                        )}
                        onClick={() => toggleMessageSelection(eventId)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleMessageSelection(eventId)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <span>{formatUserId(sender || "Unknown")}</span>
                            <span>•</span>
                            <span>{format(new Date(timestamp), "MMM d, h:mm a")}</span>
                          </div>
                          <p className="text-sm text-gray-900 dark:text-gray-100 truncate mt-1">
                            {messageText.substring(0, 100)}
                            {messageText.length > 100 && "..."}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setBulkDeleteState(prev => ({ ...prev, isOpen: false }))}
              disabled={bulkDeleteState.isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={performBulkDelete}
              disabled={!hasSelection || bulkDeleteState.isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {bulkDeleteState.isProcessing
                ? `Deleting ${selectedCount} messages...`
                : `Delete ${selectedCount} message${selectedCount !== 1 ? 's' : ''}`
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Moderation Logs Modal */}
      <Dialog open={showLogs} onOpenChange={setShowLogs}>
        <DialogContent className="max-w-4xl max-h-[80vh] bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Moderation Logs
            </DialogTitle>
            <DialogDescription>
              Recent moderation actions performed in this room.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-96">
            <div className="space-y-3">
              {moderationLogs.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <History className="h-8 w-8 mx-auto mb-2" />
                  <p>No moderation logs found</p>
                  <p className="text-sm">Moderation actions will appear here</p>
                </div>
              ) : (
                moderationLogs.map((log, index) => (
                  <div
                    key={`${log.timestamp}_${index}`}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={getActionColorClass(log.action)}>
                          {getActionDisplayText(log.action)}
                        </Badge>
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(log.timestamp), "MMM d, yyyy 'at' h:mm a")}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span className="text-gray-600 dark:text-gray-400">Moderator:</span>
                        <span className="font-medium">{formatUserId(log.moderatorId)}</span>
                      </div>
                      
                      {log.targetUserId && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="text-gray-600 dark:text-gray-400">Target:</span>
                          <span className="font-medium">{formatUserId(log.targetUserId)}</span>
                        </div>
                      )}
                    </div>

                    {log.reason && (
                      <div className="text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Reason:</span>
                        <span className="ml-1 italic">{log.reason}</span>
                      </div>
                    )}

                    {log.metadata && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                        {log.action === 'bulk_delete_messages' && (
                          <div className="grid grid-cols-3 gap-2">
                            <span>Total: {log.metadata.totalMessages}</span>
                            <span>Deleted: {log.metadata.deletedCount}</span>
                            <span>Failed: {log.metadata.failedCount}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {log.eventId && (
                      <div className="text-xs text-gray-400 font-mono">
                        Event ID: {log.eventId}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowLogs(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ModActions;