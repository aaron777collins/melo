"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ActionTooltip } from "@/components/action-tooltip";
import { UserAvatar } from "@/components/user-avatar";

// Import Matrix DM service
import { 
  getDMsWithInfo, 
  DirectMessageRoom,
  getOrCreateDM,
  DMServiceError,
  isDMRoom,
  getDMInfo
} from "../../apps/web/services/matrix-dm";
import { useMatrix } from "@/components/providers/matrix-provider";

/**
 * Direct Message List Component
 * 
 * Shows list of active DM conversations with:
 * - User avatar and display name
 * - Last message preview
 * - Unread count badge
 * - Online status indicator
 */
export function DMList() {
  const router = useRouter();
  const { client } = useMatrix();
  const [dmRooms, setDmRooms] = useState<DirectMessageRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreatingDM, setIsCreatingDM] = useState(false);

  // Load DM rooms
  const loadDMRooms = async () => {
    if (!client) return;
    
    try {
      setIsLoading(true);
      const rooms = await getDMsWithInfo();
      setDmRooms(rooms);
    } catch (error) {
      console.error("Failed to load DM rooms:", error);
      if (error instanceof DMServiceError) {
        toast.error(error.message);
      } else {
        toast.error("Failed to load direct messages");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load DMs on component mount and when Matrix client changes
  useEffect(() => {
    loadDMRooms();
  }, [client]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Listen for new DMs or updates
  useEffect(() => {
    if (!client) return;

    const handleRoomUpdate = () => {
      loadDMRooms();
    };

    // Handle new DM messages for notifications
    const handleNewMessage = (event: any, room: any) => {
      // Check if this is a DM room
      if (isDMRoom(room)) {
        const messageContent = event.getContent();
        const senderId = event.getSender();
        const myUserId = client.getUserId();
        
        // Only show notification if message is from someone else
        if (senderId !== myUserId && messageContent.msgtype === 'm.text') {
          // Show browser notification for new DM
          const dmInfo = getDMInfo(room);
          const senderName = dmInfo?.otherUserDisplayName || senderId;
          
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`New message from ${senderName}`, {
              body: messageContent.body,
              icon: dmInfo?.otherUserAvatarUrl || undefined,
              tag: `dm-${room.roomId}`, // Prevent duplicate notifications
            });
          }
        }
      }
    };

    // Listen for relevant Matrix events
    client.on("Room.timeline", handleRoomUpdate);
    client.on("Room.timeline", handleNewMessage);
    client.on("Room.accountData", handleRoomUpdate);

    return () => {
      client.off("Room.timeline", handleRoomUpdate);
      client.off("Room.timeline", handleNewMessage);
      client.off("Room.accountData", handleRoomUpdate);
    };
  }, [client]);

  // Filter DMs based on search query
  const filteredDMs = useMemo(() => {
    if (!searchQuery.trim()) return dmRooms;

    const query = searchQuery.toLowerCase();
    return dmRooms.filter(room =>
      room.otherUserDisplayName?.toLowerCase().includes(query) ||
      room.otherUserId?.toLowerCase().includes(query)
    );
  }, [dmRooms, searchQuery]);

  // Handle DM selection
  const handleDMSelect = (roomId: string) => {
    router.push(`/channels/@me/${roomId}`);
  };

  // Handle starting new DM
  const handleStartNewDM = async () => {
    const userId = prompt("Enter Matrix user ID (e.g., @user:example.com):");
    if (!userId || !userId.trim()) return;

    try {
      setIsCreatingDM(true);
      const room = await getOrCreateDM(userId.trim());
      toast.success(`Started conversation with ${userId}`);
      router.push(`/channels/@me/${room.roomId}`);
      
      // Refresh DM list
      await loadDMRooms();
    } catch (error) {
      console.error("Failed to create DM:", error);
      if (error instanceof DMServiceError) {
        toast.error(error.message);
      } else {
        toast.error("Failed to start conversation");
      }
    } finally {
      setIsCreatingDM(false);
    }
  };

  // Get last message preview for a room
  const getLastMessagePreview = (room: DirectMessageRoom): string => {
    const timeline = room.getLiveTimeline();
    const events = timeline.getEvents();
    const lastMessage = events
      .reverse()
      .find(event => event.getType() === "m.room.message" && !event.isRedacted());

    if (!lastMessage) return "No messages yet";

    const content = lastMessage.getContent();
    if (content.msgtype === "m.text") {
      return content.body || "Message";
    } else if (content.msgtype === "m.image") {
      return "📷 Image";
    } else if (content.msgtype === "m.file") {
      return "📎 File";
    } else if (content.msgtype === "m.audio") {
      return "🎵 Audio";
    } else if (content.msgtype === "m.video") {
      return "🎬 Video";
    }

    return "Message";
  };

  // Get unread count for a room
  const getUnreadCount = (room: DirectMessageRoom): number => {
    // Use Matrix SDK to get unread count
    return room.getUnreadNotificationCount() || 0;
  };

  // Format timestamp for last message
  const formatLastMessageTime = (room: DirectMessageRoom): string => {
    const timestamp = room.getLastActiveTimestamp();
    if (!timestamp) return "";

    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffMs = now.getTime() - messageTime.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return messageTime.toLocaleDateString([], { weekday: 'short' });
    } else {
      return messageTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-zinc-700 rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-zinc-700 rounded animate-pulse" />
              <div className="h-3 bg-zinc-700 rounded animate-pulse w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search and New DM button */}
      <div className="px-3 py-2 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search DMs..."
              className="w-full pl-9 pr-8 py-2 bg-zinc-800 text-zinc-200 placeholder-zinc-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <ActionTooltip side="bottom" label="Start new conversation">
            <Button
              onClick={handleStartNewDM}
              disabled={isCreatingDM}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </ActionTooltip>
        </div>
      </div>

      {/* DM List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredDMs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-zinc-400 text-sm">
                {searchQuery ? "No conversations found" : "No direct messages yet"}
              </p>
              {!searchQuery && (
                <Button
                  onClick={handleStartNewDM}
                  disabled={isCreatingDM}
                  variant="outline"
                  size="sm"
                  className="mt-3"
                >
                  Start a conversation
                </Button>
              )}
            </div>
          ) : (
            filteredDMs.map(room => {
              const unreadCount = getUnreadCount(room);
              const lastMessagePreview = getLastMessagePreview(room);
              const lastMessageTime = formatLastMessageTime(room);

              return (
                <button
                  key={room.roomId}
                  onClick={() => handleDMSelect(room.roomId)}
                  className={cn(
                    "w-full p-3 rounded-lg text-left transition-colors",
                    "hover:bg-zinc-700/50",
                    "focus:outline-none focus:ring-2 focus:ring-indigo-500",
                    unreadCount > 0 && "bg-zinc-700/30"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* User Avatar */}
                    <div className="relative">
                      <UserAvatar
                        src={room.otherUserAvatarUrl}
                        className="w-10 h-10"
                      />
                      {/* Online status indicator would go here */}
                    </div>

                    {/* Message Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn(
                          "text-sm font-medium truncate",
                          unreadCount > 0 ? "text-white" : "text-zinc-300"
                        )}>
                          {room.otherUserDisplayName || room.otherUserId}
                        </span>
                        {lastMessageTime && (
                          <span className="text-xs text-zinc-400 flex-shrink-0">
                            {lastMessageTime}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <p className={cn(
                          "text-xs truncate",
                          unreadCount > 0 ? "text-zinc-300" : "text-zinc-400"
                        )}>
                          {lastMessagePreview}
                        </p>
                        
                        {unreadCount > 0 && (
                          <Badge
                            variant="destructive"
                            className="ml-2 h-5 min-w-5 flex items-center justify-center text-xs"
                          >
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}