/**
 * Singleton Matrix Client
 *
 * Provides a global Matrix client instance for real-time sync with E2EE support.
 * Only one client can exist at a time - call destroyClient() before creating a new one.
 */

import { createClientSafe, type MatrixClient, isClientEnvironment, requireClientEnvironment } from "./client-wrapper";

import type { MatrixSession } from "./types/auth";
import {
  getCryptoStoreConfig,
  clearCryptoStore,
  type CryptoStoreOptions,
  type CryptoState,
} from "./crypto/store";

// =============================================================================
// Singleton Instance
// =============================================================================

let client: MatrixClient | null = null;
let cryptoState: CryptoState = { status: "uninitialized" };

// =============================================================================
// Public API
// =============================================================================

/**
 * Initialize a new Matrix client from a session.
 *
 * Creates the client, starts sync, and stores it as the singleton instance.
 * If a client already exists, it will be destroyed first.
 *
 * NOTE: This does NOT initialize crypto. Call initializeCrypto() after this.
 *
 * @param session - The Matrix session containing credentials
 * @returns The initialized MatrixClient
 * @throws Error if session is missing required fields
 */
export async function initializeClient(session: MatrixSession): Promise<MatrixClient | null> {
  requireClientEnvironment('initializeClient');

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

  // Create new client using safe wrapper
  // NOTE: deviceId is REQUIRED for E2EE to work properly
  const newClient = await createClientSafe({
    baseUrl: session.homeserverUrl,
    accessToken: session.accessToken,
    userId: session.userId,
    deviceId: session.deviceId,
  });

  if (!newClient) {
    throw new Error("Failed to create Matrix client");
  }

  client = newClient;

  // Reset crypto state for new client
  cryptoState = { status: "uninitialized" };

  return newClient;
}

/**
 * Initialize Rust crypto for end-to-end encryption.
 *
 * This MUST be called BEFORE startClient() for E2EE to work correctly.
 * Initializes the crypto store and prepares the client for encrypted messaging.
 *
 * @param options - Optional crypto store configuration
 * @returns Promise that resolves when crypto is ready
 * @throws Error if client is not initialized or crypto init fails
 */
export async function initializeCrypto(
  options?: CryptoStoreOptions
): Promise<void> {
  if (!client) {
    throw new Error(
      "Cannot initialize crypto: client not initialized. Call initializeClient() first."
    );
  }

  // Don't re-initialize if already done
  if (cryptoState.status === "ready") {
    console.log("[MatrixClient] Crypto already initialized");
    return;
  }

  // Don't initialize if already in progress
  if (cryptoState.status === "initializing") {
    console.log("[MatrixClient] Crypto initialization already in progress");
    return;
  }

  cryptoState = { status: "initializing" };

  try {
    console.log("[MatrixClient] Initializing Rust crypto...");

    const config = getCryptoStoreConfig(options);

    // Initialize Rust crypto with IndexedDB storage
    await client.initRustCrypto({
      useIndexedDB: config.useIndexedDB,
      cryptoDatabasePrefix: config.cryptoDatabasePrefix,
      storagePassword: config.storagePassword,
    });

    // Verify crypto is working
    const crypto = client.getCrypto();
    const isEncryptionSupported = crypto !== undefined;

    console.log(
      "[MatrixClient] Rust crypto initialized successfully. E2EE supported:",
      isEncryptionSupported
    );

    cryptoState = { status: "ready", isEncryptionSupported };
  } catch (error) {
    console.error("[MatrixClient] Failed to initialize Rust crypto:", error);
    cryptoState = {
      status: "error",
      error: error instanceof Error ? error : new Error(String(error)),
    };
    throw error;
  }
}

/**
 * Start the Matrix client sync.
 *
 * Call this AFTER initializeCrypto() has completed for E2EE support.
 *
 * @throws Error if client is not initialized
 */
export function startClientSync(): void {
  if (!client) {
    throw new Error(
      "Cannot start sync: client not initialized. Call initializeClient() first."
    );
  }

  // Warn if crypto wasn't initialized
  if (cryptoState.status !== "ready") {
    console.warn(
      "[MatrixClient] Starting sync without crypto. E2EE messages will not be decrypted."
    );
  }

  // Start syncing
  // Using void to handle the promise without awaiting (fire-and-forget)
  // The client will emit events as sync progresses
  void client.startClient({
    // Initial sync: fetch minimal data for faster startup
    initialSyncLimit: 10,
    // Include account data in sync
    includeArchivedRooms: false,
  });
}

/**
 * Full initialization sequence: create client, init crypto, start sync.
 *
 * This is a convenience method that handles the correct initialization order.
 *
 * @param session - The Matrix session containing credentials
 * @param cryptoOptions - Optional crypto store configuration
 * @returns The initialized MatrixClient
 * @throws Error if any step fails
 */
export async function initializeClientWithCrypto(
  session: MatrixSession,
  cryptoOptions?: CryptoStoreOptions
): Promise<MatrixClient | null> {
  // 1. Create the client
  const newClient = await initializeClient(session);

  if (!newClient) {
    return null;
  }

  // 2. Initialize crypto (must be before startClient)
  await initializeCrypto(cryptoOptions);

  // 3. Start syncing
  startClientSync();

  return newClient;
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
 * Get the current crypto initialization state.
 *
 * @returns The current CryptoState
 */
export function getCryptoState(): CryptoState {
  return cryptoState;
}

/**
 * Check if crypto is ready for use.
 *
 * @returns true if crypto is initialized and ready
 */
export function isCryptoReady(): boolean {
  return cryptoState.status === "ready";
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
 *
 * @param clearCrypto - If true, also clears the crypto store (default: false)
 */
export async function destroyClient(clearCrypto: boolean = false): Promise<void> {
  if (client === null) {
    return;
  }

  // Stop syncing
  client.stopClient();

  // Clear all event listeners to prevent memory leaks
  client.removeAllListeners();

  // Clear the singleton reference
  client = null;

  // Reset crypto state
  cryptoState = { status: "uninitialized" };

  // Optionally clear crypto store
  if (clearCrypto) {
    await clearCryptoStore();
  }
}

/**
 * Re-export MatrixClient type for consumers
 */
export type { MatrixClient } from "matrix-js-sdk";
export type { CryptoState } from "./crypto/store";
