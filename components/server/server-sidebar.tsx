"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Hash, Mic, Video, ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";

import { useMatrixAuth } from "@/components/providers/matrix-auth-provider";
import { getClient } from "@/lib/matrix/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ServerHeader } from "@/components/server/server-header";
import { ServerSection } from "@/components/server/server-section";
import { ServerChannel } from "@/components/server/server-channel";

interface ServerSidebarProps {
  serverId: string;
}

interface ChannelInfo {
  id: string;
  name: string;
  type: "TEXT" | "AUDIO" | "VIDEO";
}

interface SpaceInfo {
  id: string;
  name: string;
  topic?: string;
  avatarUrl?: string;
}

export function ServerSidebar({ serverId }: ServerSidebarProps) {
  const router = useRouter();
  const { session } = useMatrixAuth();
  const [loading, setLoading] = useState(true);
  const [space, setSpace] = useState<SpaceInfo | null>(null);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSpaceData() {
      if (!session?.accessToken || !session?.homeserverUrl) {
        setLoading(false);
        return;
      }

      try {
        const baseUrl = session.homeserverUrl.replace(/\/+$/, '');
        
        // Fetch space hierarchy
        const hierarchyUrl = `${baseUrl}/_matrix/client/v1/rooms/${encodeURIComponent(serverId)}/hierarchy?limit=50`;
        const response = await fetch(hierarchyUrl, {
          headers: { 'Authorization': `Bearer ${session.accessToken}` },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch space: ${response.status}`);
        }

        const data = await response.json();
        const rooms = data.rooms || [];

        // First room is the space itself
        const spaceRoom = rooms.find((r: any) => r.room_id === serverId);
        if (spaceRoom) {
          setSpace({
            id: spaceRoom.room_id,
            name: spaceRoom.name || "Unknown Server",
            topic: spaceRoom.topic,
            avatarUrl: spaceRoom.avatar_url,
          });
        }

        // Other rooms are channels
        const channelRooms = rooms.filter((r: any) => 
          r.room_id !== serverId && r.room_type !== "m.space"
        );

        setChannels(channelRooms.map((r: any) => ({
          id: r.room_id,
          name: r.name || "unnamed",
          type: "TEXT" as const, // Matrix doesn't have channel types like Discord
        })));

      } catch (err) {
        console.error("[ServerSidebar] Error:", err);
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }

    loadSpaceData();
  }, [serverId, session]);

  if (loading) {
    return (
      <div className="flex flex-col h-full w-full bg-[#2B2D31] dark:bg-[#2B2D31]">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      </div>
    );
  }

  if (error || !space) {
    return (
      <div className="flex flex-col h-full w-full bg-[#2B2D31] dark:bg-[#2B2D31]">
        <div className="flex items-center justify-center h-full p-4 text-center text-zinc-500">
          {error || "Space not found"}
        </div>
      </div>
    );
  }

  // For Matrix, everyone starts as a guest - admin would be the space creator
  const role = "guest";

  return (
    <div className="flex flex-col h-full text-primary w-full dark:bg-[#2B2D31] bg-[#F2F3F5]">
      <ServerHeader 
        server={{
          id: space.id,
          name: space.name,
          imageUrl: space.avatarUrl || "",
          inviteCode: "",
        }} 
        role={role} 
      />
      <ScrollArea className="flex-1 px-3">
        <div className="mt-2">
          {channels.length > 0 && (
            <ServerSection
              sectionType="channels"
              channelType={"TEXT" as any}
              role={role as any}
              label="Text Channels"
            >
              {channels.map((channel) => (
                <ServerChannel
                  key={channel.id}
                  channel={{
                    id: channel.id,
                    name: channel.name,
                    type: "text",
                    topic: null,
                    categoryId: null,
                    order: 0,
                    hasUnread: false,
                    mentionCount: 0,
                  }}
                  server={{
                    id: space.id,
                    name: space.name,
                  }}
                  role={role}
                />
              ))}
            </ServerSection>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
