/**
 * Matrix SDK Single Entrypoint Module
 * 
 * This module provides a single entrypoint for all matrix-js-sdk imports
 * to prevent "Multiple matrix-js-sdk entrypoints detected" errors during builds.
 */

// Re-export everything from matrix-js-sdk through a single entrypoint
// This consolidates all imports to prevent webpack bundling conflicts

// Use dynamic import to prevent SSR issues
let matrixSdk: typeof import('matrix-js-sdk') | null = null;

const loadMatrixSdk = () => {
  if (typeof window === 'undefined') {
    // On server side, return null/empty objects to prevent import errors
    return null;
  }
  
  if (!matrixSdk) {
    matrixSdk = require('matrix-js-sdk');
  }
  return matrixSdk;
};

// Load immediately on client side
if (typeof window !== 'undefined') {
  loadMatrixSdk();
}

// Type re-exports for TypeScript
export type MatrixClient = import('matrix-js-sdk').MatrixClient;
export type MatrixEvent = import('matrix-js-sdk').MatrixEvent;
export type Room = import('matrix-js-sdk').Room;
export type RoomMember = import('matrix-js-sdk').RoomMember;
export type User = import('matrix-js-sdk').User;
export type Method = import('matrix-js-sdk/lib/http-api').Method;
export type IMyDevice = import('matrix-js-sdk/lib/client').IMyDevice;
export type ReceiptType = import('matrix-js-sdk').ReceiptType;
export type NotificationCountType = import('matrix-js-sdk').NotificationCountType;

// Value re-exports for client-side use
export const MatrixClient = typeof window !== 'undefined' ? require('matrix-js-sdk').MatrixClient : null;
export const createClient = typeof window !== 'undefined' ? require('matrix-js-sdk').createClient : (() => null);

// Enum re-exports
export const ClientEvent = typeof window !== 'undefined' ? require('matrix-js-sdk').ClientEvent : {};
export const SyncState = typeof window !== 'undefined' ? require('matrix-js-sdk').SyncState : {};
export const EventType = typeof window !== 'undefined' ? require('matrix-js-sdk').EventType : {};
export const RelationType = typeof window !== 'undefined' ? require('matrix-js-sdk').RelationType : {};
export const MsgType = typeof window !== 'undefined' ? require('matrix-js-sdk').MsgType : {};
export const NotificationCountType = typeof window !== 'undefined' ? require('matrix-js-sdk').NotificationCountType : {};
export const RoomEvent = typeof window !== 'undefined' ? require('matrix-js-sdk').RoomEvent : {};
export const RoomStateEvent = typeof window !== 'undefined' ? require('matrix-js-sdk').RoomStateEvent : {};
export const RoomMemberEvent = typeof window !== 'undefined' ? require('matrix-js-sdk').RoomMemberEvent : {};
export const UserEvent = typeof window !== 'undefined' ? require('matrix-js-sdk').UserEvent : {};

// Utility function to check if we're in a client environment
export function isClientEnvironment(): boolean {
  return typeof window !== 'undefined';
}

export function requireClientEnvironment(fnName: string): void {
  if (typeof window === 'undefined') {
    throw new Error(`${fnName} can only be called in client environment`);
  }
}

// For backward compatibility, also export the main SDK
export default typeof window !== 'undefined' ? require('matrix-js-sdk') : {};