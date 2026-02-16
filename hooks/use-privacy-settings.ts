/**
 * Privacy Settings Hook
 * 
 * React hooks for managing privacy settings and blocked users.
 * Provides loading states and optimistic updates.
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  PrivacySettings, 
  BlockedUser,
  getPrivacySettings,
  updatePrivacySetting,
  updatePrivacySettings,
  getBlockedUsers,
  blockUser,
  unblockUser,
  isUserBlocked
} from '@/lib/matrix/privacy';

// =============================================================================
// Privacy Settings Hook
// =============================================================================

export interface UsePrivacySettingsReturn {
  settings: PrivacySettings | null;
  isLoading: boolean;
  error: string | null;
  updateSetting: <K extends keyof PrivacySettings>(
    key: K, 
    value: PrivacySettings[K]
  ) => Promise<void>;
  updateAllSettings: (settings: PrivacySettings) => Promise<void>;
  refetch: () => Promise<void>;
}

export function usePrivacySettings(): UsePrivacySettingsReturn {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const privacySettings = await getPrivacySettings();
      setSettings(privacySettings);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load privacy settings';
      setError(message);
      console.error('Failed to fetch privacy settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load settings on mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = useCallback(async <K extends keyof PrivacySettings>(
    key: K, 
    value: PrivacySettings[K]
  ) => {
    if (!settings) return;

    // Optimistic update
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      await updatePrivacySetting(key, value);
      toast.success('Privacy setting updated');
    } catch (err) {
      // Revert optimistic update on error
      setSettings(settings);
      const message = err instanceof Error ? err.message : 'Failed to update setting';
      setError(message);
      toast.error(message);
      console.error(`Failed to update privacy setting ${key}:`, err);
    }
  }, [settings]);

  const updateAllSettings = useCallback(async (newSettings: PrivacySettings) => {
    const oldSettings = settings;
    
    // Optimistic update
    setSettings(newSettings);

    try {
      await updatePrivacySettings(newSettings);
      toast.success('Privacy settings updated');
    } catch (err) {
      // Revert optimistic update on error
      setSettings(oldSettings);
      const message = err instanceof Error ? err.message : 'Failed to update settings';
      setError(message);
      toast.error(message);
      console.error('Failed to update privacy settings:', err);
    }
  }, [settings]);

  return {
    settings,
    isLoading,
    error,
    updateSetting,
    updateAllSettings,
    refetch: fetchSettings,
  };
}

// =============================================================================
// Blocked Users Hook
// =============================================================================

export interface UseBlockedUsersReturn {
  blockedUsers: BlockedUser[];
  isLoading: boolean;
  error: string | null;
  blockUser: (userId: string, reason?: string, displayName?: string, avatarUrl?: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  isBlocked: (userId: string) => boolean;
  refetch: () => Promise<void>;
}

export function useBlockedUsers(): UseBlockedUsersReturn {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBlockedUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const users = await getBlockedUsers();
      setBlockedUsers(users);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load blocked users';
      setError(message);
      console.error('Failed to fetch blocked users:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load blocked users on mount
  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  const handleBlockUser = useCallback(async (
    userId: string, 
    reason?: string, 
    displayName?: string, 
    avatarUrl?: string
  ) => {
    try {
      await blockUser(userId, reason, displayName, avatarUrl);
      
      // Optimistically add to list
      const newBlockedUser: BlockedUser = {
        userId,
        displayName,
        avatarUrl,
        blockedAt: new Date().toISOString(),
        reason,
      };
      setBlockedUsers(prev => [...prev, newBlockedUser]);
      
      toast.success('User blocked');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to block user';
      setError(message);
      toast.error(message);
      console.error('Failed to block user:', err);
    }
  }, []);

  const handleUnblockUser = useCallback(async (userId: string) => {
    try {
      await unblockUser(userId);
      
      // Optimistically remove from list
      setBlockedUsers(prev => prev.filter(user => user.userId !== userId));
      
      toast.success('User unblocked');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unblock user';
      setError(message);
      toast.error(message);
      console.error('Failed to unblock user:', err);
    }
  }, []);

  const isBlocked = useCallback((userId: string) => {
    return blockedUsers.some(user => user.userId === userId);
  }, [blockedUsers]);

  return {
    blockedUsers,
    isLoading,
    error,
    blockUser: handleBlockUser,
    unblockUser: handleUnblockUser,
    isBlocked,
    refetch: fetchBlockedUsers,
  };
}

// =============================================================================
// Individual User Blocking Hook
// =============================================================================

export interface UseUserBlockingReturn {
  isBlocked: boolean;
  isLoading: boolean;
  error: string | null;
  toggleBlock: () => Promise<void>;
}

export function useUserBlocking(userId: string, displayName?: string, avatarUrl?: string): UseUserBlockingReturn {
  const [isBlocked, setIsBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is blocked on mount
  useEffect(() => {
    async function checkBlockedStatus() {
      try {
        setIsLoading(true);
        setError(null);
        const blocked = await isUserBlocked(userId);
        setIsBlocked(blocked);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to check block status';
        setError(message);
        console.error('Failed to check if user is blocked:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (userId) {
      checkBlockedStatus();
    }
  }, [userId]);

  const toggleBlock = useCallback(async () => {
    try {
      setError(null);
      
      if (isBlocked) {
        await unblockUser(userId);
        setIsBlocked(false);
        toast.success('User unblocked');
      } else {
        await blockUser(userId, undefined, displayName, avatarUrl);
        setIsBlocked(true);
        toast.success('User blocked');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to toggle block status';
      setError(message);
      toast.error(message);
      console.error('Failed to toggle user block:', err);
    }
  }, [userId, isBlocked, displayName, avatarUrl]);

  return {
    isBlocked,
    isLoading,
    error,
    toggleBlock,
  };
}