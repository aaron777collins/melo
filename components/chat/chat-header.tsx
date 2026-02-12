import React from "react";
import { Hash } from "lucide-react";

import { MobileToggle } from "@/components/mobile-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { ConnectionIndicator } from "@/components/connection-indicator";
import { ChatVideoButton } from "@/components/chat/chat-video-button";
import { VoiceChannelControls } from "@/components/voice/voice-channel-controls";
import { VoiceConnectionStatus } from "@/components/voice/voice-connection-status";
import { useMatrixClient } from "@/hooks/use-matrix-client";

interface ChatHeaderProps {
  serverId: string;
  name: string;
  type: "channel" | "conversation";
  imageUrl?: string;
  channelId?: string;
}

export function ChatHeader({
  name,
  serverId,
  type,
  imageUrl,
  channelId
}: ChatHeaderProps) {
  const { client } = useMatrixClient();
  const userId = client?.getUserId() || "Unknown User";

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
