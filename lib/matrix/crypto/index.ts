/**
 * Matrix Crypto Module
 *
 * Exports for end-to-end encryption functionality.
 *
 * @security Review SECURITY-AUDIT-REPORT.md for known issues and recommendations.
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

export {
  // Recovery key functions
  generateRecoveryKey,
  createRecoveryKeyFromData,
  validateRecoveryKey,
  isValidRecoveryKeyFormat,
  formatRecoveryKey,
  unformatRecoveryKey,
  deriveRecoveryKeyFromPassphrase,
  encodeBase58,
  decodeBase58,
  // Recovery key types
  type RecoveryKeyInfo,
} from "./recovery-key";

export {
  // Cross-signing functions
  getCrossSigningStatus,
  isCrossSigningReady,
  bootstrapCrossSigning,
  signDevice,
  isDeviceSigned,
  verifyUser,
  isUserVerified,
  enableAutoDeviceVerification,
  resetCrossSigning,
  // Cross-signing types
  type CrossSigningKeyType,
  type CrossSigningStatus,
  type CrossSigningBootstrapOptions,
  type CrossSigningBootstrapResult,
} from "./cross-signing";

export {
  // Secret storage functions
  getSecretStorageStatus,
  isSecretStorageReady,
  setupSecretStorage,
  resetSecretStorage,
  accessSecretStorage,
  storeSecret,
  getSecret,
  shareSecretsWithDevice,
  getDevicesWithSecretAccess,
  // Secret storage types
  type SecretStorageStatus,
  type SecretStorageSetupOptions,
  type SecretStorageSetupResult,
  type SecretAccessOptions,
} from "./secrets";
