/**
 * Matrix Crypto Store Configuration
 *
 * Provides configuration and utilities for the Rust crypto store.
 * Uses IndexedDB for persistent storage of E2EE keys and state.
 */

// =============================================================================
// Constants
// =============================================================================

/**
 * Prefix for the crypto database in IndexedDB
 * This keeps crypto data separate from other Matrix data
 */
export const CRYPTO_DB_PREFIX = "melo_matrix_crypto";

/**
 * Key used for storing the storage password in sessionStorage
 * This is used for encrypting the crypto store
 */
export const STORAGE_PASSWORD_KEY = "melo_crypto_storage_password";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for initializing the Rust crypto store
 */
export interface CryptoStoreOptions {
  /** Whether to use IndexedDB (default: true for browser) */
  useIndexedDB?: boolean;
  /** Custom database prefix (default: CRYPTO_DB_PREFIX) */
  databasePrefix?: string;
  /** Storage password for encrypting the store */
  storagePassword?: string;
}

/**
 * Crypto initialization state
 */
export type CryptoState =
  | { status: "uninitialized" }
  | { status: "initializing" }
  | { status: "ready"; isEncryptionSupported: boolean }
  | { status: "error"; error: Error };

// =============================================================================
// Utilities
// =============================================================================

/**
 * Check if IndexedDB is available in the current environment
 */
export function isIndexedDBAvailable(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return typeof window.indexedDB !== "undefined";
  } catch {
    return false;
  }
}

/**
 * Generate a random storage password for encrypting the crypto store
 * The password is stored in sessionStorage for the current session
 *
 * @returns The storage password
 */
export function getOrCreateStoragePassword(): string | undefined {
  if (typeof window === "undefined" || typeof sessionStorage === "undefined") {
    return undefined;
  }

  let password = sessionStorage.getItem(STORAGE_PASSWORD_KEY);

  if (!password) {
    // Generate a random password using crypto API
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    password = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join(
      ""
    );
    sessionStorage.setItem(STORAGE_PASSWORD_KEY, password);
  }

  return password;
}

/**
 * Get crypto store configuration with sensible defaults
 *
 * @param options - Optional overrides
 * @returns Configuration for initRustCrypto
 */
export function getCryptoStoreConfig(options?: CryptoStoreOptions): {
  useIndexedDB: boolean;
  cryptoDatabasePrefix: string;
  storagePassword?: string;
} {
  return {
    useIndexedDB: options?.useIndexedDB ?? isIndexedDBAvailable(),
    cryptoDatabasePrefix: options?.databasePrefix ?? CRYPTO_DB_PREFIX,
    // Note: storagePassword is optional - if not provided, the store is unencrypted
    // For now, we don't enforce encryption, but this can be enabled later
    storagePassword: options?.storagePassword,
  };
}

/**
 * Clear all crypto data from IndexedDB
 * Useful for logout or troubleshooting
 *
 * @param prefix - Database prefix (default: CRYPTO_DB_PREFIX)
 */
export async function clearCryptoStore(
  prefix: string = CRYPTO_DB_PREFIX
): Promise<void> {
  if (!isIndexedDBAvailable()) {
    return;
  }

  // Get all databases and delete ones matching our prefix
  const databases = await window.indexedDB.databases();
  const cryptoDbs = databases.filter(
    (db) => db.name && db.name.startsWith(prefix)
  );

  await Promise.all(
    cryptoDbs.map(
      (db) =>
        new Promise<void>((resolve, reject) => {
          if (!db.name) {
            resolve();
            return;
          }
          const request = window.indexedDB.deleteDatabase(db.name);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        })
    )
  );

  // Also clear storage password
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(STORAGE_PASSWORD_KEY);
  }
}
