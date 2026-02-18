"use client";

import React from "react";
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff,
  Loader2
} from "lucide-react";

import { ActionTooltip } from "@/components/action-tooltip";
import { useVoiceChannel } from "@/hooks/use-voice-channel";
import { useVoiceChannelManager } from "@/hooks/use-voice-channel-manager";

interface VoiceChannelControlsProps {
  channelId: string;
  username: string;
  className?: string;
}

export function VoiceChannelControls({ 
  channelId, 
  username, 
  className 
}: VoiceChannelControlsProps) {
  // Use the new voice channel manager
  const {
    isConnected,
    isConnecting,
    audioEnabled,
    videoEnabled,
    error,
    currentChannelId,
    joinVoiceChannel,
    leaveVoiceChannel,
    toggleAudio,
    toggleVideo,
  } = useVoiceChannelManager();

  // Fallback to old hook for backwards compatibility
  const legacyVoiceChannel = useVoiceChannel();

  // Use new manager if available, otherwise fall back to legacy
  const actuallyConnected = isConnected && currentChannelId === channelId;
  const actuallyConnecting = isConnecting;
  const actualAudioEnabled = audioEnabled;
  const actualVideoEnabled = videoEnabled;
  const actualError = error;

  const handleJoinLeave = async () => {
    if (actuallyConnected) {
      await leaveVoiceChannel();
    } else {
      // Extract spaceId from current URL or context - for now use a placeholder
      // TODO: Get actual spaceId from context or props
      const spaceId = "unknown"; // This should be passed as a prop
      await joinVoiceChannel(channelId, spaceId, {
        audio: true,
        video: false,
      });
    }
  };

  // Join/Leave button
  const JoinLeaveButton = () => {
    const isLoading = actuallyConnecting;
    const Icon = isLoading ? Loader2 : actuallyConnected ? PhoneOff : Phone;
    const tooltipLabel = isLoading 
      ? "Connecting..." 
      : actuallyConnected 
        ? "Leave voice channel" 
        : "Join voice channel";
    
    const buttonClass = `
      flex items-center justify-center w-8 h-8 rounded-md transition-colors
      ${actuallyConnected 
        ? "bg-red-500 hover:bg-red-600 text-white" 
        : "bg-green-500 hover:bg-green-600 text-white"
      }
      ${isLoading ? "cursor-not-allowed opacity-75" : ""}
    `;

    return (
      <ActionTooltip side="bottom" label={tooltipLabel}>
        <button
          onClick={handleJoinLeave}
          disabled={isLoading}
          className={buttonClass}
        >
          <Icon 
            className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} 
          />
        </button>
      </ActionTooltip>
    );
  };

  // Audio toggle button
  const AudioButton = () => {
    if (!actuallyConnected) return null;
    
    const Icon = actualAudioEnabled ? Mic : MicOff;
    const tooltipLabel = actualAudioEnabled ? "Mute microphone" : "Unmute microphone";
    
    return (
      <ActionTooltip side="bottom" label={tooltipLabel}>
        <button
          onClick={toggleAudio}
          className={`
            flex items-center justify-center w-8 h-8 rounded-md transition-colors
            ${actualAudioEnabled
              ? "bg-gray-600 hover:bg-gray-700 text-white"
              : "bg-red-500 hover:bg-red-600 text-white"
            }
          `}
        >
          <Icon className="h-4 w-4" />
        </button>
      </ActionTooltip>
    );
  };

  // Video toggle button  
  const VideoButton = () => {
    if (!actuallyConnected) return null;
    
    const Icon = actualVideoEnabled ? Video : VideoOff;
    const tooltipLabel = actualVideoEnabled ? "Turn off camera" : "Turn on camera";
    
    return (
      <ActionTooltip side="bottom" label={tooltipLabel}>
        <button
          onClick={toggleVideo}
          className={`
            flex items-center justify-center w-8 h-8 rounded-md transition-colors
            ${actualVideoEnabled
              ? "bg-gray-600 hover:bg-gray-700 text-white"
              : "bg-gray-500 hover:bg-gray-600 text-white"
            }
          `}
        >
          <Icon className="h-4 w-4" />
        </button>
      </ActionTooltip>
    );
  };

  // Error display
  if (actualError) {
    return (
      <ActionTooltip side="bottom" label={`Error: ${actualError}`}>
        <div className="flex items-center gap-2">
          <PhoneOff className="h-4 w-4 text-red-500" />
          <span className="text-xs text-red-500">Connection failed</span>
        </div>
      </ActionTooltip>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <JoinLeaveButton />
      <AudioButton />
      <VideoButton />
    </div>
  );
}