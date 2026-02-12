import React from "react";
import { redirect } from "next/navigation";

import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/apps/web/components/chat/chat-input";
import { ChatMessages } from "@/components/chat/chat-messages";
import { MediaRoom } from "@/components/media-room";

interface ChannelIdPageProps {
  params: {
    serverId: string;
    channelId: string;
  };
}

export default async function ChannelIdPage({
  params: { channelId, serverId }
}: ChannelIdPageProps) {
  // For now, create a simplified version that works with Matrix types
  // TODO: Implement proper Matrix auth and room fetching
  
  // Mock channel data for build compatibility
  // Determine channel type from channel name for now
  const channelName = "general"; // placeholder, should come from Matrix room
  let channelType: "text" | "audio" | "video" = "text";
  
  if (channelName.toLowerCase().includes("voice") || channelName.toLowerCase().includes("audio")) {
    channelType = "audio";
  } else if (channelName.toLowerCase().includes("video")) {
    channelType = "video";
  }
  
  const channel = {
    id: channelId,
    name: channelName,
    type: channelType,
    serverId: serverId
  };

  return (
    <div className="bg-white dark:bg-[#313338] flex flex-col h-full">
      <ChatHeader
        name={channel.name}
        serverId={channel.serverId}
        type="channel"
      />
      {channel.type === "text" && (
        <>
          <ChatMessages
            roomId={channelId}
            roomName={channel.name}
            type="channel"
            currentUserId="@user:example.com" // placeholder
          />
          <ChatInput
            roomId={channelId}
            name={channel.name}
            type="channel"
          />
        </>
      )}
      {channel.type === "audio" && (
        <MediaRoom chatId={channel.id} video={false} audio={true} />
      )}
      {channel.type === "video" && (
        <MediaRoom chatId={channel.id} video={true} audio={true} />
      )}
    </div>
  );
}
