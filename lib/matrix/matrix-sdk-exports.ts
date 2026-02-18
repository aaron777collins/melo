/**
 * Matrix SDK Single Entrypoint Module
 * 
 * This module provides a single entrypoint for all matrix-js-sdk imports
 * to prevent "Multiple matrix-js-sdk entrypoints detected" errors during builds.
 * 
 * IMPORTANT: Uses lazy initialization to avoid "Cannot access 'X' before initialization"
 * errors caused by webpack bundling and circular dependencies.
 */

// =============================================================================
// TYPE RE-EXPORTS (Always safe - types are compile-time only)
// =============================================================================

export type MatrixClient = import('matrix-js-sdk').MatrixClient;
export type MatrixEvent = import('matrix-js-sdk').MatrixEvent;
export type Room = import('matrix-js-sdk').Room;
export type RoomMember = import('matrix-js-sdk').RoomMember;
export type User = import('matrix-js-sdk').User;
export type Method = import('matrix-js-sdk/lib/http-api').Method;
export type IMyDevice = import('matrix-js-sdk/lib/client').IMyDevice;
export type ReceiptType = import('matrix-js-sdk').ReceiptType;
export type ICreateRoomOpts = import('matrix-js-sdk').ICreateRoomOpts;

// =============================================================================
// LAZY SDK LOADING (Critical fix for initialization order issues)
// =============================================================================

// SDK instance - lazily loaded ONLY when first accessed
let _sdk: typeof import('matrix-js-sdk') | null = null;
let _sdkLoadPromise: Promise<typeof import('matrix-js-sdk')> | null = null;

/**
 * Check if we're in a client (browser) environment
 */
