"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  ConnectionState,
  useTracks,
  useRoomContext,
  useParticipants,
  useConnectionState,
} from "@livekit/components-react";
import { Track as LKTrack, Participant } from "livekit-client";
import { Maximize2, Minimize2, Grid3x3, Users, VideoOff } from "lucide-react";

import { ActionTooltip } from "@/components/action-tooltip";
import { EnhancedVideoTile } from "./enhanced-video-tile";

interface EnhancedVideoGridProps {
  className?: string;
  showControls?: boolean;
  canModerate?: boolean;
  onParticipantAction?: (action: string, participantId: string) => void;
}

type GridLayout = "auto" | "1x1" | "2x2" | "3x3" | "4x4" | "sidebar";
type ViewMode = "normal" | "presenter" | "gallery";

export function EnhancedVideoGrid({
  className,
  showControls = true,
  canModerate = false,
  onParticipantAction
}: EnhancedVideoGridProps) {
  const participants = useParticipants();
  const connectionState = useConnectionState();
  const room = useRoomContext();

  // Layout state
  const [gridLayout, setGridLayout] = useState<GridLayout>("auto");
  const [viewMode, setViewMode] = useState<ViewMode>("normal");
  const [pinnedParticipant, setPinnedParticipant] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Get all video and screen share tracks
  const videoTracks = useTracks([
    { source: LKTrack.Source.Camera, withPlaceholder: true },
    { source: LKTrack.Source.ScreenShare, withPlaceholder: false },
  ]);

  const audioTracks = useTracks([
    { source: LKTrack.Source.Microphone, withPlaceholder: true },
  ]);

  // Screen share detection
  const screenShareTracks = videoTracks.filter(track => 
    track.source === LKTrack.Source.ScreenShare
  );
  const hasScreenShare = screenShareTracks.length > 0;

  // Auto-adjust layout based on participant count
  useEffect(() => {
    if (gridLayout === "auto") {
      const count = participants.length;
      if (count <= 1) setGridLayout("1x1");
      else if (count <= 4) setGridLayout("2x2");
      else if (count <= 9) setGridLayout("3x3");
      else setGridLayout("4x4");
    }
  }, [participants.length, gridLayout]);

  // Auto-switch to presenter mode when screen sharing
  useEffect(() => {
    if (hasScreenShare && viewMode === "normal") {
      setViewMode("presenter");
    } else if (!hasScreenShare && viewMode === "presenter") {
      setViewMode("normal");
    }
  }, [hasScreenShare, viewMode]);

  // Participant actions - hooks must be called before any early returns
  const handlePin = useCallback((participantId: string) => {
    setPinnedParticipant(participantId);
    if (onParticipantAction) {
      onParticipantAction("pin", participantId);
    }
  }, [onParticipantAction]);

  const handleUnpin = useCallback(() => {
    setPinnedParticipant(null);
    if (onParticipantAction) {
      onParticipantAction("unpin", pinnedParticipant || "");
    }
  }, [onParticipantAction, pinnedParticipant]);

  const handleKick = useCallback((participantId: string) => {
    if (onParticipantAction) {
      onParticipantAction("kick", participantId);
    }
  }, [onParticipantAction]);

  const handleMute = useCallback((participantId: string) => {
    if (onParticipantAction) {
      onParticipantAction("mute", participantId);
    }
  }, [onParticipantAction]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Loading state
  if (connectionState === (ConnectionState as any).Connecting) {
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
  if (connectionState === (ConnectionState as any).Disconnected) {
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

  // Get grid CSS classes based on layout
  const getGridClasses = (layout: GridLayout, participantCount: number) => {
    switch (layout) {
      case "1x1":
        return "grid-cols-1";
      case "2x2":
        return "grid-cols-1 sm:grid-cols-2";
      case "3x3":
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
      case "4x4":
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
      case "sidebar":
        return "flex flex-col lg:flex-row";
      case "auto":
      default:
        if (participantCount <= 1) return "grid-cols-1";
        if (participantCount <= 4) return "grid-cols-1 sm:grid-cols-2";
        if (participantCount <= 9) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
    }
  };

  // Render participants based on view mode
  const renderParticipants = () => {
    if (viewMode === "presenter" && hasScreenShare) {
      // Presenter mode: screen share large, participants small
      const mainScreenShare = screenShareTracks[0];
      const regularParticipants = participants.filter(p => 
        !screenShareTracks.some(track => track.participant.identity === p.identity)
      );

      return (
        <div className="h-full flex flex-col">
          {/* Main screen share */}
          <div className="flex-1 p-2">
            <EnhancedVideoTile
              participant={mainScreenShare.participant}
              videoTrack={mainScreenShare}
              audioTrack={audioTracks.find(track => 
                track.participant.identity === mainScreenShare.participant.identity
              )}
              size="fullscreen"
              showControls={showControls}
              canModerate={canModerate}
              onPin={() => handlePin(mainScreenShare.participant.identity)}
              onUnpin={handleUnpin}
              onKick={() => handleKick(mainScreenShare.participant.identity)}
              onMute={() => handleMute(mainScreenShare.participant.identity)}
              isPinned={pinnedParticipant === mainScreenShare.participant.identity}
            />
          </div>

          {/* Participant strip */}
          {regularParticipants.length > 0 && (
            <div className="h-32 border-t border-zinc-700 p-2">
              <div className="flex gap-2 h-full overflow-x-auto">
                {regularParticipants.map((participant) => {
                  const videoTrack = videoTracks.find(track => 
                    track.participant.identity === participant.identity &&
                    track.source === LKTrack.Source.Camera
                  );
                  const audioTrack = audioTracks.find(track => 
                    track.participant.identity === participant.identity
                  );

                  return (
                    <div key={participant.identity} className="flex-shrink-0 w-32">
                      <EnhancedVideoTile
                        participant={participant}
                        videoTrack={videoTrack}
                        audioTrack={audioTrack}
                        isLocal={participant.isLocal}
                        size="small"
                        showControls={showControls}
                        canModerate={canModerate}
                        onPin={() => handlePin(participant.identity)}
                        onUnpin={handleUnpin}
                        onKick={() => handleKick(participant.identity)}
                        onMute={() => handleMute(participant.identity)}
                        isPinned={pinnedParticipant === participant.identity}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Normal/Gallery mode: grid layout
    const gridClasses = getGridClasses(gridLayout, participants.length);
    
    return (
      <div className={`h-full p-4 gap-4 ${
        gridLayout === "sidebar" 
          ? "flex flex-col lg:flex-row" 
          : `grid place-items-center ${gridClasses}`
      }`}>
        {participants.map((participant) => {
          const videoTrack = videoTracks.find(track => 
            track.participant.identity === participant.identity &&
            track.source === LKTrack.Source.Camera
          );
          const audioTrack = audioTracks.find(track => 
            track.participant.identity === participant.identity
          );

          const isLarge = pinnedParticipant === participant.identity;
          const size = isLarge ? "large" : participants.length <= 4 ? "medium" : "small";

          return (
            <EnhancedVideoTile
              key={participant.identity}
              participant={participant}
              videoTrack={videoTrack}
              audioTrack={audioTrack}
              isLocal={participant.isLocal}
              size={size}
              showControls={showControls}
              canModerate={canModerate}
              onPin={() => handlePin(participant.identity)}
              onUnpin={handleUnpin}
              onKick={() => handleKick(participant.identity)}
              onMute={() => handleMute(participant.identity)}
              isPinned={isLarge}
              className={isLarge ? "col-span-2 row-span-2" : ""}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className={`relative h-full bg-zinc-900 overflow-hidden ${className}`}>
      {/* Top controls bar */}
      {showControls && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {/* View mode selector */}
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-1 flex items-center gap-1">
            <ActionTooltip side="bottom" label="Gallery view">
              <button
                onClick={() => setViewMode("gallery")}
                className={`p-2 rounded transition-colors ${
                  viewMode === "gallery" 
                    ? "bg-indigo-500 text-white" 
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
            </ActionTooltip>

            <ActionTooltip side="bottom" label="Normal view">
              <button
                onClick={() => setViewMode("normal")}
                className={`p-2 rounded transition-colors ${
                  viewMode === "normal" 
                    ? "bg-indigo-500 text-white" 
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Users className="w-4 h-4" />
              </button>
            </ActionTooltip>
          </div>

          {/* Layout selector */}
          {viewMode !== "presenter" && (
            <div className="bg-black/50 backdrop-blur-sm rounded-lg p-1 flex items-center gap-1">
              {["auto", "2x2", "3x3", "4x4"].map((layout) => (
                <ActionTooltip key={layout} side="bottom" label={`${layout} layout`}>
                  <button
                    onClick={() => setGridLayout(layout as GridLayout)}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      gridLayout === layout 
                        ? "bg-indigo-500 text-white" 
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {layout === "auto" ? "Auto" : layout.toUpperCase()}
                  </button>
                </ActionTooltip>
              ))}
            </div>
          )}

          {/* Fullscreen toggle */}
          <ActionTooltip side="bottom" label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
            <button
              onClick={toggleFullscreen}
              className="bg-black/50 backdrop-blur-sm p-2 rounded-lg text-zinc-400 hover:text-white transition-colors"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </ActionTooltip>
        </div>
      )}

      {/* Participant count indicator */}
      <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-lg">
        <span className="text-zinc-400 text-sm flex items-center gap-1">
          <Users className="w-4 h-4" />
          {participants.length} participant{participants.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Screen share indicator */}
      {hasScreenShare && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-blue-500/90 backdrop-blur-sm px-3 py-1 rounded-lg">
          <span className="text-white text-sm font-medium">
            Screen Share Active
          </span>
        </div>
      )}

      {/* Main content */}
      <div className={`${isFullscreen ? "fixed inset-0 z-50 bg-zinc-900" : "h-full"}`}>
        {renderParticipants()}
      </div>
    </div>
  );
}