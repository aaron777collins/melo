"use client";

import React from "react";
import {
  ConnectionState,
  Track,
  useTracks,
  useRoomContext,
  useParticipants,
  VideoTrack,
  AudioTrack,
  useConnectionState,
} from "@livekit/components-react";
import { Track as LKTrack, Participant } from "livekit-client";
import { Mic, MicOff, Video as VideoIcon, VideoOff, User } from "lucide-react";

import { ActionTooltip } from "@/components/action-tooltip";

interface VideoCallLayoutProps {
  className?: string;
}

export function VideoCallLayout({ className }: VideoCallLayoutProps) {
  const participants = useParticipants();
  const connectionState = useConnectionState();
  
  // Get all video and screen share tracks
  const videoTracks = useTracks([
    { source: LKTrack.Source.Camera, withPlaceholder: true },
    { source: LKTrack.Source.ScreenShare, withPlaceholder: false },
  ]);

  // Loading state
  if (connectionState === ConnectionState.Connecting) {
    return (
      <div className={`flex items-center justify-center h-full bg-zinc-900 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-zinc-400 text-sm">Connecting to video call...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (connectionState === ConnectionState.Disconnected) {
    return (
      <div className={`flex items-center justify-center h-full bg-zinc-900 ${className}`}>
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <VideoOff className="h-8 w-8 mx-auto" />
          </div>
          <p className="text-zinc-400 text-sm">Failed to connect to video call</p>
        </div>
      </div>
    );
  }

  // Calculate grid layout based on participant count
  const participantCount = participants.length;
  const gridCols = getGridColumns(participantCount);
  const gridRows = Math.ceil(participantCount / gridCols);

  return (
    <div className={`relative h-full bg-zinc-900 overflow-hidden ${className}`}>
      {/* Main video grid */}
      <div 
        className={`
          h-full p-4 gap-2 grid place-items-center
          ${getGridClass(participantCount)}
        `}
      >
        {participants.map((participant) => (
          <ParticipantTile
            key={participant.identity}
            participant={participant}
            videoTracks={videoTracks.filter(track => 
              track.participant.identity === participant.identity
            )}
          />
        ))}
      </div>

      {/* Screen share overlay (if any) */}
      {videoTracks
        .filter(track => track.source === LKTrack.Source.ScreenShare)
        .map((track) => (
          <ScreenShareOverlay 
            key={track.participant.identity}
            track={track}
          />
        ))}
    </div>
  );
}

interface ParticipantTileProps {
  participant: Participant;
  videoTracks: { participant: Participant; publication: any; source: LKTrack.Source }[];
}

function ParticipantTile({ participant, videoTracks }: ParticipantTileProps) {
  const videoTrack = videoTracks.find(track => 
    track.source === LKTrack.Source.Camera
  );
  
  const hasVideo = videoTrack && videoTrack.publication?.isEnabled;
  const isAudioEnabled = participant.isMicrophoneEnabled;
  const isSpeaking = participant.isSpeaking;
  const displayName = participant.name || participant.identity;

  return (
    <div 
      className={`
        relative w-full h-full rounded-lg overflow-hidden bg-zinc-800 border-2 transition-all
        ${isSpeaking 
          ? "border-green-500 shadow-lg shadow-green-500/25" 
          : "border-zinc-700"
        }
        min-h-[200px]
      `}
    >
      {/* Video track or avatar placeholder */}
      {hasVideo && videoTrack ? (
        <div className="w-full h-full">
          <VideoTrack
            trackRef={videoTrack}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center mb-3">
              <User className="w-8 h-8 text-white" />
            </div>
            <p className="text-white font-medium text-lg">{displayName}</p>
          </div>
        </div>
      )}

      {/* Participant info overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
        <div className="flex items-center justify-between">
          <span className="text-white font-medium text-sm truncate">
            {displayName}
          </span>
          
          <div className="flex items-center gap-1">
            {/* Audio status */}
            <ActionTooltip 
              side="top" 
              label={isAudioEnabled ? "Microphone on" : "Microphone off"}
            >
              <div className={`
                p-1 rounded-full
                ${isAudioEnabled 
                  ? "bg-green-500/80" 
                  : "bg-red-500/80"
                }
              `}>
                {isAudioEnabled ? (
                  <Mic className="w-3 h-3 text-white" />
                ) : (
                  <MicOff className="w-3 h-3 text-white" />
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
                  <VideoIcon className="w-3 h-3 text-white" />
                ) : (
                  <VideoOff className="w-3 h-3 text-white" />
                )}
              </div>
            </ActionTooltip>
          </div>
        </div>
      </div>

      {/* Speaking indicator ring */}
      {isSpeaking && (
        <div className="absolute inset-0 rounded-lg ring-2 ring-green-400 ring-offset-2 ring-offset-zinc-900 pointer-events-none" />
      )}
    </div>
  );
}

interface ScreenShareOverlayProps {
  track: { participant: Participant; publication: any; source: LKTrack.Source };
}

function ScreenShareOverlay({ track }: ScreenShareOverlayProps) {
  const displayName = track.participant.name || track.participant.identity;

  return (
    <div className="absolute inset-0 bg-black z-10">
      {/* Screen share video */}
      <div className="w-full h-full">
        <VideoTrack
          trackRef={track}
          className="w-full h-full object-contain"
        />
      </div>

      {/* Screen share indicator */}
      <div className="absolute top-4 left-4 bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-medium">
        {displayName} is sharing their screen
      </div>
    </div>
  );
}

// Helper functions for grid layout
function getGridColumns(participantCount: number): number {
  if (participantCount <= 1) return 1;
  if (participantCount <= 4) return 2;
  if (participantCount <= 9) return 3;
  return 4;
}

function getGridClass(participantCount: number): string {
  if (participantCount <= 1) return "grid-cols-1";
  if (participantCount <= 4) return "grid-cols-1 md:grid-cols-2";
  if (participantCount <= 9) return "grid-cols-2 md:grid-cols-3";
  return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
}