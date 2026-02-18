"use client";

import { useEffect, useRef, useCallback } from "react";
import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import { Room, RoomEvent, RemoteParticipant, LocalParticipant, Participant } from "livekit-client";

import { useMatrixClient } from "./use-matrix-client";
import { useModal } from "./use-modal-store";

// Types
export interface VoiceChannelParticipant {
  id: string;
  name: string;
  displayName: string;
  avatarUrl?: string;
  isSpeaking: boolean;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isLocal: boolean;
  connectionQuality: "excellent" | "good" | "poor" | "lost";
  joinedAt: number;
}

export interface VoiceChannelState {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  currentChannelId?: string;
  currentSpaceId?: string;
  error?: string;

  // Call state
  participants: VoiceChannelParticipant[];
  localParticipant?: VoiceChannelParticipant;
  audioEnabled: boolean;
  videoEnabled: boolean;
  speakerEnabled: boolean;
  volume: number;

  // Call history
  callHistory: VoiceCallHistoryItem[];
  
  // Settings
  autoJoinCalls: boolean;
  defaultAudioEnabled: boolean;
  defaultVideoEnabled: boolean;
  notifications: {
    incomingCalls: boolean;
    participantJoined: boolean;
    participantLeft: boolean;
  };
}

export interface VoiceCallHistoryItem {
  id: string;
  channelId: string;
  channelName: string;
  spaceId: string;
  spaceName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  participants: string[];
  isVideoCall: boolean;
  endReason: "left" | "kicked" | "disconnected" | "error";
}

export interface IncomingCallData {
  channelId: string;
  channelName: string;
  spaceId: string;
  spaceName: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  isVideoCall: boolean;
  participantCount: number;
  timestamp: number;
}

// Zustand store for voice channel state with persistence
interface VoiceChannelStore extends VoiceChannelState {
  // Actions
  setConnectionState: (connecting: boolean, connected: boolean, error?: string) => void;
  setCurrentChannel: (channelId?: string, spaceId?: string) => void;
  setParticipants: (participants: VoiceChannelParticipant[]) => void;
  setLocalParticipant: (participant?: VoiceChannelParticipant) => void;
  setAudioVideo: (audio: boolean, video: boolean) => void;
  setSpeaker: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  addCallToHistory: (call: Omit<VoiceCallHistoryItem, "id">) => void;
  endCall: (callId: string, endReason: VoiceCallHistoryItem["endReason"]) => void;
  updateSettings: (settings: Partial<VoiceChannelState>) => void;
  clearError: () => void;
}

const useVoiceChannelStore = create<VoiceChannelStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        isConnected: false,
        isConnecting: false,
        participants: [],
        audioEnabled: true,
        videoEnabled: false,
        speakerEnabled: true,
        volume: 100,
        callHistory: [],
        autoJoinCalls: false,
        defaultAudioEnabled: true,
        defaultVideoEnabled: false,
        notifications: {
          incomingCalls: true,
          participantJoined: true,
          participantLeft: false,
        },

        // Actions
        setConnectionState: (connecting, connected, error) =>
          set({ isConnecting: connecting, isConnected: connected, error }),

        setCurrentChannel: (channelId, spaceId) =>
          set({ currentChannelId: channelId, currentSpaceId: spaceId }),

        setParticipants: (participants) => set({ participants }),

        setLocalParticipant: (participant) => set({ localParticipant: participant }),

        setAudioVideo: (audio, video) =>
          set({ audioEnabled: audio, videoEnabled: video }),

        setSpeaker: (enabled) => set({ speakerEnabled: enabled }),

        setVolume: (volume) => set({ volume: Math.max(0, Math.min(100, volume)) }),

        addCallToHistory: (call) => {
          const callWithId = {
            ...call,
            id: `${call.channelId}-${call.startTime}`,
          };
          set((state) => ({
            callHistory: [callWithId, ...state.callHistory].slice(0, 50), // Keep last 50 calls
          }));
        },

        endCall: (callId, endReason) =>
          set((state) => ({
            callHistory: state.callHistory.map((call) =>
              call.id === callId && !call.endTime
                ? {
                    ...call,
                    endTime: Date.now(),
                    duration: Date.now() - call.startTime,
                    endReason,
                  }
                : call
            ),
          })),

        updateSettings: (settings) => set((state) => ({ ...state, ...settings })),

        clearError: () => set({ error: undefined }),
      }),
      {
        name: "melo-voice-channel-state",
        partialize: (state) => ({
          // Only persist settings and call history, not connection state
          callHistory: state.callHistory,
          autoJoinCalls: state.autoJoinCalls,
          defaultAudioEnabled: state.defaultAudioEnabled,
          defaultVideoEnabled: state.defaultVideoEnabled,
          notifications: state.notifications,
          volume: state.volume,
          speakerEnabled: state.speakerEnabled,
        }),
      }
    )
  )
);

