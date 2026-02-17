"use client";

/**
 * Permission Editor Component
 * 
 * Granular permission toggle interface for Melo roles.
 * Provides Discord-style permission management with Matrix integration.
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Settings,
  MessageSquare,
  Mic,
  Shield,
  Crown,
  Check,
  X,
  AlertTriangle,
  Info,
  RotateCcw,
  Eye,
  EyeOff,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MeloPermissions,
  PermissionCategory,
  PermissionTemplate,
  PERMISSION_CATEGORIES,
  PERMISSION_TEMPLATES,
  getPermissionTemplate,
  calculateRequiredPowerLevel,
  validatePermissions,
  applyPermissionTemplate,
  type MeloPermissions as PermissionsType
} from "@/lib/matrix/permissions";

// =============================================================================
// Types
// =============================================================================

interface PermissionEditorProps {
  /** Current permissions state */
  permissions: MeloPermissions;
  /** Current power level */
  powerLevel: number;
  /** Maximum power level user can assign */
  maxPowerLevel: number;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Callback when permissions change */
  onPermissionsChange?: (permissions: MeloPermissions) => void;
  /** Callback when power level needs to change */
  onPowerLevelChange?: (powerLevel: number) => void;
  /** Show power level requirements */
  showPowerLevelInfo?: boolean;
  /** Compact mode for smaller spaces */
  compact?: boolean;
}

interface PermissionItemProps {
  permission: keyof MeloPermissions;
  label: string;
  description: string;
  enabled: boolean;
  disabled: boolean;
  required: boolean;
  conflict: boolean;
  onToggle: (permission: keyof MeloPermissions, enabled: boolean) => void;
  compact?: boolean;
}

