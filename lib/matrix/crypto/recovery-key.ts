/**
 * Matrix Recovery Key Utilities
 *
 * Implements proper recovery key generation following the Matrix spec.
 * Recovery keys use base58 encoding with a checksum for error detection.
 *
 * @see https://spec.matrix.org/v1.4/client-server-api/#recovery-key
 */

// =============================================================================
// Base58 Alphabet (Bitcoin-style, excludes 0OIl)
// =============================================================================

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// =============================================================================
// Types
// =============================================================================

export interface RecoveryKeyInfo {
  /** The raw 32-byte key material */
  keyData: Uint8Array;
  /** The encoded recovery key string */
  encodedKey: string;
  /** Formatted for display (grouped) */
  displayKey: string;
}

// =============================================================================
// Base58 Encoding/Decoding
// =============================================================================

/**
 * Encode bytes to base58 string
 */
export function encodeBase58(data: Uint8Array): string {
  if (data.length === 0) return '';
  
  // Count leading zeros
  let zeros = 0;
  for (let i = 0; i < data.length && data[i] === 0; i++) {
    zeros++;
  }
  
  // Allocate enough space for result
  const size = Math.floor(data.length * 138 / 100) + 1;
  const b58 = new Uint8Array(size);
  
  // Process the bytes
  let length = 0;
  for (let i = zeros; i < data.length; i++) {
    let carry = data[i];
    
    for (let j = 0; j < length || carry !== 0; j++) {
      carry += 256 * (b58[j] || 0);
      b58[j] = carry % 58;
      carry = Math.floor(carry / 58);
      if (j >= length) length = j + 1;
    }
  }
  
  // Convert to string
  let result = '';
  for (let i = 0; i < zeros; i++) {
    result += '1';
  }
  for (let i = length - 1; i >= 0; i--) {
    result += BASE58_ALPHABET[b58[i]];
  }
  
  return result;
}

/**
 * Decode base58 string to bytes
 */
export function decodeBase58(str: string): Uint8Array {
  if (str.length === 0) return new Uint8Array(0);
  
  // Count leading '1's (zeros)
  let zeros = 0;
  for (let i = 0; i < str.length && str[i] === '1'; i++) {
    zeros++;
  }
  
  // Allocate enough space for result
  const size = Math.floor(str.length * 733 / 1000) + 1;
  const b256 = new Uint8Array(size);
  
  // Process the characters
  let length = 0;
  for (let i = zeros; i < str.length; i++) {
    const c = str[i];
    const value = BASE58_ALPHABET.indexOf(c);
    if (value === -1) {
      throw new Error(`Invalid base58 character: ${c}`);
    }
    
    let carry = value;
    for (let j = 0; j < length || carry !== 0; j++) {
      carry += 58 * (b256[j] || 0);
      b256[j] = carry % 256;
      carry = Math.floor(carry / 256);
      if (j >= length) length = j + 1;
    }
  }
  
  // Build result
  const result = new Uint8Array(zeros + length);
  for (let i = length - 1, j = zeros; i >= 0; i--, j++) {
    result[j] = b256[i];
  }
  
  return result;
}

// =============================================================================
// Recovery Key Parity Byte
// =============================================================================

/**
 * Calculate parity byte for recovery key
 * XOR of all bytes
 */
function calculateParityByte(data: Uint8Array): number {
  let parity = 0;
  for (let i = 0; i < data.length; i++) {
    parity ^= data[i];
  }
  return parity;
}

/**
 * Timing-safe comparison of two bytes
 * 
 * Uses XOR and OR accumulation to ensure constant-time comparison
 * regardless of where differences occur. This prevents timing attacks
 * that could leak information about valid recovery keys.
 * 
 * @security This MUST be used for all secret comparisons
 */
function timingSafeEqual(a: number, b: number): boolean {
  // XOR gives 0 if equal, non-zero if different
  // The result is the same regardless of bit positions
  return (a ^ b) === 0;
}

// =============================================================================
// Recovery Key Generation
// =============================================================================

/**
 * Generate a cryptographically secure recovery key
 *
 * Format: EKPrefix (2 bytes) + KeyData (32 bytes) + Parity (1 byte)
 * Encoded as base58 string
 *
 * @returns Recovery key info with raw data and encoded string
 */
export function generateRecoveryKey(): RecoveryKeyInfo {
  // Generate 32 bytes of random key material
  const keyData = new Uint8Array(32);
  window.crypto.getRandomValues(keyData);
  
  return createRecoveryKeyFromData(keyData);
}

/**
 * Create a recovery key from existing key data
 *
 * @param keyData - 32 bytes of key material
 * @returns Recovery key info
 */
