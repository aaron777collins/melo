"use client";

import React from "react";
import { Phone, PhoneOff, Wifi, WifiOff, Loader2 } from "lucide-react";

import { ActionTooltip } from "@/components/action-tooltip";
import { useVoiceChannel } from "@/hooks/use-voice-channel";

interface VoiceConnectionStatusProps {
  className?: string;
}

export function VoiceConnectionStatus({ className }: VoiceConnectionStatusProps) {
  const {
    isConnected,
    isConnecting,
    participants,
    localParticipant,
    error,
  } = useVoiceChannel();

  // Don't show anything if not connected or connecting
  if (!isConnected && !isConnecting && !error) {
    return null;
  }

  const getStatusInfo = () => {
    if (error) {
      return {
        icon: WifiOff,
        color: "text-red-500",
        bgColor: "bg-red-500/10",
        label: `Voice connection error: ${error}`,
        text: "Connection Error"
      };
    }
    
    if (isConnecting) {
      return {
        icon: Loader2,
        color: "text-yellow-500",
        bgColor: "bg-yellow-500/10",
        label: "Connecting to voice channel...",
        text: "Connecting...",
        spinning: true
      };
    }
    
    if (isConnected) {
      const participantCount = participants.length;
      return {
        icon: Phone,
        color: "text-green-500",
        bgColor: "bg-green-500/10",
        label: `Connected to voice channel (${participantCount} participant${participantCount !== 1 ? 's' : ''})`,
        text: `Voice (${participantCount})`
      };
    }

    return null;
  };

  const statusInfo = getStatusInfo();
  if (!statusInfo) return null;

  const Icon = statusInfo.icon;

  return (
    <ActionTooltip side="bottom" label={statusInfo.label}>
      <div 
        className={`
          flex items-center gap-2 px-2 py-1 rounded-md transition-colors
          ${statusInfo.bgColor} ${className}
        `}
      >
        <Icon 
          className={`
            h-4 w-4 ${statusInfo.color} 
            ${statusInfo.spinning ? "animate-spin" : ""}
          `} 
        />
        <span 
          className={`text-xs font-medium ${statusInfo.color}`}
        >
          {statusInfo.text}
        </span>
      </div>
    </ActionTooltip>
  );
}