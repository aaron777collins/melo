/**
 * Comprehensive Matrix SDK Re-export Module
 * 
 * This module serves as the SINGLE ENTRY POINT for all matrix-js-sdk imports
 * to prevent webpack bundling conflicts and "Multiple matrix-js-sdk entrypoints" errors.
 * 
 * ALL matrix-js-sdk imports should go through this module instead of direct imports.
 */

// During SSG/SSR, return mock implementations to prevent matrix-js-sdk imports
const isServer = typeof window === 'undefined';

// ============================================================================
// TYPE RE-EXPORTS (Server-safe)
// ============================================================================

// Core client and room types
export type MatrixClient = typeof isServer extends true ? null : import('matrix-js-sdk').MatrixClient;
export type Room = typeof isServer extends true ? null : import('matrix-js-sdk').Room;
export type MatrixEvent = typeof isServer extends true ? null : import('matrix-js-sdk').MatrixEvent;
export type RoomMember = typeof isServer extends true ? null : import('matrix-js-sdk').RoomMember;
export type User = typeof isServer extends true ? null : import('matrix-js-sdk').User;

// HTTP and API types
export type Method = typeof isServer extends true ? null : import('matrix-js-sdk/lib/http-api').Method;
export type IMyDevice = typeof isServer extends true ? null : import('matrix-js-sdk/lib/client').IMyDevice;

// Receipt and notification types  
export type ReceiptType = typeof isServer extends true ? null : import('matrix-js-sdk').ReceiptType;
export type NotificationCountType = typeof isServer extends true ? null : import('matrix-js-sdk').NotificationCountType;

// ============================================================================
// ENUM AND CONSTANT RE-EXPORTS (Client-side only)
// ============================================================================

let matrixEnums: any = {};

if (!isServer) {
  // Load all enums dynamically on client side
  import('matrix-js-sdk').then(sdk => {
    matrixEnums = {
      ClientEvent: sdk.ClientEvent,
      SyncState: sdk.SyncState,
      EventType: sdk.EventType,
      RelationType: sdk.RelationType,
      MsgType: sdk.MsgType,
      NotificationCountType: sdk.NotificationCountType,
      RoomEvent: sdk.RoomEvent,
      RoomStateEvent: sdk.RoomStateEvent,
      RoomMemberEvent: sdk.RoomMemberEvent,
      UserEvent: sdk.UserEvent,
    };
  }).catch(console.error);
}

// Safe enum exports with fallbacks
export const ClientEvent = isServer ? {} : (matrixEnums.ClientEvent || {});
export const SyncState = isServer ? {} : (matrixEnums.SyncState || {});
export const EventType = isServer ? {} : (matrixEnums.EventType || {});
export const RelationType = isServer ? {} : (matrixEnums.RelationType || {});
export const MsgType = isServer ? {} : (matrixEnums.MsgType || {});
export const NotificationCountType = isServer ? {} : (matrixEnums.NotificationCountType || {});
export const RoomEvent = isServer ? {} : (matrixEnums.RoomEvent || {});
export const RoomStateEvent = isServer ? {} : (matrixEnums.RoomStateEvent || {});
export const RoomMemberEvent = isServer ? {} : (matrixEnums.RoomMemberEvent || {});
export const UserEvent = isServer ? {} : (matrixEnums.UserEvent || {});

// ============================================================================
// DYNAMIC SDK LOADING
// ============================================================================

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

// ============================================================================
// FUNCTION RE-EXPORTS
// ============================================================================

export async function createClient(config: any) {
  if (isServer) {
    return null;
  }

  const sdk = await loadMatrixSdk();
  if (!sdk) {
    return null;
  }

  return sdk.createClient(config);
}

// Alias for backward compatibility
export const createClientSafe = createClient;

// ============================================================================
// SYNCHRONOUS EXPORTS (for immediate use after dynamic loading)
// ============================================================================

// These will be populated after the dynamic import completes
export let matrixJsSdk: typeof import('matrix-js-sdk') | null = null;

if (!isServer) {
  loadMatrixSdk().then(sdk => {
    if (sdk) {
      matrixJsSdk = sdk;
    }
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function isClientEnvironment(): boolean {
  return !isServer && typeof window !== 'undefined';
}

export function requireClientEnvironment(fnName: string): void {
  if (!isClientEnvironment()) {
    throw new Error(`${fnName} can only be called in client environment`);
  }
}

// ============================================================================
// MIGRATION HELPER
// ============================================================================

/**
 * Temporary re-exports for easier migration from direct matrix-js-sdk imports.
 * These maintain the same API but go through the consolidated module.
 */
export async function getMatrixSDK() {
  requireClientEnvironment('getMatrixSDK');
  return await loadMatrixSdk();
}