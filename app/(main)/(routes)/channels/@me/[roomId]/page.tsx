import React from "react";
import { redirect } from "next/navigation";

import { getSessionCookie } from "@/lib/matrix/cookies";
import { DMChatHeader } from "@/components/chat/dm-chat-header";
import { ChatMessages } from "@/components/chat/chat-messages";
import { DMChatInput } from "@/components/chat/dm-chat-input";
import { MediaRoom } from "@/components/media-room";
import { DMList } from "@/components/navigation/dm-list";
import { SectionErrorBoundary } from "@/components/error-boundary";
import { Separator } from "@/components/ui/separator";
import { MessageCircle } from "lucide-react";

interface DMRoomPageProps {
  params: Promise<{
    roomId: string;
  }>;
  searchParams: Promise<{
    video?: boolean;
  }>;
}

/**
 * Individual DM conversation page
 * 
 * Works with UserSidebar layout - shows DM list and chat interface
 * Layout: [UserSidebar] [DM List] [Chat Content]
 */
export default async function DMRoomPage({
  params,
  searchParams
}: DMRoomPageProps) {
  // Next.js 15: params and searchParams are async and must be awaited
  const { roomId } = await params;
  const { video } = await searchParams;
  // Get session from cookies
  const session = await getSessionCookie();
  
  if (!session?.accessToken || !session?.userId) {
    return redirect("/sign-in");
  }

  // Validate room ID format (Matrix room IDs start with !)
  if (!roomId || !roomId.startsWith("!")) {
    return redirect("/channels/@me");
  }

  return (
    <div className="flex h-full">
      {/* DM List sidebar - shows conversations */}
      <div className="flex flex-col h-full w-60 bg-[#2f3136] dark:bg-[#2f3136] border-r border-zinc-200 dark:border-zinc-800">
        {/* Header */}
        <div className="flex items-center px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <h1 className="text-lg font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Direct Messages
          </h1>
        </div>

        {/* DM List */}
        <div className="flex-1">
          <SectionErrorBoundary name="dm-list">
            <DMList activeRoomId={roomId} />
          </SectionErrorBoundary>
        </div>
      </div>

      {/* Chat interface - main content */}
      <div className="flex-1 bg-white dark:bg-[#36393f] flex flex-col">
        <SectionErrorBoundary name="dm-chat-header">
          <DMChatHeader roomId={roomId} />
        </SectionErrorBoundary>
        
        {video && (
          <SectionErrorBoundary name="media-room">
            <MediaRoom
              chatId={roomId}
              video={true}
              audio={true}
            />
          </SectionErrorBoundary>
        )}
        
        {!video && (
          <>
            <SectionErrorBoundary name="dm-chat-messages">
              <ChatMessages
                roomId={roomId}
                roomName="Direct Message"
                type="conversation"
                currentUserId={session.userId}
              />
            </SectionErrorBoundary>
            
            <SectionErrorBoundary name="dm-chat-input">
              <DMChatInput roomId={roomId} />
            </SectionErrorBoundary>
          </>
        )}
      </div>
    </div>
  );
}