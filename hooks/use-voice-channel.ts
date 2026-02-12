"use client";

import { useEffect, useState, useRef } from "react";
import { Room, RoomEvent, Track, RemoteTrack, RemoteParticipant, LocalParticipant, Participant } from "livekit-client";

export interface VoiceChannelParticipant {
  id: string;
  name: string;
  isSpeaking: boolean;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isLocal: boolean;
}

export interface VoiceChannelState {
  isConnected: boolean;
  isConnecting: boolean;
  participants: VoiceChannelParticipant[];
  localParticipant?: VoiceChannelParticipant;
  error?: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

interface UseVoiceChannelOptions {
  roomId?: string;
  username?: string;
  autoConnect?: boolean;
}

export function useVoiceChannel(options: UseVoiceChannelOptions = {}) {
  const { roomId, username, autoConnect = false } = options;
  const roomRef = useRef<Room | null>(null);
  
  const [state, setState] = useState<VoiceChannelState>({
    isConnected: false,
    isConnecting: false,
    participants: [],
    audioEnabled: true,
    videoEnabled: false,
  });

  // Convert LiveKit participant to our interface
  const convertParticipant = (participant: Participant, isSpeaking = false): VoiceChannelParticipant => ({
    id: participant.identity,
    name: participant.name || participant.identity,
    isSpeaking,
    isAudioEnabled: participant.isMicrophoneEnabled,
    isVideoEnabled: participant.isCameraEnabled,
    isLocal: participant instanceof LocalParticipant,
  });

  // Update participants list
  const updateParticipants = () => {
    if (!roomRef.current) {
      setState(prev => ({ ...prev, participants: [] }));
      return;
    }

    const room = roomRef.current;
    const participants: VoiceChannelParticipant[] = [];
    
    // Add local participant
    if (room.localParticipant) {
      const localParticipant = convertParticipant(room.localParticipant);
      participants.push(localParticipant);
      setState(prev => ({ ...prev, localParticipant }));
    }
    
    // Add remote participants
    room.remoteParticipants.forEach((participant) => {
      participants.push(convertParticipant(participant, participant.isSpeaking));
    });

    setState(prev => ({ ...prev, participants }));
  };

  // Connect to voice channel
  const connect = async (channelId: string, userName: string) => {
    if (state.isConnecting || state.isConnected) return;

    setState(prev => ({ ...prev, isConnecting: true, error: undefined }));

    try {
      // Get LiveKit token
      const response = await fetch(`/api/livekit?room=${channelId}&username=${userName}`);
      
      if (!response.ok) {
        throw new Error('Failed to get access token');
      }

      const { token } = await response.json();

      // Create and connect room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: {
          videoSimulcastLayers: [
            { resolution: { width: 640, height: 360 }, encoding: { maxBitrate: 300_000 } },
            { resolution: { width: 320, height: 180 }, encoding: { maxBitrate: 100_000 } },
          ],
        },
      });

      roomRef.current = room;

      // Set up event listeners
      room.on(RoomEvent.Connected, () => {
        setState(prev => ({ 
          ...prev, 
          isConnected: true, 
          isConnecting: false, 
          error: undefined 
        }));
        updateParticipants();
      });

      room.on(RoomEvent.Disconnected, () => {
        setState(prev => ({ 
          ...prev, 
          isConnected: false, 
          isConnecting: false,
          participants: [],
          localParticipant: undefined
        }));
      });

      room.on(RoomEvent.ParticipantConnected, updateParticipants);
      room.on(RoomEvent.ParticipantDisconnected, updateParticipants);

      room.on(RoomEvent.TrackMuted, updateParticipants);
      room.on(RoomEvent.TrackUnmuted, updateParticipants);

      room.on(RoomEvent.TrackPublished, updateParticipants);
      room.on(RoomEvent.TrackUnpublished, updateParticipants);

      // Handle speaking indicators
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        setState(prev => ({
          ...prev,
          participants: prev.participants.map(p => ({
            ...p,
            isSpeaking: speakers.some(s => s.identity === p.id)
          }))
        }));
      });

      room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
        // Could add connection quality indicators here
      });

      // Connect to LiveKit server
      const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
      if (!serverUrl) {
        throw new Error('LiveKit server URL not configured');
      }

      await room.connect(serverUrl, token);

      // Enable audio by default, video off
      await room.localParticipant.setMicrophoneEnabled(true);
      await room.localParticipant.setCameraEnabled(false);

    } catch (error) {
      console.error('Failed to connect to voice channel:', error);
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: error instanceof Error ? error.message : 'Failed to connect' 
      }));
      roomRef.current = null;
    }
  };

  // Disconnect from voice channel
  const disconnect = async () => {
    if (!roomRef.current) return;

    try {
      await roomRef.current.disconnect();
    } catch (error) {
      console.error('Error disconnecting from voice channel:', error);
    }
    
    roomRef.current = null;
    setState(prev => ({ 
      ...prev, 
      isConnected: false, 
      isConnecting: false,
      participants: [],
      localParticipant: undefined
    }));
  };

  // Toggle audio mute
  const toggleAudio = async () => {
    if (!roomRef.current?.localParticipant) return;

    const enabled = !state.audioEnabled;
    await roomRef.current.localParticipant.setMicrophoneEnabled(enabled);
    setState(prev => ({ ...prev, audioEnabled: enabled }));
    updateParticipants();
  };

  // Toggle video
  const toggleVideo = async () => {
    if (!roomRef.current?.localParticipant) return;

    const enabled = !state.videoEnabled;
    await roomRef.current.localParticipant.setCameraEnabled(enabled);
    setState(prev => ({ ...prev, videoEnabled: enabled }));
    updateParticipants();
  };

  // Auto-connect if options provided
  useEffect(() => {
    if (autoConnect && roomId && username && !state.isConnected && !state.isConnecting) {
      connect(roomId, username);
    }
  }, [autoConnect, roomId, username, state.isConnected, state.isConnecting]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    toggleAudio,
    toggleVideo,
  };
}