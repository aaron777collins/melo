"use client";

import React, { useEffect, useState } from "react";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { ActionTooltip } from "@/components/action-tooltip";
import { useModal } from "@/hooks/use-modal-store";
import { useVoiceChannelManager, IncomingCallData } from "@/hooks/use-voice-channel-manager";

export function IncomingCallModal() {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();
  const { joinVoiceChannel } = useVoiceChannelManager();
  const [isJoining, setIsJoining] = useState(false);
  const [autoJoinEnabled, setAutoJoinEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(false);

  const isModalOpen = isOpen && type === "incomingCall";
  const callData = data.incomingCallData;

  // Auto-answer timeout (30 seconds)
  useEffect(() => {
    if (!isModalOpen || !callData) return;

    const timeout = setTimeout(() => {
      onClose();
    }, 30000);

    return () => clearTimeout(timeout);
  }, [isModalOpen, callData, onClose]);

  const handleAccept = async () => {
    if (isJoining || !callData) return;
    
    setIsJoining(true);
    
    try {
      // Join the voice channel
      const success = await joinVoiceChannel(
        callData.channelId,
        callData.spaceId,
        {
          audio: autoJoinEnabled,
          video: videoEnabled && callData.isVideoCall,
        }
      );

      if (success) {
        // Navigate to the channel
        router.push(`/servers/${callData.spaceId}/channels/${callData.channelId}`);
        onClose();
      }
    } catch (error) {
      console.error("Failed to join voice channel:", error);
      // Show error modal or toast
    } finally {
      setIsJoining(false);
    }
  };

  const handleDecline = () => {
    // Send decline notification to caller (if needed)
    onClose();
  };

  const formatParticipantCount = (count: number) => {
    if (count === 0) return "Starting call";
    if (count === 1) return "1 person in call";
    return `${count} people in call`;
  };

  if (!isModalOpen || !callData) {
    return null;
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-zinc-900 border-zinc-800">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl font-semibold text-white">
            Incoming {callData.isVideoCall ? "Video" : "Voice"} Call
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {callData.callerName} is inviting you to join
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4 py-4">
          {/* Caller Avatar */}
          <div className="relative">
            <UserAvatar
              src={callData.callerAvatar}
              className="h-16 w-16"
            />
            <div className="absolute -bottom-1 -right-1">
              {callData.isVideoCall ? (
                <Video className="h-6 w-6 bg-green-500 text-white rounded-full p-1" />
              ) : (
                <Phone className="h-6 w-6 bg-green-500 text-white rounded-full p-1" />
              )}
            </div>
          </div>

          {/* Call Details */}
          <div className="text-center space-y-1">
            <h3 className="font-semibold text-white">{callData.channelName}</h3>
            <p className="text-sm text-zinc-400">{callData.spaceName}</p>
            <p className="text-xs text-zinc-500">
              {formatParticipantCount(callData.participantCount)}
            </p>
          </div>

          {/* Call Settings */}
          <div className="flex items-center gap-4 py-2">
            <ActionTooltip label={autoJoinEnabled ? "Mute microphone" : "Unmute microphone"}>
              <button
                onClick={() => setAutoJoinEnabled(!autoJoinEnabled)}
                className={`p-3 rounded-full transition-colors ${
                  autoJoinEnabled
                    ? "bg-zinc-700 hover:bg-zinc-600 text-white"
                    : "bg-red-500 hover:bg-red-600 text-white"
                }`}
              >
                {autoJoinEnabled ? (
                  <Mic className="h-5 w-5" />
                ) : (
                  <MicOff className="h-5 w-5" />
                )}
              </button>
            </ActionTooltip>

            {callData.isVideoCall && (
              <ActionTooltip label={videoEnabled ? "Turn off camera" : "Turn on camera"}>
                <button
                  onClick={() => setVideoEnabled(!videoEnabled)}
                  className={`p-3 rounded-full transition-colors ${
                    videoEnabled
                      ? "bg-zinc-700 hover:bg-zinc-600 text-white"
                      : "bg-zinc-600 hover:bg-zinc-500 text-white"
                  }`}
                >
                  {videoEnabled ? (
                    <Video className="h-5 w-5" />
                  ) : (
                    <VideoOff className="h-5 w-5" />
                  )}
                </button>
              </ActionTooltip>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-6 pt-4">
            {/* Decline Button */}
            <ActionTooltip label="Decline call">
              <Button
                onClick={handleDecline}
                variant="ghost"
                size="lg"
                className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600 text-white"
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            </ActionTooltip>

            {/* Accept Button */}
            <ActionTooltip label="Accept call">
              <Button
                onClick={handleAccept}
                disabled={isJoining}
                size="lg"
                className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-600 text-white disabled:opacity-50"
              >
                {isJoining ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                ) : (
                  <Phone className="h-6 w-6" />
                )}
              </Button>
            </ActionTooltip>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}