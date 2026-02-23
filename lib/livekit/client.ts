/**
 * LiveKit Client Wrapper
 * 
 * Provides a simplified interface for LiveKit functionality integrated with Melo's
 * Matrix-based authentication and room system.
 */

import { 
  Room, 
  RoomEvent, 
  ConnectionState,
  LocalTrack,
  RemoteTrack,
  RemoteParticipant,
  LocalParticipant,
  Track,
  createLocalAudioTrack,
  createLocalVideoTrack,
  RoomOptions,
  VideoPresets,
  AudioPresets
} from 'livekit-client';
import { EventEmitter } from 'events';
import { getLiveKitConfig, generateAccessToken, security, rateLimiter } from './config';

export interface LiveKitClientOptions {
  autoConnect?: boolean;
  enableAudio?: boolean;
  enableVideo?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  matrixAuth?: {
    userId: string;
    accessToken: string;
    deviceId: string;
  };
}

export interface RoomConnectionOptions {
  roomName: string;
  identity?: string;
  token?: string;
  requireMatrixMembership?: boolean;
}

export interface ClientEventHandlers {
  onRoomConnected?: (roomInfo: { roomName: string; participantCount: number }) => void;
  onRoomDisconnected?: () => void;
  onParticipantConnected?: (participant: RemoteParticipant) => void;
  onParticipantDisconnected?: (participant: RemoteParticipant) => void;
  onTrackSubscribed?: (track: RemoteTrack, participant: RemoteParticipant) => void;
  onTrackUnsubscribed?: (track: RemoteTrack, participant: RemoteParticipant) => void;
  onConnectionStateChanged?: (state: ConnectionState) => void;
  onError?: (error: Error) => void;
}

export class MeloLiveKitClient extends EventEmitter {
  private room: Room | null = null;
  private config: ReturnType<typeof getLiveKitConfig> | null = null;
  public readonly options: LiveKitClientOptions;
  private reconnectAttempts = 0;
  private localAudioTrack: LocalTrack | null = null;
  private localVideoTrack: LocalTrack | null = null;
  public readonly matrixAuth: LiveKitClientOptions['matrixAuth'];

  constructor(options: LiveKitClientOptions = {}) {
    super();
    
    this.options = {
      autoConnect: false,
      enableAudio: true,
      enableVideo: false,
      logLevel: 'warn',
      autoReconnect: true,
      maxReconnectAttempts: 3,
      ...options,
    };

    this.matrixAuth = options.matrixAuth;
  }

  /**
   * Get LiveKit configuration (lazy loaded)
   */
  private getConfig() {
    if (!this.config) {
      this.config = getLiveKitConfig();
    }
    return this.config;
  }

  /**
   * Check if client is currently connected to a room
   */
  get isConnected(): boolean {
    return this.room?.state === ConnectionState.Connected;
  }

  /**
   * Get current room instance
   */
  get currentRoom(): Room | null {
    return this.room;
  }

  /**
   * Connect to a LiveKit room
   */
  async connectToRoom(options: RoomConnectionOptions): Promise<boolean> {
    try {
      // Rate limiting check
      const identity = this.getIdentityForConnection(options);
      if (!rateLimiter.canJoinRoom(identity)) {
        throw new Error('Rate limit exceeded: Too many concurrent rooms');
      }

      // Validate Matrix membership if required
      if (options.requireMatrixMembership && this.matrixAuth) {
        await this.validateMatrixRoomMembership(options.roomName);
      }

      // Create or get access token
      const token = options.token || await this.generateRoomToken(options.roomName, identity);

      // Configure room options
      const roomOptions: RoomOptions = {
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: VideoPresets.h720.resolution,
          facingMode: 'user',
        },
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      // Create and configure room
      this.room = new Room(roomOptions);
      this.setupRoomEventHandlers();

      // Connect to LiveKit server
      await this.room.connect(this.getConfig().serverUrl, token);

      // Track successful connection
      rateLimiter.trackRoomJoin(identity);
      this.reconnectAttempts = 0;

      this.emit('roomConnected', {
        roomName: options.roomName,
        participantCount: this.room.participants.size,
      });

      return true;
    } catch (error) {
      console.error('Failed to connect to room:', error);
      this.emit('error', error);
      
      // Attempt reconnection if enabled
      if (this.options.autoReconnect && this.reconnectAttempts < (this.options.maxReconnectAttempts || 3)) {
        this.reconnectAttempts++;
        setTimeout(() => this.connectToRoom(options), 2000 * this.reconnectAttempts);
      }
      
      return false;
    }
  }

