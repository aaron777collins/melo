/**
 * Singleton Matrix Client
 *
 * Provides a global Matrix client instance for real-time sync.
 * Only one client can exist at a time - call destroyClient() before creating a new one.
 */

import { createClient, MatrixClient } from "matrix-js-sdk";

import type { MatrixSession } from "./types/auth";

// =============================================================================
// Singleton Instance
// =============================================================================

let client: MatrixClient | null = null;

// =============================================================================
// Public API
// =============================================================================

/**
 * Initialize a new Matrix client from a session.
 *
 * Creates the client, starts sync, and stores it as the singleton instance.
 * If a client already exists, it will be destroyed first.
 *
 * @param session - The Matrix session containing credentials
 * @returns The initialized MatrixClient
 * @throws Error if session is missing required fields
 */
export function initializeClient(session: MatrixSession): MatrixClient {
  // Validate session has required fields
  if (!session.homeserverUrl) {
    throw new Error("Session missing homeserverUrl");
  }
  if (!session.accessToken) {
    throw new Error("Session missing accessToken");
  }
  if (!session.userId) {
    throw new Error("Session missing userId");
  }

  // Destroy existing client if any
  if (client !== null) {
    destroyClient();
  }

  // Create new client
  client = createClient({
    baseUrl: session.homeserverUrl,
    accessToken: session.accessToken,
    userId: session.userId,
    deviceId: session.deviceId,
  });

  // Start syncing
  // Using void to handle the promise without awaiting (fire-and-forget)
  // The client will emit events as sync progresses
  void client.startClient({
    // Initial sync: fetch minimal data for faster startup
    initialSyncLimit: 10,
    // Include account data in sync
    includeArchivedRooms: false,
  });

  return client;
}

/**
 * Get the current Matrix client instance.
 *
 * @returns The current MatrixClient or null if not initialized
 */
export function getClient(): MatrixClient | null {
  return client;
}

/**
 * Check if a Matrix client is currently initialized.
 *
 * @returns true if a client exists, false otherwise
 */
export function hasClient(): boolean {
  return client !== null;
}

/**
 * Destroy the current Matrix client.
 *
 * Stops sync, clears the singleton, and performs cleanup.
 * Safe to call even if no client exists.
 */
export function destroyClient(): void {
  if (client === null) {
    return;
  }

  // Stop syncing
  client.stopClient();

  // Clear all event listeners to prevent memory leaks
  client.removeAllListeners();

  // Clear the singleton reference
  client = null;
}

/**
 * Re-export MatrixClient type for consumers
 */
export type { MatrixClient } from "matrix-js-sdk";
