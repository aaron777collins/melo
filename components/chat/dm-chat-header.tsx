"use client";

import React, { useMemo, useCallback } from "react";
import { Phone, Video, User, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActionTooltip } from "@/components/action-tooltip";
import { useMatrix } from "@/components/providers/matrix-provider";
import { useModal } from "@/hooks/use-modal-store";

interface DMChatHeaderProps {
  roomId: string;
}

export const DMChatHeader = ({ roomId }: DMChatHeaderProps) => {
  const { client, isReady } = useMatrix();
  const { onOpen } = useModal();

  // Get room and user information
  const roomInfo = useMemo(() => {
    if (!client || !isReady || !roomId) {
      return null;
    }

    const room = client.getRoom(roomId);
    if (!room) return null;

    // Get the other user in the DM (not ourselves)
    const members = room.getJoinedMembers();
    const userId = client.getUserId();
    const otherUser = members.find(member => member.userId !== userId);

    if (!otherUser) return null;

    // Get display name and avatar
    const displayName = otherUser.name || otherUser.userId || "Unknown User";
    const avatarUrl = otherUser.getAvatarUrl(
      client.baseUrl,
      96, 96, "crop", true, false
    ) || undefined;

    // Check online status
    let isOnline = false;
    let presenceStatus = "Unknown";
    
    if (otherUser.userId) {
      const user = client.getUser(otherUser.userId);
      const presence = user?.presence;
      isOnline = presence === "online";
      
      switch (presence) {
        case "online":
          presenceStatus = "Online";
          break;
        case "offline":
          presenceStatus = "Offline";
          break;
        case "unavailable":
          presenceStatus = "Away";
          break;
        default:
          presenceStatus = "Unknown";
      }
    }

    return {
      userId: otherUser.userId,
      displayName,
      avatarUrl,
      isOnline,
      presenceStatus,
      room
    };
  }, [client, isReady, roomId]);

  const handleVoiceCall = useCallback(() => {
    if (!roomInfo) return;
    
    // TODO: Implement voice calling when LiveKit integration is ready
    console.log("Voice call to", roomInfo.displayName);
    
    // For now, show a modal indicating feature is coming soon
    onOpen("featureComingSoon", { 
      feature: "Voice Calls",
      description: "Voice calling will be available once LiveKit integration is complete."
    });
  }, [roomInfo, onOpen]);

  const handleVideoCall = useCallback(() => {
    if (!roomInfo) return;
    
    // TODO: Implement video calling when LiveKit integration is ready
    console.log("Video call to", roomInfo.displayName);
    
    // For now, show a modal indicating feature is coming soon
    onOpen("featureComingSoon", { 
      feature: "Video Calls",
      description: "Video calling will be available once LiveKit integration is complete."
    });
  }, [roomInfo, onOpen]);

  const handleUserProfile = useCallback(() => {
    if (!roomInfo) return;
    
    // Open user profile modal
    onOpen("userProfile", { 
      userId: roomInfo.userId,
      displayName: roomInfo.displayName,
      avatarUrl: roomInfo.avatarUrl,
      presence: roomInfo.presenceStatus
    });
  }, [roomInfo, onOpen]);

  const handleMoreOptions = useCallback(() => {
    if (!roomInfo) return;
    
    // Open DM options menu
    onOpen("dmOptions", { 
      roomId,
      userId: roomInfo.userId,
      displayName: roomInfo.displayName
    });
  }, [roomInfo, roomId, onOpen]);

  if (!isReady || !roomInfo) {
    return (
      <div className="flex items-center h-12 px-3 border-b-2 border-[#e3e5e8] dark:border-[#313338]">
        <div className="text-md font-semibold text-[#4f5660] dark:text-[#b5bac1]">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between h-12 px-3 border-b-2 border-[#e3e5e8] dark:border-[#313338] bg-[#ffffff] dark:bg-[#1e1f22]">
      {/* Left side - User info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Avatar with online indicator */}
        <div className="relative">
          <Avatar className="h-8 w-8">
            <AvatarImage src={roomInfo.avatarUrl} />
            <AvatarFallback className="bg-[#5865f2] text-white text-sm">
              {roomInfo.displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          {/* Online status indicator */}
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white dark:border-[#1e1f22] rounded-full ${
            roomInfo.isOnline ? "bg-green-500" : "bg-gray-400"
          }`} />
        </div>

        {/* Name and status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-md font-semibold text-zinc-900 dark:text-white truncate">
              {roomInfo.displayName}
            </h2>
            <Badge 
              variant={roomInfo.isOnline ? "default" : "secondary"}
              className={`text-xs px-2 py-0.5 ${
                roomInfo.isOnline 
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                  : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              {roomInfo.presenceStatus}
            </Badge>
          </div>
        </div>
      </div>

      {/* Right side - Action buttons */}
      <div className="flex items-center gap-2">
        {/* Voice call button */}
        <ActionTooltip side="bottom" label="Start voice call">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleVoiceCall}
            className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <Phone className="h-4 w-4" />
          </Button>
        </ActionTooltip>

        {/* Video call button */}
        <ActionTooltip side="bottom" label="Start video call">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleVideoCall}
            className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <Video className="h-4 w-4" />
          </Button>
        </ActionTooltip>

        {/* User profile button */}
        <ActionTooltip side="bottom" label="View profile">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUserProfile}
            className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <User className="h-4 w-4" />
          </Button>
        </ActionTooltip>

        {/* More options button */}
        <ActionTooltip side="bottom" label="More options">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMoreOptions}
            className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </ActionTooltip>
      </div>
    </div>
  );
};