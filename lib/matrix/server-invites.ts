/**
 * Server-side invite management with file-based storage
 * 
 * This module provides server-side invite functionality that doesn't require
 * a Matrix client or authentication, making it suitable for use during the
 * login flow before authentication is completed.
 * 
 * Storage is file-based to ensure persistence and avoid database dependencies.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const INVITES_DATA_DIR = path.join(process.cwd(), 'data', 'invites');
const INVITES_FILE = path.join(INVITES_DATA_DIR, 'server-invites.json');

export interface ServerInvite {
  id: string;
  invitedUserId: string;
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  used: boolean;
  usedAt?: string;
  notes?: string;
}

interface InviteStorage {
  invites: ServerInvite[];
  lastUpdated: string;
}

/**
 * Ensure the data directory exists
 */
function ensureDataDir(): void {
  if (!fs.existsSync(INVITES_DATA_DIR)) {
    fs.mkdirSync(INVITES_DATA_DIR, { recursive: true });
  }
}

/**
 * Load invites from storage
 */
function loadInvites(): ServerInvite[] {
  try {
    ensureDataDir();
    
    if (!fs.existsSync(INVITES_FILE)) {
      return [];
    }
    
    const data = fs.readFileSync(INVITES_FILE, 'utf8');
    const storage: InviteStorage = JSON.parse(data);
    
    // Filter out expired invites
    const now = new Date().toISOString();
    return storage.invites.filter(invite => {
      return !invite.expiresAt || invite.expiresAt > now;
    });
  } catch (error) {
    console.error('[server-invites] Failed to load invites:', error);
    return [];
  }
}

/**
 * Save invites to storage
 */
function saveInvites(invites: ServerInvite[]): boolean {
  try {
    ensureDataDir();
    
    const storage: InviteStorage = {
      invites,
      lastUpdated: new Date().toISOString(),
    };
    
    fs.writeFileSync(INVITES_FILE, JSON.stringify(storage, null, 2));
    return true;
  } catch (error) {
    console.error('[server-invites] Failed to save invites:', error);
    return false;
  }
}

/**
 * Check if a user has a valid invite
 */
export function serverCheckHasValidInvite(userId: string): boolean {
  console.log(`[server-invites] Checking invite for ${userId}`);
  
  const invites = loadInvites();
  const now = new Date().toISOString();
  
  const validInvite = invites.find(invite => 
    invite.invitedUserId === userId &&
    !invite.used &&
    (!invite.expiresAt || invite.expiresAt > now)
  );
  
  const hasValidInvite = !!validInvite;
  console.log(`[server-invites] User ${userId} has valid invite: ${hasValidInvite}`);
  
  return hasValidInvite;
}

/**
 * Mark an invite as used
 */
export function serverMarkInviteUsed(userId: string): boolean {
  console.log(`[server-invites] Marking invite used for ${userId}`);
  
  const invites = loadInvites();
  const now = new Date().toISOString();
  
  // Find the first valid invite for this user
  const inviteIndex = invites.findIndex(invite => 
    invite.invitedUserId === userId &&
    !invite.used &&
    (!invite.expiresAt || invite.expiresAt > now)
  );
  
  if (inviteIndex === -1) {
    console.log(`[server-invites] No valid invite found for ${userId}`);
    return false;
  }
  
  // Mark as used
  invites[inviteIndex].used = true;
  invites[inviteIndex].usedAt = now;
  
  const saved = saveInvites(invites);
  if (saved) {
    console.log(`[server-invites] Successfully marked invite used for ${userId}`);
  }
  
  return saved;
}

/**
 * Create a new invite
 */
export function serverCreateInvite(invite: Omit<ServerInvite, 'id'>): ServerInvite | null {
  console.log(`[server-invites] Creating invite for ${invite.invitedUserId}`);
  
  const invites = loadInvites();
  
  // Check if user already has a valid invite
  const existingInvite = invites.find(existing => 
    existing.invitedUserId === invite.invitedUserId &&
    !existing.used &&
    (!existing.expiresAt || existing.expiresAt > new Date().toISOString())
  );
  
  if (existingInvite) {
    console.log(`[server-invites] User ${invite.invitedUserId} already has a valid invite`);
    return existingInvite;
  }
  
  // Create new invite
  const newInvite: ServerInvite = {
    ...invite,
    id: crypto.randomBytes(16).toString('hex'),
  };
  
  invites.push(newInvite);
  
  if (saveInvites(invites)) {
    console.log(`[server-invites] Successfully created invite for ${invite.invitedUserId}`);
    return newInvite;
  }
  
  return null;
}

/**
 * Revoke an invite by ID
 */
export function serverRevokeInvite(inviteId: string): boolean {
  console.log(`[server-invites] Revoking invite ${inviteId}`);
  
  const invites = loadInvites();
  const initialLength = invites.length;
  
  // Remove the invite
  const filteredInvites = invites.filter(invite => invite.id !== inviteId);
  
  if (filteredInvites.length === initialLength) {
    console.log(`[server-invites] Invite ${inviteId} not found`);
    return false;
  }
  
  const saved = saveInvites(filteredInvites);
  if (saved) {
    console.log(`[server-invites] Successfully revoked invite ${inviteId}`);
  }
  
  return saved;
}

/**
 * Validate an invite code and return the invite
 */
export function serverValidateInviteCode(inviteCode: string): { valid: boolean; invite?: ServerInvite } {
  console.log(`[server-invites] Validating invite code ${inviteCode}`);
  
  const invites = loadInvites();
  const now = new Date().toISOString();
  
  const invite = invites.find(inv => 
    inv.id === inviteCode &&
    !inv.used &&
    (!inv.expiresAt || inv.expiresAt > now)
  );
  
  const isValid = !!invite;
  console.log(`[server-invites] Invite code ${inviteCode} is valid: ${isValid}`);
  
  return { valid: isValid, invite };
}

/**
 * Get all invites (for admin interface)
 */
export function serverGetAllInvites(): ServerInvite[] {
  return loadInvites();
}

/**
 * Sync invites from Matrix (placeholder for future enhancement)
 */
export function syncInvitesFromMatrix(invites: ServerInvite[]): boolean {
  console.log(`[server-invites] Syncing ${invites.length} invites from Matrix`);
  
  // In the future, this could sync invites from Matrix account data
  // or integrate with Matrix's built-in invite system
  
  return saveInvites(invites);
}

/**
 * Clean up expired invites
 */
export function serverCleanupExpiredInvites(): { removed: number } {
  console.log('[server-invites] Cleaning up expired invites');
  
  const invites = loadInvites();
  const now = new Date().toISOString();
  const initialCount = invites.length;
  
  // Filter out expired invites
  const validInvites = invites.filter(invite => 
    !invite.expiresAt || invite.expiresAt > now
  );
  
  const removedCount = initialCount - validInvites.length;
  
  if (removedCount > 0) {
    saveInvites(validInvites);
    console.log(`[server-invites] Removed ${removedCount} expired invites`);
  }
  
  return { removed: removedCount };
}