import React from "react";
import { redirect } from "next/navigation";

import { DMChatHeader } from "@/components/chat/dm-chat-header";
import { DMChatInput } from "@/components/chat/dm-chat-input";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatLayout } from "@/components/chat/chat-layout";
import { SectionErrorBoundary, ChatErrorBoundary } from "@/components/error-boundary";
import { getSessionCookie } from "@/lib/matrix/cookies";

interface ConversationPageProps {
  params: {
    serverId: string;
    memberId: string;
  };
}

interface DirectMessageInfo {
  roomId: string;
  targetUserId: string;
  targetUserName: string;
  targetUserAvatar?: string;
}

/**
 * Find or create a DM room between current user and target user
 */
async function findOrCreateDMRoom(
  targetUserId: string,
  accessToken: string,
  homeserverUrl: string,
  currentUserId: string
): Promise<DirectMessageInfo | null> {
  const baseUrl = homeserverUrl.replace(/\/+$/, '');
  
  try {
    // First, check existing DM rooms using m.direct account data
    const directUrl = `${baseUrl}/_matrix/client/v3/user/${encodeURIComponent(currentUserId)}/account_data/m.direct`;
    const directResponse = await fetch(directUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    
    if (directResponse.ok) {
      const directData = await directResponse.json();
      const existingRooms = directData[targetUserId];
      
      if (existingRooms && existingRooms.length > 0) {
        // Use the first existing DM room
        const roomId = existingRooms[0];
        
        // Get target user info
        const userInfo = await getUserInfo(targetUserId, accessToken, baseUrl);
        
        return {
          roomId,
          targetUserId,
          targetUserName: userInfo?.displayName || targetUserId.split(':')[0].slice(1),
          targetUserAvatar: userInfo?.avatarUrl,
        };
      }
    }
    
    // No existing DM found, create a new one
    const createRoomUrl = `${baseUrl}/_matrix/client/v3/createRoom`;
    const createRoomResponse = await fetch(createRoomUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invite: [targetUserId],
        is_direct: true,
        preset: 'trusted_private_chat',
        // This ensures the room is created as a DM
        creation_content: {
          type: 'm.room',
        },
        // E2EE is MANDATORY - all rooms must be encrypted
        initial_state: [
          {
            type: 'm.room.encryption',
            state_key: '',
            content: { algorithm: 'm.megolm.v1.aes-sha2' }
          }
        ],
      }),
      cache: 'no-store',
    });
    
    if (!createRoomResponse.ok) {
      console.error("[createDMRoom] Failed to create room:", createRoomResponse.status);
      return null;
    }
    
    const createRoomData = await createRoomResponse.json();
    const newRoomId = createRoomData.room_id;
    
    // Update m.direct account data to mark this as a DM
    const updateDirectUrl = `${baseUrl}/_matrix/client/v3/user/${encodeURIComponent(currentUserId)}/account_data/m.direct`;
    
    // Get current direct data first
    let currentDirectData: Record<string, string[]> = {};
    if (directResponse.ok) {
      currentDirectData = await directResponse.json();
    }
    
    // Add the new room to the user's DM list
    const updatedDirectData = {
      ...currentDirectData,
      [targetUserId]: [
        ...(currentDirectData[targetUserId] || []),
        newRoomId
      ]
    };
    
    await fetch(updateDirectUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedDirectData),
      cache: 'no-store',
    });
    
    // Get target user info
    const userInfo = await getUserInfo(targetUserId, accessToken, baseUrl);
    
    return {
      roomId: newRoomId,
      targetUserId,
      targetUserName: userInfo?.displayName || targetUserId.split(':')[0].slice(1),
      targetUserAvatar: userInfo?.avatarUrl,
    };
    
  } catch (error) {
    console.error("[findOrCreateDMRoom] Error:", error);
    return null;
  }
}

/**
 * Get user profile information
 */
async function getUserInfo(
  userId: string,
  accessToken: string,
  baseUrl: string
): Promise<{ displayName?: string; avatarUrl?: string } | null> {
  try {
    const profileUrl = `${baseUrl}/_matrix/client/v3/profile/${encodeURIComponent(userId)}`;
    const response = await fetch(profileUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    
    if (!response.ok) return null;
    
    const profileData = await response.json();
    return {
      displayName: profileData.displayname,
      avatarUrl: profileData.avatar_url,
    };
  } catch (error) {
    console.error("[getUserInfo] Error:", error);
    return null;
  }
}

/**
 * Direct Message Conversation Page
 * 
 * Handles finding or creating DM rooms between users and displays the chat interface
 */
export default async function ConversationPage({
  params
}: ConversationPageProps) {
  // Decode Matrix IDs
  const spaceId = decodeURIComponent(params.serverId);
  const targetUserId = decodeURIComponent(params.memberId);
  
  // Get session from cookies
  const session = await getSessionCookie();
  
  if (!session?.accessToken || !session?.homeserverUrl || !session?.userId) {
    return redirect("/sign-in");
  }
  
  const { accessToken, homeserverUrl, userId } = session;
  
  // Don't allow DM with yourself
  if (targetUserId === userId) {
    return redirect(`/servers/${params.serverId}`);
  }
  
  // Find or create DM room
  const dmInfo = await findOrCreateDMRoom(
    targetUserId,
    accessToken,
    homeserverUrl,
    userId
  );
  
  if (!dmInfo) {
    // Failed to create/find DM room
    return redirect(`/servers/${params.serverId}`);
  }

  return (
    <ChatErrorBoundary>
      <ChatLayout 
        members={[]} // DMs don't show member sidebar
        onlineMembers={[]}
        showMembersToggle={false}
        className="bg-white dark:bg-[#313338]"
      >
        <div className="flex flex-col h-full">
          <SectionErrorBoundary name="dm-chat-header">
            <DMChatHeader roomId={dmInfo.roomId} />
          </SectionErrorBoundary>
          
          <SectionErrorBoundary name="chat-messages">
            <ChatMessages
              roomId={dmInfo.roomId}
              roomName={dmInfo.targetUserName}
              type="conversation"
              currentUserId={userId}
            />
          </SectionErrorBoundary>
          
          <SectionErrorBoundary name="dm-chat-input">
            <DMChatInput
              roomId={dmInfo.roomId}
              name={dmInfo.targetUserName}
            />
          </SectionErrorBoundary>
        </div>
      </ChatLayout>
    </ChatErrorBoundary>
  );
}
