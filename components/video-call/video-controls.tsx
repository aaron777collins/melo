"use client";

import React, { useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Monitor,
  MonitorOff,
  Settings,
  Users,
  MessageSquare,
  MoreHorizontal,
  Camera,
  Speaker,
  Volume2,
  VolumeX,
} from "lucide-react";
import { 
  useLocalParticipant, 
  useRoomContext,
  useTracks,
  useConnectionState,
  ConnectionState
} from "@livekit/components-react";
import { Track as LKTrack } from "livekit-client";

import { ActionTooltip } from "@/components/action-tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface VideoControlsProps {
  onLeaveCall?: () => void;
  onToggleParticipants?: () => void;
  onToggleChat?: () => void;
  className?: string;
}

export function VideoControls({
  onLeaveCall,
  onToggleParticipants,
  onToggleChat,
  className
}: VideoControlsProps) {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const connectionState = useConnectionState();
  
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  // Get screen share track to determine if we're sharing
  const screenTracks = useTracks([
    { source: LKTrack.Source.ScreenShare, withPlaceholder: false },
  ]);
  
  const isCurrentlyScreenSharing = screenTracks.some(track => 
    track.participant.identity === localParticipant?.identity
  );

  // Audio controls
  const toggleMicrophone = async () => {
    if (!localParticipant) return;
    await localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
  };

  // Video controls
  const toggleCamera = async () => {
    if (!localParticipant) return;
    await localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled);
  };

  // Screen share controls
  const toggleScreenShare = async () => {
    if (!localParticipant || !room) return;

    try {
      if (isCurrentlyScreenSharing) {
        // Stop screen sharing
        await localParticipant.setScreenShareEnabled(false);
        setIsScreenSharing(false);
      } else {
        // Start screen sharing
        await localParticipant.setScreenShareEnabled(true);
        setIsScreenSharing(true);
      }
    } catch (error) {
      console.error("Failed to toggle screen share:", error);
    }
  };

  // Leave call
  const handleLeaveCall = () => {
    if (onLeaveCall) {
      onLeaveCall();
    } else {
      room?.disconnect();
    }
  };

  // Speaker toggle (placeholder - would integrate with audio output device)
  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // TODO: Integrate with audio output device selection
  };

  const isConnected = connectionState === ConnectionState.Connected;
  const isAudioEnabled = localParticipant?.isMicrophoneEnabled ?? false;
  const isVideoEnabled = localParticipant?.isCameraEnabled ?? false;

  return (
    <div className={`
      flex items-center justify-center gap-3 px-6 py-4 
      bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-800
      ${className}
    `}>
      {/* Audio controls */}
      <div className="flex items-center gap-2">
        {/* Microphone toggle */}
        <ActionTooltip 
          side="top" 
          label={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
        >
          <button
            onClick={toggleMicrophone}
            disabled={!isConnected}
            className={`
              flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200
              ${isAudioEnabled
                ? "bg-zinc-700 hover:bg-zinc-600 text-white"
                : "bg-red-500 hover:bg-red-600 text-white"
              }
              ${!isConnected ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            {isAudioEnabled ? (
              <Mic className="w-5 h-5" />
            ) : (
              <MicOff className="w-5 h-5" />
            )}
          </button>
        </ActionTooltip>

        {/* Audio device dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              disabled={!isConnected}
              className={`
                flex items-center justify-center w-8 h-8 rounded-full transition-colors
                bg-zinc-700 hover:bg-zinc-600 text-white
                ${!isConnected ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              <Settings className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top" className="w-48">
            <DropdownMenuItem>
              <Mic className="w-4 h-4 mr-2" />
              Microphone Settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Speaker className="w-4 h-4 mr-2" />
              Speaker Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Video controls */}
      <div className="flex items-center gap-2">
        {/* Camera toggle */}
        <ActionTooltip 
          side="top" 
          label={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
        >
          <button
            onClick={toggleCamera}
            disabled={!isConnected}
            className={`
              flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200
              ${isVideoEnabled
                ? "bg-zinc-700 hover:bg-zinc-600 text-white"
                : "bg-zinc-600 hover:bg-zinc-500 text-white"
              }
              ${!isConnected ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            {isVideoEnabled ? (
              <Video className="w-5 h-5" />
            ) : (
              <VideoOff className="w-5 h-5" />
            )}
          </button>
        </ActionTooltip>

        {/* Camera device dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              disabled={!isConnected}
              className={`
                flex items-center justify-center w-8 h-8 rounded-full transition-colors
                bg-zinc-700 hover:bg-zinc-600 text-white
                ${!isConnected ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              <Settings className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top" className="w-48">
            <DropdownMenuItem>
              <Camera className="w-4 h-4 mr-2" />
              Camera Settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Video className="w-4 h-4 mr-2" />
              Video Quality
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Screen share */}
      <ActionTooltip 
        side="top" 
        label={isCurrentlyScreenSharing ? "Stop sharing screen" : "Share screen"}
      >
        <button
          onClick={toggleScreenShare}
          disabled={!isConnected}
          className={`
            flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200
            ${isCurrentlyScreenSharing
              ? "bg-indigo-500 hover:bg-indigo-600 text-white"
              : "bg-zinc-700 hover:bg-zinc-600 text-white"
            }
            ${!isConnected ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          {isCurrentlyScreenSharing ? (
            <MonitorOff className="w-5 h-5" />
          ) : (
            <Monitor className="w-5 h-5" />
          )}
        </button>
      </ActionTooltip>

      {/* Speaker toggle */}
      <ActionTooltip 
        side="top" 
        label={isSpeakerOn ? "Mute speakers" : "Unmute speakers"}
      >
        <button
          onClick={toggleSpeaker}
          disabled={!isConnected}
          className={`
            flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200
            ${isSpeakerOn
              ? "bg-zinc-700 hover:bg-zinc-600 text-white"
              : "bg-red-500 hover:bg-red-600 text-white"
            }
            ${!isConnected ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          {isSpeakerOn ? (
            <Volume2 className="w-5 h-5" />
          ) : (
            <VolumeX className="w-5 h-5" />
          )}
        </button>
      </ActionTooltip>

      {/* Separator */}
      <div className="w-px h-8 bg-zinc-700 mx-2" />

      {/* Additional controls */}
      <div className="flex items-center gap-2">
        {/* Participants toggle */}
        {onToggleParticipants && (
          <ActionTooltip side="top" label="Toggle participants">
            <button
              onClick={onToggleParticipants}
              disabled={!isConnected}
              className={`
                flex items-center justify-center w-12 h-12 rounded-full transition-colors
                bg-zinc-700 hover:bg-zinc-600 text-white
                ${!isConnected ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              <Users className="w-5 h-5" />
            </button>
          </ActionTooltip>
        )}

        {/* Chat toggle */}
        {onToggleChat && (
          <ActionTooltip side="top" label="Toggle chat">
            <button
              onClick={onToggleChat}
              disabled={!isConnected}
              className={`
                flex items-center justify-center w-12 h-12 rounded-full transition-colors
                bg-zinc-700 hover:bg-zinc-600 text-white
                ${!isConnected ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          </ActionTooltip>
        )}

        {/* More options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              disabled={!isConnected}
              className={`
                flex items-center justify-center w-12 h-12 rounded-full transition-colors
                bg-zinc-700 hover:bg-zinc-600 text-white
                ${!isConnected ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top" className="w-52">
            <DropdownMenuItem>
              <Settings className="w-4 h-4 mr-2" />
              Call Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Monitor className="w-4 h-4 mr-2" />
              Recording Options
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Video className="w-4 h-4 mr-2" />
              Video Effects
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Separator */}
      <div className="w-px h-8 bg-zinc-700 mx-2" />

      {/* Leave call */}
      <ActionTooltip side="top" label="Leave call">
        <button
          onClick={handleLeaveCall}
          disabled={!isConnected}
          className={`
            flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200
            bg-red-500 hover:bg-red-600 text-white
            ${!isConnected ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </ActionTooltip>
    </div>
  );
}