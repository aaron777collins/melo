/**
 * Invite Usage Tracker
 * 
 * Utilities for tracking when invites are actually used to join spaces.
 * This should be called when someone successfully joins via an invite link.
 */

import { MatrixClient } from "matrix-js-sdk";
import { createInviteService } from "./invites";

export interface InviteUsageEvent {
  inviteUrl: string;
  roomId: string;
  userId: string;
  joinedAt: Date;
  userDisplayName?: string;
  userAvatarUrl?: string;
}

/**
 * Track when an invite is used to join a room
 * Call this function when someone successfully joins via an invite link
 */
export function trackInviteUsage(
  client: MatrixClient,
  event: InviteUsageEvent
): void {
  try {
    // Get the invite service
    const inviteService = createInviteService(client);
    
    // Get existing invites for this room
    const invites = inviteService.getInvites(event.roomId);
    
    // Find the matching invite and increment usage count
    const updatedInvites = invites.map(invite => {
      if (invite.url === event.inviteUrl) {
        return {
          ...invite,
          currentUses: invite.currentUses + 1
        };
      }
      return invite;
    });

    // Save the updated invites
    localStorage.setItem(`haos_invites_${event.roomId}`, JSON.stringify(updatedInvites));

    // Store detailed usage analytics if needed
    const usageHistory = getInviteUsageHistory(event.roomId);
    usageHistory.push(event);
    
    // Keep only the last 100 usage events per room to prevent storage bloat
    const trimmedHistory = usageHistory.slice(-100);
    localStorage.setItem(`haos_invite_usage_${event.roomId}`, JSON.stringify(trimmedHistory));

    console.log(`[InviteTracker] Tracked invite usage: ${event.userId} joined ${event.roomId} via ${event.inviteUrl}`);
  } catch (error) {
    console.error("[InviteTracker] Failed to track invite usage:", error);
  }
}

/**
 * Get detailed usage history for a room's invites
 */
export function getInviteUsageHistory(roomId: string): InviteUsageEvent[] {
  try {
    const stored = localStorage.getItem(`haos_invite_usage_${roomId}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Get usage statistics for a specific invite URL
 */
export function getInviteUsageStats(roomId: string, inviteUrl: string): {
  totalUses: number;
  recentUses: InviteUsageEvent[];
  firstUsed?: Date;
  lastUsed?: Date;
} {
  const history = getInviteUsageHistory(roomId);
  const inviteUsage = history.filter(event => event.inviteUrl === inviteUrl);
  
  const sortedByDate = inviteUsage.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
  
  return {
    totalUses: inviteUsage.length,
    recentUses: inviteUsage.slice(-10), // Last 10 uses
    firstUsed: sortedByDate[0]?.joinedAt,
    lastUsed: sortedByDate[sortedByDate.length - 1]?.joinedAt,
  };
}

/**
 * Clean up old usage history (call periodically to prevent storage bloat)
 */
export function cleanupOldUsageHistory(maxAge: number = 30 * 24 * 60 * 60 * 1000): void {
  const cutoffDate = new Date(Date.now() - maxAge);
  
  // Get all invite usage keys
  const usageKeys = Object.keys(localStorage).filter(key => key.startsWith('haos_invite_usage_'));
  
  usageKeys.forEach(key => {
    try {
      const history: InviteUsageEvent[] = JSON.parse(localStorage.getItem(key) || '[]');
      const filteredHistory = history
        .filter(event => new Date(event.joinedAt) > cutoffDate)
        .slice(-100); // Keep maximum 100 entries
      
      if (filteredHistory.length === 0) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(filteredHistory));
      }
    } catch (error) {
      console.error(`[InviteTracker] Failed to cleanup usage history for ${key}:`, error);
    }
  });
}

/**
 * Validate if an invite is still usable
 * Returns false if invite is expired or usage limit reached
 */
export function validateInviteUsage(
  client: MatrixClient,
  roomId: string,
  inviteUrl: string
): { valid: boolean; reason?: string } {
  try {
    const inviteService = createInviteService(client);
    const invites = inviteService.getInvites(roomId);
    const invite = invites.find(inv => inv.url === inviteUrl);
    
    if (!invite) {
      return { valid: false, reason: "Invite not found" };
    }
    
    // Check if expired
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return { valid: false, reason: "Invite has expired" };
    }
    
    // Check if usage limit reached
    if (invite.maxUses && invite.maxUses > 0 && invite.currentUses >= invite.maxUses) {
      return { valid: false, reason: "Invite usage limit reached" };
    }
    
    return { valid: true };
  } catch (error) {
    console.error("[InviteTracker] Failed to validate invite usage:", error);
    return { valid: false, reason: "Validation failed" };
  }
}