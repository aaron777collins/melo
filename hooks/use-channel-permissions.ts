import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import permissionsService, { type HaosPermissions } from '@/lib/matrix/permissions';
import rolesService from '@/lib/matrix/roles';
import type { 
  ChannelPermissions,
  ChannelRolePermissionOverride,
  ChannelUserPermissionOverride,
  BulkPermissionOperation,
  PermissionCheckResult
} from '@/src/types/channel';

interface UseChannelPermissionsProps {
  channelId: string;
  userId?: string;
}

interface UseChannelPermissionsReturn {
  // Data
  channelPermissions: ChannelPermissions | null;
  userRoles: Array<{ roleId: string; roleName: string; powerLevel: number }>;
  effectivePermissions: HaosPermissions | null;
  
  // Loading states
  isLoading: boolean;
  isUpdating: boolean;
  
  // Actions
  setRolePermissionOverride: (
    roleId: string, 
    roleName: string,
    permissions: Partial<HaosPermissions>
  ) => Promise<void>;
  
  setUserPermissionOverride: (
    userId: string,
    displayName: string,
    permissions: Partial<HaosPermissions>
  ) => Promise<void>;
  
  removeRoleOverride: (roleId: string) => Promise<void>;
  removeUserOverride: (userId: string) => Promise<void>;
  
  checkPermission: (permission: keyof HaosPermissions) => Promise<PermissionCheckResult>;
  
  executeBulkOperation: (operation: BulkPermissionOperation) => Promise<{
    success: string[];
    failed: { id: string; error: string }[];
  }>;
  
  refreshPermissions: () => Promise<void>;
}

