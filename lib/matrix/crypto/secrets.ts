/**
 * Matrix Secret Storage (4S) Implementation
 *
 * Provides secure secret storage for cross-signing keys, key backup keys,
 * and other sensitive cryptographic material. Compatible with Element's 4S.
 *
 * @security This module handles sensitive cryptographic operations.
 *           See SECURITY-AUDIT-REPORT.md for known issues and recommendations.
 */

import { getClient } from "../client";
import { DeviceVerification } from "@/lib/matrix/matrix-sdk-exports";
import {
  generateRecoveryKey,
  deriveRecoveryKeyFromPassphrase,
  validateRecoveryKey,
  type RecoveryKeyInfo,
} from "./recovery-key";

// Use secure logger that redacts sensitive data in production
const isProduction = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';

const logger = {
  error: (...args: unknown[]) => {
    if (!isProduction) {
      console.error('[SecretStorage]', ...args);
    } else {
      console.error('[SecretStorage] Error occurred (details redacted)');
    }
  },
  warn: (...args: unknown[]) => {
    if (!isProduction) {
      console.warn('[SecretStorage]', ...args);
    }
  },
  info: (...args: unknown[]) => {
    if (!isProduction) {
      console.info('[SecretStorage]', ...args);
    }
  },
  debug: (...args: unknown[]) => {
    if (!isProduction) {
      console.debug('[SecretStorage]', ...args);
    }
  },
};

// =============================================================================
// Types
// =============================================================================

/**
 * Secret storage status
 */
export interface SecretStorageStatus {
  /** Whether secret storage is set up */
  isSetUp: boolean;
  /** Whether we have access to the default key */
  hasDefaultKey: boolean;
  /** Whether the recovery key is cached */
  hasRecoveryKey: boolean;
  /** List of available secret storage key IDs */
  keyIds: string[];
  /** Error if secret storage is not working */
  error?: string;
}

/**
 * Secret storage setup options
 */
export interface SecretStorageSetupOptions {
  /** Security phrase for deriving the storage key */
  securityPhrase?: string;
  /** Existing recovery key to use */
  recoveryKey?: string;
  /** Whether to backup existing cross-signing keys */
  backupExistingKeys?: boolean;
}

/**
 * Secret storage setup result
 */
export interface SecretStorageSetupResult {
  /** Whether setup was successful */
  success: boolean;
  /** Generated recovery key (base58 format) */
  recoveryKey?: string;
  /** Error message if failed */
  error?: string;
  /** Whether secret storage was already set up */
  alreadySetup?: boolean;
}

/**
 * Secret access options
 */
export interface SecretAccessOptions {
  /** Security phrase for key derivation */
  securityPhrase?: string;
  /** Recovery key in base58 format */
  recoveryKey?: string;
}

// =============================================================================
// Secret Storage Status
// =============================================================================

/**
 * Get the current secret storage status
 *
 * @returns Promise resolving to the current secret storage status
 */
