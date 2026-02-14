import React from "react";
import { Hash, Pin } from "lucide-react";

import { MobileToggle } from "@/components/mobile-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { ConnectionIndicator } from "@/components/connection-indicator";
import { ChatVideoButton } from "@/components/chat/chat-video-button";
import { VoiceChannelControls } from "@/components/voice/voice-channel-controls";
import { VoiceConnectionStatus } from "@/components/voice/voice-connection-status";
import { Button } from "@/components/ui/button";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { useModal } from "@/hooks/use-modal-store";
import { usePins } from "@/hooks/use-pins";

interface ChatHeaderProps {
  serverId: string;
  name: string;
  type: "channel" | "conversation";
  imageUrl?: string;
  channelId?: string;
  roomId?: string;
}

export function ChatHeader({
  name,
  serverId,
  type,
  imageUrl,
  channelId,
  roomId
}: ChatHeaderProps) {
  const { client } = useMatrixClient();
  const { onOpen } = useModal();
  const userId = client?.getUserId() || "Unknown User";
  
  // Use channelId as roomId if roomId not provided (for backward compatibility)
  const effectiveRoomId = roomId || channelId || "";
  const { hasPins, pinCount } = usePins(effectiveRoomId);
  
  /**
   * Open pinned messages modal
   */
  const handleOpenPinnedMessages = () => {
    onOpen("pinnedMessages", { roomId: effectiveRoomId });
  };

  return (
    <div className="text-md font-semibold px-3 flex items-center h-12 border-neutral-200 dark:border-neutral-800 border-b-2">
      <MobileToggle serverId={serverId} />
      {type === "channel" && (
        <Hash className="w-5 h-5 text-zinc-500 dark:text-zinc-400 mr-2" />
      )}
      {type === "conversation" && (
        <UserAvatar
          src={imageUrl}
          className="h-8 w-8 md:h-8 md:w-8 mr-2"
        />
      )}
      <p className="font-semibold text-md text-black dark:text-white">
        {name}
      </p>
      <div className="ml-auto flex items-center gap-2">
        {/* Pinned Messages Button */}
        {effectiveRoomId && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 relative"
            onClick={handleOpenPinnedMessages}
            title={`Pinned Messages ${hasPins ? `(${pinCount})` : ""}`}
          >
            <Pin className="h-4 w-4" />
            {hasPins && (
              <span className="ml-1 text-xs bg-zinc-500 text-white rounded-full px-1.5 py-0.5 min-w-[1.2rem] h-5 flex items-center justify-center">
                {pinCount}
              </span>
            )}
          </Button>
        )}
        
        {/* Voice channel controls for server channels */}
        {type === "channel" && channelId && (
          <>
            <VoiceConnectionStatus className="mr-2" />
            <VoiceChannelControls 
              channelId={channelId} 
              username={userId}
            />
          </>
        )}
        {/* Direct call video button for conversations */}
        {type === "conversation" && <ChatVideoButton />}
        <ConnectionIndicator />
      </div>
    </div>
  );
}
