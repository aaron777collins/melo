"use client";

import React, { useEffect, useState } from "react";
import "@livekit/components-styles";
import { LiveKitRoom } from "@livekit/components-react";
import { Loader2 } from "lucide-react";

import { useMatrixClient } from "@/hooks/use-matrix-client";
import { VideoCallLayout, VideoControls, ParticipantList } from "@/components/video-call";

interface MediaRoomProps {
  chatId: string;
  video: boolean;
  audio: boolean;
}

/**
 * Enhanced Media Room component for audio/video calls with HAOS styling
 * Integrates with Matrix authentication and custom video call components
 */
export function MediaRoom({ chatId, video, audio }: MediaRoomProps) {
  const { client } = useMatrixClient();
  const userName = client?.getUserId() || "User";
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [showParticipants, setShowParticipants] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string>();

  useEffect(() => {
    if (!userName) return;

    (async () => {
      try {
        setError("");
        const response = await fetch(
          `/api/livekit?room=${chatId}&username=${userName}`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to get LiveKit token: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        setToken(data.token);
      } catch (err) {
        console.error("MediaRoom error:", err);
        setError(err instanceof Error ? err.message : "Failed to connect");
      }
    })();
  }, [userName, chatId]);

  const handleLeaveCall = () => {
    // Navigate back or close modal - this would be handled by parent component
    window.history.back();
  };

  const handleToggleParticipants = () => {
    setShowParticipants(!showParticipants);
  };

  const handleToggleChat = () => {
    setShowChat(!showChat);
  };

  const handlePinParticipant = (participantId: string) => {
    setPinnedParticipantId(participantId === pinnedParticipantId ? undefined : participantId);
  };

  if (error) {
    return (
      <div className="flex flex-col flex-1 justify-center items-center p-4 bg-zinc-900">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <div className="text-red-500 text-2xl">⚠️</div>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Connection Failed
          </h3>
          <p className="text-sm text-red-400 mb-1">
            Failed to connect to video call
          </p>
          <p className="text-xs text-zinc-500 max-w-md">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (token === "") {
    return (
      <div className="flex flex-col flex-1 justify-center items-center bg-zinc-900">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mb-4">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Connecting to call...
          </h3>
          <p className="text-sm text-zinc-400">
            Getting ready to join the video call
          </p>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={false} // Start with camera off by default
      audio={audio}
      token={token}
      connect={true}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      data-lk-theme="default"
      className="h-screen"
    >
      <div className="flex flex-col h-full bg-zinc-900">
        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Video call layout */}
          <div className="flex-1 flex flex-col">
            <VideoCallLayout className="flex-1" />
            
            {/* Video controls at bottom */}
            <VideoControls
              onLeaveCall={handleLeaveCall}
              onToggleParticipants={handleToggleParticipants}
              onToggleChat={handleToggleChat}
              className="border-t border-zinc-800"
            />
          </div>

          {/* Participant list sidebar */}
          {showParticipants && (
            <div className="w-80">
              <ParticipantList
                showVideoThumbnails={true}
                onPinParticipant={handlePinParticipant}
                pinnedParticipantId={pinnedParticipantId}
                className="h-full"
              />
            </div>
          )}

          {/* Chat sidebar (placeholder for future implementation) */}
          {showChat && (
            <div className="w-80 bg-zinc-800 border-l border-zinc-700">
              <div className="p-4 border-b border-zinc-700">
                <h3 className="text-sm font-semibold text-white">Chat</h3>
              </div>
              <div className="flex-1 p-4 text-center text-zinc-400">
                <p className="text-sm">Chat feature coming soon...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </LiveKitRoom>
  );
}
