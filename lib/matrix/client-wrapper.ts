/**
 * Matrix Client Wrapper for SSG Compatibility
 *
 * Prevents matrix-js-sdk from being imported during static generation
 * by using dynamic imports and client-side guards.
 */

// During SSG/SSR, return mock implementations to prevent matrix-js-sdk imports
const isServer = typeof window === 'undefined';

// Mock types for server-side rendering
type MockMatrixClient = null;
type MockRoom = null;
type MockMatrixEvent = null;

// Dynamic imports to prevent server-side bundling
let matrixSdk: typeof import('matrix-js-sdk') | null = null;

async function loadMatrixSdk() {
  if (isServer) {
    return null;
  }

  if (!matrixSdk) {
    try {
      matrixSdk = await import('matrix-js-sdk');
    } catch (error) {
      console.error('Failed to load matrix-js-sdk:', error);
      return null;
    }
  }

  return matrixSdk;
}

// Client-side only wrapper functions
export async function createClientSafe(config: any) {
  if (isServer) {
    return null;
  }

  const sdk = await loadMatrixSdk();
  if (!sdk) {
    return null;
  }

  return sdk.createClient(config);
}

// Export types conditionally
export type MatrixClient = typeof isServer extends true 
  ? MockMatrixClient 
  : import('matrix-js-sdk').MatrixClient;

export type Room = typeof isServer extends true 
  ? MockRoom 
  : import('matrix-js-sdk').Room;

export type MatrixEvent = typeof isServer extends true 
  ? MockMatrixEvent 
  : import('matrix-js-sdk').MatrixEvent;

// Re-export common types and enums for server-side compatibility
export const ClientEvent = isServer ? {} : undefined;
export const SyncState = isServer ? {} : undefined;
export const EventType = isServer ? {} : undefined;
export const RelationType = isServer ? {} : undefined;
export const MsgType = isServer ? {} : undefined;

// Client-side only helper to load SDK constants
export async function getMatrixConstants() {
  if (isServer) {
    return {
      ClientEvent: {},
      SyncState: {},
      EventType: {},
      RelationType: {},
      MsgType: {},
      NotificationCountType: {},
      RoomEvent: {},
      RoomStateEvent: {},
      RoomMemberEvent: {},
      UserEvent: {}
    };
  }

  const sdk = await loadMatrixSdk();
  if (!sdk) {
    return null;
  }

  return {
    ClientEvent: sdk.ClientEvent,
    SyncState: sdk.SyncState,
    EventType: sdk.EventType,
    RelationType: sdk.RelationType,
    MsgType: sdk.MsgType,
    NotificationCountType: sdk.NotificationCountType,
    RoomEvent: sdk.RoomEvent,
    RoomStateEvent: sdk.RoomStateEvent,
    RoomMemberEvent: sdk.RoomMemberEvent,
    UserEvent: sdk.UserEvent
  };
}

// Guards to check if we're in a client environment
export function isClientEnvironment(): boolean {
  return !isServer && typeof window !== 'undefined';
}

export function requireClientEnvironment(fnName: string): void {
  if (!isClientEnvironment()) {
    throw new Error(`${fnName} can only be called in client environment`);
  }
}