  /**
   * Disconnect from current room
   */
  async disconnectFromRoom(): Promise<boolean> {
    try {
      if (this.room) {
        const identity = this.room.localParticipant?.identity || '';
        
        // Clean up local tracks
        await this.cleanupLocalTracks();
        
        // Disconnect from room
        await this.room.disconnect();
        
        // Update rate limiter
        if (identity) {
          rateLimiter.trackRoomLeave(identity);
        }
        
        this.room = null;
        this.emit('roomDisconnected');
      }
      
      return true;
    } catch (error) {
      console.error('Error disconnecting from room:', error);
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Enable audio (microphone)
   */
  async enableAudio(): Promise<boolean> {
    try {
      if (!this.room || !this.isConnected) {
        throw new Error('Not connected to a room');
      }

      if (!this.localAudioTrack) {
        this.localAudioTrack = await createLocalAudioTrack(this.options.logLevel !== 'debug' ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } : undefined);
      }

      await this.room.localParticipant.publishTrack(this.localAudioTrack);
      return true;
    } catch (error) {
      console.error('Error enabling audio:', error);
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Disable audio (microphone)
   */
  async disableAudio(): Promise<boolean> {
    try {
      if (!this.room || !this.isConnected) {
        return true; // Already disabled
      }

      if (this.localAudioTrack) {
        await this.room.localParticipant.unpublishTrack(this.localAudioTrack);
        this.localAudioTrack.stop();
        this.localAudioTrack = null;
      }

      return true;
    } catch (error) {
      console.error('Error disabling audio:', error);
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Enable video (camera)
   */
  async enableVideo(): Promise<boolean> {
    try {
      if (!this.room || !this.isConnected) {
        throw new Error('Not connected to a room');
      }

      if (!this.localVideoTrack) {
        this.localVideoTrack = await createLocalVideoTrack({
          resolution: VideoPresets.h720.resolution,
          facingMode: 'user',
        });
      }

      await this.room.localParticipant.publishTrack(this.localVideoTrack);
      return true;
    } catch (error) {
      console.error('Error enabling video:', error);
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Disable video (camera)
   */
  async disableVideo(): Promise<boolean> {
    try {
      if (!this.room || !this.isConnected) {
        return true; // Already disabled
      }

      if (this.localVideoTrack) {
        await this.room.localParticipant.unpublishTrack(this.localVideoTrack);
        this.localVideoTrack.stop();
        this.localVideoTrack = null;
      }

      return true;
    } catch (error) {
      console.error('Error disabling video:', error);
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Get list of participants in current room
   */
  getParticipants(): Array<{ identity: string; sid: string; displayName?: string }> {
    if (!this.room) {
      return [];
    }

    return Array.from(this.room.participants.values()).map(participant => ({
      identity: participant.identity,
      sid: participant.sid,
      displayName: participant.metadata ? JSON.parse(participant.metadata).displayName : undefined,
    }));
  }

  /**
   * Check if local audio is enabled
   */
  isAudioEnabled(): boolean {
    return this.localAudioTrack !== null && !this.localAudioTrack.isMuted;
  }

  /**
   * Check if local video is enabled
   */
  isVideoEnabled(): boolean {
    return this.localVideoTrack !== null && !this.localVideoTrack.isMuted;
  }

  /**
   * Mute/unmute local audio
   */
  async setAudioEnabled(enabled: boolean): Promise<boolean> {
    return enabled ? await this.enableAudio() : await this.disableAudio();
  }

  /**
   * Enable/disable local video
   */
  async setVideoEnabled(enabled: boolean): Promise<boolean> {
    return enabled ? await this.enableVideo() : await this.disableVideo();
  }

  /**
   * Get local video track for preview
   */
  getLocalVideoTrack(): LocalTrack | null {
    return this.localVideoTrack;
  }

  /**
   * Clean up all resources
   */
  async cleanup(): Promise<void> {
    await this.disconnectFromRoom();
    this.removeAllListeners();
  }

  /**
   * Private: Generate room access token
   */
  private async generateRoomToken(roomName: string, identity: string): Promise<string> {
    return await generateAccessToken({
      roomName: security.sanitizeRoomName(roomName),
      identity: identity,
      permissions: {
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      },
      metadata: JSON.stringify({
        displayName: this.extractDisplayName(identity),
        matrixUserId: this.matrixAuth?.userId,
      }),
    });
  }

  /**
   * Private: Get identity for connection
   */
  private getIdentityForConnection(options: RoomConnectionOptions): string {
    if (options.identity) {
      return options.identity;
    }
    
    if (this.matrixAuth?.userId) {
      return security.matrixUserToIdentity(this.matrixAuth.userId);
    }

    throw new Error('No identity provided and no Matrix authentication available');
  }

  /**
   * Private: Validate Matrix room membership
   */
  private async validateMatrixRoomMembership(roomName: string): Promise<void> {
    if (!this.matrixAuth) {
      throw new Error('Matrix authentication required for room membership validation');
    }

    // This would typically involve calling the Matrix API to check membership
    // For now, we'll implement a placeholder that always passes
    // In a real implementation, this would check the Matrix room membership
    console.log(`Validating Matrix membership for room: ${roomName}, user: ${this.matrixAuth.userId}`);
  }

  /**
   * Private: Extract display name from identity
   */
  private extractDisplayName(identity: string): string {
    // Extract display name from Matrix user ID
    if (identity.startsWith('@') && identity.includes(':')) {
      const localPart = identity.split(':')[0].substring(1);
      return localPart.charAt(0).toUpperCase() + localPart.slice(1);
    }
    return identity;
  }

  /**
   * Private: Setup room event handlers
   */
  private setupRoomEventHandlers(): void {
    if (!this.room) return;

    this.room.on(RoomEvent.Connected, () => {
      console.log('Connected to room');
    });

    this.room.on(RoomEvent.Disconnected, () => {
      console.log('Disconnected from room');
      this.emit('roomDisconnected');
    });

    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log('Participant connected:', participant.identity);
      this.emit('participantConnected', participant);
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log('Participant disconnected:', participant.identity);
      this.emit('participantDisconnected', participant);
    });

    this.room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication, participant: RemoteParticipant) => {
      console.log('Track subscribed:', track.kind, 'from', participant.identity);
      this.emit('trackSubscribed', track, participant);
    });

    this.room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication, participant: RemoteParticipant) => {
      console.log('Track unsubscribed:', track.kind, 'from', participant.identity);
      this.emit('trackUnsubscribed', track, participant);
    });

    this.room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      console.log('Connection state changed:', state);
      this.emit('connectionStateChanged', state);

      if (state === ConnectionState.Disconnected && this.options.autoReconnect) {
        // Handle unexpected disconnection
        this.emit('roomDisconnected');
      }
    });

    // Error handling
    this.room.on(RoomEvent.Reconnecting, () => {
      console.log('Attempting to reconnect...');
    });

    this.room.on(RoomEvent.Reconnected, () => {
      console.log('Successfully reconnected to room');
      this.reconnectAttempts = 0;
    });
  }

  /**
   * Private: Clean up local tracks
   */
  private async cleanupLocalTracks(): Promise<void> {
    if (this.localAudioTrack) {
      this.localAudioTrack.stop();
      this.localAudioTrack = null;
    }

    if (this.localVideoTrack) {
      this.localVideoTrack.stop();
      this.localVideoTrack = null;
    }
  }
}

// Export types for external use
export type { LiveKitClientOptions, RoomConnectionOptions, ClientEventHandlers };

// Convenience factory function
export function createLiveKitClient(options?: LiveKitClientOptions): MeloLiveKitClient {
  return new MeloLiveKitClient(options);
}