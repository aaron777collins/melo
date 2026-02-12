"use client";

import React from "react";
import { Mic, MicOff, Video, VideoOff, Volume2 } from "lucide-react";

import { UserAvatar } from "@/components/user-avatar";
import { ActionTooltip } from "@/components/action-tooltip";
import { useVoiceChannel, VoiceChannelParticipant } from "@/hooks/use-voice-channel";

interface VoiceMemberListProps {
  className?: string;
  showVideoParticipants?: boolean;
}

export function VoiceMemberList({ 
  className, 
  showVideoParticipants = true 
}: VoiceMemberListProps) {
  const { participants, isConnected } = useVoiceChannel();

  if (!isConnected || participants.length === 0) {
    return null;
  }

  const voiceParticipants = participants.filter(p => 
    p.isAudioEnabled || (showVideoParticipants && p.isVideoEnabled)
  );

  if (voiceParticipants.length === 0) {
    return (
      <div className={`p-3 ${className}`}>
        <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Voice Channel
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          No active participants
        </div>
      </div>
    );
  }

  return (
    <div className={`p-3 ${className}`}>
      <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
        Voice Channel — {voiceParticipants.length}
      </div>
      
      <div className="space-y-2">
        {voiceParticipants.map((participant) => (
          <VoiceMemberItem key={participant.id} participant={participant} />
        ))}
      </div>
    </div>
  );
}

interface VoiceMemberItemProps {
  participant: VoiceChannelParticipant;
}

function VoiceMemberItem({ participant }: VoiceMemberItemProps) {
  const { 
    name, 
    isSpeaking, 
    isAudioEnabled, 
    isVideoEnabled, 
    isLocal 
  } = participant;

  return (
    <div 
      className={`
        flex items-center gap-2 p-2 rounded-md transition-colors
        ${isSpeaking 
          ? "bg-green-500/20 border border-green-500/50" 
          : "hover:bg-zinc-700/50 dark:hover:bg-zinc-800/50"
        }
      `}
    >
      {/* Avatar with speaking ring */}
      <div className="relative">
        <div 
          className={`
            absolute inset-0 rounded-full transition-all
            ${isSpeaking 
              ? "ring-2 ring-green-500 ring-offset-2 ring-offset-zinc-900" 
              : ""
            }
          `}
        />
        <UserAvatar 
          src=""  // TODO: Get avatar from Matrix user data
          className="h-8 w-8"
        />
        
        {/* Speaking indicator */}
        {isSpeaking && (
          <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
            <Volume2 className="h-3 w-3 text-white" />
          </div>
        )}
      </div>

      {/* Name and status */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span 
            className={`
              text-sm font-medium truncate
              ${isSpeaking 
                ? "text-green-400" 
                : "text-zinc-200 dark:text-zinc-300"
              }
            `}
          >
            {name}
          </span>
          {isLocal && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              (you)
            </span>
          )}
        </div>
        
        {/* Connection status indicators */}
        <div className="flex items-center gap-1 mt-1">
          <ActionTooltip 
            side="top" 
            label={isAudioEnabled ? "Microphone on" : "Microphone off"}
          >
            <div className="flex items-center">
              {isAudioEnabled ? (
                <Mic className="h-3 w-3 text-green-500" />
              ) : (
                <MicOff className="h-3 w-3 text-red-500" />
              )}
            </div>
          </ActionTooltip>
          
          <ActionTooltip 
            side="top" 
            label={isVideoEnabled ? "Camera on" : "Camera off"}
          >
            <div className="flex items-center">
              {isVideoEnabled ? (
                <Video className="h-3 w-3 text-green-500" />
              ) : (
                <VideoOff className="h-3 w-3 text-zinc-500" />
              )}
            </div>
          </ActionTooltip>
        </div>
      </div>
    </div>
  );
}