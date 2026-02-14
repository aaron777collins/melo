import React from "react";
import { redirect } from "next/navigation";

import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatLayout } from "@/components/chat/chat-layout";
import { MediaRoom } from "@/components/media-room";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

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
    return redirect("/");
  }

  // Fetch server data including members for the member sidebar
  const server = await db.server.findUnique({
    where: {
      id: serverId,
      members: {
        some: {
          profileId: profile.id
        }
      }
    },
    include: {
      channels: {
        where: {
          id: channelId
        }
      },
      members: {
        include: {
          profile: true
        },
        orderBy: {
          role: "asc"
        }
      }
    }
  });

  if (!server) {
    return redirect("/");
  }

  const channel = server.channels?.[0];

  if (!channel) {
    return redirect(`/servers/${serverId}`);
  }

  // Filter out current user from members list for member sidebar
  const members = server.members.filter(
    member => member.profileId !== profile.id
  );

  // For now, mock online status - in real implementation this would come from Matrix presence
  const onlineMembers = members.slice(0, Math.floor(members.length / 2)).map(m => m.id);

  return (
    <ChatLayout 
      members={members}
      onlineMembers={onlineMembers}
      showMembersToggle={channel.type === "TEXT"} // Only show member sidebar for text channels
      className="bg-white dark:bg-[#313338]"
    >
      <div className="flex flex-col h-full">
        <ChatHeader
          name={channel.name}
          serverId={channel.serverId}
          type="channel"
          channelId={channel.id}
          roomId={channelId}
        />
        {channel.type === "TEXT" && (
          <>
            <ChatMessages
              roomId={channelId}
              roomName={channel.name}
              type="channel"
              currentUserId={profile.userId}
            />
            <ChatInput
              name={channel.name}
              type="channel"
              apiUrl="/api/socket/messages"
              query={{
                channelId,
                serverId
              }}
            />
          </>
        )}
        {channel.type === "AUDIO" && (
          <MediaRoom chatId={channel.id} video={false} audio={true} />
        )}
        {channel.type === "VIDEO" && (
          <MediaRoom chatId={channel.id} video={true} audio={true} />
        )}
      </div>
    </ChatLayout>
  );
}