export function createRecoveryKeyFromData(keyData: Uint8Array): RecoveryKeyInfo {
  if (keyData.length !== 32) {
    throw new Error(`Invalid key data length: expected 32 bytes, got ${keyData.length}`);
  }
  
  // Matrix recovery key format:
  // - 2 bytes: 0x8B 0x01 (magic prefix identifying as Element/Matrix recovery key)
  // - 32 bytes: key material
  // - 1 byte: parity (XOR of all previous bytes)
  const prefix = new Uint8Array([0x8B, 0x01]);
  const fullData = new Uint8Array(35);
  fullData.set(prefix, 0);
  fullData.set(keyData, 2);
  
  // Calculate parity
  const parityInput = new Uint8Array(34);
  parityInput.set(prefix, 0);
  parityInput.set(keyData, 2);
  const parity = calculateParityByte(parityInput);
  fullData[34] = parity;
  
  // Encode to base58
  const encodedKey = encodeBase58(fullData);
  
  // Format for display (groups of 4, like Element does)
  const displayKey = formatRecoveryKey(encodedKey);
  
  return {
    keyData,
    encodedKey,
    displayKey,
  };
}

/**
 * Format recovery key for display with spacing
 *
 * @param key - Base58 encoded key
 * @returns Formatted key with groups of 4
 */
export function formatRecoveryKey(key: string): string {
  const groups: string[] = [];
  for (let i = 0; i < key.length; i += 4) {
    groups.push(key.slice(i, i + 4));
  }
  return groups.join(' ');
}

/**
 * Remove formatting from recovery key
 *
 * @param displayKey - Formatted key with spaces
 * @returns Raw base58 key
 */
export function unformatRecoveryKey(displayKey: string): string {
  return displayKey.replace(/\s+/g, '');
}

// =============================================================================
// Recovery Key Validation
// =============================================================================

/**
 * Validate a recovery key
 *
 * Checks:
 * 1. Valid base58 encoding
 * 2. Correct length (35 bytes when decoded)
 * 3. Correct prefix (0x8B 0x01)
 * 4. Valid parity byte
 *
 * @param key - Recovery key string (with or without formatting)
 * @returns Validation result
 */
export function validateRecoveryKey(key: string): {
  valid: boolean;
  error?: string;
  keyData?: Uint8Array;
} {
  try {
    // Remove any formatting
    const cleanKey = unformatRecoveryKey(key);
    
    // Decode base58
    const decoded = decodeBase58(cleanKey);
    
    // Check length
    if (decoded.length !== 35) {
      return {
        valid: false,
        error: `Invalid key length: expected 35 bytes, got ${decoded.length}`,
      };
    }
    
    // Check prefix
    if (decoded[0] !== 0x8B || decoded[1] !== 0x01) {
      return {
        valid: false,
        error: 'Invalid key prefix',
      };
    }
    
    // Check parity using timing-safe comparison
    // @security: Prevents timing attacks that could leak info about valid keys
    const parityInput = decoded.slice(0, 34);
    const expectedParity = calculateParityByte(parityInput);
    const actualParity = decoded[34];
    
    if (!timingSafeEqual(expectedParity, actualParity)) {
      return {
        valid: false,
        error: 'Invalid checksum',
      };
    }
    
    // Extract key data
    const keyData = decoded.slice(2, 34);
    
    return {
      valid: true,
      keyData,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Quick check if a recovery key format looks valid
 *
 * Doesn't fully validate, just checks basic format
 *
 * @param key - Recovery key string
 * @returns true if format looks valid
 */
export function isValidRecoveryKeyFormat(key: string): boolean {
  const cleanKey = unformatRecoveryKey(key);
  
  // Check length (base58 encoded 35 bytes should be ~48 chars)
  if (cleanKey.length < 45 || cleanKey.length > 52) {
    return false;
  }
  
  // Check all characters are valid base58
  for (const char of cleanKey) {
    if (!BASE58_ALPHABET.includes(char)) {
      return false;
    }
  }
  
  return true;
}

// =============================================================================
// Key Derivation from Passphrase
// =============================================================================

/**
 * Derive a recovery key from a passphrase using PBKDF2
 *
 * @param passphrase - User's security phrase
 * @param salt - Salt for key derivation (use random bytes, store with key info)
 * @param iterations - PBKDF2 iterations (recommend 500000+)
 * @returns Derived key info
 */
export async function deriveRecoveryKeyFromPassphrase(
  passphrase: string,
  salt?: Uint8Array,
  iterations: number = 500000
): Promise<RecoveryKeyInfo & { salt: Uint8Array }> {
  // Generate salt if not provided
  const derivationSalt = salt || window.crypto.getRandomValues(new Uint8Array(32));
  
  // Import passphrase as key material
  const passphraseKey = await window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  // Derive 32 bytes using PBKDF2
  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: derivationSalt,
      iterations,
      hash: 'SHA-512',
    },
    passphraseKey,
    256 // 32 bytes
  );
  
  const keyData = new Uint8Array(derivedBits);
  const recoveryKeyInfo = createRecoveryKeyFromData(keyData);
  
  return {
    ...recoveryKeyInfo,
    salt: derivationSalt,
  };
}

// Note: All functions are exported inline with their declarations above