export function useChannelPermissions({ 
  channelId, 
  userId 
}: UseChannelPermissionsProps): UseChannelPermissionsReturn {
  const [channelPermissions, setChannelPermissions] = useState<ChannelPermissions | null>(null);
  const [userRoles, setUserRoles] = useState<Array<{ roleId: string; roleName: string; powerLevel: number }>>([]);
  const [effectivePermissions, setEffectivePermissions] = useState<HaosPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const loadChannelPermissions = useCallback(async () => {
    try {
      setIsLoading(true);
      const permissions = await permissionsService.getChannelPermissions(channelId);
      setChannelPermissions(permissions);
    } catch (error) {
      console.error('Failed to load channel permissions:', error);
      toast.error('Failed to load channel permissions');
    } finally {
      setIsLoading(false);
    }
  }, [channelId]);

  const loadUserRoles = useCallback(async () => {
    if (!userId || !channelId) return;
    
    try {
      const customRoles = await rolesService.getCustomRoles(channelId);
      const powerLevels = await rolesService.getRoomPowerLevels(channelId);
      const userPowerLevel = powerLevels?.users?.[userId] || powerLevels?.users_default || 0;
      
      // Find matching custom role based on power level
      const matchingRole = customRoles.find(role => role.powerLevel === userPowerLevel);
      
      const roles: Array<{ roleId: string; roleName: string; powerLevel: number }> = [];
      
      if (matchingRole) {
        roles.push({
          roleId: matchingRole.id,
          roleName: matchingRole.name,
          powerLevel: matchingRole.powerLevel
        });
      } else {
        // Create a default role based on power level
        const roleName = userPowerLevel >= 100 ? 'Admin' : 
                        userPowerLevel >= 50 ? 'Moderator' : 'Member';
        roles.push({
          roleId: `power_level_${userPowerLevel}`,
          roleName,
          powerLevel: userPowerLevel
        });
      }
      
      setUserRoles(roles);
    } catch (error) {
      console.error('Failed to load user roles:', error);
      setUserRoles([]);
    }
  }, [channelId, userId]);

  const loadEffectivePermissions = useCallback(async () => {
    if (!userId || !channelId) {
      setEffectivePermissions(null);
      return;
    }

    try {
      const permissions = await permissionsService.getChannelUserPermissions(
        channelId,
        userId,
        userRoles
      );
      setEffectivePermissions(permissions);
    } catch (error) {
      console.error('Failed to load effective permissions:', error);
      setEffectivePermissions(null);
    }
  }, [channelId, userId, userRoles]);

  // Load all data
  useEffect(() => {
    loadChannelPermissions();
  }, [loadChannelPermissions]);

  useEffect(() => {
    loadUserRoles();
  }, [loadUserRoles]);

  useEffect(() => {
    loadEffectivePermissions();
  }, [loadEffectivePermissions]);

  const setRolePermissionOverride = useCallback(async (
    roleId: string,
    roleName: string,
    permissions: Partial<HaosPermissions>
  ) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      setIsUpdating(true);
      await permissionsService.setChannelRolePermissionOverride(
        channelId,
        roleId,
        roleName,
        permissions,
        userId
      );
      await loadChannelPermissions();
      toast.success(`Updated permissions for role "${roleName}"`);
    } catch (error) {
      console.error('Failed to set role permission override:', error);
      toast.error('Failed to update role permissions');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [channelId, userId, loadChannelPermissions]);

  const setUserPermissionOverride = useCallback(async (
    targetUserId: string,
    displayName: string,
    permissions: Partial<HaosPermissions>
  ) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      setIsUpdating(true);
      await permissionsService.setChannelUserPermissionOverride(
        channelId,
        targetUserId,
        displayName,
        permissions,
        userId
      );
      await loadChannelPermissions();
      if (targetUserId === userId) {
        // Refresh effective permissions if updating current user
        await loadEffectivePermissions();
      }
      toast.success(`Updated permissions for "${displayName}"`);
    } catch (error) {
      console.error('Failed to set user permission override:', error);
      toast.error('Failed to update user permissions');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [channelId, userId, loadChannelPermissions, loadEffectivePermissions]);

  const removeRoleOverride = useCallback(async (roleId: string) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      setIsUpdating(true);
      await permissionsService.removeChannelRolePermissionOverride(
        channelId,
        roleId,
        userId
      );
      await loadChannelPermissions();
      toast.success('Removed role permission override');
    } catch (error) {
      console.error('Failed to remove role override:', error);
      toast.error('Failed to remove role override');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [channelId, userId, loadChannelPermissions]);

  const removeUserOverride = useCallback(async (targetUserId: string) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      setIsUpdating(true);
      await permissionsService.removeChannelUserPermissionOverride(
        channelId,
        targetUserId,
        userId
      );
      await loadChannelPermissions();
      if (targetUserId === userId) {
        // Refresh effective permissions if removing current user override
        await loadEffectivePermissions();
      }
      toast.success('Removed user permission override');
    } catch (error) {
      console.error('Failed to remove user override:', error);
      toast.error('Failed to remove user override');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [channelId, userId, loadChannelPermissions, loadEffectivePermissions]);

  const checkPermission = useCallback(async (permission: keyof HaosPermissions): Promise<PermissionCheckResult> => {
    if (!userId) {
      return {
        allowed: false,
        source: 'default',
        reasoning: 'User not authenticated',
        value: false
      };
    }

    return await permissionsService.hasChannelPermission(
      channelId,
      userId,
      permission,
      userRoles
    );
  }, [channelId, userId, userRoles]);

  const executeBulkOperation = useCallback(async (operation: BulkPermissionOperation) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      setIsUpdating(true);
      const result = await permissionsService.executeBulkPermissionOperation(
        channelId,
        operation,
        userId
      );
      
      await loadChannelPermissions();
      
      if (result.success.length > 0) {
        toast.success(`Updated permissions for ${result.success.length} target(s)`);
      }
      
      if (result.failed.length > 0) {
        toast.error(`${result.failed.length} operations failed`);
      }
      
      return result;
    } catch (error) {
      console.error('Failed to execute bulk operation:', error);
      toast.error('Failed to execute bulk operation');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [channelId, userId, loadChannelPermissions]);

  const refreshPermissions = useCallback(async () => {
    await Promise.all([
      loadChannelPermissions(),
      loadUserRoles(),
      loadEffectivePermissions()
    ]);
  }, [loadChannelPermissions, loadUserRoles, loadEffectivePermissions]);

  return {
    channelPermissions,
    userRoles,
    effectivePermissions,
    isLoading,
    isUpdating,
    setRolePermissionOverride,
    setUserPermissionOverride,
    removeRoleOverride,
    removeUserOverride,
    checkPermission,
    executeBulkOperation,
    refreshPermissions,
  };
}