import React from "react";
import { redirect } from "next/navigation";
import { ChannelType, MemberRole } from "@/types";
import { Hash, Mic, ShieldAlert, ShieldCheck, Video } from "lucide-react";

import { currentProfile } from "@/lib/current-profile";
import { getMatrixClient } from "@/lib/matrix-client";

import { ServerHeader } from "@/components/server/server-header";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ServerSearch } from "@/components/server/server-search";
import { Separator } from "@/components/ui/separator";
import { ServerSection } from "@/components/server/server-section";
import { ServerChannel } from "@/components/server/server-channel";
import { ServerMember } from "@/components/server/server-member";

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

export async function ServerSidebar({ serverId }: { serverId: string }) {
  const profile = await currentProfile();

  if (!profile) return redirect("/sign-in");

  const client = getMatrixClient();
  if (!client) return redirect("/sign-in");

  // Get the Matrix space (server)
  const space = client.getRoom(serverId);
  if (!space || !space.hasMembershipState(client.getUserId() || "", "join")) {
    return redirect("/");
  }

  // Create server object
  const server = {
    id: space.roomId,
    name: space.name || "Unnamed Server",
    imageUrl: space.getAvatarUrl(client.baseUrl, 96, 96, "crop") || "",
    inviteCode: "", // Would need to be generated/retrieved
    profileId: space.getCreator() || "",
    createdAt: new Date(space.getTs() || Date.now()),
    updatedAt: new Date(),
  };

  // Get child rooms (channels) - in a real implementation we'd query space children
  const allRooms = client.getRooms();
  const channels = allRooms
    .filter(room => room.roomId !== serverId) // Exclude the space itself
    .slice(0, 10) // Limit for demo
    .map(room => ({
      id: room.roomId,
      name: room.name || "Unnamed Channel",
      type: ChannelType.TEXT, // Default, in Matrix we'd determine from room type
      profileId: room.getCreator() || "",
      serverId: serverId,
      createdAt: new Date(room.getTs() || Date.now()),
      updatedAt: new Date(),
    }));

  const textChannels = channels.filter(
    (channel) => channel.type === ChannelType.TEXT
  );
  const audioChannels = channels.filter(
    (channel) => channel.type === ChannelType.AUDIO
  );
  const videoChannels = channels.filter(
    (channel) => channel.type === ChannelType.VIDEO
  );

  // Get space members
  const spaceMembers = space.getJoinedMembers();
  const currentUserId = client.getUserId();
  
  const members = spaceMembers
    .filter(member => member.userId !== currentUserId)
    .map(member => {
      const user = client.getUser(member.userId);
      return {
        id: member.userId,
        role: MemberRole.GUEST, // Default, would get from power levels in real impl
        profileId: member.userId,
        serverId: serverId,
        profile: {
          id: member.userId,
          userId: member.userId,
          name: user?.displayName || member.userId.replace(/@|:.*/g, ''),
          imageUrl: user?.avatarUrl || "",
          email: "",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

  // Get current user's role in the space
  const currentMember = spaceMembers.find(m => m.userId === currentUserId);
  const role = currentMember ? MemberRole.GUEST : undefined; // Would get from power levels

  return (
    <div className="flex flex-col h-full text-primary w-full dark:bg-[#2b2d31] bg-[#f2f3f5]">
      <ServerHeader server={server} role={role} />
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
          <div className="mb-2">
            <ServerSection
              sectionType="channels"
              channelType={ChannelType.TEXT}
              role={role}
              label="Text Channels"
            />
            <div className="space-y-[2px]">
              {textChannels.map((channel) => (
                <ServerChannel
                  key={channel.id}
                  channel={channel}
                  role={role}
                  server={server}
                />
              ))}
            </div>
          </div>
        )}
        {!!audioChannels?.length && (
          <div className="mb-2">
            <ServerSection
              sectionType="channels"
              channelType={ChannelType.AUDIO}
              role={role}
              label="Voice Channels"
            />
            <div className="space-y-[2px]">
              {audioChannels.map((channel) => (
                <ServerChannel
                  key={channel.id}
                  channel={channel}
                  role={role}
                  server={server}
                />
              ))}
            </div>
          </div>
        )}
        {!!videoChannels?.length && (
          <div className="mb-2">
            <ServerSection
              sectionType="channels"
              channelType={ChannelType.VIDEO}
              role={role}
              label="Video Channels"
            />
            <div className="space-y-[2px]">
              {videoChannels.map((channel) => (
                <ServerChannel
                  key={channel.id}
                  channel={channel}
                  role={role}
                  server={server}
                />
              ))}
            </div>
          </div>
        )}
        {!!members?.length && (
          <div className="mb-2">
            <ServerSection
              sectionType="members"
              role={role}
              label="Members"
              server={server}
            />
            <div className="space-y-[2px]">
              {members.map((member) => (
                <ServerMember key={member.id} member={member} server={server} />
              ))}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
