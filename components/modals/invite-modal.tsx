"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Check, Copy, RefreshCw, Trash2, Clock, Users, ExternalLink } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import { useModal } from "@/hooks/use-modal-store";
import { useOrigin } from "@/hooks/use-origin";
import { 
  createInviteLink, 
  revokeInvite, 
  getSpaceInvites,
  type InviteInfo 
} from "@/apps/web/services/matrix-invite";
import { MatrixSpace } from "@/lib/matrix/types/space";

// =============================================================================
// Types and Interfaces
// =============================================================================

interface ExpirationOption {
  value: string;
  label: string;
  hours?: number;
}

interface MaxUsesOption {
  value: string;
  label: string;
  uses?: number;
}

// =============================================================================
// Configuration Options
// =============================================================================

const EXPIRATION_OPTIONS: ExpirationOption[] = [
  { value: "1h", label: "1 hour", hours: 1 },
  { value: "12h", label: "12 hours", hours: 12 },
  { value: "1d", label: "1 day", hours: 24 },
  { value: "7d", label: "7 days", hours: 168 },
  { value: "never", label: "Never" }
];

const MAX_USES_OPTIONS: MaxUsesOption[] = [
  { value: "1", label: "1 use", uses: 1 },
  { value: "5", label: "5 uses", uses: 5 },
  { value: "10", label: "10 uses", uses: 10 },
  { value: "25", label: "25 uses", uses: 25 },
  { value: "50", label: "50 uses", uses: 50 },
  { value: "unlimited", label: "Unlimited" }
];

// =============================================================================
// Utility Functions
// =============================================================================

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// =============================================================================
// Main Modal Component
// =============================================================================

