"use client";

/**
 * Server Moderation Settings Page
 * 
 * Moderation tools and audit logging:
 * - Member moderation actions (kick, ban, timeout)
 * - Banned members management
 * - Audit log viewer
 * - Moderation settings and auto-mod
 * - Message management tools
 * 
 * Integrates with Matrix moderation services.
 */

import React, { useState, useEffect } from "react";
import { 
  Shield, 
  Ban, 
  UserMinus, 
  FileText, 
  Clock, 
  Users,
  AlertTriangle,
  Eye,
  Search,
  Filter,
  MoreHorizontal,
  Loader2,
  RefreshCw,
  UserPlus,
  MessageSquare
} from "lucide-react";

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Matrix Services
import { 
  kickMember, 
  banMember, 
  unbanMember,
  type Member 
} from "@/apps/web/services/matrix-member";

// Types
import type { ServerSettingsContextData } from "./server-settings";

// =============================================================================
// Types and Constants
// =============================================================================

interface ModerationAction {
  id: string;
  type: "kick" | "ban" | "unban" | "timeout" | "warn";
  targetUserId: string;
  targetDisplayName: string;
  moderatorUserId: string;
  moderatorDisplayName: string;
  reason?: string;
  timestamp: Date;
  duration?: number; // For timeouts, in minutes
}

interface BannedMember {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  bannedAt: Date;
  bannedBy: string;
  reason?: string;
}

// Mock data for demonstration - in real implementation, this would come from Matrix audit logs
const mockAuditLog: ModerationAction[] = [
  {
    id: "1",
    type: "ban",
    targetUserId: "@spammer:example.com",
    targetDisplayName: "Spammer",
    moderatorUserId: "@admin:example.com", 
    moderatorDisplayName: "Admin",
    reason: "Spam posting",
    timestamp: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
  },
  {
    id: "2", 
    type: "kick",
    targetUserId: "@troublemaker:example.com",
    targetDisplayName: "Troublemaker",
    moderatorUserId: "@mod:example.com",
    moderatorDisplayName: "Moderator",
    reason: "Disruptive behavior",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 hours ago
  },
  {
    id: "3",
    type: "timeout",
    targetUserId: "@chatty:example.com", 
    targetDisplayName: "Chatty",
    moderatorUserId: "@mod:example.com",
    moderatorDisplayName: "Moderator",
    reason: "Off-topic spam",
    duration: 60, // 1 hour
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4) // 4 hours ago
  }
];

// Mock banned members - in real implementation, this would come from Matrix
const mockBannedMembers: BannedMember[] = [
  {
    userId: "@spammer:example.com",
    displayName: "Spammer",
    bannedAt: new Date(Date.now() - 1000 * 60 * 30),
    bannedBy: "@admin:example.com",
    reason: "Spam posting"
  }
];

const POWER_LEVELS = {
  OWNER: 100,
  ADMIN: 75,
  MODERATOR: 50,
  MEMBER: 0,
} as const;

// =============================================================================
// Component
// =============================================================================

