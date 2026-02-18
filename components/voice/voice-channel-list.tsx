"use client";

import React, { useMemo } from "react";
import { Hash, Mic, Video, Settings, UserPlus, Volume2, Users } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { ActionTooltip } from "@/components/action-tooltip";
import { UserAvatar } from "@/components/user-avatar";
import { VoiceMemberList } from "./voice-member-list";
import { VoiceChannelControls } from "./voice-channel-controls";
import { useVoiceChannelManager } from "@/hooks/use-voice-channel-manager";
import { useModal } from "@/hooks/use-modal-store";
import { useMatrixClient } from "@/hooks/use-matrix-client";

interface VoiceChannelListProps {
  spaceId: string;
  channels: Array<{
    id: string;
    name: string;
    type: "voice" | "video" | "audio";
    participantCount?: number;
    hasActivity?: boolean;
  }>;
  userRole?: "owner" | "admin" | "moderator" | "member" | "guest" | "restricted";
  className?: string;
}

export function VoiceChannelList({ 
  spaceId, 
  channels, 
  userRole = "guest",
  className 
}: VoiceChannelListProps) {
  const router = useRouter();
  const params = useParams();
  const { onOpen } = useModal();
  const { client } = useMatrixClient();
  const {
    isConnected,
    currentChannelId,
    currentSpaceId,
    participants,
    joinVoiceChannel,
    leaveVoiceChannel,
  } = useVoiceChannelManager();

  const voiceChannels = useMemo(() => 
    channels.filter(ch => ch.type === "voice" || ch.type === "audio"),
    [channels]
  );

  const videoChannels = useMemo(() => 
    channels.filter(ch => ch.type === "video"),
    [channels]
  );

  // Check if user can manage voice channels
  const canManageChannels = userRole === "owner" || userRole === "admin" || userRole === "moderator";

  const handleChannelClick = async (channelId: string, channelType: string) => {
    // If already in this channel, navigate to it
    if (isConnected && currentChannelId === channelId && currentSpaceId === spaceId) {
      router.push(`/servers/${spaceId}/channels/${channelId}`);
      return;
    }

    // Join the voice channel
    const success = await joinVoiceChannel(channelId, spaceId, {
      audio: true,
      video: channelType === "video",
    });

    if (success) {
      router.push(`/servers/${spaceId}/channels/${channelId}`);
    }
  };

  const handleChannelSettings = (channelId: string) => {
    onOpen("voiceChannelSettings", {
      voiceChannelSettings: {
        channelId,
        spaceId,
        currentSettings: {}, // TODO: Load current channel settings
      },
    });
  };

  if (voiceChannels.length === 0 && videoChannels.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Voice Channels Section */}
      {voiceChannels.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 py-1">
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Voice Channels
            </h3>
            {canManageChannels && (
              <ActionTooltip side="top" label="Create Voice Channel">
                <button
                  onClick={() => onOpen("createChannel", { 
                    spaceId,
                    matrixChannelType: "voice" 
                  })}
                  className="text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300"
                >
                  <UserPlus className="h-4 w-4" />
                </button>
              </ActionTooltip>
            )}
          </div>

          {voiceChannels.map((channel) => (
            <VoiceChannelItem
              key={channel.id}
              channel={channel}
              spaceId={spaceId}
              isActive={isConnected && currentChannelId === channel.id && currentSpaceId === spaceId}
              participantsInChannel={
                isConnected && currentChannelId === channel.id && currentSpaceId === spaceId
                  ? participants
                  : []
              }
              onChannelClick={handleChannelClick}
              onSettingsClick={canManageChannels ? handleChannelSettings : undefined}
              userRole={userRole}
            />
          ))}
        </div>
      )}

      {/* Video Channels Section */}
      {videoChannels.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 py-1">
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Video Channels
            </h3>
            {canManageChannels && (
              <ActionTooltip side="top" label="Create Video Channel">
                <button
                  onClick={() => onOpen("createChannel", { 
                    spaceId,
                    matrixChannelType: "video" 
                  })}
                  className="text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300"
                >
                  <UserPlus className="h-4 w-4" />
                </button>
              </ActionTooltip>
            )}
          </div>

          {videoChannels.map((channel) => (
            <VoiceChannelItem
              key={channel.id}
              channel={channel}
              spaceId={spaceId}
              isActive={isConnected && currentChannelId === channel.id && currentSpaceId === spaceId}
              participantsInChannel={
                isConnected && currentChannelId === channel.id && currentSpaceId === spaceId
                  ? participants
                  : []
              }
              onChannelClick={handleChannelClick}
              onSettingsClick={canManageChannels ? handleChannelSettings : undefined}
              userRole={userRole}
            />
          ))}
        </div>
      )}

      {/* Current Voice Channel Status */}
      {isConnected && currentChannelId && currentSpaceId === spaceId && (
        <div className="mt-4 px-2 py-3 bg-green-500/10 dark:bg-green-500/20 rounded-md border border-green-500/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              Connected to Voice
            </span>
          </div>
          <VoiceChannelControls
            channelId={currentChannelId}
            username={client?.getUserId() || "User"}
            className="justify-start"
          />
        </div>
      )}
    </div>
  );
}

