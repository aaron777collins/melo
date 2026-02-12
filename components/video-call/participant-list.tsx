"use client";

import React, { useState } from "react";
import { 
  useParticipants, 
  useConnectionState,
  ConnectionState,
  VideoTrack,
  useTracks
} from "@livekit/components-react";
import { Track as LKTrack } from "livekit-client";
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Volume2, 
  User, 
  Crown,
  Shield,
  UserPlus,
  MoreVertical,
  Pin,
  PinOff
} from "lucide-react";

import { UserAvatar } from "@/components/user-avatar";
import { ActionTooltip } from "@/components/action-tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ParticipantListProps {
  className?: string;
  showVideoThumbnails?: boolean;
  onPinParticipant?: (participantId: string) => void;
  pinnedParticipantId?: string;
}

export function ParticipantList({ 
  className,
  showVideoThumbnails = true,
  onPinParticipant,
  pinnedParticipantId
}: ParticipantListProps) {
  const participants = useParticipants();
  const connectionState = useConnectionState();
  const [expandedSections, setExpandedSections] = useState({
    moderators: true,
    participants: true
  });

  // Get all video tracks for thumbnail display
  const videoTracks = useTracks([
    { source: LKTrack.Source.Camera, withPlaceholder: true },
  ]);

  if (connectionState !== ConnectionState.Connected) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-center text-zinc-500">
          <div className="animate-pulse">Connecting to call...</div>
        </div>
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-center text-zinc-500">
          <User className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">No participants</p>
        </div>
      </div>
    );
  }

  // Group participants by role (placeholder logic - would integrate with Matrix roles)
  const moderators = participants.filter(p => 
    p.permissions?.canPublish || p.identity.includes('mod') // Placeholder logic
  );
  const regularParticipants = participants.filter(p => 
    !moderators.includes(p)
  );

  const toggleSection = (section: 'moderators' | 'participants') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className={`flex flex-col h-full bg-zinc-900 border-l border-zinc-800 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-white">
          Participants ({participants.length})
        </h3>
        <p className="text-xs text-zinc-400 mt-1">
          In video call
        </p>
      </div>

      {/* Participants list */}
      <div className="flex-1 overflow-y-auto">
        {/* Moderators section */}
        {moderators.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => toggleSection('moderators')}
              className="w-full px-4 py-2 text-left hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                <Shield className="w-3 h-3" />
                Moderators — {moderators.length}
              </div>
            </button>
            
            {expandedSections.moderators && (
              <div className="space-y-1 px-2">
                {moderators.map((participant) => (
                  <ParticipantItem
                    key={participant.identity}
                    participant={participant}
                    videoTracks={videoTracks}
                    showVideoThumbnail={showVideoThumbnails}
                    isModerator
                    isPinned={pinnedParticipantId === participant.identity}
                    onPin={onPinParticipant}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Regular participants section */}
        <div>
          <button
            onClick={() => toggleSection('participants')}
            className="w-full px-4 py-2 text-left hover:bg-zinc-800 transition-colors"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
              <User className="w-3 h-3" />
              Members — {regularParticipants.length}
            </div>
          </button>
          
          {expandedSections.participants && (
            <div className="space-y-1 px-2">
              {regularParticipants.map((participant) => (
                <ParticipantItem
                  key={participant.identity}
                  participant={participant}
                  videoTracks={videoTracks}
                  showVideoThumbnail={showVideoThumbnails}
                  isPinned={pinnedParticipantId === participant.identity}
                  onPin={onPinParticipant}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="p-4 border-t border-zinc-800">
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors">
          <UserPlus className="w-4 h-4" />
          Invite others
        </button>
      </div>
    </div>
  );
}

interface ParticipantItemProps {
  participant: any; // LiveKit participant
  videoTracks: any[];
  showVideoThumbnail?: boolean;
  isModerator?: boolean;
  isPinned?: boolean;
  onPin?: (participantId: string) => void;
}

function ParticipantItem({ 
  participant, 
  videoTracks, 
  showVideoThumbnail = true,
  isModerator = false,
  isPinned = false,
  onPin
}: ParticipantItemProps) {
  const displayName = participant.name || participant.identity;
  const isAudioEnabled = participant.isMicrophoneEnabled;
  const isVideoEnabled = participant.isCameraEnabled;
  const isSpeaking = participant.isSpeaking;
  const isLocal = participant.isLocal;

  // Find video track for this participant
  const videoTrack = videoTracks.find(track => 
    track.participant.identity === participant.identity &&
    track.source === LKTrack.Source.Camera
  );

  const hasVideo = videoTrack && videoTrack.publication?.isEnabled;

  const handlePin = () => {
    if (onPin) {
      onPin(participant.identity);
    }
  };

  return (
    <div 
      className={`
        group relative flex items-center gap-3 p-2 rounded-md transition-all
        ${isSpeaking 
          ? "bg-green-500/20 border border-green-500/50" 
          : "hover:bg-zinc-800"
        }
        ${isPinned ? "bg-indigo-500/20 border border-indigo-500/50" : ""}
      `}
    >
      {/* Video thumbnail or avatar */}
      <div className="relative flex-shrink-0">
        {showVideoThumbnail && hasVideo ? (
          <div className="w-10 h-10 rounded-md overflow-hidden bg-zinc-800">
            <VideoTrack
              trackRef={videoTrack}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <UserAvatar 
            src="" // TODO: Get avatar from Matrix user data
            className="h-10 w-10"
          />
        )}
        
        {/* Speaking indicator */}
        {isSpeaking && (
          <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5">
            <Volume2 className="h-2.5 w-2.5 text-white" />
          </div>
        )}

        {/* Pin indicator */}
        {isPinned && (
          <div className="absolute -top-1 -right-1 bg-indigo-500 rounded-full p-0.5">
            <Pin className="h-2.5 w-2.5 text-white" />
          </div>
        )}
      </div>

      {/* Participant info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-1">
          <span 
            className={`
              text-sm font-medium truncate
              ${isSpeaking 
                ? "text-green-300" 
                : "text-zinc-200"
              }
            `}
          >
            {displayName}
          </span>
          
          {/* Role indicators */}
          {isModerator && (
            <ActionTooltip side="top" label="Moderator">
              <Shield className="w-3 h-3 text-yellow-500" />
            </ActionTooltip>
          )}
          
          {isLocal && (
            <span className="text-xs text-zinc-400">(you)</span>
          )}
        </div>
        
        {/* Status indicators */}
        <div className="flex items-center gap-1">
          <ActionTooltip 
            side="top" 
            label={isAudioEnabled ? "Microphone on" : "Microphone off"}
          >
            {isAudioEnabled ? (
              <Mic className="h-3 w-3 text-green-500" />
            ) : (
              <MicOff className="h-3 w-3 text-red-500" />
            )}
          </ActionTooltip>
          
          <ActionTooltip 
            side="top" 
            label={isVideoEnabled ? "Camera on" : "Camera off"}
          >
            {isVideoEnabled ? (
              <Video className="h-3 w-3 text-green-500" />
            ) : (
              <VideoOff className="h-3 w-3 text-zinc-500" />
            )}
          </ActionTooltip>
          
          {/* Connection quality indicator */}
          <div className="flex gap-0.5 ml-1">
            <div className="w-1 h-2 bg-green-500 rounded-sm"></div>
            <div className="w-1 h-3 bg-green-500 rounded-sm"></div>
            <div className="w-1 h-2 bg-zinc-600 rounded-sm"></div>
          </div>
        </div>
      </div>

      {/* Actions menu */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {onPin && (
              <DropdownMenuItem onClick={handlePin}>
                {isPinned ? (
                  <>
                    <PinOff className="w-4 h-4 mr-2" />
                    Unpin participant
                  </>
                ) : (
                  <>
                    <Pin className="w-4 h-4 mr-2" />
                    Pin participant
                  </>
                )}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem>
              <User className="w-4 h-4 mr-2" />
              View profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Volume2 className="w-4 h-4 mr-2" />
              Adjust volume
            </DropdownMenuItem>
            {!isLocal && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-500">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Kick from call
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}