interface PermissionCategoryProps {
  category: PermissionCategory;
  permissions: MeloPermissions;
  disabledPermissions: Set<keyof MeloPermissions>;
  requiredPermissions: Set<keyof MeloPermissions>;
  conflictPermissions: Set<keyof MeloPermissions>;
  onPermissionToggle: (permission: keyof MeloPermissions, enabled: boolean) => void;
  compact?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const CATEGORY_ICONS = {
  general: Settings,
  text: MessageSquare,
  voice: Mic,
  moderation: Shield,
  management: Crown,
};

const PERMISSION_LABELS: Record<keyof MeloPermissions, string> = {
  // Server Management
  manageServer: "Manage Server",
  manageRoles: "Manage Roles",
  manageChannels: "Manage Channels", 
  manageServerSettings: "Manage Server Settings",
  viewServerInsights: "View Server Insights",
  
  // Member Management
  kickMembers: "Kick Members",
  banMembers: "Ban Members",
  timeoutMembers: "Timeout Members",
  moveMembers: "Move Members",
  manageMemberRoles: "Manage Member Roles",
  
  // Channel Permissions
  viewChannels: "View Channels",
  sendMessages: "Send Messages",
  sendMessagesInThreads: "Send Messages in Threads",
  createPublicThreads: "Create Public Threads",
  createPrivateThreads: "Create Private Threads",
  embedLinks: "Embed Links",
  attachFiles: "Attach Files",
  addReactions: "Add Reactions",
  useExternalEmojis: "Use External Emojis",
  readMessageHistory: "Read Message History",
  
  // Voice Permissions
  connect: "Connect",
  speak: "Speak",
  useVoiceActivation: "Use Voice Activation",
  shareScreen: "Share Screen",
  useVideo: "Use Video",
  
  // Advanced Permissions
  manageMessages: "Manage Messages",
  pinMessages: "Pin Messages",
  mentionEveryone: "Mention Everyone",
  createInvites: "Create Invites",
  useSlashCommands: "Use Slash Commands",
  changeNickname: "Change Nickname",
  manageNicknames: "Manage Nicknames",
  
  // Administrative
  administrator: "Administrator",
};

const PERMISSION_DESCRIPTIONS: Record<keyof MeloPermissions, string> = {
  // Server Management
  manageServer: "Change server name, icon, and other basic settings",
  manageRoles: "Create, edit, and delete server roles",
  manageChannels: "Create, edit, and delete channels",
  manageServerSettings: "Access advanced server configuration",
  viewServerInsights: "View server analytics and audit logs",
  
  // Member Management
  kickMembers: "Remove members from the server temporarily",
  banMembers: "Remove and prevent members from rejoining",
  timeoutMembers: "Temporarily prevent members from messaging",
  moveMembers: "Move members between voice channels",
  manageMemberRoles: "Assign and remove roles from members",
  
  // Channel Permissions
  viewChannels: "See and access channels",
  sendMessages: "Send messages in text channels",
  sendMessagesInThreads: "Reply to threads",
  createPublicThreads: "Start new public threads from messages",
  createPrivateThreads: "Start new private threads from messages",
  embedLinks: "Send links that show previews and embeds",
  attachFiles: "Upload and share files in messages",
  addReactions: "React to messages with emojis",
  useExternalEmojis: "Use emojis from other servers",
  readMessageHistory: "View messages sent before joining",
  
  // Voice Permissions
  connect: "Join voice channels",
  speak: "Talk in voice channels",
  useVoiceActivation: "Use voice without push-to-talk",
  shareScreen: "Share screen in voice channels",
  useVideo: "Use camera in voice channels",
  
  // Advanced Permissions
  manageMessages: "Delete messages from other members",
  pinMessages: "Pin and unpin messages in channels",
  mentionEveryone: "Notify all members with @everyone and @here",
  createInvites: "Create invitation links for the server",
  useSlashCommands: "Use application commands and bots",
  changeNickname: "Change own display name in the server",
  manageNicknames: "Change other members' display names",
  
  // Administrative
  administrator: "Full access to all server features and settings",
};

// =============================================================================
// Components
// =============================================================================

function PermissionItem({
  permission,
  label,
  description,
  enabled,
  disabled,
  required,
  conflict,
  onToggle,
  compact = false
}: PermissionItemProps) {
  const handleToggle = () => {
    if (!disabled) {
      onToggle(permission, !enabled);
    }
  };

  return (
    <div className={cn(
      "flex items-center justify-between gap-3 p-3 rounded-lg border transition-all",
      enabled && !conflict ? "bg-green-500/10 border-green-500/30" : "bg-zinc-800/30 border-zinc-700",
      conflict && "bg-red-500/10 border-red-500/30",
      required && "bg-blue-500/10 border-blue-500/30",
      disabled && "opacity-50",
      !disabled && "hover:bg-zinc-700/30",
      compact && "p-2"
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "font-medium text-sm",
            enabled && !conflict ? "text-green-400" : "text-white",
            conflict && "text-red-400",
            compact && "text-xs"
          )}>
            {label}
          </span>
          
          {required && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-400">
                    Required
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>This permission is required by other enabled permissions</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {conflict && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>This permission conflicts with the current power level</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        
        {!compact && (
          <p className="text-xs text-zinc-400 mt-1">
            {description}
          </p>
        )}
      </div>
      
      <Switch
        checked={enabled}
        onCheckedChange={handleToggle}
        disabled={disabled}
        className="data-[state=checked]:bg-green-500"
      />
    </div>
  );
}

function PermissionCategorySection({
  category,
  permissions,
  disabledPermissions,
  requiredPermissions,
  conflictPermissions,
  onPermissionToggle,
  compact = false
}: PermissionCategoryProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const Icon = CATEGORY_ICONS[category.id as keyof typeof CATEGORY_ICONS] || Settings;
  
  const enabledCount = category.permissions.filter(perm => permissions[perm]).length;
  const totalCount = category.permissions.length;

  return (
    <div className="space-y-3">
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-between p-3 h-auto hover:bg-zinc-800/50"
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-zinc-400" />
          <div className="text-left">
            <div className="font-semibold text-white">{category.name}</div>
            {!compact && (
              <div className="text-xs text-zinc-400 mt-1">{category.description}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {enabledCount}/{totalCount}
          </Badge>
          {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </div>
      </Button>
      
      {isExpanded && (
        <div className="space-y-2 ml-2">
          {category.permissions.map((permission) => (
            <PermissionItem
              key={permission}
              permission={permission}
              label={PERMISSION_LABELS[permission]}
              description={PERMISSION_DESCRIPTIONS[permission]}
              enabled={permissions[permission]}
              disabled={disabledPermissions.has(permission)}
              required={requiredPermissions.has(permission)}
              conflict={conflictPermissions.has(permission)}
              onToggle={onPermissionToggle}
              compact={compact}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function PermissionEditor({
  permissions,
  powerLevel,
  maxPowerLevel,
  readOnly = false,
  onPermissionsChange,
  onPowerLevelChange,
  showPowerLevelInfo = true,
  compact = false
}: PermissionEditorProps) {
  const [localPermissions, setLocalPermissions] = useState<MeloPermissions>(permissions);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  // Update local state when props change
  useEffect(() => {
    setLocalPermissions(permissions);
  }, [permissions]);

  // Calculate derived state
  const validation = useMemo(() => {
    return validatePermissions(localPermissions, powerLevel);
  }, [localPermissions, powerLevel]);

  const requiredPowerLevel = useMemo(() => {
    return calculateRequiredPowerLevel(localPermissions);
  }, [localPermissions]);

  const disabledPermissions = useMemo(() => {
    const disabled = new Set<keyof MeloPermissions>();
    if (readOnly || powerLevel >= maxPowerLevel) {
      // Disable all if read-only or at max power level
      Object.keys(localPermissions).forEach(perm => {
        disabled.add(perm as keyof MeloPermissions);
      });
    }
    return disabled;
  }, [readOnly, powerLevel, maxPowerLevel, localPermissions]);

  const requiredPermissions = useMemo(() => {
    const required = new Set<keyof MeloPermissions>();
    // Add logic for required permissions (e.g., viewChannels required for sendMessages)
    if (localPermissions.sendMessages && !localPermissions.viewChannels) {
      required.add('viewChannels');
    }
    return required;
  }, [localPermissions]);

  const conflictPermissions = useMemo(() => {
    const conflicts = new Set<keyof MeloPermissions>();
    if (!validation.valid) {
      // Add permissions that are enabled but require higher power level
      Object.entries(localPermissions).forEach(([perm, enabled]) => {
        if (enabled && requiredPowerLevel > powerLevel) {
          conflicts.add(perm as keyof MeloPermissions);
        }
      });
    }
    return conflicts;
  }, [validation, requiredPowerLevel, powerLevel, localPermissions]);

  // =============================================================================
  // Handlers
  // =============================================================================

  const handlePermissionToggle = (permission: keyof MeloPermissions, enabled: boolean) => {
    const newPermissions = { ...localPermissions, [permission]: enabled };
    
    // Handle permission dependencies
    if (permission === 'sendMessages' && enabled && !newPermissions.viewChannels) {
      newPermissions.viewChannels = true;
    }
    
    setLocalPermissions(newPermissions);
    onPermissionsChange?.(newPermissions);
  };

  const handleTemplateApply = (templateId: string) => {
    if (!templateId) return;
    
    try {
      const newPermissions = applyPermissionTemplate(localPermissions, templateId);
      setLocalPermissions(newPermissions);
      onPermissionsChange?.(newPermissions);
      
      // Suggest power level change if needed
      const template = getPermissionTemplate(templateId);
      if (template && onPowerLevelChange && template.recommendedPowerLevel !== powerLevel) {
        onPowerLevelChange(template.recommendedPowerLevel);
      }
      
      setSelectedTemplate("");
    } catch (error) {
      console.error("Failed to apply permission template:", error);
    }
  };

  const handleResetToTemplate = () => {
    // Find closest matching template
    const bestMatch = PERMISSION_TEMPLATES.find(template => 
      template.recommendedPowerLevel <= powerLevel
    ) || PERMISSION_TEMPLATES[PERMISSION_TEMPLATES.length - 1];
    
    if (bestMatch) {
      const newPermissions = { ...bestMatch.permissions };
      setLocalPermissions(newPermissions);
      onPermissionsChange?.(newPermissions);
    }
  };

  const enabledPermissionCount = Object.values(localPermissions).filter(Boolean).length;
  const totalPermissionCount = Object.keys(localPermissions).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Permissions
          </h3>
          <p className="text-sm text-zinc-400 mt-1">
            Configure specific permissions for this role. {enabledPermissionCount}/{totalPermissionCount} enabled.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {!readOnly && (
            <>
              <Select value={selectedTemplate} onValueChange={handleTemplateApply}>
                <SelectTrigger className="w-40 bg-zinc-800 border-zinc-600">
                  <SelectValue placeholder="Apply template..." />
                </SelectTrigger>
                <SelectContent>
                  {PERMISSION_TEMPLATES.map((template) => (
                    <SelectItem 
                      key={template.id} 
                      value={template.id}
                      disabled={template.recommendedPowerLevel > maxPowerLevel}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: template.color }}
                        />
                        {template.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToTemplate}
                className="border-zinc-600 text-zinc-300 hover:bg-zinc-700"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Power Level Info */}
      {showPowerLevelInfo && (
        <Alert className={cn(
          "border",
          validation.valid ? "border-zinc-600 bg-zinc-800/30" : "border-red-500 bg-red-500/10"
        )}>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                Current Power Level: <strong>{powerLevel}</strong>
                {requiredPowerLevel > powerLevel && (
                  <span className="text-red-400 ml-2">
                    (Requires: {requiredPowerLevel})
                  </span>
                )}
              </div>
              {requiredPowerLevel > powerLevel && onPowerLevelChange && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPowerLevelChange(requiredPowerLevel)}
                  className="border-red-500 text-red-400 hover:bg-red-500/10"
                >
                  Update Power Level
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Errors */}
      {!validation.valid && (
        <Alert className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Permission Issues:</p>
              {validation.errors.map((error, index) => (
                <p key={index} className="text-sm">• {error}</p>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Permission Categories */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-4">
          {PERMISSION_CATEGORIES.map((category) => (
            <React.Fragment key={category.id}>
              <PermissionCategorySection
                category={category}
                permissions={localPermissions}
                disabledPermissions={disabledPermissions}
                requiredPermissions={requiredPermissions}
                conflictPermissions={conflictPermissions}
                onPermissionToggle={handlePermissionToggle}
                compact={compact}
              />
              {category.id !== PERMISSION_CATEGORIES[PERMISSION_CATEGORIES.length - 1].id && (
                <Separator className="bg-zinc-700" />
              )}
            </React.Fragment>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export default PermissionEditor;