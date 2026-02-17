/**
 * Matrix Privacy Service
 * 
 * Handles privacy settings and user blocking using Matrix account data and ignored users list.
 * Provides utilities for managing DM privacy, online status, and blocked users.
 */

import {  MatrixClient  } from "@/lib/matrix/matrix-sdk-exports";
import { getClient } from "./client";

// =============================================================================
// Types
// =============================================================================

export interface PrivacySettings extends Record<string, any> {
  /** DM privacy level: who can send direct messages */
  dmPrivacy: 'everyone' | 'friends' | 'nobody';
  /** Whether to show read receipts to others */
  showReadReceipts: boolean;
  /** Whether to show online status to others */
  showOnlineStatus: boolean;
  /** Whether to share activity status (what you're doing) */
  shareActivityStatus: boolean;
  /** Friend request privacy level */
  friendRequestPrivacy: 'everyone' | 'friends-of-friends' | 'server-members' | 'nobody';
  /** Whether to show typing indicators */
  showTypingIndicator: boolean;
}

export interface BlockedUser {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  blockedAt: string; // ISO date string
  reason?: string;
}

// =============================================================================
// Constants
// =============================================================================

/** Account data event type for privacy settings */
const PRIVACY_SETTINGS_EVENT_TYPE = "dev.haos.privacy_settings";

/** Account data event type for blocked users metadata */
const BLOCKED_USERS_EVENT_TYPE = "dev.haos.blocked_users_metadata";

// =============================================================================
// Privacy Settings Management
// =============================================================================

/**
 * Get user's privacy settings from Matrix account data
 */
export async function getPrivacySettings(): Promise<PrivacySettings> {
  try {
    const client = await getClient();
    if (!client) {
      throw new Error("Matrix client not available");
    }
    const accountData = client.getAccountData(PRIVACY_SETTINGS_EVENT_TYPE as any);
    
    if (accountData?.getContent()) {
      return accountData.getContent() as PrivacySettings;
    }

    // Default privacy settings
    return {
      dmPrivacy: 'everyone',
      showReadReceipts: true,
      showOnlineStatus: true,
      shareActivityStatus: true,
      friendRequestPrivacy: 'everyone',
      showTypingIndicator: true,
    };
  } catch (error) {
    console.error("Failed to get privacy settings:", error);
    throw new Error("Failed to load privacy settings");
  }
}

/**
 * Update user's privacy settings in Matrix account data
 */
export async function updatePrivacySettings(settings: PrivacySettings): Promise<void> {
  try {
    const client = await getClient();
    if (!client) {
      throw new Error("Matrix client not available");
    }
    await client.setAccountData(PRIVACY_SETTINGS_EVENT_TYPE as any, settings as any);
  } catch (error) {
    console.error("Failed to update privacy settings:", error);
    throw new Error("Failed to save privacy settings");
  }
}

/**
 * Update a single privacy setting
 */
export async function updatePrivacySetting<K extends keyof PrivacySettings>(
  key: K,
  value: PrivacySettings[K]
): Promise<void> {
  try {
    const currentSettings = await getPrivacySettings();
    const updatedSettings = { ...currentSettings, [key]: value };
    await updatePrivacySettings(updatedSettings);
  } catch (error) {
    console.error(`Failed to update privacy setting ${key}:`, error);
    throw new Error(`Failed to update ${key} setting`);
  }
}

// =============================================================================
// User Blocking Management
// =============================================================================

/**
 * Get list of blocked users with metadata
 */
export async function getBlockedUsers(): Promise<BlockedUser[]> {
  try {
    const client = await getClient();
    if (!client) {
      throw new Error("Matrix client not available");
    }
    
    // Get blocked users from Matrix ignored users list
    const ignoredUsers = client.getIgnoredUsers();
    
    // Get metadata from account data
    const metadataEvent = client.getAccountData(BLOCKED_USERS_EVENT_TYPE as any);
    const metadata = metadataEvent?.getContent() || {};

    // Combine Matrix ignored users with metadata
    return ignoredUsers.map(userId => ({
      userId,
      displayName: metadata[userId]?.displayName,
      avatarUrl: metadata[userId]?.avatarUrl,
      blockedAt: metadata[userId]?.blockedAt || new Date().toISOString(),
      reason: metadata[userId]?.reason,
    }));
  } catch (error) {
    console.error("Failed to get blocked users:", error);
    throw new Error("Failed to load blocked users");
  }
}