export function ServerModeration({
  space,
  currentMember,
  members,
  isLoading: parentLoading,
  error: parentError,
  refreshData
}: ServerSettingsContextData) {
  
  // State
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [auditLog, setAuditLog] = useState<ModerationAction[]>(mockAuditLog);
  const [bannedMembers, setBannedMembers] = useState<BannedMember[]>(mockBannedMembers);
  const [auditFilter, setAuditFilter] = useState<string>("all");
  const [auditSearch, setAuditSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  
  // Calculate user permissions
  const userPowerLevel = currentMember?.powerLevel || 0;
  const isModerator = userPowerLevel >= POWER_LEVELS.MODERATOR;
  const isAdmin = userPowerLevel >= POWER_LEVELS.ADMIN;
  
  // Filter members for moderation (exclude self and higher power levels)
  const moderatableMembers = React.useMemo(() => {
    if (!members || !currentMember) return [];
    
    return members.filter(member => {
      // Don't show self
      if (member.userId === currentMember.userId) return false;
      
      // Can only moderate members with lower power level
      return member.powerLevel < currentMember.powerLevel;
    });
  }, [members, currentMember]);
  
  // Filter audit log
  const filteredAuditLog = React.useMemo(() => {
    return auditLog.filter(action => {
      const typeMatch = auditFilter === "all" || action.type === auditFilter;
      const searchMatch = auditSearch === "" || 
        action.targetDisplayName.toLowerCase().includes(auditSearch.toLowerCase()) ||
        action.moderatorDisplayName.toLowerCase().includes(auditSearch.toLowerCase()) ||
        (action.reason && action.reason.toLowerCase().includes(auditSearch.toLowerCase()));
      
      return typeMatch && searchMatch;
    });
  }, [auditLog, auditFilter, auditSearch]);
  
  // Filter members for search
  const filteredMembers = React.useMemo(() => {
    if (!memberSearch) return moderatableMembers;
    
    return moderatableMembers.filter(member => {
      const displayName = member.displayName || member.userId;
      return displayName.toLowerCase().includes(memberSearch.toLowerCase());
    });
  }, [moderatableMembers, memberSearch]);
  
  // Handle moderation actions
  const handleModerationAction = async (
    userId: string,
    action: "kick" | "ban",
    reason?: string
  ) => {
    if (!space || !isModerator) return;
    
    setIsPerformingAction(true);
    setActionError(null);
    
    try {
      switch (action) {
        case "kick":
          await kickMember(space.id, userId);
          break;
        case "ban":
          await banMember(space.id, userId);
          break;
      }
      
      // Refresh data to show updated member list
      await refreshData();
      
      // Add to audit log (in real implementation, this would come from Matrix events)
      const targetMember = members?.find(m => m.userId === userId);
      const newLogEntry: ModerationAction = {
        id: Date.now().toString(),
        type: action,
        targetUserId: userId,
        targetDisplayName: targetMember?.displayName || userId,
        moderatorUserId: currentMember?.userId || "",
        moderatorDisplayName: currentMember?.displayName || "Unknown",
        reason,
        timestamp: new Date()
      };
      
      setAuditLog(prev => [newLogEntry, ...prev]);
      
    } catch (err) {
      console.error(`Failed to ${action} member:`, err);
      setActionError(err instanceof Error ? err.message : `Failed to ${action} member`);
    } finally {
      setIsPerformingAction(false);
    }
  };
  
  // Handle unban
  const handleUnban = async (userId: string) => {
    if (!space || !isModerator) return;
    
    setIsPerformingAction(true);
    setActionError(null);
    
    try {
      await unbanMember(space.id, userId);
      
      // Remove from banned members list
      setBannedMembers(prev => prev.filter(member => member.userId !== userId));
      
      // Add to audit log
      const bannedMember = bannedMembers.find(m => m.userId === userId);
      const newLogEntry: ModerationAction = {
        id: Date.now().toString(),
        type: "unban",
        targetUserId: userId,
        targetDisplayName: bannedMember?.displayName || userId,
        moderatorUserId: currentMember?.userId || "",
        moderatorDisplayName: currentMember?.displayName || "Unknown",
        timestamp: new Date()
      };
      
      setAuditLog(prev => [newLogEntry, ...prev]);
      
    } catch (err) {
      console.error("Failed to unban member:", err);
      setActionError(err instanceof Error ? err.message : "Failed to unban member");
    } finally {
      setIsPerformingAction(false);
    }
  };
  
  // Get action badge color
  const getActionBadgeColor = (type: ModerationAction["type"]) => {
    switch (type) {
      case "ban":
        return "bg-red-500 text-white";
      case "kick":
        return "bg-orange-500 text-white";
      case "timeout":
        return "bg-yellow-500 text-white";
      case "warn":
        return "bg-blue-500 text-white";
      case "unban":
        return "bg-green-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };
  
  // Format relative time
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };
  
  if (!space) return null;
  
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Moderation</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Manage members, view audit logs, and configure moderation settings
        </p>
      </div>
      
      {/* Error Alert */}
      {(parentError || actionError) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {parentError || actionError}
          </AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue="actions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="actions" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Actions
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Audit Log
          </TabsTrigger>
          <TabsTrigger value="banned" className="flex items-center gap-2">
            <Ban className="h-4 w-4" />
            Banned Members
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>
        
        {/* Moderation Actions Tab */}
        <TabsContent value="actions">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Moderate Members
                  </CardTitle>
                  <CardDescription>
                    Take moderation actions on server members
                  </CardDescription>
                  
                  {/* Search */}
                  <div className="flex items-center gap-2 pt-2">
                    <Search className="h-4 w-4 text-zinc-400" />
                    <Input
                      placeholder="Search members..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      className="max-w-xs"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {filteredMembers.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500">
                          {memberSearch ? "No members found matching search" : "No members to moderate"}
                        </div>
                      ) : (
                        filteredMembers.map((member) => (
                          <div key={member.userId} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={member.avatarUrl || undefined} />
                                <AvatarFallback>
                                  {member.displayName?.substring(0, 2).toUpperCase() || 
                                   member.userId.substring(1, 3).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {member.displayName || member.userId}
                                </p>
                                <div className="flex items-center space-x-2">
                                  <Badge 
                                    variant="secondary" 
                                    className="text-xs"
                                  >
                                    {member.role}
                                  </Badge>
                                  {member.isOnline && (
                                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  disabled={isPerformingAction}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {/* TODO: Open profile */}}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {/* TODO: Send DM */}}>
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Send Message
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleModerationAction(member.userId, "kick")}
                                  className="text-yellow-600 dark:text-yellow-400"
                                >
                                  <UserMinus className="h-4 w-4 mr-2" />
                                  Kick Member
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleModerationAction(member.userId, "ban")}
                                  className="text-red-600 dark:text-red-400"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Ban Member
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
            
            {/* Quick Stats */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Moderation Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Members</span>
                    <Badge variant="secondary">{members?.length || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Moderators</span>
                    <Badge variant="secondary">
                      {members?.filter(m => m.powerLevel >= POWER_LEVELS.MODERATOR).length || 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Banned Members</span>
                    <Badge variant="destructive">{bannedMembers.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Actions Today</span>
                    <Badge variant="secondary">
                      {auditLog.filter(a => {
                        const today = new Date();
                        const actionDate = new Date(a.timestamp);
                        return actionDate.toDateString() === today.toDateString();
                      }).length}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        {/* Audit Log Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Audit Log
              </CardTitle>
              <CardDescription>
                View all moderation actions taken in this server
              </CardDescription>
              
              {/* Filters */}
              <div className="flex items-center gap-2 pt-2">
                <Search className="h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="Search actions..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="max-w-xs"
                />
                <Select value={auditFilter} onValueChange={setAuditFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="ban">Bans</SelectItem>
                    <SelectItem value="kick">Kicks</SelectItem>
                    <SelectItem value="timeout">Timeouts</SelectItem>
                    <SelectItem value="warn">Warnings</SelectItem>
                    <SelectItem value="unban">Unbans</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {filteredAuditLog.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500">
                      No moderation actions found
                    </div>
                  ) : (
                    filteredAuditLog.map((action) => (
                      <div key={action.id} className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className="mt-1">
                              <Badge className={`text-xs ${getActionBadgeColor(action.type)}`}>
                                {action.type.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm">
                                <span className="font-medium">{action.moderatorDisplayName}</span>
                                {" "}
                                {action.type}ed
                                {" "}
                                <span className="font-medium">{action.targetDisplayName}</span>
                              </p>
                              {action.reason && (
                                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                                  Reason: {action.reason}
                                </p>
                              )}
                              {action.duration && (
                                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                                  Duration: {action.duration} minutes
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-zinc-500">
                            {formatRelativeTime(action.timestamp)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Banned Members Tab */}
        <TabsContent value="banned">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5" />
                Banned Members
              </CardTitle>
              <CardDescription>
                Manage banned members and review ban appeals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bannedMembers.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    No banned members
                  </div>
                ) : (
                  bannedMembers.map((banned) => (
                    <div key={banned.userId} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={banned.avatarUrl || undefined} />
                          <AvatarFallback>
                            {banned.displayName?.substring(0, 2).toUpperCase() || 
                             banned.userId.substring(1, 3).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {banned.displayName || banned.userId}
                          </p>
                          <p className="text-xs text-zinc-500">
                            Banned {formatRelativeTime(banned.bannedAt)} by {banned.bannedBy}
                          </p>
                          {banned.reason && (
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">
                              Reason: {banned.reason}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnban(banned.userId)}
                        disabled={isPerformingAction}
                        className="text-green-600 hover:text-green-700"
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Unban
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Auto-Moderation Settings</CardTitle>
                <CardDescription>
                  Configure automatic moderation rules and filters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-zinc-500">
                    Auto-moderation settings will be available in a future update.
                    For now, manual moderation actions are available through the Actions tab.
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Moderation Logs</CardTitle>
                <CardDescription>
                  Configure how moderation actions are logged and stored
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-zinc-500">
                    Moderation logging settings will be available in a future update.
                    Currently, all actions are logged in the Audit Log tab.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ServerModeration;