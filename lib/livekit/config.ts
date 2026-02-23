/**
 * LiveKit Configuration
 * 
 * Handles environment validation, configuration setup, and JWT token generation
 * for LiveKit integration with Melo v2.
 */

import { AccessToken } from 'livekit-server-sdk';
import { z } from 'zod';

// Environment validation schema
const liveKitEnvSchema = z.object({
  LIVEKIT_API_KEY: z.string().min(1, 'LIVEKIT_API_KEY is required'),
  LIVEKIT_API_SECRET: z.string().min(1, 'LIVEKIT_API_SECRET is required'),
  NEXT_PUBLIC_LIVEKIT_URL: z.string().url('NEXT_PUBLIC_LIVEKIT_URL must be a valid URL'),
});

export interface LiveKitEnvironment {
  apiKey: string;
  apiSecret: string;
  serverUrl: string;
}

export interface LiveKitConfig {
  serverUrl: string;
  apiKey: string;
  apiSecret: string;
  security: {
    rateLimitEnabled: boolean;
    maxRoomsPerUser: number;
    sessionTimeoutMinutes: number;
  };
  turnServers: Array<{
    urls: string;
    username?: string;
    credential?: string;
  }>;
}

export interface AccessTokenOptions {
  roomName: string;
  identity: string;
  permissions: {
    canPublish: boolean;
    canSubscribe: boolean;
    canPublishData: boolean;
  };
  metadata?: string;
  ttlSeconds?: number;
}

/**
 * Validates LiveKit environment variables
 */
export function validateLiveKitEnvironment(): LiveKitEnvironment {
  try {
    const env = liveKitEnvSchema.parse({
      LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
      NEXT_PUBLIC_LIVEKIT_URL: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    });

    return {
      apiKey: env.LIVEKIT_API_KEY,
      apiSecret: env.LIVEKIT_API_SECRET,
      serverUrl: env.NEXT_PUBLIC_LIVEKIT_URL,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingFields = error.errors.map(err => err.message).join(', ');
      throw new Error(`LiveKit configuration error: ${missingFields}`);
    }
    throw error;
  }
}

/**
 * Gets complete LiveKit configuration
 */
export function getLiveKitConfig(): LiveKitConfig {
  const env = validateLiveKitEnvironment();

  return {
    serverUrl: env.serverUrl,
    apiKey: env.apiKey,
    apiSecret: env.apiSecret,
    security: {
      rateLimitEnabled: true,
      maxRoomsPerUser: 5, // Maximum concurrent rooms per user
      sessionTimeoutMinutes: 120, // 2 hours
    },
    turnServers: [
      {
        urls: 'turn:turn.livekit.io:443?transport=tcp',
        username: 'livekit',
        credential: 'turn-secret',
      },
      {
        urls: 'turn:turn.livekit.io:443?transport=udp',
        username: 'livekit', 
        credential: 'turn-secret',
      },
    ],
  };
}

/**
 * Generates JWT access token for room access
 */
export async function generateAccessToken(options: AccessTokenOptions): Promise<string> {
  const env = validateLiveKitEnvironment();
  
  const accessToken = new AccessToken(env.apiKey, env.apiSecret, {
    identity: options.identity,
    ttl: options.ttlSeconds || 3600, // Default 1 hour
  });

  // Configure room permissions
  accessToken.addGrant({
    room: options.roomName,
    roomJoin: true,
    canPublish: options.permissions.canPublish,
    canSubscribe: options.permissions.canSubscribe,
    canPublishData: options.permissions.canPublishData,
  });

  if (options.metadata) {
    accessToken.metadata = options.metadata;
  }

  return await accessToken.toJwt();
}

/**
 * Validates an access token (for testing/debugging)
 */
export function verifyAccessToken(token: string): boolean {
  try {
    // Basic JWT structure validation
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  } catch {
    return false;
  }
}

/**
 * Rate limiting for room access
 */
