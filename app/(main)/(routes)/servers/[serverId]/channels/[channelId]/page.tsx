import React from "react";
import { redirect } from "next/navigation";
import { ChannelType, MemberRole } from "@/types";

import { currentProfile } from "@/lib/current-profile";
import { getMatrixClient } from "@/lib/matrix-client";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
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
  const profile = await currentProfile();

  if (!profile) {
    redirect("/sign-in");
    return;
  }

  const client = getMatrixClient();
  if (!client) {
    redirect("/sign-in");
    return;
  }

  // Get the Matrix room (channel)
  const room = client.getRoom(channelId);
  if (!room || !room.hasMembershipState(client.getUserId() || "", "join")) {
    redirect("/");
    return;
  }

  // Create a channel object that matches the expected interface
  const channel = {
    id: room.roomId,
    name: room.name || "Unnamed Channel",
    type: ChannelType.TEXT, // Default to TEXT, in Matrix we'd determine this from room type
    serverId: serverId,
  };

  // Create a member object representing the current user
  const userId = client.getUserId();
  const member = {
    id: userId || "",
    role: MemberRole.GUEST, // Default role, in Matrix we'd get this from power levels
    profileId: profile.id,
    profile: profile,
    serverId: serverId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return (
    <div className="bg-white dark:bg-[#313338] flex flex-col h-full">
      <ChatHeader
        name={channel.name}
        serverId={channel.serverId}
        type="channel"
      />
      {channel.type === ChannelType.TEXT && (
        <>
          <ChatMessages
            member={member}
            name={channel.name}
            chatId={channel.id}
            type="channel"
            apiUrl="/api/messages"
            socketUrl="/api/socket/messages"
            socketQuery={{
              channelId: channel.id,
              serverId: channel.serverId
            }}
            paramKey="channelId"
            paramValue={channel.id}
          />
          <ChatInput
            name={channel.name}
            type="channel"
            apiUrl="/api/socket/messages"
            query={{
              channelId: channel.id,
              serverId: channel.serverId
            }}
          />
        </>
      )}
      {channel.type === ChannelType.AUDIO && (
        <MediaRoom chatId={channel.id} video={false} audio={true} />
      )}
      {channel.type === ChannelType.VIDEO && (
        <MediaRoom chatId={channel.id} video={true} audio={true} />
      )}
    </div>
  );
}