/**
 * Block a user
 */
export async function blockUser(
  userId: string,
  reason?: string,
  displayName?: string,
  avatarUrl?: string
): Promise<void> {
  try {
    const client = await getClient();
    if (!client) {
      throw new Error("Matrix client not available");
    }
    
    // Add to Matrix ignored users list
    const currentIgnored = client.getIgnoredUsers();
    if (!currentIgnored.includes(userId)) {
      await client.setIgnoredUsers([...currentIgnored, userId]);
    }

    // Store metadata in account data
    const metadataEvent = client.getAccountData(BLOCKED_USERS_EVENT_TYPE as any);
    const metadata = metadataEvent?.getContent() || {};
    
    metadata[userId] = {
      displayName,
      avatarUrl,
      blockedAt: new Date().toISOString(),
      reason,
    };

    await client.setAccountData(BLOCKED_USERS_EVENT_TYPE as any, metadata as any);
  } catch (error) {
    console.error("Failed to block user:", error);
    throw new Error("Failed to block user");
  }
}

/**
 * Unblock a user
 */
export async function unblockUser(userId: string): Promise<void> {
  try {
    const client = await getClient();
    if (!client) {
      throw new Error("Matrix client not available");
    }
    
    // Remove from Matrix ignored users list
    const currentIgnored = client.getIgnoredUsers();
    const filteredIgnored = currentIgnored.filter(id => id !== userId);
    await client.setIgnoredUsers(filteredIgnored);

    // Remove metadata from account data
    const metadataEvent = client.getAccountData(BLOCKED_USERS_EVENT_TYPE as any);
    const metadata = metadataEvent?.getContent() || {};
    
    if (metadata[userId]) {
      delete metadata[userId];
      await client.setAccountData(BLOCKED_USERS_EVENT_TYPE as any, metadata as any);
    }
  } catch (error) {
    console.error("Failed to unblock user:", error);
    throw new Error("Failed to unblock user");
  }
}

/**
 * Check if a user is blocked
 */
export async function isUserBlocked(userId: string): Promise<boolean> {
  try {
    const client = await getClient();
    if (!client) {
      return false;
    }
    const ignoredUsers = client.getIgnoredUsers();
    return ignoredUsers.includes(userId);
  } catch (error) {
    console.error("Failed to check if user is blocked:", error);
    return false;
  }
}

// =============================================================================
// Privacy Enforcement Helpers
// =============================================================================

/**
 * Check if a user can send DMs to another user based on privacy settings
 */
export async function canSendDirectMessage(
  fromUserId: string,
  toUserId: string
): Promise<boolean> {
  try {
    // Check if sender is blocked by recipient
    const client = await getClient();
    if (!client) {
      return true; // Default to allow if client not available
    }
    const recipientIgnoredUsers = client.getIgnoredUsers();
    if (recipientIgnoredUsers.includes(fromUserId)) {
      return false;
    }

    // Get recipient's privacy settings
    const privacySettings = await getPrivacySettings();
    
    switch (privacySettings.dmPrivacy) {
      case 'nobody':
        return false;
      case 'friends':
        // TODO: Implement friend checking logic
        // For now, allow server members
        return true;
      case 'everyone':
      default:
        return true;
    }
  } catch (error) {
    console.error("Failed to check DM permissions:", error);
    // Default to allow if we can't determine
    return true;
  }
}

/**
 * Should show read receipts for this user
 */
export async function shouldShowReadReceipts(): Promise<boolean> {
  try {
    const settings = await getPrivacySettings();
    return settings.showReadReceipts;
  } catch (error) {
    console.error("Failed to check read receipt settings:", error);
    return true; // Default to showing
  }
}

/**
 * Should show online status for this user
 */
export async function shouldShowOnlineStatus(): Promise<boolean> {
  try {
    const settings = await getPrivacySettings();
    return settings.showOnlineStatus;
  } catch (error) {
    console.error("Failed to check online status settings:", error);
    return true; // Default to showing
  }
}

/**
 * Should show activity status for this user
 */
export async function shouldShowActivityStatus(): Promise<boolean> {
  try {
    const settings = await getPrivacySettings();
    return settings.shareActivityStatus;
  } catch (error) {
    console.error("Failed to check activity status settings:", error);
    return true; // Default to showing
  }
}