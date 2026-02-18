"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Hash, Mic, Video, ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";

import { useSpaces } from "@/hooks/use-spaces";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ServerHeader } from "@/components/server/server-header";
import { ServerSection } from "@/components/server/server-section";
import { ServerChannel } from "@/components/server/server-channel";
import { VoiceChannelList } from "@/components/voice/voice-channel-list";

interface ServerSidebarProps {
  serverId: string;
}

export function ServerSidebar({ serverId }: ServerSidebarProps) {
  const router = useRouter();
  const { spaces, isLoading, error } = useSpaces();

  // Find the specific space for this server ID
  const currentSpace = useMemo(() => {
    return spaces.find(space => space.id === serverId);
  }, [spaces, serverId]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full w-full bg-[#2B2D31] dark:bg-[#2B2D31]" data-testid="space-loading">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      </div>
    );
  }

  if (error || !currentSpace) {
    return (
      <div className="flex flex-col h-full w-full bg-[#2B2D31] dark:bg-[#2B2D31]" data-testid="space-error">
        <div className="flex items-center justify-center h-full p-4 text-center text-zinc-500">
          {error?.message || "Space not found"}
        </div>
      </div>
    );
  }

  // For Matrix, everyone starts as a guest - admin would be determined by power levels
  const role = "guest";

  // Group channels by type
  const textChannels = currentSpace.channels.filter(ch => ch.type === "text");
  const audioChannels = currentSpace.channels.filter(ch => ch.type === "voice" || ch.type === "audio");
  const videoChannels = currentSpace.channels.filter(ch => ch.type === "video");

  return (
    <div className="flex flex-col h-full text-primary w-full dark:bg-[#2B2D31] bg-[#F2F3F5]" data-testid="channels-sidebar">
      <div data-testid="space-header">
        <ServerHeader 
          server={{
            id: currentSpace.id,
            name: currentSpace.name,
            imageUrl: currentSpace.avatarUrl || "",
            inviteCode: "",
          }} 
          role={role} 
        />
      </div>
      <ScrollArea className="flex-1 px-3">
        <div className="mt-2">
          {/* Text Channels */}
          {textChannels.length > 0 && (
            <ServerSection
              sectionType="channels"
              channelType={"TEXT" as any}
              role={role as any}
              label="Text Channels"
              serverId={currentSpace.id}
            >
              {textChannels.map((channel) => (
                <ServerChannel
                  key={channel.id}
                  channel={channel}
                  server={{
                    id: currentSpace.id,
                    name: currentSpace.name,
                  }}
                  role={role}
                />
              ))}
            </ServerSection>
          )}
          
          {/* Voice Channels with Enhanced Management */}
          <VoiceChannelList
            spaceId={currentSpace.id}
            channels={[...audioChannels, ...videoChannels].map(ch => ({
              id: ch.id,
              name: ch.name,
              type: ch.type as "voice" | "video" | "audio",
              participantCount: 0, // TODO: Get real-time participant count
              hasActivity: false, // TODO: Detect channel activity
            }))}
            userRole={role as any}
            className="mt-2"
          />

          {/* Show member count */}
          <div className="mt-4 px-2 text-xs text-zinc-500 dark:text-zinc-400" data-testid="space-member-count">
            {currentSpace.memberCount} {currentSpace.memberCount === 1 ? 'member' : 'members'}
          </div>
          
          {/* Show space topic if it exists */}
          {currentSpace.topic && (
            <div className="mt-2 px-2 text-xs text-zinc-500 dark:text-zinc-400" data-testid="space-topic">
              {currentSpace.topic}
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Hidden element with space name for easier testing */}
      <div className="sr-only" data-testid="space-name">{currentSpace.name}</div>
    </div>
  );
}
