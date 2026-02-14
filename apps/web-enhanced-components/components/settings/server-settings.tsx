"use client";

/**
 * Server Settings Page Component
 * 
 * Main layout wrapper for server settings pages. Handles routing and layout
 * for different settings sections (overview, roles, moderation, etc.)
 * Designed to work with the ServerSettingsSidebar navigation.
 */

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2, AlertCircle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

// UI Components
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Matrix Services
import { getSpace } from "@/apps/web/services/matrix-space";
import { getMembers, type Member } from "@/apps/web/services/matrix-member";
import { useMatrixClient } from "@/hooks/use-matrix-client";

// Settings Components
import { ServerOverview } from "./server-overview";
import { ServerRoles } from "./server-roles";
import { ServerModeration } from "./server-moderation";

// Types
import type { MatrixSpace } from "@/lib/matrix/types/space";

// =============================================================================
// Types
// =============================================================================

export interface ServerSettingsProps {
  /** The settings section to display */
  section?: "overview" | "roles" | "moderation" | "members" | "invites" | "integrations" | "security" | "danger";
  /** Custom class names */
  className?: string;
}

export interface ServerSettingsContextData {
  /** Current space/server */
  space: MatrixSpace | null;
  /** Current user's member info */
  currentMember: Member | null;
  /** All space members */
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

export function ServerSettings({ 
  section = "overview", 
  className 
}: ServerSettingsProps) {
  const params = useParams();
  const { client, isReady } = useMatrixClient();
  
  // State
  const [space, setSpace] = useState<MatrixSpace | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const serverId = params?.serverId as string;
  const currentUserId = client?.getUserId() || "";
  
  // Calculate user permissions
  const userPowerLevel = currentMember?.powerLevel || 0;
  const isAdmin = userPowerLevel >= POWER_LEVELS.ADMIN;
  const isModerator = userPowerLevel >= POWER_LEVELS.MODERATOR;
  
  // Load server data
  const loadData = async () => {
    if (!isReady || !client || !serverId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Load space and members in parallel
      const [spaceData, membersData] = await Promise.all([
        getSpace(serverId),
        getMembers(serverId)
      ]);
      
      setSpace(spaceData);
      setMembers(membersData);
      
      // Find current user's member info
      const userMember = membersData.find(m => m.userId === currentUserId);
      setCurrentMember(userMember || null);
      
    } catch (err) {
      console.error("Failed to load server settings data:", err);
      setError(err instanceof Error ? err.message : "Failed to load server data");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load data on mount and when dependencies change
  useEffect(() => {
    loadData();
  }, [isReady, client, serverId, currentUserId]);
  
  // Context data for child components
  const contextData: ServerSettingsContextData = {
    space,
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
        return isModerator; // Moderator+ can view/edit basic info
      case "roles":
      case "moderation":
      case "members":
        return isModerator; // Moderator+ for user management
      case "integrations":
      case "security":
        return isAdmin; // Admin+ for advanced settings
      case "danger":
        return userPowerLevel >= POWER_LEVELS.OWNER; // Owner only
      default:
        return isModerator;
    }
  };
  
  // Render loading state
  if (isLoading && !space) {
    return (
      <div className={cn("flex items-center justify-center h-96", className)}>
        <div className="flex flex-col items-center gap-4 text-zinc-500">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading server settings...</p>
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
  
  // Render no space state
  if (!space) {
    return (
      <div className={cn("p-6", className)}>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Server not found or you don't have access to it.
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
                  You don't have permission to access this settings section. 
                  Contact a server administrator if you need access.
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
        return <ServerOverview {...contextData} />;
      case "roles":
        return <ServerRoles {...contextData} />;
      case "moderation":
        return <ServerModeration {...contextData} />;
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

export default ServerSettings;