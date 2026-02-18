"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  User,
  Signal,
  SignalLow,
  SignalMedium,
  SignalHigh,
  Volume2,
  VolumeX,
  Pin,
  PinOff,
  MoreVertical,
  Crown,
  UserMinus
} from "lucide-react";
import { VideoTrack, AudioTrack } from "@livekit/components-react";
import { Participant, Track as LKTrack } from "livekit-client";

import { ActionTooltip } from "@/components/action-tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EnhancedVideoTileProps {
  participant: Participant;
  videoTrack?: { publication?: any; source: LKTrack.Source };
  audioTrack?: { publication?: any; source: LKTrack.Source };
  isLocal?: boolean;
  isPinned?: boolean;
  onPin?: () => void;
  onUnpin?: () => void;
  onKick?: () => void;
  onMute?: () => void;
  canModerate?: boolean;
  isAdmin?: boolean;
  className?: string;
  showControls?: boolean;
  size?: "small" | "medium" | "large" | "fullscreen";
}

export function EnhancedVideoTile({
  participant,
  videoTrack,
  audioTrack,
  isLocal = false,
  isPinned = false,
  onPin,
  onUnpin,
  onKick,
  onMute,
  canModerate = false,
  isAdmin = false,
  className,
  showControls = true,
  size = "medium"
}: EnhancedVideoTileProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [volume, setVolume] = useState(1);
  const [audioLevel, setAudioLevel] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Participant info
  const hasVideo = videoTrack?.publication?.isEnabled && !videoTrack.publication.isMuted;
  const hasAudio = participant.isMicrophoneEnabled && !participant.isMuted;
  const isSpeaking = participant.isSpeaking;
  const displayName = participant.name || participant.identity;
  const isScreenSharing = videoTrack?.source === LKTrack.Source.ScreenShare;
  
  // Connection quality
  const connectionQuality = participant.connectionQuality || "unknown";
  
  // Audio level animation
  useEffect(() => {
    if (isSpeaking && hasAudio) {
      const interval = setInterval(() => {
        setAudioLevel(Math.random() * 0.8 + 0.2); // Simulate audio levels
      }, 100);
      return () => clearInterval(interval);
    } else {
      setAudioLevel(0);
    }
  }, [isSpeaking, hasAudio]);

  // Size-based styling
  const sizeClasses = {
    small: "min-h-[120px] max-h-[200px]",
    medium: "min-h-[200px] max-h-[300px]",
    large: "min-h-[300px] max-h-[400px]",
    fullscreen: "h-full"
  };

  const textSizeClasses = {
    small: "text-sm",
    medium: "text-base",
    large: "text-lg",
    fullscreen: "text-xl"
  };

  const iconSizeClasses = {
    small: "w-3 h-3",
    medium: "w-4 h-4",
    large: "w-5 h-5",
    fullscreen: "w-6 h-6"
  };

  // Connection quality indicator
  const getConnectionIcon = () => {
    switch (connectionQuality) {
      case "excellent":
        return <SignalHigh className={`${iconSizeClasses[size]} text-green-400`} />;
      case "good":
        return <SignalMedium className={`${iconSizeClasses[size]} text-yellow-400`} />;
      case "poor":
        return <SignalLow className={`${iconSizeClasses[size]} text-orange-400`} />;
      case "lost":
        return <Signal className={`${iconSizeClasses[size]} text-red-400`} />;
      default:
        return <Signal className={`${iconSizeClasses[size]} text-zinc-400`} />;
    }
  };

  // Handle pin toggle
  const handlePinToggle = () => {
    if (isPinned && onUnpin) {
      onUnpin();
    } else if (!isPinned && onPin) {
      onPin();
    }
  };

  return (
    <div 
      className={`
        relative w-full h-full rounded-lg overflow-hidden bg-zinc-800 border-2 transition-all duration-200
        ${isPinned 
          ? "border-indigo-500 shadow-lg shadow-indigo-500/25 ring-2 ring-indigo-400/20" 
          : isSpeaking
            ? "border-green-500 shadow-lg shadow-green-500/25" 
            : "border-zinc-700"
        }
        ${isScreenSharing ? "border-blue-500 shadow-lg shadow-blue-500/25" : ""}
        ${sizeClasses[size]}
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Video content */}
      <div className="relative w-full h-full">
        {hasVideo && videoTrack ? (
          <div className="w-full h-full">
            <VideoTrack
              source={videoTrack.source}
              participant={participant}
              publication={videoTrack.publication}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className={`
            w-full h-full flex items-center justify-center
            ${isScreenSharing 
              ? "bg-gradient-to-br from-blue-900 to-indigo-900" 
              : "bg-gradient-to-br from-indigo-900 to-purple-900"
            }
          `}>
            <div className="text-center">
              <div className={`
                rounded-full bg-indigo-600 flex items-center justify-center mb-3
                ${size === "small" ? "w-12 h-12" : size === "medium" ? "w-16 h-16" : "w-20 h-20"}
              `}>
                {isScreenSharing ? (
                  <VideoIcon className={`${iconSizeClasses[size]} text-white`} />
                ) : (
                  <User className={`${iconSizeClasses[size]} text-white`} />
                )}
              </div>
              <p className={`text-white font-medium ${textSizeClasses[size]} truncate px-2`}>
                {displayName}
              </p>
              {isScreenSharing && (
                <p className="text-zinc-300 text-xs mt-1">Screen Share</p>
              )}
            </div>
          </div>
        )}

        {/* Audio track (hidden) */}
        {audioTrack && (
          <AudioTrack
            source={audioTrack.source}
            participant={participant}
            publication={audioTrack.publication}
            volume={volume}
            ref={audioRef}
          />
        )}
      </div>

      {/* Top overlay - Pin indicator and controls */}
      {showControls && (isHovered || isPinned || isSpeaking) && (
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
          {/* Left side indicators */}
          <div className="flex items-center gap-1">
            {isPinned && (
              <div className="bg-indigo-500/90 p-1 rounded-full">
                <Pin className="w-3 h-3 text-white" />
              </div>
            )}
            {isAdmin && (
              <div className="bg-yellow-500/90 p-1 rounded-full">
                <Crown className="w-3 h-3 text-white" />
              </div>
            )}
            {isScreenSharing && (
              <div className="bg-blue-500/90 px-2 py-1 rounded-full">
                <span className="text-xs text-white font-medium">Screen</span>
              </div>
            )}
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-1">
            {/* Connection quality */}
            <ActionTooltip 
              side="bottom" 
              label={`Connection: ${connectionQuality}`}
            >
              <div className="bg-black/50 p-1 rounded-full">
                {getConnectionIcon()}
              </div>
            </ActionTooltip>

            {/* More options */}
            {(canModerate || isLocal) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="bg-black/50 p-1 rounded-full hover:bg-black/70 transition-colors">
                    <MoreVertical className={`${iconSizeClasses[size]} text-white`} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!isLocal && onPin && (
                    <DropdownMenuItem onClick={handlePinToggle}>
                      {isPinned ? (
                        <>
                          <PinOff className="w-4 h-4 mr-2" />
                          Unpin
                        </>
                      ) : (
                        <>
                          <Pin className="w-4 h-4 mr-2" />
                          Pin
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                  
                  {canModerate && !isLocal && (
                    <>
                      <DropdownMenuSeparator />
                      {onMute && (
                        <DropdownMenuItem onClick={onMute}>
                          <MicOff className="w-4 h-4 mr-2" />
                          Mute Participant
                        </DropdownMenuItem>
                      )}
                      {onKick && (
                        <DropdownMenuItem onClick={onKick} className="text-red-400">
                          <UserMinus className="w-4 h-4 mr-2" />
                          Remove from Call
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      )}

      {/* Bottom overlay - Participant info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Name */}
            <span className={`text-white font-medium ${textSizeClasses[size]} truncate`}>
              {displayName}
              {isLocal && " (You)"}
            </span>
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Volume control for remote participants */}
            {!isLocal && hasAudio && (
              <ActionTooltip 
                side="top" 
                label="Adjust volume"
              >
                <button
                  onClick={() => setVolume(volume > 0 ? 0 : 1)}
                  className={`
                    p-1 rounded-full transition-colors
                    ${volume > 0 
                      ? "bg-green-500/80 hover:bg-green-500" 
                      : "bg-zinc-600/80 hover:bg-zinc-600"
                    }
                  `}
                >
                  {volume > 0 ? (
                    <Volume2 className={`${iconSizeClasses[size]} text-white`} />
                  ) : (
                    <VolumeX className={`${iconSizeClasses[size]} text-white`} />
                  )}
                </button>
              </ActionTooltip>
            )}

            {/* Audio status */}
            <ActionTooltip 
              side="top" 
              label={hasAudio ? "Microphone on" : "Microphone off"}
            >
              <div className={`
                p-1 rounded-full transition-all
                ${hasAudio 
                  ? "bg-green-500/80" 
                  : "bg-red-500/80"
                }
                ${isSpeaking ? "scale-110" : ""}
              `}>
                {hasAudio ? (
                  <Mic className={`${iconSizeClasses[size]} text-white`} />
                ) : (
                  <MicOff className={`${iconSizeClasses[size]} text-white`} />
                )}
              </div>
            </ActionTooltip>

            {/* Video status */}
            <ActionTooltip 
              side="top" 
              label={hasVideo ? "Camera on" : "Camera off"}
            >
              <div className={`
                p-1 rounded-full
                ${hasVideo 
                  ? "bg-green-500/80" 
                  : "bg-zinc-600/80"
                }
              `}>
                {hasVideo ? (
                  <VideoIcon className={`${iconSizeClasses[size]} text-white`} />
                ) : (
                  <VideoOff className={`${iconSizeClasses[size]} text-white`} />
                )}
              </div>
            </ActionTooltip>
          </div>
        </div>

        {/* Audio level indicator */}
        {isSpeaking && hasAudio && (
          <div className="mt-2">
            <div className="w-full bg-zinc-700 rounded-full h-1">
              <div 
                className="bg-green-400 h-1 rounded-full transition-all duration-100"
                style={{ width: `${audioLevel * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Speaking indicator ring */}
      {isSpeaking && (
        <div className="absolute inset-0 rounded-lg ring-2 ring-green-400 ring-offset-2 ring-offset-zinc-900 pointer-events-none animate-pulse" />
      )}
    </div>
  );
}