export function InviteModal() {
  const { isOpen, onOpen, onClose, type, data } = useModal();
  const origin = useOrigin();

  const isModalOpen = isOpen && type === "invite";
  
  // Extract space data from modal - support both legacy server and new space
  const space = (data.space || data.server) as MatrixSpace | undefined;

  // =============================================================================
  // State Management
  // =============================================================================

  const [newInviteCode, setNewInviteCode] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state for new invite creation
  const [selectedExpiration, setSelectedExpiration] = useState<string>("never");
  const [selectedMaxUses, setSelectedMaxUses] = useState<string>("unlimited");
  
  // Active invites list
  const [activeInvites, setActiveInvites] = useState<InviteInfo[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  // =============================================================================
  // Computed Values
  // =============================================================================

  const inviteUrl = newInviteCode 
    ? `${origin}/invite/${newInviteCode}` 
    : "";

  const selectedExpirationOption = EXPIRATION_OPTIONS.find(opt => opt.value === selectedExpiration);
  const selectedMaxUsesOption = MAX_USES_OPTIONS.find(opt => opt.value === selectedMaxUses);

  // =============================================================================
  // Effect Handlers
  // =============================================================================

  // Load active invites when modal opens
  useEffect(() => {
    if (isModalOpen && space?.id) {
      loadActiveInvites();
    }
  }, [isModalOpen, space?.id, loadActiveInvites]);

  // Reset state when modal opens
  useEffect(() => {
    if (isModalOpen) {
      setError(null);
      setCopied(false);
      setNewInviteCode("");
    }
  }, [isModalOpen]);

  // =============================================================================
  // Event Handlers
  // =============================================================================

  const loadActiveInvites = useCallback(async () => {
    if (!space?.id) return;

    try {
      setLoadingInvites(true);
      const invites = await getSpaceInvites(space.id);
      setActiveInvites(invites.filter(invite => invite.isActive));
    } catch (err) {
      console.error("Failed to load active invites:", err);
      setError(err instanceof Error ? err.message : "Failed to load invites");
    } finally {
      setLoadingInvites(false);
    }
  }, [space?.id]);

  const handleCreateInvite = async () => {
    if (!space?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      // Calculate max uses
      const maxUses = selectedMaxUsesOption?.uses || null;
      
      // Create the invite
      const inviteCode = await createInviteLink(space.id, maxUses);
      setNewInviteCode(inviteCode);
      
      // Reload active invites to show the new one
      await loadActiveInvites();
      
    } catch (err) {
      console.error("Failed to create invite:", err);
      setError(err instanceof Error ? err.message : "Failed to create invite");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      setError("Failed to copy to clipboard");
    }
  };

  const handleRevokeInvite = async (inviteCode: string) => {
    try {
      setIsLoading(true);
      await revokeInvite(inviteCode);
      
      // Remove from active invites list
      setActiveInvites(prev => prev.filter(invite => invite.code !== inviteCode));
      
      // Clear the current invite if it was revoked
      if (newInviteCode === inviteCode) {
        setNewInviteCode("");
      }
      
    } catch (err) {
      console.error("Failed to revoke invite:", err);
      setError(err instanceof Error ? err.message : "Failed to revoke invite");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setNewInviteCode("");
    setCopied(false);
    setError(null);
    setActiveInvites([]);
    setSelectedExpiration("never");
    setSelectedMaxUses("unlimited");
    onClose();
  };

  // =============================================================================
  // Render Functions
  // =============================================================================

  const renderNewInviteSection = () => (
    <div className="space-y-4">
      {/* Invite Creation Form */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Expires After
            </Label>
            <Select value={selectedExpiration} onValueChange={setSelectedExpiration}>
              <SelectTrigger className="bg-zinc-300/50 dark:bg-zinc-700 border-0 focus:ring-0 text-black dark:text-white focus:ring-offset-0">
                <SelectValue placeholder="Never" />
              </SelectTrigger>
              <SelectContent>
                {EXPIRATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Max Uses
            </Label>
            <Select value={selectedMaxUses} onValueChange={setSelectedMaxUses}>
              <SelectTrigger className="bg-zinc-300/50 dark:bg-zinc-700 border-0 focus:ring-0 text-black dark:text-white focus:ring-offset-0">
                <SelectValue placeholder="Unlimited" />
              </SelectTrigger>
              <SelectContent>
                {MAX_USES_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleCreateInvite}
          disabled={isLoading || !space?.id}
          className="w-full"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <ExternalLink className="w-4 h-4 mr-2" />
          )}
          Generate New Invite Link
        </Button>
      </div>

      {/* Generated Invite Link */}
      {newInviteCode && (
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Your Invite Link
          </Label>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={inviteUrl}
              className="bg-zinc-300/50 dark:bg-zinc-700 border-0 focus-visible:ring-0 text-black dark:text-white focus-visible:ring-offset-0 font-mono text-sm"
            />
            <Button 
              onClick={() => handleCopy(inviteUrl)} 
              size="icon"
              variant="secondary"
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const renderActiveInvitesList = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Active Invites ({activeInvites.length})
        </Label>
        <Button 
          onClick={loadActiveInvites}
          variant="ghost" 
          size="sm"
          disabled={loadingInvites}
        >
          <RefreshCw className={`w-3 h-3 ${loadingInvites ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {activeInvites.length === 0 ? (
        <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No active invites</p>
          <p className="text-xs">Create an invite link to get started</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {activeInvites.map((invite) => {
            const inviteUrl = `${origin}/invite/${invite.code}`;
            
            return (
              <div 
                key={invite.code} 
                className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-xs font-mono bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded">
                        {invite.code}
                      </code>
                      <Badge variant="secondary" className="text-xs">
                        {invite.currentUses} / {invite.maxUses || '∞'} uses
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      Created by {invite.createdByName} • {formatTimeAgo(invite.createdAt)}
                    </p>
                  </div>

                  <div className="flex gap-1 ml-2">
                    <Button
                      onClick={() => handleCopy(inviteUrl)}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      onClick={() => handleRevokeInvite(invite.code)}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <Input
                  readOnly
                  value={inviteUrl}
                  className="text-xs font-mono bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // =============================================================================
  // Main Render
  // =============================================================================

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white dark:bg-zinc-900 text-black dark:text-white p-0 overflow-hidden max-w-md">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold">
            Invite Friends
          </DialogTitle>
          {space?.name && (
            <p className="text-sm text-center text-zinc-500 dark:text-zinc-400">
              to {space.name}
            </p>
          )}
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {renderNewInviteSection()}

          <Separator />

          {renderActiveInvitesList()}
        </div>
      </DialogContent>
    </Dialog>
  );
}