class RoomRateLimiter {
  private static instance: RoomRateLimiter;
  private userRoomCounts = new Map<string, number>();
  private userLastActivity = new Map<string, number>();

  static getInstance(): RoomRateLimiter {
    if (!RoomRateLimiter.instance) {
      RoomRateLimiter.instance = new RoomRateLimiter();
    }
    return RoomRateLimiter.instance;
  }

  canJoinRoom(userId: string): boolean {
    const config = getLiveKitConfig();
    const currentCount = this.userRoomCounts.get(userId) || 0;
    
    // Clean up old entries (older than session timeout)
    this.cleanupExpiredSessions();

    return currentCount < config.security.maxRoomsPerUser;
  }

  trackRoomJoin(userId: string): void {
    const currentCount = this.userRoomCounts.get(userId) || 0;
    this.userRoomCounts.set(userId, currentCount + 1);
    this.userLastActivity.set(userId, Date.now());
  }

  trackRoomLeave(userId: string): void {
    const currentCount = this.userRoomCounts.get(userId) || 0;
    if (currentCount > 0) {
      this.userRoomCounts.set(userId, currentCount - 1);
    }
    this.userLastActivity.set(userId, Date.now());
  }

  private cleanupExpiredSessions(): void {
    const config = getLiveKitConfig();
    const timeoutMs = config.security.sessionTimeoutMinutes * 60 * 1000;
    const now = Date.now();

    for (const [userId, lastActivity] of this.userLastActivity.entries()) {
      if (now - lastActivity > timeoutMs) {
        this.userRoomCounts.delete(userId);
        this.userLastActivity.delete(userId);
      }
    }
  }
}

export const rateLimiter = RoomRateLimiter.getInstance();

/**
 * Security utilities
 */
export const security = {
  /**
   * Sanitizes room name to prevent injection attacks
   */
  sanitizeRoomName(roomName: string): string {
    return roomName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 64);
  },

  /**
   * Validates user identity format
   */
  validateIdentity(identity: string): boolean {
    // Allow Matrix user IDs and basic alphanumeric identities
    const matrixIdPattern = /^@[a-zA-Z0-9._-]+:[a-zA-Z0-9.-]+$/;
    const basicIdPattern = /^[a-zA-Z0-9._-]+$/;
    
    return matrixIdPattern.test(identity) || basicIdPattern.test(identity);
  },

  /**
   * Extracts Matrix user ID for use as LiveKit identity
   */
  matrixUserToIdentity(matrixUserId: string): string {
    if (this.validateIdentity(matrixUserId)) {
      // Use full Matrix ID as identity
      return matrixUserId;
    }
    throw new Error(`Invalid Matrix user ID format: ${matrixUserId}`);
  },
};

/**
 * Development utilities
 */
export const dev = {
  /**
   * Creates a test token for development
   */
  async createTestToken(roomName: string, identity: string): Promise<string> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Test tokens not available in production');
    }

    return await generateAccessToken({
      roomName: security.sanitizeRoomName(roomName),
      identity: security.validateIdentity(identity) ? identity : `test-${identity}`,
      permissions: {
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      },
      ttlSeconds: 300, // 5 minutes for testing
    });
  },

  /**
   * Logs current configuration (without secrets)
   */
  logConfig(): void {
    if (process.env.NODE_ENV !== 'development') return;

    try {
      const config = getLiveKitConfig();
      console.log('LiveKit Configuration:', {
        serverUrl: config.serverUrl,
        security: config.security,
        turnServers: config.turnServers.map(server => ({
          urls: server.urls,
          hasCredentials: !!(server.username && server.credential),
        })),
        apiKeyConfigured: !!config.apiKey,
        apiSecretConfigured: !!config.apiSecret,
      });
    } catch (error) {
      console.error('LiveKit configuration error:', error);
    }
  },
};

// Export type definitions for external use
export type { LiveKitConfig, LiveKitEnvironment, AccessTokenOptions };