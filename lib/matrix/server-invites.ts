/**
 * Server-Side Invite Storage
 * 
 * Provides file-based storage for admin invites that can be checked during login
 * WITHOUT requiring a Matrix client. This solves the chicken-and-egg problem where
 * we need to check invites before the user is logged in.
 * 
 * The invites are stored in a JSON file on the server. This module syncs with
 * the Matrix account data when an admin is logged in, ensuring consistency.
 * 
 * @module lib/matrix/server-invites
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getAccessControlConfig } from './access-control';

// =============================================================================
// Types
// =============================================================================

/**
 * Server-side invite record
 */
export interface ServerInvite {
  /** Unique invite ID */
  id: string;
  /** Matrix user ID of the invited user (e.g., @alice:external.org) */
  invitedUserId: string;
  /** Matrix user ID of the admin who created the invite */
  createdBy: string;
  /** When the invite was created (ISO string) */
  createdAt: string;
  /** When the invite expires (ISO string, optional) */
  expiresAt?: string;
  /** Whether the invite has been used */
  used: boolean;
  /** When the invite was used (ISO string, optional) */
  usedAt?: string;
  /** Notes about the invite */
  notes?: string;
}

/**
 * File storage structure
 */
interface InviteStorage {
  invites: ServerInvite[];
  version: number;
  lastUpdated: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Data directory for server-side storage
 * Uses .data in project root (gitignored)
 */
const DATA_DIR = process.env.MELO_DATA_DIR || join(process.cwd(), '.data');
const INVITES_FILE = join(DATA_DIR, 'invites.json');

// =============================================================================
// Storage Functions
// =============================================================================

/**
 * Ensure data directory exists
 */
function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Read invites from file storage
 */
function readInvites(): ServerInvite[] {
  try {
    ensureDataDir();
    
    if (!existsSync(INVITES_FILE)) {
      return [];
    }
    
    const data = readFileSync(INVITES_FILE, 'utf-8');
    const storage: InviteStorage = JSON.parse(data);
    return storage.invites || [];
  } catch (error) {
    console.error('[ServerInvites] Failed to read invites file:', error);
    return [];
  }
}

/**
 * Write invites to file storage
 */
function writeInvites(invites: ServerInvite[]): boolean {
  try {
    ensureDataDir();
    
    const storage: InviteStorage = {
      invites,
      version: 1,
      lastUpdated: new Date().toISOString(),
    };
    
    writeFileSync(INVITES_FILE, JSON.stringify(storage, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('[ServerInvites] Failed to write invites file:', error);
    return false;
  }
}

/**
 * Check if an invite is valid (not expired, not used)
 */
function isInviteValid(invite: ServerInvite): boolean {
  // Already used
  if (invite.used) {
    return false;
  }
  
  // Check expiration
  if (invite.expiresAt) {
    const expirationDate = new Date(invite.expiresAt);
    if (expirationDate < new Date()) {
      return false;
    }
  }
  
  return true;
}

// =============================================================================
// Public API - Server-Side (No Matrix Client Required)
// =============================================================================

/**
 * Check if a user has a valid invite (server-side check)
 * 
 * This function can be called during login flow BEFORE authentication.
 * It reads from file storage, not Matrix account data.
 * 
 * @param userId - The Matrix user ID to check
 * @returns Whether the user has a valid invite
 */
export function serverCheckHasValidInvite(userId: string): boolean {
  // In public mode, invites aren't needed
  const config = getAccessControlConfig();
  if (config.publicMode) {
    return true;
  }

  const invites = readInvites();
  
  const validInvite = invites.find(
    inv => inv.invitedUserId.toLowerCase() === userId.toLowerCase() && isInviteValid(inv)
  );
  
  if (validInvite) {
    console.log(`[ServerInvites] Valid invite found for ${userId}: ${validInvite.id}`);
  }
  
  return !!validInvite;
}

/**
 * Mark an invite as used (server-side)
 * 
 * Called after a user successfully logs in with an invite.
 * 
 * @param userId - The Matrix user ID that used the invite
 * @returns Whether the operation succeeded
 */
export function serverMarkInviteUsed(userId: string): boolean {
  const invites = readInvites();
  
  const invite = invites.find(
    inv => inv.invitedUserId.toLowerCase() === userId.toLowerCase() && isInviteValid(inv)
  );
  
  if (!invite) {
    console.warn(`[ServerInvites] No valid invite found for ${userId} to mark as used`);
    return false;
  }
  
  invite.used = true;
  invite.usedAt = new Date().toISOString();
  
  const success = writeInvites(invites);
  if (success) {
    console.log(`[ServerInvites] Marked invite ${invite.id} for ${userId} as used`);
  }
  
  return success;
}

/**
 * Get all invites (server-side)
 * 
 * @param options - Filter options
 * @returns List of invites
 */
export function serverListInvites(options?: {
  includeUsed?: boolean;
  includeExpired?: boolean;
}): ServerInvite[] {
  let invites = readInvites();
  
  if (!options?.includeUsed) {
    invites = invites.filter(inv => !inv.used);
  }
  
  if (!options?.includeExpired) {
    invites = invites.filter(inv => {
      if (!inv.expiresAt) return true;
      return new Date(inv.expiresAt) > new Date();
    });
  }
  
  return invites;
}

/**
 * Create a new invite (server-side)
 * 
 * @param invite - The invite to create
 * @returns Whether the operation succeeded
 */
export function serverCreateInvite(invite: ServerInvite): boolean {
  const invites = readInvites();
  
  // Check for existing valid invite for this user
  const existing = invites.find(
    inv => inv.invitedUserId.toLowerCase() === invite.invitedUserId.toLowerCase() && isInviteValid(inv)
  );
  
  if (existing) {
    console.log(`[ServerInvites] Invite already exists for ${invite.invitedUserId}: ${existing.id}`);
    return true; // Consider it a success since the invite exists
  }
  
  invites.push(invite);
  
  const success = writeInvites(invites);
  if (success) {
    console.log(`[ServerInvites] Created invite ${invite.id} for ${invite.invitedUserId}`);
  }
  
  return success;
}

/**
 * Revoke an invite (server-side)
 * 
 * @param inviteId - The invite ID to revoke
 * @returns Whether the operation succeeded
 */
export function serverRevokeInvite(inviteId: string): boolean {
  const invites = readInvites();
  const index = invites.findIndex(inv => inv.id === inviteId);
  
  if (index === -1) {
    console.warn(`[ServerInvites] Invite not found: ${inviteId}`);
    return false;
  }
  
  invites.splice(index, 1);
  
  const success = writeInvites(invites);
  if (success) {
    console.log(`[ServerInvites] Revoked invite ${inviteId}`);
  }
  
  return success;
}

/**
 * Sync invites from Matrix account data to server storage
 * 
 * Called when an admin logs in to ensure server storage is up to date.
 * This syncs invites FROM Matrix TO the file storage.
 * 
 * @param matrixInvites - Invites from Matrix account data
 */
export function syncInvitesFromMatrix(matrixInvites: ServerInvite[]): void {
  // Merge with existing invites, preferring Matrix data
  const existing = readInvites();
  const existingMap = new Map(existing.map(inv => [inv.id, inv]));
  
  for (const invite of matrixInvites) {
    existingMap.set(invite.id, invite);
  }
  
  const merged = Array.from(existingMap.values());
  writeInvites(merged);
  
  console.log(`[ServerInvites] Synced ${matrixInvites.length} invites from Matrix, total: ${merged.length}`);
}

/**
 * Validate an invite code for a specific user ID
 * 
 * Called during registration to verify the invite code is valid and matches
 * the user ID being registered.
 * 
 * @param inviteCode - The invite code (id) to validate
 * @param userId - The Matrix user ID to validate against
 * @returns Validation result with status and reason
 */
export function serverValidateInviteCode(
  inviteCode: string,
  userId: string
): { valid: boolean; reason?: string; code?: string } {
  // In public mode, invites aren't needed
  const config = getAccessControlConfig();
  if (config.publicMode) {
    return { valid: true };
  }

  // Validate invite code format
  if (!inviteCode || typeof inviteCode !== 'string') {
    return { 
      valid: false, 
      reason: 'Invite code is required',
      code: 'INVITE_REQUIRED'
    };
  }

  // Basic format validation (inv_timestamp_random)
  if (!inviteCode.match(/^inv_\d+_[a-z0-9]+$/i)) {
    return { 
      valid: false, 
      reason: 'Invalid invite code format',
      code: 'INVALID_FORMAT'
    };
  }

  const invites = readInvites();
  
  // Find invite by code
  const invite = invites.find(inv => inv.id === inviteCode);
  
  if (!invite) {
    return { 
      valid: false, 
      reason: 'Invite code not found',
      code: 'NOT_FOUND'
    };
  }

  // Check if invite is already used
  if (invite.used) {
    return { 
      valid: false, 
      reason: 'This invite code has already been used',
      code: 'ALREADY_USED'
    };
  }

  // Check expiration
  if (invite.expiresAt) {
    const expirationDate = new Date(invite.expiresAt);
    if (expirationDate < new Date()) {
      return { 
        valid: false, 
        reason: 'This invite code has expired',
        code: 'EXPIRED'
      };
    }
  }

  // Check if invite matches the user ID
  if (invite.invitedUserId.toLowerCase() !== userId.toLowerCase()) {
    return { 
      valid: false, 
      reason: 'This invite code was issued for a different user',
      code: 'USER_MISMATCH'
    };
  }

  console.log(`[ServerInvites] Invite code ${inviteCode} validated for ${userId}`);
  return { valid: true };
}

/**
 * Get invites storage status
 */
export function getServerInvitesStatus(): {
  storageFile: string;
  exists: boolean;
  totalInvites: number;
  activeInvites: number;
  usedInvites: number;
  expiredInvites: number;
} {
  const invites = readInvites();
  const now = new Date();
  
  const active = invites.filter(inv => isInviteValid(inv));
  const used = invites.filter(inv => inv.used);
  const expired = invites.filter(inv => 
    inv.expiresAt && new Date(inv.expiresAt) < now && !inv.used
  );
  
  return {
    storageFile: INVITES_FILE,
    exists: existsSync(INVITES_FILE),
    totalInvites: invites.length,
    activeInvites: active.length,
    usedInvites: used.length,
    expiredInvites: expired.length,
  };
}
