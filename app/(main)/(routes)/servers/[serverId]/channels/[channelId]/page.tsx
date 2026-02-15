import React from "react";
import { redirect } from "next/navigation";

import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatLayout } from "@/components/chat/chat-layout";
import { getSessionCookie } from "@/lib/matrix/cookies";

interface ChannelIdPageProps {
  params: {
    serverId: string;
    channelId: string;
  };
}

interface MatrixRoomInfo {
  roomId: string;
  name: string;
  topic?: string;
  avatarUrl?: string;
  type?: string;
}

async function getRoomInfo(
  roomId: string, 
  accessToken: string, 
  homeserverUrl: string
): Promise<MatrixRoomInfo | null> {
  const baseUrl = homeserverUrl.replace(/\/+$/, '');
  
  try {
    // Fetch room state to get name and other info
    const stateUrl = `${baseUrl}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/state`;
    const response = await fetch(stateUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      console.error("[getRoomInfo] Failed:", response.status);
      return null;
    }
    
    const stateEvents = await response.json();
    
    // Extract room info from state events
    let name = "Unknown Channel";
    let topic: string | undefined;
    let avatarUrl: string | undefined;
    let roomType: string | undefined;
    
    for (const event of stateEvents) {
      switch (event.type) {
        case "m.room.name":
          name = event.content?.name || name;
          break;
        case "m.room.topic":
          topic = event.content?.topic;
          break;
        case "m.room.avatar":
          avatarUrl = event.content?.url;
          break;
        case "m.room.create":
          roomType = event.content?.type;
          break;
      }
    }
    
    return { roomId, name, topic, avatarUrl, type: roomType };
  } catch (error) {
    console.error("[getRoomInfo] Error:", error);
    return null;
  }
}

async function getRoomMembers(
  roomId: string,
  accessToken: string,
  homeserverUrl: string
): Promise<any[]> {
  const baseUrl = homeserverUrl.replace(/\/+$/, '');
  
  try {
    const membersUrl = `${baseUrl}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/members`;
    const response = await fetch(membersUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    
    // Filter to only joined members and format
    return (data.chunk || [])
      .filter((event: any) => event.content?.membership === "join")
      .map((event: any) => ({
        id: event.state_key,
        name: event.content?.displayname || event.state_key.split(':')[0].slice(1),
        avatarUrl: event.content?.avatar_url,
      }));
  } catch (error) {
    console.error("[getRoomMembers] Error:", error);
    return [];
  }
}

export default async function ChannelIdPage({
  params: { channelId, serverId }
}: ChannelIdPageProps) {
  // Decode Matrix room IDs
  const spaceId = decodeURIComponent(serverId);
  const roomId = decodeURIComponent(channelId);
  
  // Get session from cookies (properly decoded)
  const session = await getSessionCookie();
  
  if (!session?.accessToken || !session?.homeserverUrl) {
    return redirect("/sign-in");
  }
  
  const { accessToken, homeserverUrl, userId } = session;
  
  // Fetch room info from Matrix
  const roomInfo = await getRoomInfo(roomId, accessToken, homeserverUrl);
  
  if (!roomInfo) {
    // Room not found or not accessible
    return redirect("/");
  }
  
  // Fetch room members for sidebar
  const members = await getRoomMembers(roomId, accessToken, homeserverUrl);
  
  // Filter out current user
  const otherMembers = members.filter(m => m.id !== userId);
  
  // For now, treat all members as online (Matrix presence API requires sync)
  const onlineMembers = otherMembers.map(m => m.id);

  return (
    <ChatLayout 
      members={otherMembers.map(m => ({
        id: m.id,
        profileId: m.id,
        role: "GUEST" as const,
        serverId: spaceId,
        profile: {
          id: m.id,
          userId: m.id,
          name: m.name,
          imageUrl: m.avatarUrl || "",
          email: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }))}
      onlineMembers={onlineMembers}
      showMembersToggle={true}
      className="bg-white dark:bg-[#313338]"
    >
      <div className="flex flex-col h-full">
        <ChatHeader
          name={roomInfo.name}
          serverId={spaceId}
          type="channel"
          channelId={roomId}
          roomId={roomId}
        />
        <ChatMessages
          roomId={roomId}
          roomName={roomInfo.name}
          type="channel"
          currentUserId={userId}
        />
        <ChatInput
          name={roomInfo.name}
          type="channel"
          apiUrl="/api/messages"
          query={{
            channelId: roomId,
            serverId: spaceId
          }}
        />
      </div>
    </ChatLayout>
  );
}
