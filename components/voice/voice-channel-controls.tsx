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
  const {
    isConnected,
    isConnecting,
    audioEnabled,
    videoEnabled,
    error,
    connect,
    disconnect,
    toggleAudio,
    toggleVideo,
  } = useVoiceChannel();

  const handleJoinLeave = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect(channelId, username);
    }
  };

  // Join/Leave button
  const JoinLeaveButton = () => {
    const isLoading = isConnecting;
    const Icon = isLoading ? Loader2 : isConnected ? PhoneOff : Phone;
    const tooltipLabel = isLoading 
      ? "Connecting..." 
      : isConnected 
        ? "Leave voice channel" 
        : "Join voice channel";
    
    const buttonClass = `
      flex items-center justify-center w-8 h-8 rounded-md transition-colors
      ${isConnected 
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
    if (!isConnected) return null;
    
    const Icon = audioEnabled ? Mic : MicOff;
    const tooltipLabel = audioEnabled ? "Mute microphone" : "Unmute microphone";
    
    return (
      <ActionTooltip side="bottom" label={tooltipLabel}>
        <button
          onClick={toggleAudio}
          className={`
            flex items-center justify-center w-8 h-8 rounded-md transition-colors
            ${audioEnabled
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
    if (!isConnected) return null;
    
    const Icon = videoEnabled ? Video : VideoOff;
    const tooltipLabel = videoEnabled ? "Turn off camera" : "Turn on camera";
    
    return (
      <ActionTooltip side="bottom" label={tooltipLabel}>
        <button
          onClick={toggleVideo}
          className={`
            flex items-center justify-center w-8 h-8 rounded-md transition-colors
            ${videoEnabled
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
  if (error) {
    return (
      <ActionTooltip side="bottom" label={`Error: ${error}`}>
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