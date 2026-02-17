"use client";

import React, { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Room } from "matrix-js-sdk";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useMatrix } from "@/components/providers/matrix-provider";
import { ActionTooltip } from "@/components/action-tooltip";

interface DMConversation {
  roomId: string;
  displayName: string;
  avatarUrl?: string;
  lastMessage?: {
    text: string;
    timestamp: number;
    sender: string;
  };
  isOnline?: boolean;
  unreadCount: number;
}

export const DMList = () => {
  const { client, rooms, isReady } = useMatrix();
  const router = useRouter();

  // Get direct message rooms
  const dmRooms = useMemo(() => {
    if (!client || !isReady) return [];

    // Get the m.direct account data to identify DM rooms
    // Use type assertion for Matrix SDK account data key
    const directRooms = client.getAccountData("m.direct" as any)?.getContent() || {};
    const directRoomIds = new Set<string>();
    
    // Collect all room IDs from the m.direct mapping
    Object.values(directRooms).forEach((roomIds) => {
      if (Array.isArray(roomIds)) {
        roomIds.forEach(id => directRoomIds.add(id));
      }
    });

    // Filter rooms to only include direct message rooms
    return rooms.filter(room => directRoomIds.has(room.roomId));
  }, [client, rooms, isReady]);

  // Convert Matrix rooms to DM conversation objects
  const dmConversations = useMemo((): DMConversation[] => {
    if (!client || !dmRooms.length) return [];

    return dmRooms.map((room: Room) => {
      // Get the other user in the DM (not ourselves)
      const members = room.getJoinedMembers();
      const userId = client.getUserId();
      const otherUser = members.find(member => member.userId !== userId);
      
      // Get display name and avatar
      const displayName = otherUser?.name || otherUser?.userId || "Unknown User";
      const avatarUrl = otherUser?.getAvatarUrl(
        client.baseUrl,
        64, 64, "crop", true, false
      ) || undefined;

      // Get last message
      const timeline = room.getLiveTimeline().getEvents();
      const lastEvent = timeline
        .filter(event => event.getType() === "m.room.message")
        .pop();

      let lastMessage;
      if (lastEvent) {
        const content = lastEvent.getContent();
        lastMessage = {
          text: content.body || "",
          timestamp: lastEvent.getTs(),
          sender: lastEvent.getSender() || ""
        };
      }

      // Get unread count
      const unreadCount = room.getUnreadNotificationCount() || 0;

      // Check online status - get presence from Matrix
      let isOnline = false;
      if (otherUser?.userId) {
        const presence = client.getUser(otherUser.userId)?.presence;
        isOnline = presence === "online";
      }

      return {
        roomId: room.roomId,
        displayName,
        avatarUrl,
        lastMessage,
        isOnline,
        unreadCount
      };
    }).sort((a, b) => {
      // Sort by last message timestamp, most recent first
      const aTime = a.lastMessage?.timestamp || 0;
      const bTime = b.lastMessage?.timestamp || 0;
      return bTime - aTime;
    });
  }, [client, dmRooms]);

  const handleDMClick = useCallback((roomId: string) => {
    router.push(`/channels/@me/${roomId}`);
  }, [router]);

  const formatTimestamp = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  }, []);

  const truncateMessage = useCallback((text: string, maxLength = 40) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }, []);

  if (!isReady) {
    return (
      <div className="space-y-2 px-2">
        <div className="text-sm text-zinc-500 dark:text-zinc-400 px-2">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-2">
      <div className="text-sm text-zinc-500 dark:text-zinc-400 px-2 mb-2">
        Direct Messages
      </div>
      
      {dmConversations.length === 0 ? (
        <div className="text-sm text-zinc-400 dark:text-zinc-500 px-2 py-4 text-center">
          No direct messages yet
        </div>
      ) : (
        dmConversations.map((conversation) => (
          <ActionTooltip
            key={conversation.roomId}
            side="right"
            align="center"
            label={conversation.displayName}
          >
            <div
              onClick={() => handleDMClick(conversation.roomId)}
              className={cn(
                "flex items-center gap-3 p-2 mx-1 rounded-md cursor-pointer",
                "hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50",
                "transition-colors duration-200 group"
              )}
            >
              {/* Avatar with online indicator */}
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={conversation.avatarUrl} />
                  <AvatarFallback className="bg-zinc-500 text-white text-sm">
                    {conversation.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                {/* Online status indicator */}
                {conversation.isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#1e1f22] rounded-full" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm truncate text-zinc-900 dark:text-zinc-100">
                    {conversation.displayName}
                  </div>
                  {conversation.lastMessage && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 ml-2 flex-shrink-0">
                      {formatTimestamp(conversation.lastMessage.timestamp)}
                    </div>
                  )}
                </div>
                
                {conversation.lastMessage && (
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                    {truncateMessage(conversation.lastMessage.text)}
                  </div>
                )}
              </div>

              {/* Unread count badge */}
              {conversation.unreadCount > 0 && (
                <div className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                </div>
              )}
            </div>
          </ActionTooltip>
        ))
      )}
    </div>
  );
};