// Main hook for voice channel management
export function useVoiceChannelManager() {
  const { client } = useMatrixClient();
  const { onOpen } = useModal();
  const roomRef = useRef<Room | null>(null);
  const currentCallIdRef = useRef<string | null>(null);

  // Store access
  const store = useVoiceChannelStore();
  const {
    isConnected,
    isConnecting,
    currentChannelId,
    currentSpaceId,
    participants,
    localParticipant,
    audioEnabled,
    videoEnabled,
    volume,
    speakerEnabled,
    callHistory,
    notifications,
    error,
    setConnectionState,
    setCurrentChannel,
    setParticipants,
    setLocalParticipant,
    setAudioVideo,
    setSpeaker,
    setVolume,
    addCallToHistory,
    endCall,
    updateSettings,
    clearError,
  } = store;

  // Convert LiveKit participant to our interface
  const convertParticipant = useCallback((
    participant: Participant,
    isSpeaking = false
  ): VoiceChannelParticipant => {
    return {
      id: participant.identity,
      name: participant.name || participant.identity,
      displayName: participant.metadata ? JSON.parse(participant.metadata).displayName : participant.name || participant.identity,
      avatarUrl: participant.metadata ? JSON.parse(participant.metadata).avatarUrl : undefined,
      isSpeaking,
      isAudioEnabled: participant.isMicrophoneEnabled,
      isVideoEnabled: participant.isCameraEnabled,
      isLocal: participant instanceof LocalParticipant,
    };
  }, []);

  // Update participants from LiveKit room
  const updateParticipants = useCallback(() => {
    if (!roomRef.current) {
      setParticipants([]);
      setLocalParticipant(undefined);
      return;
    }

    const room = roomRef.current;
    const newParticipants: VoiceChannelParticipant[] = [];

    // Add local participant
    if (room.localParticipant) {
      const local = convertParticipant(room.localParticipant);
      newParticipants.push(local);
      setLocalParticipant(local);
    }

    // Add remote participants
    room.participants.forEach((participant) => {
      newParticipants.push(convertParticipant(participant, participant.isSpeaking));
    });

    setParticipants(newParticipants);
  }, [convertParticipant, setParticipants, setLocalParticipant]);

  // Join a voice channel
  const joinVoiceChannel = useCallback(async (
    channelId: string,
    spaceId: string,
    options: {
      audio?: boolean;
      video?: boolean;
      autoJoin?: boolean;
    } = {}
  ): Promise<boolean> => {
    if (isConnecting || (isConnected && currentChannelId === channelId)) {
      return false;
    }

    // Disconnect from current channel if connected
    if (isConnected && roomRef.current) {
      // Use direct disconnect to avoid circular dependency
      try {
        await roomRef.current.disconnect();
      } catch (error) {
        console.error("Error disconnecting from previous channel:", error);
      }
    }

    setConnectionState(true, false);
    clearError();

    const { audio = true, video = false } = options;

    try {
      if (!client?.getUserId()) {
        throw new Error("Matrix client not available");
      }

      const userName = client.getUserId()!;
      
      // Get LiveKit token
      const response = await fetch(`/api/livekit?room=${channelId}&username=${userName}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get LiveKit token: ${response.statusText}`);
      }

      const { token } = await response.json();

      // Create LiveKit room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      roomRef.current = room;

      // Set up event listeners
      room.on(RoomEvent.Connected, () => {
        setConnectionState(false, true);
        setCurrentChannel(channelId, spaceId);
        updateParticipants();

        // Add to call history
        const callId = `${channelId}-${Date.now()}`;
        currentCallIdRef.current = callId;
        
        addCallToHistory({
          channelId,
          spaceId,
          startTime: Date.now(),
          participants: [userName],
          isVideoCall: video,
          endReason: "left",
        });
      });

      room.on(RoomEvent.Disconnected, (reason) => {
        setConnectionState(false, false);
        setCurrentChannel(undefined, undefined);
        setParticipants([]);
        setLocalParticipant(undefined);

        // End call in history
        if (currentCallIdRef.current) {
          endCall(currentCallIdRef.current, reason === "DISCONNECT" ? "left" : "disconnected");
          currentCallIdRef.current = null;
        }
      });

      room.on(RoomEvent.ParticipantConnected, (participant) => {
        updateParticipants();
        
        // Show notification if enabled
        if (notifications.participantJoined) {
        }
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        updateParticipants();
        
        // Show notification if enabled
        if (notifications.participantLeft) {
        }
      });

      room.on(RoomEvent.TrackMuted, updateParticipants);
      room.on(RoomEvent.TrackUnmuted, updateParticipants);
      room.on(RoomEvent.TrackPublished, updateParticipants);
      room.on(RoomEvent.TrackUnpublished, updateParticipants);

      // Handle speaking indicators
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        setParticipants(
          participants.map((p) => ({
            ...p,
            isSpeaking: speakers.some((s) => s.identity === p.id),
          }))
        );
      });

      // Connect to LiveKit server
      const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
      if (!serverUrl) {
        throw new Error("LiveKit server URL not configured");
      }

      await room.connect(serverUrl, token, {
        autoSubscribe: true,
        publishDefaults: {
          videoEncoding: {
            maxBitrate: 1_500_000,
            maxFramerate: 30,
          },
        },
      });

      // Set initial audio/video state
      await room.localParticipant.setMicrophoneEnabled(audio);
      await room.localParticipant.setCameraEnabled(video);
      setAudioVideo(audio, video);

      return true;
    } catch (error) {
      console.error("Failed to join voice channel:", error);
      setConnectionState(false, false, error instanceof Error ? error.message : "Failed to join");
      return false;
    }
  }, [
    isConnecting,
    isConnected,
    currentChannelId,
    client,
    setConnectionState,
    clearError,
    setCurrentChannel,
    updateParticipants,
    addCallToHistory,
    endCall,
    notifications,
    participants,
    setParticipants,
    setAudioVideo,
  ]);

  // Leave voice channel
  const leaveVoiceChannel = useCallback(async () => {
    if (!roomRef.current) return;

    try {
      await roomRef.current.disconnect();
    } catch (error) {
      console.error("Error leaving voice channel:", error);
    }

    roomRef.current = null;
    
    // End call in history
    if (currentCallIdRef.current) {
      endCall(currentCallIdRef.current, "left");
      currentCallIdRef.current = null;
    }
  }, [endCall]);

  // Toggle audio
  const toggleAudio = useCallback(async (): Promise<boolean> => {
    if (!roomRef.current?.localParticipant) return false;

    const newAudioState = !audioEnabled;
    await roomRef.current.localParticipant.setMicrophoneEnabled(newAudioState);
    setAudioVideo(newAudioState, videoEnabled);
    updateParticipants();
    return newAudioState;
  }, [audioEnabled, videoEnabled, setAudioVideo, updateParticipants]);

  // Toggle video
  const toggleVideo = useCallback(async (): Promise<boolean> => {
    if (!roomRef.current?.localParticipant) return false;

    const newVideoState = !videoEnabled;
    await roomRef.current.localParticipant.setCameraEnabled(newVideoState);
    setAudioVideo(audioEnabled, newVideoState);
    updateParticipants();
    return newVideoState;
  }, [audioEnabled, videoEnabled, setAudioVideo, updateParticipants]);

  // Show incoming call modal
  const showIncomingCall = useCallback((callData: IncomingCallData) => {
    if (!notifications.incomingCalls) return;

    onOpen("incomingCall", { incomingCallData: callData });
  }, [notifications.incomingCalls, onOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, []);

  return {
    // State
    isConnected,
    isConnecting,
    currentChannelId,
    currentSpaceId,
    participants,
    localParticipant,
    audioEnabled,
    videoEnabled,
    volume,
    speakerEnabled,
    callHistory,
    notifications,
    error,

    // Actions
    joinVoiceChannel,
    leaveVoiceChannel,
    toggleAudio,
    toggleVideo,
    setSpeaker,
    setVolume,
    updateSettings,
    clearError,
    showIncomingCall,
  };
}