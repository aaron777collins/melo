"use client";

/**
 * Server Settings Component
 *
 * Main server settings interface that handles different settings tabs.
 * Integrates role management, member management, and other server configuration.
 */

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ServerSettingsSidebar } from "@/components/server/settings/server-settings-sidebar";
import { RoleManager } from "@/components/server/role-manager";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MatrixSpace } from "@/lib/matrix/types/space";
import { MatrixRole } from "@/components/server/role-manager";
import {
  Shield,
  Users,
  Settings,
  AlertTriangle,
  Bell,
  Webhook,
  Globe,
  Activity,
  FileText,
  Ban,
  Link2,
  Bot,
  Lock,
  Plug2,
  Gavel,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface ServerSettingsProps {
  /** Server/Space data */
  space: MatrixSpace;
  /** Server ID */
  serverId: string;
  /** Current user's power level in this space */
  userPowerLevel: number;
  /** Current settings tab */
  activeTab: ServerSettingsTab;
}

/**
 * Available server settings tabs
 */
export type ServerSettingsTab = 
  | "overview"
  | "roles" 
  | "members"
  | "invites"
  | "moderation"
  | "audit-log"
  | "bans"
  | "integrations"
  | "webhooks"
  | "bots"
  | "security"
  | "federation"
  | "danger";

// =============================================================================
// Tab Content Components
// =============================================================================

/**
 * Overview tab content
 */
function OverviewTab({ space, serverId }: { space: MatrixSpace; serverId: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Server Overview</h2>
        <p className="text-sm text-zinc-400 mt-1">
          General settings and information about {space.name}
        </p>
      </div>
      
      <div className="bg-zinc-800/50 p-6 rounded-lg space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-zinc-400">Server Name</label>
            <p className="text-white font-medium">{space.name}</p>
          </div>
          <div>
            <label className="text-sm text-zinc-400">Member Count</label>
            <p className="text-white font-medium">{space.memberCount} members</p>
          </div>
          <div>
            <label className="text-sm text-zinc-400">Room ID</label>
            <p className="text-white font-mono text-sm">{space.id}</p>
          </div>
          <div>
            <label className="text-sm text-zinc-400">Join Rule</label>
            <Badge variant="secondary" className="mt-1">
              {space.joinRule}
            </Badge>
          </div>
        </div>
      </div>

      <div className="bg-zinc-800/50 p-4 rounded-lg">
        <p className="text-xs text-zinc-500">
          Server settings allow you to configure permissions, manage members, and customize your community.
        </p>
      </div>
    </div>
  );
}

/**
 * Roles tab content (integrates RoleManager)
 */
function RolesTab({ 
  space, 
  serverId, 
  userPowerLevel 
}: { 
  space: MatrixSpace; 
  serverId: string; 
  userPowerLevel: number;
}) {
  const handleRoleReorder = (roles: MatrixRole[]) => {
    console.log("Roles reordered:", roles);
    // TODO: Implement Matrix power level updates
  };

  const handleRoleEdit = (role: MatrixRole) => {
    console.log("Edit role:", role);
    // TODO: Open role edit modal
  };

  const handleRoleDelete = (roleId: string) => {
    console.log("Delete role:", roleId);
    // TODO: Implement role deletion
  };

  const handleRoleCreate = () => {
    console.log("Create new role");
    // TODO: Open role creation modal
  };

  return (
    <RoleManager
      serverId={serverId}
      userPowerLevel={userPowerLevel}
      onRoleReorder={handleRoleReorder}
      onRoleEdit={handleRoleEdit}
      onRoleDelete={handleRoleDelete}
      onRoleCreate={handleRoleCreate}
    />
  );
}

/**
 * Placeholder tabs for future implementation
 */
function PlaceholderTab({ 
  title, 
  description, 
  icon: Icon,
  comingSoon = false 
}: { 
  title: string; 
  description: string; 
  icon: React.ComponentType<{ className?: string }>;
  comingSoon?: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {title}
          {comingSoon && (
            <Badge variant="secondary" className="text-xs">
              Coming Soon
            </Badge>
          )}
        </h2>
        <p className="text-sm text-zinc-400 mt-1">{description}</p>
      </div>
      
      <div className="bg-zinc-800/50 p-8 rounded-lg text-center">
        <Icon className="h-12 w-12 text-zinc-500 mx-auto mb-4" />
        <p className="text-zinc-400 mb-4">
          This feature is {comingSoon ? "coming soon" : "under development"}.
        </p>
        <Button variant="outline" disabled>
          {comingSoon ? "Available Soon" : "Under Development"}
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ServerSettings({
  space,
  serverId,
  userPowerLevel,
  activeTab,
}: ServerSettingsProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Handle tab switching via URL
  const handleTabChange = (tab: ServerSettingsTab) => {
    const basePath = `/servers/${serverId}/settings`;
    const newPath = tab === "overview" ? basePath : `${basePath}/${tab}`;
    router.push(newPath);
  };

  // =============================================================================
  // Tab Content Rendering
  // =============================================================================

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab space={space} serverId={serverId} />;
        
      case "roles":
        return (
          <RolesTab 
            space={space} 
            serverId={serverId} 
            userPowerLevel={userPowerLevel} 
          />
        );
        
      case "members":
        return (
          <PlaceholderTab
            title="Members"
            description="Manage server members, view roles, and moderate users."
            icon={Users}
            comingSoon={true}
          />
        );
        
      case "invites":
        return (
          <PlaceholderTab
            title="Invites"
            description="Create and manage server invite links."
            icon={Link2}
            comingSoon={true}
          />
        );
        
      case "moderation":
        return (
          <PlaceholderTab
            title="Moderation"
            description="Configure automod, message filtering, and moderation tools."
            icon={Gavel}
            comingSoon={true}
          />
        );
        
      case "audit-log":
        return (
          <PlaceholderTab
            title="Audit Log"
            description="View server activity and administrative actions."
            icon={FileText}
            comingSoon={true}
          />
        );
        
      case "bans":
        return (
          <PlaceholderTab
            title="Bans"
            description="View and manage banned users."
            icon={Ban}
            comingSoon={true}
          />
        );
        
      case "integrations":
        return (
          <PlaceholderTab
            title="Integrations"
            description="Connect external services and applications."
            icon={Plug2}
            comingSoon={true}
          />
        );
        
      case "webhooks":
        return (
          <PlaceholderTab
            title="Webhooks"
            description="Configure webhooks for external integrations."
            icon={Webhook}
            comingSoon={true}
          />
        );
        
      case "bots":
        return (
          <PlaceholderTab
            title="Bots"
            description="Manage bot permissions and integrations."
            icon={Bot}
            comingSoon={true}
          />
        );
        
      case "security":
        return (
          <PlaceholderTab
            title="Security"
            description="Configure verification levels and security settings."
            icon={Lock}
            comingSoon={true}
          />
        );
        
      case "federation":
        return (
          <PlaceholderTab
            title="Federation"
            description="Manage federation settings and allowed servers."
            icon={Globe}
            comingSoon={true}
          />
        );
        
      case "danger":
        return (
          <PlaceholderTab
            title="Delete Server"
            description="Permanently delete this server and all its data."
            icon={AlertTriangle}
          />
        );
        
      default:
        return <OverviewTab space={space} serverId={serverId} />;
    }
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <ServerSettingsSidebar 
        space={space}
        serverId={serverId}
        userPowerLevel={userPowerLevel}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <ScrollArea className="flex-1">
          <div className="p-8 max-w-4xl mx-auto">
            {renderTabContent()}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

export default ServerSettings;