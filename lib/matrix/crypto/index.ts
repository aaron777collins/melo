/**
 * Matrix Crypto Module
 *
 * Exports for end-to-end encryption functionality.
 */

export {
  // Constants
  CRYPTO_DB_PREFIX,
  STORAGE_PASSWORD_KEY,
  // Functions
  isIndexedDBAvailable,
  getOrCreateStoragePassword,
  getCryptoStoreConfig,
  clearCryptoStore,
  // Types
  type CryptoStoreOptions,
  type CryptoState,
} from "./store";