export function isClientEnvironment(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Throw if called outside client environment
 */
export function requireClientEnvironment(fnName: string): void {
  if (!isClientEnvironment()) {
    throw new Error(`${fnName} can only be called in client environment`);
  }
}

/**
 * Lazily load the Matrix SDK (async version - preferred)
 */
export async function loadMatrixSdk(): Promise<typeof import('matrix-js-sdk') | null> {
  if (!isClientEnvironment()) {
    return null;
  }
  
  if (_sdk) {
    return _sdk;
  }
  
  if (_sdkLoadPromise) {
    return _sdkLoadPromise;
  }
  
  _sdkLoadPromise = import('matrix-js-sdk').then(sdk => {
    _sdk = sdk;
    return sdk;
  });
  
  return _sdkLoadPromise;
}

/**
 * Get the SDK synchronously (must be loaded first via loadMatrixSdk)
 * Returns null if not loaded or in server environment
 */
export function getMatrixSdk(): typeof import('matrix-js-sdk') | null {
  if (!isClientEnvironment()) {
    return null;
  }
  return _sdk;
}

/**
 * Get SDK synchronously, throwing if not available
 */
export function requireMatrixSdk(): typeof import('matrix-js-sdk') {
  const sdk = getMatrixSdk();
  if (!sdk) {
    throw new Error('Matrix SDK not loaded. Call loadMatrixSdk() first or ensure you are in client environment.');
  }
  return sdk;
}

// =============================================================================
// ENUM/CONSTANT GETTERS (Lazy access to avoid initialization issues)
// =============================================================================

// These return the actual enum values, falling back to safe defaults on server

export function getClientEvent() {
  return getMatrixSdk()?.ClientEvent ?? {};
}

export function getSyncState() {
  return getMatrixSdk()?.SyncState ?? {};
}

export function getEventType() {
  return getMatrixSdk()?.EventType ?? {};
}

export function getRelationType() {
  return getMatrixSdk()?.RelationType ?? {};
}

export function getMsgType() {
  return getMatrixSdk()?.MsgType ?? {};
}

export function getNotificationCountType() {
  return getMatrixSdk()?.NotificationCountType ?? {};
}

export function getRoomEvent() {
  return getMatrixSdk()?.RoomEvent ?? {};
}

export function getRoomStateEvent() {
  return getMatrixSdk()?.RoomStateEvent ?? {};
}

export function getRoomMemberEvent() {
  return getMatrixSdk()?.RoomMemberEvent ?? {};
}

export function getUserEvent() {
  return getMatrixSdk()?.UserEvent ?? {};
}

// =============================================================================
// PROXY EXPORTS (For backward compatibility with existing imports)
// These use Object.defineProperty with getters for lazy evaluation
// =============================================================================

// Create a proxy object for lazy enum access
const createLazyEnumProxy = (getter: () => any): any => {
  if (!isClientEnvironment()) {
    return {};
  }
  
  return new Proxy({}, {
    get(_target, prop) {
      const value = getter();
      return value?.[prop];
    },
    has(_target, prop) {
      const value = getter();
      return prop in (value ?? {});
    },
    ownKeys() {
      const value = getter();
      return value ? Reflect.ownKeys(value) : [];
    },
    getOwnPropertyDescriptor(_target, prop) {
      const value = getter();
      if (value && prop in value) {
        return { configurable: true, enumerable: true, value: value[prop] };
      }
      return undefined;
    }
  });
};

// Lazy enum proxies (safe for imports at module scope)
export const ClientEvent = createLazyEnumProxy(getClientEvent);
export const SyncState = createLazyEnumProxy(getSyncState);
export const EventType = createLazyEnumProxy(getEventType);
export const RelationType = createLazyEnumProxy(getRelationType);
export const MsgType = createLazyEnumProxy(getMsgType);
export const RoomEvent = createLazyEnumProxy(getRoomEvent);
export const RoomStateEvent = createLazyEnumProxy(getRoomStateEvent);
export const RoomMemberEvent = createLazyEnumProxy(getRoomMemberEvent);
export const UserEvent = createLazyEnumProxy(getUserEvent);

// NotificationCountType needs special handling since it's also a type
export const NotificationCountType = createLazyEnumProxy(getNotificationCountType);

// =============================================================================
// STATIC ENUMS (Safe for SSR - no SDK dependency)
// =============================================================================

// Visibility enum - works during SSG/SSR
export const Visibility = {
  Public: 'public',
  Private: 'private'
} as const;
export type Visibility = typeof Visibility[keyof typeof Visibility];

// Device verification enum - works during SSG/SSR
export enum DeviceVerification {
  Blocked = -1,
  Unverified = 0,
  Verified = 1
}

// Room creation presets - safe fallbacks
export const Preset = createLazyEnumProxy(() => 
  getMatrixSdk()?.Preset ?? {
    PrivateChat: 'private_chat',
    PublicChat: 'public_chat', 
    TrustedPrivateChat: 'trusted_private_chat'
  }
);

export const JoinRule = createLazyEnumProxy(() =>
  getMatrixSdk()?.JoinRule ?? {
    Public: 'public',
    Knock: 'knock',
    Invite: 'invite',
    Private: 'private',
    Restricted: 'restricted'
  }
);

export const GuestAccess = createLazyEnumProxy(() =>
  getMatrixSdk()?.GuestAccess ?? {
    CanJoin: 'can_join',
    Forbidden: 'forbidden'
  }
);

// =============================================================================
// CLASS/FUNCTION EXPORTS (Lazy loading)
// =============================================================================

// MatrixClient class (for instanceof checks)
export const MatrixClient = createLazyEnumProxy(() => getMatrixSdk()?.MatrixClient);

// MatrixEvent class (for instanceof checks)  
export const MatrixEvent = createLazyEnumProxy(() => getMatrixSdk()?.MatrixEvent);

// createClient function
export async function createClient(config: any) {
  const sdk = await loadMatrixSdk();
  if (!sdk) {
    return null;
  }
  return sdk.createClient(config);
}

// Alias for backward compatibility
export const createClientSafe = createClient;

// =============================================================================
// CONSTANTS HELPER
// =============================================================================

export const getMatrixConstants = async () => {
  // Ensure SDK is loaded before accessing constants
  const sdk = await loadMatrixSdk();
  if (!sdk) {
    return {
      LOCAL_NOTIFICATION_SETTINGS_PREFIX: 'im.vector.setting.push_rules',
      UNSTABLE_MSC2545_URLS: [],
      // Provide empty objects for client-side checks
      ClientEvent: {},
      SyncState: {},
    };
  }
  return {
    LOCAL_NOTIFICATION_SETTINGS_PREFIX: sdk.LOCAL_NOTIFICATION_SETTINGS_PREFIX || 'im.vector.setting.push_rules',
    UNSTABLE_MSC2545_URLS: (sdk as any).UNSTABLE_MSC2545_URLS || [],
    Visibility: sdk.Visibility,
    Preset: sdk.Preset,
    JoinRule: sdk.JoinRule,
    GuestAccess: sdk.GuestAccess,
    // Critical: Include ClientEvent and SyncState for the Matrix provider
    ClientEvent: sdk.ClientEvent,
    SyncState: sdk.SyncState,
  };
};

// =============================================================================
// SDK INITIALIZATION HOOK
// =============================================================================

/**
 * Initialize the SDK early in the app lifecycle.
 * Call this in your root layout or provider.
 */
export async function initializeMatrixSdk(): Promise<boolean> {
  if (!isClientEnvironment()) {
    return false;
  }
  
  try {
    await loadMatrixSdk();
    return true;
  } catch (error) {
    console.error('[MatrixSDK] Failed to initialize:', error);
    return false;
  }
}

// =============================================================================
// DEFAULT EXPORT (Lazy SDK)
// =============================================================================

export default {
  loadMatrixSdk,
  getMatrixSdk,
  requireMatrixSdk,
  isClientEnvironment,
  requireClientEnvironment,
  initializeMatrixSdk,
};
