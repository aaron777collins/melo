import React from "react";
import { redirect } from "next/navigation";

import { currentProfile } from "@/lib/current-profile";
import { getMatrixClient } from "@/lib/matrix-client";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { MediaRoom } from "@/components/media-room";

interface MemberIdPageProps {
  params: {
    memberId: string;
    serverId: string;
  };
  searchParams: {
    video?: boolean;
  };
}

export default async function MemberIdPage({
  params: { memberId, serverId },
  searchParams: { video }
}: MemberIdPageProps) {
  const profile = await currentProfile();

  if (!profile) return redirect("/sign-in");

  const client = getMatrixClient();
  if (!client) return redirect("/sign-in");

  const currentUserId = client.getUserId();
  if (!currentUserId) return redirect("/sign-in");

  // Create current member object
  const currentMember = {
    id: currentUserId,
    role: "GUEST",
    profileId: profile.id,
    profile: profile,
    serverId: serverId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Get the other member's information
  const otherUser = client.getUser(memberId);
  const otherMemberProfile = {
    id: memberId,
    userId: memberId,
    name: otherUser?.displayName || memberId.replace(/@|:.*/g, ''),
    imageUrl: otherUser?.avatarUrl || "",
    email: "",
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const otherMember = {
    id: memberId,
    role: "GUEST",
    profileId: memberId,
    profile: otherMemberProfile,
    serverId: serverId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Find or create a direct message room between these users
  const dmRooms = client.getRooms().filter(room => {
    const members = room.getJoinedMembers();
    return members.length === 2 && 
           members.some(m => m.userId === currentUserId) &&
           members.some(m => m.userId === memberId);
  });

  let conversationRoomId = dmRooms[0]?.roomId;
  
  // If no DM room exists, use a constructed ID
  if (!conversationRoomId) {
    conversationRoomId = `dm:${[currentUserId, memberId].sort().join(':')}`;
  }

  const conversation = {
    id: conversationRoomId,
    memberOneId: currentUserId,
    memberTwoId: memberId,
    memberOne: currentMember,
    memberTwo: otherMember,
  };

  return (
    <div className="bg-white dark:bg-[#313338] flex flex-col h-full">
      <ChatHeader
        imageUrl={otherMember.profile.imageUrl}
        name={otherMember.profile.name}
        serverId={serverId}
        type="conversation"
      />
      {video && <MediaRoom chatId={conversation.id} video audio />}
      {!video && (
        <>
          <ChatMessages
            member={currentMember}
            name={otherMember.profile.name}
            chatId={conversation.id}
            type="conversation"
            apiUrl="/api/direct-messages"
            paramKey="conversationId"
            paramValue={conversation.id}
            socketUrl="/api/socket/direct-messages"
            socketQuery={{
              conversationId: conversation.id
            }}
          />
          <ChatInput
            name={otherMember.profile.name}
            type="conversation"
            apiUrl="/api/socket/direct-messages"
            query={{
              conversationId: conversation.id
            }}
          />
        </>
      )}
    </div>
  );
}
