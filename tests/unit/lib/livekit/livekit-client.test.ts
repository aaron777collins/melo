/**
 * LiveKit Client Tests
 * TDD Phase: RED - These tests should FAIL initially
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Room, RoomEvent, ConnectionState } from 'livekit-client';

// Import types and classes that should exist after implementation
import type { 
  MeloLiveKitClient, 
  LiveKitClientOptions, 
  RoomConnectionOptions,
  ClientEventHandlers 
} from '@/lib/livekit/client';

// Mock livekit-client
vi.mock('livekit-client', () => ({
  Room: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    state: 'disconnected',
    participants: new Map(),
    localParticipant: {
      identity: 'test-user',
      publishTrack: vi.fn(),
      unpublishTrack: vi.fn()
    }
  })),
  RoomEvent: {
    Connected: 'connected',
    Disconnected: 'disconnected',
    ParticipantConnected: 'participantConnected',
    ParticipantDisconnected: 'participantDisconnected'
  },
  ConnectionState: {
    Connected: 'connected',
    Disconnected: 'disconnected',
    Connecting: 'connecting'
  },
  VideoPresets: {
    h720: {
      resolution: { width: 1280, height: 720 }
    }
  },
  AudioPresets: {
    music: { bitrate: 128000 }
  },
  createLocalAudioTrack: vi.fn().mockResolvedValue({
    kind: 'audio',
    stop: vi.fn(),
    isMuted: false
  }),
  createLocalVideoTrack: vi.fn().mockResolvedValue({
    kind: 'video',
    stop: vi.fn(),
    isMuted: false
  })
}));

describe('MeloLiveKitClient', () => {
  let mockRoom: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up environment for LiveKit config
    vi.stubEnv('LIVEKIT_API_KEY', 'test-api-key');
    vi.stubEnv('LIVEKIT_API_SECRET', 'test-api-secret');
    vi.stubEnv('NEXT_PUBLIC_LIVEKIT_URL', 'wss://test.livekit.cloud');
    
    // Create fresh mock room instance
    mockRoom = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      state: 'disconnected',
      participants: new Map(),
      localParticipant: {
        identity: 'test-user',
        publishTrack: vi.fn(),
        unpublishTrack: vi.fn()
      }
    };
    
    // Mock the Room constructor to return our mock
    vi.mocked(Room).mockImplementation(() => mockRoom);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Client Initialization', () => {
    it('should create client with default options', async () => {
      const { MeloLiveKitClient } = await import('@/lib/livekit/client');
      
      const client = new MeloLiveKitClient();
      
      expect(client).toBeDefined();
      expect(client.isConnected).toBe(false);
      expect(client.currentRoom).toBeNull();
    });

    it('should create client with custom options', async () => {
      const { MeloLiveKitClient } = await import('@/lib/livekit/client');
      
      const options: LiveKitClientOptions = {
        autoConnect: false,
        enableAudio: true,
        enableVideo: false,
        logLevel: 'warn'
      };
      
      const client = new MeloLiveKitClient(options);
      
      expect(client).toBeDefined();
      expect(client.options).toMatchObject(options);
    });

    it('should integrate with Matrix authentication', async () => {
      const { MeloLiveKitClient } = await import('@/lib/livekit/client');
      
      const matrixAuth = {
        userId: '@user:matrix.org',
        accessToken: 'test-token',
        deviceId: 'device-123'
      };
      
      const client = new MeloLiveKitClient({ matrixAuth });
      
      expect(client.matrixAuth).toEqual(matrixAuth);
    });
  });

  describe('Room Connection', () => {
    it('should connect to room with valid token', async () => {
      const { MeloLiveKitClient } = await import('@/lib/livekit/client');
      
      const client = new MeloLiveKitClient();
      const connectionOptions: RoomConnectionOptions = {
        roomName: 'test-room',
        identity: 'user-123',
        token: 'valid-jwt-token'
      };
      
      mockRoom.connect.mockResolvedValue(undefined);
      
      const result = await client.connectToRoom(connectionOptions);
      
      expect(result).toBe(true);
      expect(client.isConnected).toBe(true);
      expect(client.currentRoom).toBeDefined();
      expect(mockRoom.connect).toHaveBeenCalledWith(
        expect.stringContaining('wss://'),
        connectionOptions.token
      );
    });

    it('should handle connection failure gracefully', async () => {
      const { MeloLiveKitClient } = await import('@/lib/livekit/client');
      
      const client = new MeloLiveKitClient();
      const connectionOptions: RoomConnectionOptions = {
        roomName: 'test-room',
        identity: 'user-123',
        token: 'invalid-token'
      };
      
      mockRoom.connect.mockRejectedValue(new Error('Connection failed'));
      
      const result = await client.connectToRoom(connectionOptions);
      
      expect(result).toBe(false);
      expect(client.isConnected).toBe(false);
      expect(client.currentRoom).toBeNull();
    });

    it('should emit connection events', async () => {
      const { MeloLiveKitClient } = await import('@/lib/livekit/client');
      
      const client = new MeloLiveKitClient();
      const connectionEventHandler = vi.fn();
      
      client.on('roomConnected', connectionEventHandler);
      
      // Simulate successful connection
      mockRoom.connect.mockResolvedValue(undefined);
      mockRoom.state = 'connected';
      
      await client.connectToRoom({
        roomName: 'test-room',
        identity: 'user-123',
        token: 'valid-token'
      });
      
      // Trigger the room connected event
      const connectedCallback = mockRoom.on.mock.calls.find(
        call => call[0] === RoomEvent.Connected
      )?.[1];
      
      if (connectedCallback) {
        connectedCallback();
      }
      
      expect(connectionEventHandler).toHaveBeenCalledWith({
        roomName: 'test-room',
        participantCount: 0
      });
    });
  });

  describe('Room Disconnection', () => {
    it('should disconnect from room cleanly', async () => {
      const { MeloLiveKitClient } = await import('@/lib/livekit/client');
      
      const client = new MeloLiveKitClient();
      
      // Simulate being connected
      mockRoom.connect.mockResolvedValue(undefined);
      await client.connectToRoom({
        roomName: 'test-room',
        identity: 'user-123',
        token: 'valid-token'
      });
      
      const result = await client.disconnectFromRoom();
      
      expect(result).toBe(true);
      expect(client.isConnected).toBe(false);
      expect(client.currentRoom).toBeNull();
      expect(mockRoom.disconnect).toHaveBeenCalled();
    });

    it('should handle disconnect when not connected', async () => {
      const { MeloLiveKitClient } = await import('@/lib/livekit/client');
      
      const client = new MeloLiveKitClient();
      
      const result = await client.disconnectFromRoom();
      
      expect(result).toBe(true);
      expect(mockRoom.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('Audio/Video Controls', () => {
    it('should enable audio track', async () => {
      const { MeloLiveKitClient } = await import('@/lib/livekit/client');
      
      const client = new MeloLiveKitClient();
      
      // Simulate being connected
      mockRoom.connect.mockResolvedValue(undefined);
      await client.connectToRoom({
        roomName: 'test-room',
        identity: 'user-123',
        token: 'valid-token'
      });
      
      const result = await client.enableAudio();
      
      expect(result).toBe(true);
      expect(mockRoom.localParticipant.publishTrack).toHaveBeenCalled();
    });

    it('should disable audio track', async () => {
      const { MeloLiveKitClient } = await import('@/lib/livekit/client');
      
      const client = new MeloLiveKitClient();
      
      // Simulate being connected with audio enabled
      mockRoom.connect.mockResolvedValue(undefined);
      await client.connectToRoom({
        roomName: 'test-room',
        identity: 'user-123',
        token: 'valid-token'
      });
      await client.enableAudio();
      
      const result = await client.disableAudio();
      
      expect(result).toBe(true);
      expect(mockRoom.localParticipant.unpublishTrack).toHaveBeenCalled();
    });

    it('should enable video track', async () => {
      const { MeloLiveKitClient } = await import('@/lib/livekit/client');
      
      const client = new MeloLiveKitClient();
      
      // Simulate being connected
      mockRoom.connect.mockResolvedValue(undefined);
      await client.connectToRoom({
        roomName: 'test-room',
        identity: 'user-123',
        token: 'valid-token'
      });
      
      const result = await client.enableVideo();
      
      expect(result).toBe(true);
      expect(mockRoom.localParticipant.publishTrack).toHaveBeenCalled();
    });

    it('should handle media permission denied', async () => {
      const { MeloLiveKitClient } = await import('@/lib/livekit/client');
      
      const client = new MeloLiveKitClient();
      
      mockRoom.connect.mockResolvedValue(undefined);
      await client.connectToRoom({
        roomName: 'test-room',
        identity: 'user-123',
        token: 'valid-token'
      });
      
      // Simulate permission denied
      mockRoom.localParticipant.publishTrack.mockRejectedValue(
        new Error('Permission denied')
      );
      
      const result = await client.enableAudio();
      
      expect(result).toBe(false);
    });
  });

  describe('Participant Management', () => {
    it('should track participant connections', async () => {
      const { MeloLiveKitClient } = await import('@/lib/livekit/client');
      
      const client = new MeloLiveKitClient();
      const participantHandler = vi.fn();
      
      client.on('participantConnected', participantHandler);
      
      mockRoom.connect.mockResolvedValue(undefined);
      await client.connectToRoom({
        roomName: 'test-room',
        identity: 'user-123',
        token: 'valid-token'
      });
      
      // Simulate participant joining
      const participantConnectedCallback = mockRoom.on.mock.calls.find(
        call => call[0] === RoomEvent.ParticipantConnected
      )?.[1];
      
      const mockParticipant = {
        identity: 'new-user',
        sid: 'participant-456'
      };
      
      if (participantConnectedCallback) {
        participantConnectedCallback(mockParticipant);
      }
      
      expect(participantHandler).toHaveBeenCalledWith(mockParticipant);
    });

    it('should get current participant list', async () => {
      const { MeloLiveKitClient } = await import('@/lib/livekit/client');
      
      const client = new MeloLiveKitClient();
      
      mockRoom.connect.mockResolvedValue(undefined);
      mockRoom.participants = new Map([
        ['participant-1', { identity: 'user-1', sid: 'participant-1' }],
        ['participant-2', { identity: 'user-2', sid: 'participant-2' }]
      ]);
      
      await client.connectToRoom({
        roomName: 'test-room',
        identity: 'user-123',
        token: 'valid-token'
      });
      
      const participants = client.getParticipants();
      
      expect(participants).toHaveLength(2);
      expect(participants[0].identity).toBe('user-1');
      expect(participants[1].identity).toBe('user-2');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle network disconnection gracefully', async () => {
      const { MeloLiveKitClient } = await import('@/lib/livekit/client');
      
      const client = new MeloLiveKitClient();
      const disconnectionHandler = vi.fn();
      
      client.on('roomDisconnected', disconnectionHandler);
      
      mockRoom.connect.mockResolvedValue(undefined);
      await client.connectToRoom({
        roomName: 'test-room',
        identity: 'user-123',
        token: 'valid-token'
      });
      
      // Simulate unexpected disconnection
      const disconnectedCallback = mockRoom.on.mock.calls.find(
        call => call[0] === RoomEvent.Disconnected
      )?.[1];
      
      if (disconnectedCallback) {
        disconnectedCallback();
      }
      
      expect(disconnectionHandler).toHaveBeenCalled();
      expect(client.isConnected).toBe(false);
    });

    it('should attempt reconnection on network issues', async () => {
      const { MeloLiveKitClient } = await import('@/lib/livekit/client');
      
      const client = new MeloLiveKitClient({ 
        autoReconnect: true,
        maxReconnectAttempts: 3 
      });
      
      // First connection fails
      mockRoom.connect
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);
      
      const result = await client.connectToRoom({
        roomName: 'test-room',
        identity: 'user-123',
        token: 'valid-token'
      });
      
      // Should eventually succeed after retry
      expect(result).toBe(true);
      expect(mockRoom.connect).toHaveBeenCalledTimes(2);
    });
  });
});

// Integration tests for Matrix authentication
describe('Matrix Integration', () => {
  it('should use Matrix user identity for LiveKit identity', async () => {
    const { MeloLiveKitClient } = await import('@/lib/livekit/client');
    
    const matrixAuth = {
      userId: '@alice:matrix.org',
      accessToken: 'matrix-token-123',
      deviceId: 'device-abc'
    };
    
    const client = new MeloLiveKitClient({ matrixAuth });
    
    mockRoom.connect.mockResolvedValue(undefined);
    
    await client.connectToRoom({
      roomName: 'matrix-room-id',
      // Identity should be derived from Matrix user ID
      token: 'valid-token'
    });
    
    expect(mockRoom.connect).toHaveBeenCalledWith(
      expect.any(String),
      'valid-token'
    );
  });

  it('should validate Matrix room permissions before connecting', async () => {
    const { MeloLiveKitClient } = await import('@/lib/livekit/client');
    
    const client = new MeloLiveKitClient({
      matrixAuth: {
        userId: '@user:matrix.org',
        accessToken: 'token',
        deviceId: 'device'
      }
    });
    
    // Should check Matrix room membership before allowing connection
    const result = await client.connectToRoom({
      roomName: 'private-matrix-room',
      token: 'token',
      requireMatrixMembership: true
    });
    
    // This would typically involve an API call to check Matrix membership
    expect(result).toBeDefined();
  });
});