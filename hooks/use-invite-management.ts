"use client";

import { useState, useEffect, useCallback } from "react";
import { InviteLink, MatrixInviteService } from "@/lib/matrix/invites";

export interface InviteAnalytics {
  totalInvites: number;
  activeInvites: number;
  expiredInvites: number;
  totalUses: number;
  mostUsedInvite?: InviteLink;
}

export interface InviteWithStatus extends InviteLink {
  isExpired: boolean;
  timeUntilExpiry?: number;
  expiryStatus: 'active' | 'expiring-soon' | 'expired';
}

export function useInviteManagement(
  roomId: string, 
  inviteService: MatrixInviteService | null
) {
  const [invites, setInvites] = useState<InviteWithStatus[]>([]);
  const [analytics, setAnalytics] = useState<InviteAnalytics>({
    totalInvites: 0,
    activeInvites: 0,
    expiredInvites: 0,
    totalUses: 0,
  });

  // Refresh invites and calculate status
  const refreshInvites = useCallback(() => {
    if (!inviteService) return;

    const rawInvites = inviteService.getInvites(roomId);
    const now = new Date();

    const invitesWithStatus: InviteWithStatus[] = rawInvites.map(invite => {
      const isExpired = invite.expiresAt ? invite.expiresAt < now : false;
      const timeUntilExpiry = invite.expiresAt ? invite.expiresAt.getTime() - now.getTime() : undefined;
      
      let expiryStatus: 'active' | 'expiring-soon' | 'expired' = 'active';
      if (isExpired) {
        expiryStatus = 'expired';
      } else if (timeUntilExpiry && timeUntilExpiry < 24 * 60 * 60 * 1000) { // Less than 24 hours
        expiryStatus = 'expiring-soon';
      }

      return {
        ...invite,
        isExpired,
        timeUntilExpiry,
        expiryStatus,
      };
    });

    setInvites(invitesWithStatus);

    // Calculate analytics
    const activeInvites = invitesWithStatus.filter(i => !i.isExpired);
    const expiredInvites = invitesWithStatus.filter(i => i.isExpired);
    const totalUses = invitesWithStatus.reduce((sum, invite) => sum + invite.currentUses, 0);
    const mostUsedInvite = invitesWithStatus.reduce((max, invite) => 
      !max || invite.currentUses > max.currentUses ? invite : max, 
      undefined as InviteWithStatus | undefined
    );

    setAnalytics({
      totalInvites: invitesWithStatus.length,
      activeInvites: activeInvites.length,
      expiredInvites: expiredInvites.length,
      totalUses,
      mostUsedInvite: mostUsedInvite && mostUsedInvite.currentUses > 0 ? mostUsedInvite : undefined,
    });
  }, [roomId, inviteService]);

  // Auto-cleanup expired invites
  const cleanupExpiredInvites = useCallback((): number => {
    if (!inviteService) return 0;

    const expiredInvites = invites.filter(invite => invite.isExpired);
    expiredInvites.forEach(invite => {
      inviteService.deleteInvite(roomId, invite.url);
    });

    if (expiredInvites.length > 0) {
      refreshInvites();
      return expiredInvites.length;
    }
    return 0;
  }, [invites, roomId, inviteService, refreshInvites]);

  // Track invite usage (called when someone joins via an invite)
  const trackInviteUsage = useCallback((inviteUrl: string) => {
    if (!inviteService) return;

    const rawInvites = inviteService.getInvites(roomId);
    const updatedInvites = rawInvites.map(invite => {
      if (invite.url === inviteUrl) {
        return { ...invite, currentUses: invite.currentUses + 1 };
      }
      return invite;
    });

    // Save updated invites
    localStorage.setItem(`haos_invites_${roomId}`, JSON.stringify(updatedInvites));
    refreshInvites();
  }, [roomId, inviteService, refreshInvites]);

  // Revoke invite (with more explicit tracking)
  const revokeInvite = useCallback((inviteUrl: string) => {
    if (!inviteService) return false;

    try {
      inviteService.deleteInvite(roomId, inviteUrl);
      refreshInvites();
      return true;
    } catch (error) {
      console.error("Failed to revoke invite:", error);
      return false;
    }
  }, [roomId, inviteService, refreshInvites]);

  // Format time until expiry for display
  const formatTimeUntilExpiry = useCallback((timeMs: number): string => {
    const minutes = Math.floor(timeMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days === 1 ? '' : 's'}`;
    } else if (hours > 0) {
      return `${hours} hour${hours === 1 ? '' : 's'}`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    } else {
      return 'Less than a minute';
    }
  }, []);

  // Refresh invites on mount and set up interval
  useEffect(() => {
    refreshInvites();

    // Refresh every minute to update countdowns and check for expiries
    const interval = setInterval(refreshInvites, 60000);
    return () => clearInterval(interval);
  }, [refreshInvites]);

  // Auto-cleanup expired invites every hour
  useEffect(() => {
    const cleanupInterval = setInterval(cleanupExpiredInvites, 60 * 60 * 1000);
    return () => clearInterval(cleanupInterval);
  }, [cleanupExpiredInvites]);

  return {
    invites,
    analytics,
    refreshInvites,
    cleanupExpiredInvites,
    trackInviteUsage,
    revokeInvite,
    formatTimeUntilExpiry,
  };
}