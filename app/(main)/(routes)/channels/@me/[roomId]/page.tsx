import React from "react";
import { redirect } from "next/navigation";

import { currentProfile } from "@/lib/current-profile";
import { DMChatHeader } from "@/components/chat/dm-chat-header";
import { ChatMessages } from "@/components/chat/chat-messages";
import { DMChatInput } from "@/components/chat/dm-chat-input";
import { MediaRoom } from "@/components/media-room";
import { DMList } from "@/components/navigation/dm-list";
import { Separator } from "@/components/ui/separator";

interface DMRoomPageProps {
  params: {
    roomId: string;
  };
  searchParams: {
    video?: boolean;
  };
}

/**
 * Individual DM conversation page
 * 
 * Layout:
 * - Left sidebar: DM list (same as /channels/@me)
 * - Right content: Selected DM chat interface
 */
export default async function DMRoomPage({
  params: { roomId },
  searchParams: { video }
}: DMRoomPageProps) {
  const profile = await currentProfile();

  if (!profile) {
    return redirect("/");
  }

  // Validate room ID format
  if (!roomId || !roomId.startsWith("!")) {
    return redirect("/channels/@me");
  }

  return (
    <div className="flex h-full">
      {/* Left sidebar - DM list */}
      <div className="flex flex-col h-full w-60 bg-[#2f3136] dark:bg-[#2f3136]">
        {/* Header */}
        <div className="flex items-center px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <h1 className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">
            Direct Messages
          </h1>
        </div>

        {/* DM List */}
        <div className="flex-1">
          <DMList />
        </div>
      </div>

      <Separator orientation="vertical" className="bg-zinc-200 dark:bg-zinc-700" />

      {/* Right content - Chat interface */}
      <div className="flex-1 bg-white dark:bg-[#36393f] flex flex-col">
        <DMChatHeader roomId={roomId} />
        
        {video && (
          <MediaRoom
            chatId={roomId}
            video={true}
            audio={true}
          />
        )}
        
        {!video && (
          <>
            <ChatMessages
              roomId={roomId}
              roomName="Direct Message"
              type="conversation"
              currentUserId={profile.userId}
            />
            <DMChatInput roomId={roomId} />
          </>
        )}
      </div>
    </div>
  );
}