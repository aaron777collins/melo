/**
 * Admin Invite System for Private Mode
 * 
 * Allows administrators to invite external users to a private Melo instance.
 * In private mode (DEFAULT), only users from the configured homeserver can login.
 * This system allows admins to create invitations for specific external users.
 * 
 * Storage: Uses Matrix account data on the admin's account for persistence.
 * 
 * @module lib/matrix/admin-invites
 */

import { getClient } from "./client";
import { getAccessControlConfig } from "./access-control";

// =============================================================================
// Types
// =============================================================================

/**
 * An admin invite for an external user
 */
export interface AdminInvite {
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
 * Account data structure for storing invites
 */
interface AdminInvitesAccountData {
  invites: AdminInvite[];
  version: number;
}

/**
 * Result of invite operations
 */
export interface InviteResult {
  success: boolean;
  invite?: AdminInvite;
  invites?: AdminInvite[];
  error?: string;
}

// =============================================================================
// Constants
// =============================================================================

/** Account data event type for storing admin invites */
const INVITES_ACCOUNT_DATA_TYPE = "im.melo.admin_invites";

/** Default invite expiration (30 days in milliseconds) */
const DEFAULT_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a unique invite ID
 */
function generateInviteId(): string {
  return `inv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Get all invites from account data
 */
async function getInvitesFromAccountData(): Promise<AdminInvite[]> {
  const client = getClient();
  if (!client) {
    console.warn("[AdminInvites] No client available");
    return [];
  }

  try {
    const accountData = client.getAccountData(INVITES_ACCOUNT_DATA_TYPE as any);
    const content = accountData?.getContent() as AdminInvitesAccountData | undefined;
    return content?.invites || [];
  } catch (error) {
    console.error("[AdminInvites] Failed to get invites:", error);
    return [];
  }
}

/**
 * Save invites to account data
 */
async function saveInvitesToAccountData(invites: AdminInvite[]): Promise<boolean> {
  const client = getClient();
  if (!client) {
    console.error("[AdminInvites] No client available");
    return false;
  }

  try {
    const data: AdminInvitesAccountData = {
      invites,
      version: 1,
    };
    
    await client.setAccountData(INVITES_ACCOUNT_DATA_TYPE as any, data);
    return true;
  } catch (error) {
    console.error("[AdminInvites] Failed to save invites:", error);
    return false;
  }
}

/**
 * Check if an invite is valid (not expired, not used)
 */
function isInviteValid(invite: AdminInvite): boolean {
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
// Public API
// =============================================================================

/**
 * Create a new admin invite for an external user
 * 
 * @param userId - The Matrix user ID to invite (e.g., @alice:external.org)
 * @param options - Optional settings
 * @returns Result with the created invite
 */
export async function createAdminInvite(
  userId: string,
  options?: {
    expirationMs?: number;
    notes?: string;
  }
): Promise<InviteResult> {
  const client = getClient();
  if (!client) {
    return { success: false, error: "Matrix client not initialized" };
  }

  const currentUserId = client.getUserId();
  if (!currentUserId) {
    return { success: false, error: "Not logged in" };
  }

  // Validate user ID format
  if (!userId.match(/^@[^:]+:.+$/)) {
    return { success: false, error: "Invalid Matrix user ID format" };
  }

  // Get existing invites
  const invites = await getInvitesFromAccountData();

  // Check if invite already exists for this user
  const existingInvite = invites.find(
    inv => inv.invitedUserId.toLowerCase() === userId.toLowerCase() && isInviteValid(inv)
  );
  
  if (existingInvite) {
    return { 
      success: true, 
      invite: existingInvite,
      error: "Invite already exists for this user"
    };
  }

  // Create new invite
  const expirationMs = options?.expirationMs ?? DEFAULT_EXPIRATION_MS;
  const invite: AdminInvite = {
    id: generateInviteId(),
    invitedUserId: userId,
    createdBy: currentUserId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + expirationMs).toISOString(),
    used: false,
    notes: options?.notes,
  };

  // Save
  invites.push(invite);
  const saved = await saveInvitesToAccountData(invites);
  
  if (!saved) {
    return { success: false, error: "Failed to save invite" };
  }

  console.log(`[AdminInvites] Created invite for ${userId} by ${currentUserId}`);
  return { success: true, invite };
}

/**
 * List all admin invites
 * 
 * @param options - Filter options
 * @returns Result with list of invites
 */
export async function listAdminInvites(
  options?: {
    includeUsed?: boolean;
    includeExpired?: boolean;
  }
): Promise<InviteResult> {
  const invites = await getInvitesFromAccountData();
  
  let filtered = invites;
  
  if (!options?.includeUsed) {
    filtered = filtered.filter(inv => !inv.used);
  }
  
  if (!options?.includeExpired) {
    filtered = filtered.filter(inv => {
      if (!inv.expiresAt) return true;
      return new Date(inv.expiresAt) > new Date();
    });
  }

  return { success: true, invites: filtered };
}

/**
 * Revoke an admin invite
 * 
 * @param inviteId - The invite ID to revoke
 * @returns Result indicating success
 */
export async function revokeAdminInvite(inviteId: string): Promise<InviteResult> {
  const invites = await getInvitesFromAccountData();
  const index = invites.findIndex(inv => inv.id === inviteId);
  
  if (index === -1) {
    return { success: false, error: "Invite not found" };
  }
  
  invites.splice(index, 1);
  const saved = await saveInvitesToAccountData(invites);
  
  if (!saved) {
    return { success: false, error: "Failed to save changes" };
  }
  
  console.log(`[AdminInvites] Revoked invite ${inviteId}`);
  return { success: true };
}

/**
 * Check if a user has a valid invite
 * 
 * This is called during login validation for external users.
 * 
 * @param userId - The Matrix user ID to check
 * @returns Whether the user has a valid invite
 */
export async function checkUserHasValidInvite(userId: string): Promise<boolean> {
  // In public mode, invites aren't needed
  const config = getAccessControlConfig();
  if (config.publicMode) {
    return true;
  }

  const invites = await getInvitesFromAccountData();
  
  const validInvite = invites.find(
    inv => inv.invitedUserId.toLowerCase() === userId.toLowerCase() && isInviteValid(inv)
  );
  
  return !!validInvite;
}

/**
 * Mark an invite as used
 * 
 * Called after a user successfully logs in with an invite.
 * 
 * @param userId - The Matrix user ID that used the invite
 * @returns Whether the operation succeeded
 */
export async function markInviteUsed(userId: string): Promise<boolean> {
  const invites = await getInvitesFromAccountData();
  
  const invite = invites.find(
    inv => inv.invitedUserId.toLowerCase() === userId.toLowerCase() && isInviteValid(inv)
  );
  
  if (!invite) {
    return false;
  }
  
  invite.used = true;
  invite.usedAt = new Date().toISOString();
  
  const saved = await saveInvitesToAccountData(invites);
  if (saved) {
    console.log(`[AdminInvites] Marked invite for ${userId} as used`);
  }
  
  return saved;
}

/**
 * Get diagnostic info about admin invites system
 */
export async function getAdminInvitesStatus(): Promise<{
  isAvailable: boolean;
  totalInvites: number;
  activeInvites: number;
  usedInvites: number;
  expiredInvites: number;
}> {
  const client = getClient();
  const invites = await getInvitesFromAccountData();
  
  const now = new Date();
  const active = invites.filter(inv => isInviteValid(inv));
  const used = invites.filter(inv => inv.used);
  const expired = invites.filter(inv => 
    inv.expiresAt && new Date(inv.expiresAt) < now && !inv.used
  );
  
  return {
    isAvailable: !!client,
    totalInvites: invites.length,
    activeInvites: active.length,
    usedInvites: used.length,
    expiredInvites: expired.length,
  };
}
