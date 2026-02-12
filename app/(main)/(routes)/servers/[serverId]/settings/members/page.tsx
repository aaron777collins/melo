"use client";

/**
 * Server Settings - Members Page
 *
 * Comprehensive member management with search, filtering, and moderation actions.
 * Integrates with Matrix power levels for role management.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  Users,
  Search,
  Filter,
  MoreHorizontal,
  Crown,
  Shield,
  User,
  Ban,
  UserMinus,
  UserCog,
  ChevronDown,
  RefreshCw,
  Download,
  AlertCircle,
  Check,
  Clock,
  SortAsc,
  SortDesc,
  Mail,
  Calendar
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import {
  getMembers,
  kickMember,
  banMember,
  setPowerLevel,
  POWER_LEVELS,
  type Member,
  type MemberRole
} from "@/apps/web/services/matrix-member";

// =============================================================================
// Types
// =============================================================================

type SortField = "name" | "role" | "joinedAt" | "lastActive";
type SortOrder = "asc" | "desc";

interface MemberFilters {
  search: string;
  role: MemberRole | "all";
  status: "all" | "online" | "offline";
}

// =============================================================================
// Constants
// =============================================================================

const ROLE_CONFIG = {
  owner: {
    label: "Owner",
    color: "bg-red-500",
    textColor: "text-red-400",
    icon: Crown,
  },
  admin: {
    label: "Admin",
    color: "bg-orange-500",
    textColor: "text-orange-400",
    icon: Shield,
  },
  moderator: {
    label: "Moderator",
    color: "bg-green-500",
    textColor: "text-green-400",
    icon: Shield,
  },
  member: {
    label: "Member",
    color: "bg-gray-500",
    textColor: "text-gray-400",
    icon: User,
  },
  restricted: {
    label: "Restricted",
    color: "bg-gray-700",
    textColor: "text-gray-500",
    icon: User,
  },
};

// =============================================================================
// Component
// =============================================================================

export default function ServerSettingsMembersPage() {
  const params = useParams();
  const { client, isReady } = useMatrixClient();
  
  const serverId = params?.serverId as string;
  
  // State
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  
  // Filters and sorting
  const [filters, setFilters] = useState<MemberFilters>({
    search: "",
    role: "all",
    status: "all",
  });
  const [sortField, setSortField] = useState<SortField>("role");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  
  // Dialog states
  const [kickDialog, setKickDialog] = useState<{ member: Member | null; open: boolean }>({
    member: null,
    open: false,
  });
  const [banDialog, setBanDialog] = useState<{ member: Member | null; open: boolean }>({
    member: null,
    open: false,
  });
  const [roleDialog, setRoleDialog] = useState<{
    member: Member | null;
    open: boolean;
    newRole: MemberRole;
  }>({
    member: null,
    open: false,
    newRole: "member",
  });
  
  /**
   * Load members
   */
  const loadMembers = useCallback(async () => {
    if (!isReady || !serverId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const membersData = await getMembers(serverId);
      setMembers(membersData);
    } catch (err) {
      console.error("Failed to load members:", err);
      setError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setIsLoading(false);
    }
  }, [isReady, serverId]);
  
  useEffect(() => {
    loadMembers();
  }, [loadMembers]);
  
  /**
   * Filter and sort members
   */
  const filteredMembers = useMemo(() => {
    let result = [...members];
    
    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(
        (m) =>
          m.displayName?.toLowerCase().includes(search) ||
          m.userId.toLowerCase().includes(search)
      );
    }
    
    // Role filter
    if (filters.role !== "all") {
      result = result.filter((m) => m.role === filters.role);
    }
    
    // Status filter
    if (filters.status !== "all") {
      result = result.filter((m) =>
        filters.status === "online" ? m.isOnline : !m.isOnline
      );
    }
    
    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case "name":
          comparison = (a.displayName || a.userId).localeCompare(
            b.displayName || b.userId
          );
          break;
        case "role":
          comparison = b.powerLevel - a.powerLevel;
          break;
        case "joinedAt":
          comparison =
            (a.joinedAt?.getTime() || 0) - (b.joinedAt?.getTime() || 0);
          break;
        case "lastActive":
          comparison =
            (a.lastActiveAt?.getTime() || 0) - (b.lastActiveAt?.getTime() || 0);
          break;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });
    
    return result;
  }, [members, filters, sortField, sortOrder]);
  
  /**
   * Handle member selection
   */
  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };
  
  const toggleAllSelection = () => {
    if (selectedMembers.size === filteredMembers.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(filteredMembers.map((m) => m.userId)));
    }
  };
  
  /**
   * Handle kick member
   */
  const handleKick = async () => {
    if (!kickDialog.member) return;
    
    try {
      await kickMember(serverId, kickDialog.member.userId);
      setMembers((prev) =>
        prev.filter((m) => m.userId !== kickDialog.member!.userId)
      );
      setActionSuccess(`${kickDialog.member.displayName || kickDialog.member.userId} has been kicked`);
      setKickDialog({ member: null, open: false });
      
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to kick member");
    }
  };
  
  /**
   * Handle ban member
   */
  const handleBan = async () => {
    if (!banDialog.member) return;
    
    try {
      await banMember(serverId, banDialog.member.userId);
      setMembers((prev) =>
        prev.filter((m) => m.userId !== banDialog.member!.userId)
      );
      setActionSuccess(`${banDialog.member.displayName || banDialog.member.userId} has been banned`);
      setBanDialog({ member: null, open: false });
      
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to ban member");
    }
  };
  
  /**
   * Handle role change
   */
  const handleRoleChange = async () => {
    if (!roleDialog.member) return;
    
    try {
      const powerLevel = {
        owner: POWER_LEVELS.OWNER,
        admin: POWER_LEVELS.ADMIN,
        moderator: POWER_LEVELS.MODERATOR,
        member: POWER_LEVELS.MEMBER,
        restricted: POWER_LEVELS.RESTRICTED,
      }[roleDialog.newRole];
      
      await setPowerLevel(serverId, roleDialog.member.userId, powerLevel);
      
      setMembers((prev) =>
        prev.map((m) =>
          m.userId === roleDialog.member!.userId
            ? { ...m, role: roleDialog.newRole, powerLevel }
            : m
        )
      );
      
      setActionSuccess(
        `${roleDialog.member.displayName || roleDialog.member.userId}'s role changed to ${ROLE_CONFIG[roleDialog.newRole].label}`
      );
      setRoleDialog({ member: null, open: false, newRole: "member" });
      
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change role");
    }
  };
  
  /**
   * Format date for display
   */
  const formatDate = (date: Date | null) => {
    if (!date) return "Unknown";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-zinc-700 rounded animate-pulse" />
          <div className="h-8 w-48 bg-zinc-700 rounded animate-pulse" />
        </div>
        <div className="h-96 bg-zinc-800 rounded-lg animate-pulse" />
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="h-7 w-7" />
            Members
          </h1>
          <p className="text-zinc-400 mt-1">
            {members.length} members in this server
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMembers}
            className="border-zinc-600"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="border-zinc-600">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      <Separator className="bg-zinc-700" />
      
      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="ml-auto"
          >
            Dismiss
          </Button>
        </div>
      )}
      
      {actionSuccess && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-lg">
          <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" />
          <p className="text-emerald-400 text-sm">{actionSuccess}</p>
        </div>
      )}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-800/50 border-zinc-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-white">{members.length}</div>
            <div className="text-xs text-zinc-400">Total Members</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-800/50 border-zinc-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-400">
              {members.filter((m) => m.isOnline).length}
            </div>
            <div className="text-xs text-zinc-400">Online Now</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-800/50 border-zinc-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-400">
              {members.filter((m) => m.role === "admin" || m.role === "moderator").length}
            </div>
            <div className="text-xs text-zinc-400">Staff Members</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-800/50 border-zinc-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-400">
              {members.filter(
                (m) =>
                  m.joinedAt &&
                  Date.now() - m.joinedAt.getTime() < 7 * 24 * 60 * 60 * 1000
              ).length}
            </div>
            <div className="text-xs text-zinc-400">New This Week</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                  placeholder="Search members..."
                  className="pl-9 bg-zinc-900 border-zinc-700"
                />
              </div>
            </div>
            
            <Select
              value={filters.role}
              onValueChange={(value: MemberRole | "all") =>
                setFilters((prev) => ({ ...prev, role: value }))
              }
            >
              <SelectTrigger className="w-36 bg-zinc-900 border-zinc-700">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="restricted">Restricted</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={filters.status}
              onValueChange={(value: "all" | "online" | "offline") =>
                setFilters((prev) => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger className="w-32 bg-zinc-900 border-zinc-700">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-zinc-600">
                  {sortOrder === "asc" ? (
                    <SortAsc className="h-4 w-4 mr-2" />
                  ) : (
                    <SortDesc className="h-4 w-4 mr-2" />
                  )}
                  Sort: {sortField}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortField("name")}>
                  Name
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortField("role")}>
                  Role
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortField("joinedAt")}>
                  Join Date
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortField("lastActive")}>
                  Last Active
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() =>
                    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
                  }
                >
                  Toggle Order ({sortOrder})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Bulk actions */}
          {selectedMembers.size > 0 && (
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-zinc-700">
              <span className="text-sm text-zinc-400">
                {selectedMembers.size} selected
              </span>
              <Button variant="outline" size="sm" className="border-zinc-600">
                <UserCog className="h-4 w-4 mr-2" />
                Change Role
              </Button>
              <Button variant="outline" size="sm" className="border-zinc-600 text-amber-400">
                <UserMinus className="h-4 w-4 mr-2" />
                Kick
              </Button>
              <Button variant="outline" size="sm" className="border-zinc-600 text-red-400">
                <Ban className="h-4 w-4 mr-2" />
                Ban
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Members Table */}
      <Card className="bg-zinc-800/50 border-zinc-700">
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader className="sticky top-0 bg-zinc-800">
              <TableRow className="border-zinc-700 hover:bg-transparent">
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedMembers.size === filteredMembers.length && filteredMembers.length > 0}
                    onCheckedChange={toggleAllSelection}
                  />
                </TableHead>
                <TableHead className="text-zinc-400">Member</TableHead>
                <TableHead className="text-zinc-400">Role</TableHead>
                <TableHead className="text-zinc-400">Joined</TableHead>
                <TableHead className="text-zinc-400">Last Active</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => {
                const roleConfig = ROLE_CONFIG[member.role];
                const RoleIcon = roleConfig.icon;
                
                return (
                  <TableRow
                    key={member.userId}
                    className="border-zinc-700 hover:bg-zinc-700/30"
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedMembers.has(member.userId)}
                        onCheckedChange={() => toggleMemberSelection(member.userId)}
                        disabled={member.role === "owner"}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            {member.avatarUrl ? (
                              <AvatarImage src={member.avatarUrl} />
                            ) : null}
                            <AvatarFallback className="bg-zinc-700 text-xs">
                              {(member.displayName || member.userId)[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-zinc-800 ${
                              member.isOnline ? "bg-green-500" : "bg-zinc-500"
                            }`}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {member.displayName || member.userId.split(":")[0].slice(1)}
                          </p>
                          <p className="text-xs text-zinc-500">{member.userId}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`${roleConfig.color} text-white text-xs`}
                      >
                        <RoleIcon className="h-3 w-3 mr-1" />
                        {roleConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-400 text-sm">
                      {formatDate(member.joinedAt)}
                    </TableCell>
                    <TableCell className="text-zinc-400 text-sm">
                      {member.isOnline ? (
                        <span className="text-green-400">Now</span>
                      ) : (
                        formatDate(member.lastActiveAt)
                      )}
                    </TableCell>
                    <TableCell>
                      {member.role !== "owner" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                setRoleDialog({
                                  member,
                                  open: true,
                                  newRole: member.role,
                                })
                              }
                            >
                              <UserCog className="h-4 w-4 mr-2" />
                              Change Role
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-amber-400"
                              onClick={() => setKickDialog({ member, open: true })}
                            >
                              <UserMinus className="h-4 w-4 mr-2" />
                              Kick
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-400"
                              onClick={() => setBanDialog({ member, open: true })}
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Ban
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          {filteredMembers.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-500">No members found</p>
              <p className="text-zinc-600 text-sm mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </ScrollArea>
      </Card>
      
      {/* Kick Dialog */}
      <Dialog
        open={kickDialog.open}
        onOpenChange={(open) => setKickDialog({ member: null, open })}
      >
        <DialogContent className="bg-zinc-900 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Kick Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to kick{" "}
              <span className="font-semibold">
                {kickDialog.member?.displayName || kickDialog.member?.userId}
              </span>
              ? They can rejoin if they have an invite link.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setKickDialog({ member: null, open: false })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleKick}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Kick Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Ban Dialog */}
      <Dialog
        open={banDialog.open}
        onOpenChange={(open) => setBanDialog({ member: null, open })}
      >
        <DialogContent className="bg-zinc-900 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Ban Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to ban{" "}
              <span className="font-semibold">
                {banDialog.member?.displayName || banDialog.member?.userId}
              </span>
              ? This will prevent them from rejoining.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setBanDialog({ member: null, open: false })}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBan}>
              Ban Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Role Change Dialog */}
      <Dialog
        open={roleDialog.open}
        onOpenChange={(open) =>
          setRoleDialog({ member: null, open, newRole: "member" })
        }
      >
        <DialogContent className="bg-zinc-900 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Change Role</DialogTitle>
            <DialogDescription>
              Change the role for{" "}
              <span className="font-semibold">
                {roleDialog.member?.displayName || roleDialog.member?.userId}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select
              value={roleDialog.newRole}
              onValueChange={(value: MemberRole) =>
                setRoleDialog((prev) => ({ ...prev, newRole: value }))
              }
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="restricted">Restricted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() =>
                setRoleDialog({ member: null, open: false, newRole: "member" })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={handleRoleChange}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
