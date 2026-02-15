"use client";

/**
 * Server Roles Settings Page Client Component
 * 
 * Client-side component that handles role management interactions,
 * including modal triggers and state management.
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";

import { RoleManager, type MatrixRole } from "@/components/server/role-manager";
import { useModal } from "@/hooks/use-modal-store";
import { MatrixSpace } from "@/lib/matrix/types/space";

// =============================================================================
// Types
// =============================================================================

interface RolesPageClientProps {
  serverId: string;
  userPowerLevel: number;
  space: MatrixSpace;
}

// =============================================================================
// Component
// =============================================================================

export function RolesPageClient({
  serverId,
  userPowerLevel,
  space,
}: RolesPageClientProps) {
  const { onOpen } = useModal();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // =============================================================================
  // Handlers
  // =============================================================================

  const handleRoleCreate = () => {
    onOpen("createRole", {
      serverId,
      userPowerLevel,
      space,
    });
  };

  const handleRoleEdit = async (role: MatrixRole) => {
    // TODO: Implement role editing
    // This would open an edit modal similar to create role modal
    console.log("Edit role:", role);
  };

  const handleRoleDelete = async (roleId: string) => {
    if (!confirm("Are you sure you want to delete this role? This action cannot be undone.")) {
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement role deletion via Matrix API
      // This would:
      // 1. Remove the custom role from space account data
      // 2. Update affected members' power levels
      // 3. Refresh the roles list
      console.log("Delete role:", roleId);
      
      // For now, just refresh the page
      router.refresh();
    } catch (error) {
      console.error("Failed to delete role:", error);
      // TODO: Show error toast
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleReorder = async (reorderedRoles: MatrixRole[]) => {
    setIsLoading(true);
    try {
      // TODO: Implement role reordering
      // This would update the role hierarchy in Matrix space account data
      console.log("Reorder roles:", reorderedRoles);
      
      // For now, just log the new order
      reorderedRoles.forEach((role, index) => {
        console.log(`${role.name}: position ${role.position}`);
      });
    } catch (error) {
      console.error("Failed to reorder roles:", error);
      // TODO: Show error toast
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#313338]">
      {/* Page Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <RoleManager 
          serverId={serverId}
          userPowerLevel={userPowerLevel}
          onRoleReorder={handleRoleReorder}
          onRoleEdit={handleRoleEdit}
          onRoleDelete={handleRoleDelete}
          onRoleCreate={handleRoleCreate}
        />
      </div>
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#2B2D31] p-4 rounded-lg flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-white">Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
}