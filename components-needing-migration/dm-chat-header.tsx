"use client";

import React, { useState, useEffect } from "react";
import { Phone, Video, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { MobileToggle } from "@/components/mobile-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { ConnectionIndicator } from "@/components/connection-indicator";
import { ActionTooltip } from "@/components/action-tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMatrix } from "@/components/providers/matrix-provider";

// Import Matrix DM service
import { getDMInfo, DirectMessageRoom, DMServiceError } from "../../apps/web/services/matrix-dm";

interface DMChatHeaderProps {
  /** Matrix room ID for the DM */
  roomId: string;
}

/**
 * Chat header for Direct Message conversations
 * 
 * Shows:
 * - Other user's avatar and name
 * - Online status (if available)
 * - Voice/video call buttons
 * - DM-specific actions
 */
export function DMChatHeader({ roomId }: DMChatHeaderProps) {
  const { client } = useMatrix();
  const [dmInfo, setDmInfo] = useState<DirectMessageRoom | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load DM information
  useEffect(() => {
    const loadDMInfo = async () => {
      if (!client || !roomId) return;

      try {
        setIsLoading(true);
        const room = client.getRoom(roomId);
        
        if (!room) {
          toast.error("Direct message not found");
          return;
        }

        const dmData = getDMInfo(room);
        setDmInfo(dmData);
      } catch (error) {
        console.error("Failed to load DM info:", error);
        if (error instanceof DMServiceError) {
          toast.error(error.message);
        } else {
          toast.error("Failed to load conversation info");
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadDMInfo();
  }, [client, roomId]);

  // Handle voice call
  const handleVoiceCall = () => {
    // TODO: Implement voice calling in DMs
    toast.info("Voice calling in DMs coming soon!");
  };

  // Handle video call
  const handleVideoCall = () => {
    // TODO: Implement video calling in DMs
    toast.info("Video calling in DMs coming soon!");
  };

  // Handle more actions menu
  const handleMoreActions = () => {
    // TODO: Implement more actions (mute, block, etc.)
    toast.info("More DM actions coming soon!");
  };

  if (isLoading) {
    return (
      <div className="text-md font-semibold px-3 flex items-center h-12 border-neutral-200 dark:border-neutral-800 border-b-2">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-zinc-700 rounded-full animate-pulse mr-2" />
          <div className="w-32 h-4 bg-zinc-700 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!dmInfo) {
    return (
      <div className="text-md font-semibold px-3 flex items-center h-12 border-neutral-200 dark:border-neutral-800 border-b-2">
        <p className="text-zinc-500 dark:text-zinc-400">
          Conversation not found
        </p>
      </div>
    );
  }

  return (
    <div className="text-md font-semibold px-3 flex items-center h-12 border-neutral-200 dark:border-neutral-800 border-b-2">
      <MobileToggle serverId="@me" />
      
      {/* User Avatar */}
      <UserAvatar
        src={dmInfo.otherUserAvatarUrl}
        className="h-8 w-8 md:h-8 md:w-8 mr-2"
      />
      
      {/* User Name and Status */}
      <div className="flex items-center">
        <p className="font-semibold text-md text-black dark:text-white">
          {dmInfo.otherUserDisplayName || dmInfo.otherUserId}
        </p>
        
        {/* Online status badge (placeholder for future implementation) */}
        <Badge 
          variant="secondary" 
          className="ml-2 text-xs bg-green-500/20 text-green-400 border-green-500/30"
        >
          Online
        </Badge>
      </div>

      {/* Right side actions */}
      <div className="ml-auto flex items-center gap-1">
        {/* Voice call */}
        <ActionTooltip side="bottom" label="Start voice call">
          <Button
            onClick={handleVoiceCall}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            <Phone className="w-4 h-4" />
          </Button>
        </ActionTooltip>

        {/* Video call */}
        <ActionTooltip side="bottom" label="Start video call">
          <Button
            onClick={handleVideoCall}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            <Video className="w-4 h-4" />
          </Button>
        </ActionTooltip>

        {/* More actions */}
        <ActionTooltip side="bottom" label="More options">
          <Button
            onClick={handleMoreActions}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </ActionTooltip>

        {/* Connection indicator */}
        <ConnectionIndicator />
      </div>
    </div>
  );
}