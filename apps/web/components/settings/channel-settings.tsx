"use client";

/**
 * Channel Settings Component
 * 
 * Main channel settings component for editing channel properties.
 * Handles routing between different settings sections (overview, permissions, moderation).
 * Similar to ServerSettings but focused on individual channels/rooms.
 */

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2, AlertCircle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

// UI Components
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Matrix Services
import { getRoom, type MatrixRoom } from "@/apps/web/services/matrix-room";
import { getMembers, type Member } from "@/apps/web/services/matrix-member";
import { useMatrixClient } from "@/hooks/use-matrix-client";

// Settings Components
import { ChannelOverview } from "./channel-overview";
import { ChannelPermissions } from "./channel-permissions";
import { ChannelModeration } from "./channel-moderation";

// =============================================================================
// Types
// =============================================================================

export interface ChannelSettingsProps {
  /** The settings section to display */
  section?: "overview" | "permissions" | "moderation";
  /** Custom class names */
  className?: string;
}

export interface ChannelSettingsContextData {
  /** Current channel/room */
  channel: MatrixRoom | null;
  /** Current user's member info in this channel */
  currentMember: Member | null;
  /** All channel members */
  members: Member[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Refresh data */
  refreshData: () => Promise<void>;
}

// =============================================================================
// Constants
// =============================================================================

const POWER_LEVELS = {
  OWNER: 100,
  ADMIN: 75,
  MODERATOR: 50,
  MEMBER: 0,
} as const;

// =============================================================================
// Component
// =============================================================================

export function ChannelSettings({ 
  section = "overview", 
  className 
}: ChannelSettingsProps) {
  const params = useParams();
  const { client, isReady } = useMatrixClient();
  
  // State
  const [channel, setChannel] = useState<MatrixRoom | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const channelId = params?.channelId as string;
  const currentUserId = client?.getUserId() || "";
  
  // Calculate user permissions
  const userPowerLevel = currentMember?.powerLevel || 0;
  const isAdmin = userPowerLevel >= POWER_LEVELS.ADMIN;
  const isModerator = userPowerLevel >= POWER_LEVELS.MODERATOR;
  
  // Load channel data
  const loadData = async () => {
    if (!isReady || !client || !channelId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Load room and members in parallel
      const [roomData, membersData] = await Promise.all([
        getRoom(channelId),
        getMembers(channelId)
      ]);
      
      setChannel(roomData);
      setMembers(membersData);
      
      // Find current user's member info
      const userMember = membersData.find(m => m.userId === currentUserId);
      setCurrentMember(userMember || null);
      
    } catch (err) {
      console.error("Failed to load channel settings data:", err);
      setError(err instanceof Error ? err.message : "Failed to load channel data");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load data on mount and when dependencies change
  useEffect(() => {
    loadData();
  }, [isReady, client, channelId, currentUserId]);
  
  // Context data for child components
  const contextData: ChannelSettingsContextData = {
    channel,
    currentMember,
    members,
    isLoading,
    error,
    refreshData: loadData
  };
  
  // Permission check for current section
  const hasPermissionForSection = (sectionName: string): boolean => {
    switch (sectionName) {
      case "overview":
        return isModerator; // Moderator+ can edit basic channel info
      case "permissions":
      case "moderation":
        return isAdmin; // Admin+ for permission and moderation settings
      default:
        return isModerator;
    }
  };
  
  // Render loading state
  if (isLoading && !channel) {
    return (
      <div className={cn("flex items-center justify-center h-96", className)}>
        <div className="flex flex-col items-center gap-4 text-zinc-500">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading channel settings...</p>
        </div>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className={cn("p-6", className)}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // Render no channel state
  if (!channel) {
    return (
      <div className={cn("p-6", className)}>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Channel not found or you don't have access to it.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // Permission check
  if (!hasPermissionForSection(section)) {
    return (
      <div className={cn("p-6", className)}>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="p-3 rounded-full bg-zinc-100 dark:bg-zinc-800">
                <Lock className="h-6 w-6 text-zinc-500" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Access Denied</h3>
                <p className="text-sm text-zinc-500 max-w-md">
                  You don't have permission to access this channel settings section. 
                  Contact a channel or server administrator if you need access.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Render appropriate settings section
  const renderSection = () => {
    switch (section) {
      case "overview":
        return <ChannelOverview {...contextData} />;
      case "permissions":
        return <ChannelPermissions {...contextData} />;
      case "moderation":
        return <ChannelModeration {...contextData} />;
      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Coming Soon</CardTitle>
              <CardDescription>
                This settings section is not yet implemented.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-500">
                The <strong>{section}</strong> settings page is under development.
                Please check back later or contact support.
              </p>
            </CardContent>
          </Card>
        );
    }
  };
  
  return (
    <div className={cn("h-full bg-white dark:bg-[#313338]", className)}>
      {renderSection()}
    </div>
  );
}

export default ChannelSettings;