export async function getSecretStorageStatus(): Promise<SecretStorageStatus> {
  const client = getClient();
  
  if (!client) {
    return {
      isSetUp: false,
      hasDefaultKey: false,
      hasRecoveryKey: false,
      keyIds: [],
      error: "Matrix client not initialized"
    };
  }

  try {
    const crypto = client.getCrypto();
    if (!crypto) {
      return {
        isSetUp: false,
        hasDefaultKey: false,
        hasRecoveryKey: false,
        keyIds: [],
        error: "E2EE not enabled"
      };
    }

    // Use secretStorage property which has getDefaultKeyId()
    const secretStorageKeyId = await client.secretStorage.getDefaultKeyId();
    const hasDefaultKey = secretStorageKeyId !== null;
    
    // Get all secret storage keys
    const keyIds: string[] = [];
    if (secretStorageKeyId) {
      keyIds.push(secretStorageKeyId);
    }

    // Check if secret storage is ready via crypto API
    let hasRecoveryKey = false;
    if (hasDefaultKey && typeof crypto.isSecretStorageReady === 'function') {
      try {
        hasRecoveryKey = await crypto.isSecretStorageReady();
      } catch {
        // Method may not exist in all SDK versions
        hasRecoveryKey = false;
      }
    }

    return {
      isSetUp: hasDefaultKey,
      hasDefaultKey,
      hasRecoveryKey,
      keyIds,
    };
  } catch (error) {
    logger.error("Failed to get secret storage status:", error);
    return {
      isSetUp: false,
      hasDefaultKey: false,
      hasRecoveryKey: false,
      keyIds: [],
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Check if secret storage is ready for use
 *
 * @returns Promise resolving to true if secret storage is ready
 */
export async function isSecretStorageReady(): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  try {
    const crypto = client.getCrypto();
    if (crypto && typeof crypto.isSecretStorageReady === 'function') {
      return await crypto.isSecretStorageReady();
    }
    // Fallback: check if we have a default key
    const keyId = await client.secretStorage.getDefaultKeyId();
    return keyId !== null;
  } catch (error) {
    logger.error("Failed to check secret storage readiness:", error);
    return false;
  }
}

// =============================================================================
// Secret Storage Setup
// =============================================================================

/**
 * Set up secret storage with a security phrase or recovery key
 *
 * @param options - Setup options including security phrase or recovery key
 * @returns Promise resolving to the setup result
 */
export async function setupSecretStorage(
  options: SecretStorageSetupOptions = {}
): Promise<SecretStorageSetupResult> {
  const client = getClient();
  
  if (!client) {
    return {
      success: false,
      error: "Matrix client not initialized"
    };
  }

  try {
    const crypto = client.getCrypto();
    if (!crypto) {
      return {
        success: false,
        error: "E2EE not enabled - initialize crypto first"
      };
    }

    // Check if secret storage is already set up
    const status = await getSecretStorageStatus();
    if (status.isSetUp && !options.recoveryKey) {
      return {
        success: true,
        alreadySetup: true
      };
    }

    const { securityPhrase, recoveryKey, backupExistingKeys = true } = options;

    if (!securityPhrase && !recoveryKey) {
      return {
        success: false,
        error: "Either security phrase or recovery key is required"
      };
    }

    const userId = client.getUserId();
    if (!userId) {
      return {
        success: false,
        error: "User ID not available"
      };
    }

    let recoveryKeyInfo: RecoveryKeyInfo & { salt?: Uint8Array };
    
    // Generate or derive recovery key
    if (securityPhrase) {
      logger.info("Deriving recovery key from security phrase...");
      recoveryKeyInfo = await deriveRecoveryKeyFromPassphrase(
        securityPhrase,
        undefined,
        500000
      );
    } else if (recoveryKey) {
      logger.info("Validating provided recovery key...");
      const validation = validateRecoveryKey(recoveryKey);
      if (!validation.valid || !validation.keyData) {
        return {
          success: false,
          error: `Invalid recovery key: ${validation.error}`
        };
      }
      recoveryKeyInfo = {
        keyData: validation.keyData,
        encodedKey: recoveryKey,
        displayKey: recoveryKey,
      };
    } else {
      logger.info("Generating new recovery key...");
      recoveryKeyInfo = generateRecoveryKey();
    }

    try {
      // Use Matrix SDK's bootstrapSecretStorage if available (CryptoApi)
      if (typeof crypto.bootstrapSecretStorage === 'function') {
        logger.info("Using Matrix SDK's bootstrapSecretStorage...");
        
        await crypto.bootstrapSecretStorage({
          setupNewSecretStorage: true,
          createSecretStorageKey: async () => ({
            privateKey: recoveryKeyInfo.keyData,
            encodedPrivateKey: recoveryKeyInfo.encodedKey,
          }),
        });
      } else {
        // Fallback: Use secretStorage.addKey directly
        logger.warn("CryptoApi.bootstrapSecretStorage not available, using fallback");
        
        const keyResult = await client.secretStorage.addKey(
          "m.secret_storage.v1.aes-hmac-sha2",
          {
            key: recoveryKeyInfo.keyData,
            name: "HAOS Recovery Key",
            ...(securityPhrase && recoveryKeyInfo.salt ? {
              passphrase: {
                algorithm: "m.pbkdf2" as const,
                iterations: 500000,
                salt: Array.from(recoveryKeyInfo.salt).map(b => b.toString(16).padStart(2, '0')).join(''),
                bits: 256,
              }
            } : {}),
          }
        );
        
        // Set as default key
        await client.secretStorage.setDefaultKeyId(keyResult.keyId);
      }
    } catch (setupError) {
      logger.error("Secret storage setup failed:", setupError);
      return {
        success: false,
        error: setupError instanceof Error ? setupError.message : "Setup failed"
      };
    }

    logger.info("Secret storage setup completed successfully");
    
    return {
      success: true,
      recoveryKey: recoveryKeyInfo.displayKey,
    };

  } catch (error) {
    logger.error("Failed to setup secret storage:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Reset secret storage (for troubleshooting)
 *
 * @returns Promise resolving to true if reset was successful
 */
export async function resetSecretStorage(): Promise<boolean> {
  const client = getClient();
  
  if (!client) {
    return false;
  }

  try {
    // Clear the default key ID
    await client.secretStorage.setDefaultKeyId(null);
    logger.info("Secret storage reset completed");
    return true;
  } catch (error) {
    logger.error("Failed to reset secret storage:", error);
    return false;
  }
}

// =============================================================================
// Secret Access
// =============================================================================

/**
 * Access secret storage with security phrase or recovery key
 *
 * @param options - Access options including security phrase or recovery key
 * @returns Promise resolving to true if access was granted
 */
export async function accessSecretStorage(
  options: SecretAccessOptions
): Promise<boolean> {
  const client = getClient();
  
  if (!client) {
    return false;
  }

  try {
    const { securityPhrase, recoveryKey } = options;

    if (!securityPhrase && !recoveryKey) {
      return false;
    }

    const keyId = await client.secretStorage.getDefaultKeyId();
    if (!keyId) {
      logger.warn("No default secret storage key found");
      return false;
    }

    // Get key info for validation
    const keyTuple = await client.secretStorage.getKey(keyId);
    if (!keyTuple) {
      logger.warn("Secret storage key not found");
      return false;
    }
    
    const [, keyInfo] = keyTuple;

    if (recoveryKey) {
      // Validate and use recovery key
      const validation = validateRecoveryKey(recoveryKey);
      if (!validation.valid || !validation.keyData) {
        logger.warn("Invalid recovery key provided");
        return false;
      }
      
      // Check if the key matches
      const isValid = await client.secretStorage.checkKey(validation.keyData, keyInfo);
      if (!isValid) {
        logger.warn("Recovery key does not match stored key");
        return false;
      }
      
      logger.info("Recovery key validated successfully");
      return true;
    } else if (securityPhrase) {
      // Derive key from passphrase
      if (!keyInfo.passphrase) {
        logger.warn("Key was not created with a passphrase");
        return false;
      }
      
      const derivedKeyInfo = await deriveRecoveryKeyFromPassphrase(
        securityPhrase,
        // Convert hex salt back to Uint8Array
        new Uint8Array(
          keyInfo.passphrase.salt.match(/.{2}/g)?.map(b => parseInt(b, 16)) || []
        ),
        keyInfo.passphrase.iterations
      );
      
      // Check if derived key matches
      const isValid = await client.secretStorage.checkKey(derivedKeyInfo.keyData, keyInfo);
      if (!isValid) {
        logger.warn("Security phrase does not match stored key");
        return false;
      }
      
      logger.info("Security phrase validated successfully");
      return true;
    }

    return false;
  } catch (error) {
    logger.error("Failed to access secret storage:", error);
    return false;
  }
}

/**
 * Store a secret in secret storage
 *
 * @param secretName - Name of the secret (e.g., "m.cross_signing.master")
 * @param secret - Secret value to store
 * @returns Promise resolving to true if successful
 */
export async function storeSecret(
  secretName: string,
  secret: string
): Promise<boolean> {
  const client = getClient();
  
  if (!client) {
    return false;
  }

  try {
    const keyId = await client.secretStorage.getDefaultKeyId();
    if (!keyId) {
      logger.warn("No default secret storage key, cannot store secret");
      return false;
    }

    await client.secretStorage.store(secretName, secret, [keyId]);
    logger.debug(`Secret ${secretName} stored successfully`);
    return true;
  } catch (error) {
    logger.error(`Failed to store secret ${secretName}:`, error);
    return false;
  }
}

/**
 * Retrieve a secret from secret storage
 *
 * @param secretName - Name of the secret to retrieve
 * @returns Promise resolving to the secret value, or null if not found
 */
export async function getSecret(secretName: string): Promise<string | null> {
  const client = getClient();
  
  if (!client) {
    return null;
  }

  try {
    const secret = await client.secretStorage.get(secretName);
    return secret || null;
  } catch (error) {
    logger.error(`Failed to get secret ${secretName}:`, error);
    return null;
  }
}

// =============================================================================
// Cross-Device Sharing
// =============================================================================

/**
 * Share secrets with a new device
 * This happens automatically when secret storage is set up properly
 *
 * @param deviceId - Device ID to share secrets with
 * @returns Promise resolving to true if successful
 */
export async function shareSecretsWithDevice(deviceId: string): Promise<boolean> {
  const client = getClient();
  
  if (!client) {
    return false;
  }

  try {
    const crypto = client.getCrypto();
    if (!crypto) {
      return false;
    }

    const userId = client.getUserId();
    if (!userId) {
      return false;
    }

    // Get device info
    const devices = await crypto.getUserDeviceInfo([userId]);
    const userDevices = devices.get(userId);
    const device = userDevices?.get(deviceId);
    
    if (!device) {
      logger.warn(`Device ${deviceId} not found`);
      return false;
    }

    // Check if device is verified
    const isVerified = device.verified === DeviceVerification.Verified;
    
    if (isVerified) {
      // Request secret sharing with verified device
      if (typeof crypto.requestDeviceVerification === 'function') {
        await crypto.requestDeviceVerification(userId, deviceId);
      }
      return true;
    }

    logger.warn(`Device ${deviceId} is not verified, cannot share secrets`);
    return false;
  } catch (error) {
    logger.error(`Failed to share secrets with device ${deviceId}:`, error);
    return false;
  }
}

/**
 * Get devices that can access secret storage
 *
 * @returns Promise resolving to list of device IDs with secret access
 */
export async function getDevicesWithSecretAccess(): Promise<string[]> {
  const client = getClient();
  
  if (!client) {
    return [];
  }

  try {
    const crypto = client.getCrypto();
    if (!crypto) {
      return [];
    }

    const userId = client.getUserId();
    if (!userId) {
      return [];
    }

    const devices = await crypto.getUserDeviceInfo([userId]);
    const userDevices = devices.get(userId);
    if (!userDevices) {
      return [];
    }

    const verifiedDevices: string[] = [];
    userDevices.forEach((device, deviceId) => {
      if (device.verified === DeviceVerification.Verified) {
        verifiedDevices.push(deviceId);
      }
    });

    return verifiedDevices;
  } catch (error) {
    logger.error("Failed to get devices with secret access:", error);
    return [];
  }
}