// Individual Voice Channel Item Component
interface VoiceChannelItemProps {
  channel: {
    id: string;
    name: string;
    type: "voice" | "video" | "audio";
    participantCount?: number;
    hasActivity?: boolean;
  };
  spaceId: string;
  isActive: boolean;
  participantsInChannel: Array<{
    id: string;
    name: string;
    displayName: string;
    avatarUrl?: string;
    isSpeaking: boolean;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    isLocal: boolean;
  }>;
  onChannelClick: (channelId: string, channelType: string) => void;
  onSettingsClick?: (channelId: string) => void;
  userRole: string;
}

function VoiceChannelItem({
  channel,
  spaceId,
  isActive,
  participantsInChannel,
  onChannelClick,
  onSettingsClick,
  userRole,
}: VoiceChannelItemProps) {
  const Icon = channel.type === "video" ? Video : Mic;
  const participantCount = participantsInChannel.length || channel.participantCount || 0;
  const hasActivity = channel.hasActivity || participantsInChannel.length > 0;

  return (
    <div className="space-y-1">
      {/* Channel Button */}
      <button
        className={cn(
          "group px-2 py-2 rounded-md flex items-center gap-x-2 w-full transition-colors",
          isActive
            ? "bg-green-500/20 border border-green-500/30"
            : hasActivity
            ? "bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20"
            : "hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50"
        )}
        onClick={() => onChannelClick(channel.id, channel.type)}
      >
        <Icon
          className={cn(
            "flex-shrink-0 w-5 h-5",
            isActive
              ? "text-green-500"
              : hasActivity
              ? "text-indigo-400"
              : "text-zinc-500 dark:text-zinc-400"
          )}
        />

        <span
          className={cn(
            "font-semibold text-sm truncate flex-1 text-left",
            isActive
              ? "text-green-600 dark:text-green-400"
              : hasActivity
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"
          )}
        >
          {channel.name}
        </span>

        {/* Participant count */}
        {participantCount > 0 && (
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 text-zinc-400" />
            <span className="text-xs text-zinc-400">{participantCount}</span>
          </div>
        )}

        {/* Settings button for admins */}
        {onSettingsClick && (
          <ActionTooltip side="top" label="Channel Settings">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSettingsClick(channel.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-600/50 transition-opacity"
            >
              <Settings className="h-4 w-4 text-zinc-400 hover:text-zinc-300" />
            </button>
          </ActionTooltip>
        )}
      </button>

      {/* Active Participants List */}
      {isActive && participantsInChannel.length > 0 && (
        <div className="ml-4 space-y-1 border-l border-green-500/30 pl-3">
          {participantsInChannel.map((participant) => (
            <div
              key={participant.id}
              className={cn(
                "flex items-center gap-2 py-1 px-2 rounded text-sm",
                participant.isSpeaking && "bg-green-500/10 border border-green-500/30"
              )}
            >
              <UserAvatar
                src={participant.avatarUrl}
                className="h-6 w-6"
              />
              <span
                className={cn(
                  "flex-1 truncate",
                  participant.isSpeaking
                    ? "text-green-600 dark:text-green-400 font-medium"
                    : "text-zinc-600 dark:text-zinc-300"
                )}
              >
                {participant.displayName}
                {participant.isLocal && (
                  <span className="ml-1 text-xs text-zinc-500">(you)</span>
                )}
              </span>
              
              {/* Audio/Video status */}
              <div className="flex items-center gap-1">
                {participant.isAudioEnabled ? (
                  <Mic className={cn(
                    "h-3 w-3",
                    participant.isSpeaking ? "text-green-500" : "text-zinc-400"
                  )} />
                ) : (
                  <Mic className="h-3 w-3 text-red-500 opacity-50" />
                )}
                
                {channel.type === "video" && (
                  participant.isVideoEnabled ? (
                    <Video className="h-3 w-3 text-zinc-400" />
                  ) : (
                    <Video className="h-3 w-3 text-red-500 opacity-50" />
                  )
                )}

                {participant.isSpeaking && (
                  <Volume2 className="h-3 w-3 text-green-500 animate-pulse" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}