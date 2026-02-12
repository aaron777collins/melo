"use client";

import React, { useState } from "react";
import { ChannelType, MemberRole, Channel, Member, Profile } from "@prisma/client";
import { Hash, Mic, ShieldAlert, ShieldCheck, Video, Users, Eye, EyeOff } from "lucide-react";

import { ServerWithMembersWithProfiles } from "@/types";
import { ServerHeader, fromPrismaServer, ServerRole } from "@/components/server/server-header";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ServerSearch } from "@/components/server/server-search";
import { Separator } from "@/components/ui/separator";
import { ServerSection } from "@/components/server/server-section";
import { ServerChannel } from "@/components/server/server-channel";
import { ServerMember } from "@/components/server/server-member";
import { ActionTooltip } from "@/components/action-tooltip";

const iconMap = {
  [ChannelType.TEXT]: <Hash className="mr-2 h-4 w-4" />,
  [ChannelType.AUDIO]: <Mic className="mr-2 h-4 w-4" />,
  [ChannelType.VIDEO]: <Video className="mr-2 h-4 w-4" />
};

const roleIconMap = {
  [MemberRole.GUEST]: null,
  [MemberRole.MODERATOR]: (
    <ShieldCheck className="h-4 w-4 mr-2 text-indigo-500" />
  ),
  [MemberRole.ADMIN]: <ShieldAlert className="h-4 w-4 mr-2 text-rose-500" />
};

interface ServerSidebarContentProps {
  server: ServerWithMembersWithProfiles;
  role?: MemberRole;
  textChannels: Channel[];
  audioChannels: Channel[];
  videoChannels: Channel[];
  members: (Member & { profile: Profile })[];
}

export function ServerSidebarContent({
  server,
  role,
  textChannels,
  audioChannels,
  videoChannels,
  members
}: ServerSidebarContentProps) {
  const [showMembers, setShowMembers] = useState(true);

  // Convert Prisma server data to new ServerHeader format
  const headerData = fromPrismaServer(server, role);

  return (
    <div className="flex flex-col h-full text-primary w-full dark:bg-[#2b2d31] bg-[#f2f3f5]">
      <ServerHeader server={headerData.server} role={headerData.role} />
      <ScrollArea className="flex-1 px-3">
        <div className="mt-2">
          <ServerSearch
            data={[
              {
                label: "Text Channels",
                type: "channel",
                data: textChannels?.map((channel) => ({
                  id: channel.id,
                  name: channel.name,
                  icon: iconMap[channel.type]
                }))
              },
              {
                label: "Voice Channels", 
                type: "channel",
                data: audioChannels?.map((channel) => ({
                  id: channel.id,
                  name: channel.name,
                  icon: iconMap[channel.type]
                }))
              },
              {
                label: "Video Channels",
                type: "channel", 
                data: videoChannels?.map((channel) => ({
                  id: channel.id,
                  name: channel.name,
                  icon: iconMap[channel.type]
                }))
              },
              {
                label: "Members",
                type: "member",
                data: members?.map((member) => ({
                  id: member.id,
                  name: member.profile.name,
                  icon: roleIconMap[member.role]
                }))
              }
            ]}
          />
        </div>
        <Separator className="bg-zinc-200 dark:bg-zinc-700 rounded-md my-2" />
        
        {!!textChannels?.length && (
          <ServerSection
            sectionType="channels"
            channelType={ChannelType.TEXT}
            role={role}
            label="Text Channels"
          >
            {textChannels.map((channel) => (
              <ServerChannel
                key={channel.id}
                channel={channel}
                role={role}
                server={server}
              />
            ))}
          </ServerSection>
        )}
        
        {!!audioChannels?.length && (
          <ServerSection
            sectionType="channels"
            channelType={ChannelType.AUDIO}
            role={role}
            label="Voice Channels"
          >
            {audioChannels.map((channel) => (
              <ServerChannel
                key={channel.id}
                channel={channel}
                role={role}
                server={server}
              />
            ))}
          </ServerSection>
        )}
        
        {!!videoChannels?.length && (
          <ServerSection
            sectionType="channels"
            channelType={ChannelType.VIDEO}
            role={role}
            label="Video Channels"
          >
            {videoChannels.map((channel) => (
              <ServerChannel
                key={channel.id}
                channel={channel}
                role={role}
                server={server}
              />
            ))}
          </ServerSection>
        )}
        
        {!!members?.length && (
          <div className="mb-2">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <p className="text-xs uppercase font-semibold text-zinc-500 dark:text-zinc-400">
                  Members
                </p>
              </div>
              <div className="flex items-center gap-1">
                <ActionTooltip label={showMembers ? "Hide Members" : "Show Members"} side="top">
                  <button
                    onClick={() => setShowMembers(!showMembers)}
                    className="text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 transition"
                  >
                    {showMembers ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </ActionTooltip>
                {role === MemberRole.ADMIN && (
                  <ActionTooltip label="Manage Members" side="top">
                    <button
                      className="text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 transition"
                    >
                      <Users className="h-4 w-4" />
                    </button>
                  </ActionTooltip>
                )}
              </div>
            </div>
            {showMembers && (
              <div className="space-y-[2px]">
                {members.map((member) => (
                  <ServerMember key={member.id} member={member} server={server} />
                ))}
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}