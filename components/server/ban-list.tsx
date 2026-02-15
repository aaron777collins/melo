"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Ban, UserCheck, Shield, Clock, Search, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { createModerationService } from "@/lib/matrix/moderation";
import { toast } from "sonner";

interface BannedUser {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  reason?: string;
  bannedAt?: Date;
  bannedBy?: string;
  expiresAt?: Date;
}

interface BanListProps {
  /** Server/Space ID to show bans for */
  serverId: string;
  /** Current user's role */
  userRole: 'admin' | 'moderator' | 'member';
}

export function BanList({ serverId, userRole }: BanListProps) {
  const { client } = useMatrixClient();
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<BannedUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUnbanning, setIsUnbanning] = useState<string | null>(null);

  // Check if user can manage bans
  const canManageBans = userRole === 'admin' || userRole === 'moderator';

  const loadBannedUsers = useCallback(async () => {
    if (!client || !serverId) return;

    try {
      setIsLoading(true);
      const room = client.getRoom(serverId);
      
      if (!room) {
        toast.error("Room not found");
        return;
      }

      // Get all members and filter for banned ones
      const allMembers = room.getMembers();
      const bannedUsersList: BannedUser[] = [];

      for (const member of allMembers) {
        // Only include members with "ban" membership status
        if (member.membership !== "ban") continue;
        // Extract ban reason from member events if available
        const banEvent = room.getLiveTimeline().getEvents().find(
          event => event.getType() === "m.room.member" && 
          event.getStateKey() === member.userId &&
          event.getContent().membership === "ban"
        );

        bannedUsersList.push({
          userId: member.userId,
          displayName: member.name || member.userId,
          avatarUrl: member.getAvatarUrl(client.baseUrl, 64, 64, "crop", false, true) || undefined,
          reason: banEvent?.getContent().reason || undefined,
          bannedAt: banEvent ? new Date(banEvent.getTs()) : undefined,
          bannedBy: banEvent?.getSender() || undefined,
          // Note: Matrix doesn't natively support timed bans, so expiresAt will be undefined
          // This would need to be tracked separately for timed bans
          expiresAt: undefined
        });
      }

      setBannedUsers(bannedUsersList);
    } catch (error) {
      console.error("Error loading banned users:", error);
      toast.error("Failed to load banned users");
    } finally {
      setIsLoading(false);
    }
  }, [client, serverId]);

  useEffect(() => {
    loadBannedUsers();
  }, [loadBannedUsers]);

  useEffect(() => {
    // Filter banned users based on search term
    if (!searchTerm) {
      setFilteredUsers(bannedUsers);
    } else {
      const filtered = bannedUsers.filter(user => 
        user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.userId.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, bannedUsers]);

  const handleUnbanUser = async (userId: string, displayName: string) => {
    if (!client || !canManageBans) return;

    try {
      setIsUnbanning(userId);
      const moderationService = createModerationService(client);
      const currentUserId = client.getUserId()!;

      const result = await moderationService.unbanUser(serverId, currentUserId, userId);

      if (result.success) {
        toast.success(`${displayName} has been unbanned`);
        // Reload the ban list
        await loadBannedUsers();
      } else {
        toast.error(result.error || "Failed to unban user");
      }
    } catch (error) {
      console.error("Error unbanning user:", error);
      toast.error("An unexpected error occurred while unbanning the user");
    } finally {
      setIsUnbanning(null);
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return "Unknown";
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const formatDuration = (expiresAt?: Date) => {
    if (!expiresAt) return "Permanent";
    
    const now = new Date();
    const timeLeft = expiresAt.getTime() - now.getTime();
    
    if (timeLeft <= 0) return "Expired";
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-zinc-500" />
        <span className="ml-2 text-zinc-500">Loading banned users...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-red-500" />
          <h3 className="text-lg font-semibold">Banned Users</h3>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            ({bannedUsers.length})
          </span>
        </div>
        <Button
          onClick={loadBannedUsers}
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500 dark:text-zinc-400" />
        <Input
          placeholder="Search banned users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Ban List */}
      <div className="border rounded-lg">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <Ban className="h-12 w-12 text-zinc-400 dark:text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-500 dark:text-zinc-400">
              {searchTerm ? "No banned users match your search" : "No banned users"}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="divide-y">
              {filteredUsers.map((user, index) => (
                <div key={user.userId} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Avatar */}
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatarUrl} alt={user.displayName} />
                        <AvatarFallback className="bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                          {user.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {user.displayName}
                          </p>
                          <Ban className="h-3 w-3 text-red-500" />
                        </div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                          {user.userId}
                        </p>
                        
                        {/* Ban Details */}
                        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          <div className="flex items-center gap-4">
                            <span>Banned: {formatDate(user.bannedAt)}</span>
                            {user.expiresAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDuration(user.expiresAt)}
                              </span>
                            )}
                          </div>
                          {user.reason && (
                            <p className="mt-1 text-zinc-600 dark:text-zinc-300">
                              Reason: {user.reason}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Unban Button */}
                    {canManageBans && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                            disabled={isUnbanning === user.userId}
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            {isUnbanning === user.userId ? "Unbanning..." : "Unban"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Unban User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to unban <strong>{user.displayName}</strong>? 
                              They will be able to rejoin the server immediately.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleUnbanUser(user.userId, user.displayName)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Unban User
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Footer Info */}
      {!canManageBans && (
        <div className="text-sm text-zinc-500 dark:text-zinc-400 text-center p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg">
          You need moderator or administrator permissions to unban users.
        </div>
      )}
    </div>
  );
}