"use client";

/**
 * Delete Role Confirmation Modal
 * 
 * Shows confirmation dialog before deleting a role with detailed consequences
 * and handles the actual deletion via Matrix API.
 */

import React, { useState } from "react";
import { AlertTriangle, Trash2, Shield, Users } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useModal } from "@/hooks/use-modal-store";
import { deleteCustomRole } from "@/lib/matrix/roles";
import type { MatrixRole } from "@/components/server/role-manager";

// =============================================================================
// Component
// =============================================================================

export function DeleteRoleModal() {
  const { isOpen, onClose, type, data } = useModal();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isModalOpen = isOpen && type === "deleteRole";
  const { role, serverId, onSuccess } = data;

  // =============================================================================
  // Handlers
  // =============================================================================

  const handleDelete = async () => {
    if (!role || !serverId) {
      setError("Missing role or server information");
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await deleteCustomRole(serverId, role.id);
      
      console.log(`Role "${role.name}" deleted successfully`);
      
      // Call success callback if provided
      onSuccess?.();
      
      // Close modal
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete role";
      setError(errorMessage);
      console.error("Failed to delete role:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (isDeleting) return; // Prevent closing while deleting
    setError(null);
    onClose();
  };

  // =============================================================================
  // Render
  // =============================================================================

  if (!role) return null;

  const isDefaultRole = role.isDefault || role.id === "member" || role.name === "@everyone";
  const memberCount = role.memberCount || 0;

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#2B2D31] text-white border-zinc-700 max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-left">
                Delete Role
              </DialogTitle>
              <DialogDescription className="text-zinc-400 text-left">
                This action cannot be undone
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Role Info */}
          <div className="bg-zinc-800/50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-full"
                style={{ backgroundColor: role.color + "20", color: role.color }}
              >
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{role.name}</h3>
                <div className="text-sm text-zinc-400">
                  Power Level: {role.powerLevel} • {memberCount} members
                </div>
              </div>
            </div>
          </div>

          {/* Default Role Warning */}
          {isDefaultRole && (
            <Alert className="border-amber-500 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <AlertDescription className="text-amber-400">
                This is a default role that cannot be deleted.
              </AlertDescription>
            </Alert>
          )}

          {/* Consequences Warning */}
          {!isDefaultRole && (
            <Alert className="border-red-500 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-400">
                <div className="space-y-2">
                  <p className="font-medium">This will permanently:</p>
                  <ul className="space-y-1 text-sm list-disc list-inside ml-2">
                    <li>Delete the role "{role.name}"</li>
                    {memberCount > 0 && (
                      <li>Remove this role from {memberCount} member{memberCount !== 1 ? 's' : ''}</li>
                    )}
                    <li>Demote affected members to default permissions</li>
                    <li>Remove all role-based channel permissions</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Member Impact */}
          {memberCount > 0 && !isDefaultRole && (
            <div className="bg-zinc-800/50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <Users className="h-4 w-4" />
                <span>
                  {memberCount} member{memberCount !== 1 ? 's' : ''} will be affected
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                They will lose all permissions from this role and return to default member level.
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert className="border-red-500 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isDeleting}
              className="border-zinc-600 text-zinc-300 hover:bg-zinc-700"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || isDefaultRole}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Role
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}