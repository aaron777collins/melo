/**
 * Consolidated Matrix SDK Module
 * 
 * This module serves as the SINGLE ENTRY POINT for all matrix-js-sdk imports
 * to prevent webpack bundling conflicts and "Multiple matrix-js-sdk entrypoints" errors.
 * 
 * ALL matrix-js-sdk imports should go through this module instead of direct imports.
 */

// ============================================================================
// DEVELOPMENT MODE: Direct re-exports (for dev server)
// ============================================================================

if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // In development, just re-export everything directly
  module.exports = require('matrix-js-sdk');
} else {
  // ============================================================================
  // PRODUCTION MODE: Careful re-exports to prevent bundling conflicts
  // ============================================================================
  
  const isServer = typeof window === 'undefined';
  
  if (isServer) {
    // On server side, export empty objects to prevent import errors
    module.exports = {
      // Core classes (will be null on server)
      MatrixClient: null,
      MatrixEvent: null,
      Room: null,
      RoomMember: null,
      User: null,
      
      // Enums and constants (empty objects on server)
      ClientEvent: {},
      SyncState: {},
      EventType: {},
      RelationType: {},
      MsgType: {},
      NotificationCountType: {},
      RoomEvent: {},
      RoomStateEvent: {},
      RoomMemberEvent: {},
      UserEvent: {},
      Method: {},
      ReceiptType: {},
      
      // Functions
      createClient: () => null,
    };
  } else {
    // On client side, dynamically import and re-export
    let matrixSdk = null;
    
    // Immediately start loading
    const loadPromise = import('matrix-js-sdk').then(sdk => {
      matrixSdk = sdk;
      return sdk;
    });
    
    // Create proxy exports that wait for the SDK to load
    const createProxy = (key) => {
      return new Proxy(() => {}, {
        get(target, prop) {
          if (matrixSdk && matrixSdk[key]) {
            return matrixSdk[key][prop];
          }
          return undefined;
        },
        apply(target, thisArg, args) {
          if (matrixSdk && matrixSdk[key]) {
            return matrixSdk[key].apply(thisArg, args);
          }
          throw new Error(`Matrix SDK not loaded yet for ${key}`);
        }
      });
    };
    
    module.exports = {
      // Classes
      MatrixClient: createProxy('MatrixClient'),
      MatrixEvent: createProxy('MatrixEvent'),
      Room: createProxy('Room'),
      RoomMember: createProxy('RoomMember'),
      User: createProxy('User'),
      
      // Enums - these need special handling
      ClientEvent: createProxy('ClientEvent'),
      SyncState: createProxy('SyncState'),
      EventType: createProxy('EventType'),
      RelationType: createProxy('RelationType'),
      MsgType: createProxy('MsgType'),
      NotificationCountType: createProxy('NotificationCountType'),
      RoomEvent: createProxy('RoomEvent'),
      RoomStateEvent: createProxy('RoomStateEvent'),
      RoomMemberEvent: createProxy('RoomMemberEvent'),
      UserEvent: createProxy('UserEvent'),
      Method: createProxy('Method'),
      ReceiptType: createProxy('ReceiptType'),
      
      // Functions
      createClient: async (...args) => {
        const sdk = await loadPromise;
        return sdk.createClient(...args);
      },
      
      // Meta
      _isMatrixSDKProxy: true,
      _loadPromise: loadPromise,
    };
  }
}