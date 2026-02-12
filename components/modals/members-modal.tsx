"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  Crown,
  Shield,
  UserPlus,
  UserMinus,
  UserX,
  MoreHorizontal,
  Filter,
  ChevronDown,
  AlertTriangle,
  Clock,
  Eye,
  EyeOff,
  Ban,
  ArrowRight,
  Calendar
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useModal } from "@/hooks/use-modal-store";
import { 
  getMembers,
  setPowerLevel,
  kickMember,
  banMember,
  unbanMember,
  getMemberRole,
  isUserAdmin,
  canUserModerate,
  type Member,
  type MemberRole,
  POWER_LEVELS,
  powerLevelToRole,
  roleToPowerLevel
} from "@/apps/web/services/matrix-member";

// =============================================================================
// Types and Constants
// =============================================================================

type FilterType = 'all' | 'online' | 'offline' | 'admin' | 'moderator' | 'member';
type SortType = 'role' | 'name' | 'joined' | 'activity';

interface ConfirmationDialog {
  isOpen: boolean;
  type: 'kick' | 'ban' | 'transferOwnership' | null;
  targetMember: Member | null;
  newOwner?: Member | null;
}

const ROLE_CONFIGS = {
  owner: {
    name: 'Owner',
    color: 'bg-red-500',
    icon: Crown,
    description: 'Full server control'
  },
  admin: {
    name: 'Admin',
    color: 'bg-orange-500',
    icon: Shield,
    description: 'Manage server and members'
  },
  moderator: {
    name: 'Moderator',
    color: 'bg-blue-500',
    icon: Shield,
    description: 'Moderate members and channels'
  },
  member: {
    name: 'Member',
    color: 'bg-gray-500',
    icon: Users,
    description: 'Standard member'
  },
  restricted: {
    name: 'Restricted',
    color: 'bg-red-700',
    icon: Ban,
    description: 'Limited permissions'
  }
} as const;

// =============================================================================
// Component
// =============================================================================

export function MembersModal() {
  const router = useRouter();
  const { isOpen, onClose, type, data } = useModal();
  const isModalOpen = isOpen && type === "members";
  const { space } = data;

  // State
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('role');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'bans'>('members');
  const [bannedMembers, setBannedMembers] = useState<Member[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmationDialog>({
    isOpen: false,
    type: null,
    targetMember: null
  });

  // Get current user's permissions
  const currentUserRole = currentUserId && space ? getMemberRole(space.id, currentUserId) : 'member';
  const canModerate = currentUserId && space ? canUserModerate(space.id, currentUserId) : false;
  const isAdmin = currentUserId && space ? isUserAdmin(space.id, currentUserId) : false;

  // Load members data
  useEffect(() => {
    if (!space || !isModalOpen) return;

    const loadMembers = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const [allMembers] = await Promise.all([
          getMembers(space.id)
        ]);
        
        setMembers(allMembers);
        // Note: getBannedMembers function not yet implemented in matrix-member service
        setBannedMembers([]);
        
        // Get current user ID from Matrix client
        // Note: This should be obtained from Matrix auth context when available
        const client = await import('@/lib/matrix/client').then(m => m.getClient());
        if (client) {
          setCurrentUserId(client.getUserId() || '@currentuser:example.com');
        } else {
          setCurrentUserId('@currentuser:example.com'); // Fallback
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load members');
      } finally {
        setIsLoading(false);
      }
    };

    loadMembers();
  }, [space, isModalOpen]);

  // Filter and sort members
  const filteredAndSortedMembers = useMemo(() => {
    let filtered = members;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(member => 
        member.displayName?.toLowerCase().includes(query) ||
        member.userId.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    switch (filterType) {
      case 'online':
        filtered = filtered.filter(member => member.isOnline);
        break;
      case 'offline':
        filtered = filtered.filter(member => !member.isOnline);
        break;
      case 'admin':
        filtered = filtered.filter(member => member.role === 'owner' || member.role === 'admin');
        break;
      case 'moderator':
        filtered = filtered.filter(member => member.role === 'moderator');
        break;
      case 'member':
        filtered = filtered.filter(member => member.role === 'member' || member.role === 'restricted');
        break;
    }

    // Apply sort
    filtered.sort((a, b) => {
      switch (sortType) {
        case 'role':
          // Sort by power level descending
          return b.powerLevel - a.powerLevel;
        case 'name':
          const nameA = a.displayName || a.userId;
          const nameB = b.displayName || b.userId;
          return nameA.localeCompare(nameB);
        case 'joined':
          if (!a.joinedAt || !b.joinedAt) return 0;
          return b.joinedAt.getTime() - a.joinedAt.getTime();
        case 'activity':
          if (!a.lastActiveAt || !b.lastActiveAt) return 0;
          return b.lastActiveAt.getTime() - a.lastActiveAt.getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [members, searchQuery, filterType, sortType]);

  // =============================================================================
  // Actions
  // =============================================================================

  const handleRoleChange = async (member: Member, newRole: MemberRole) => {
    if (!space || !currentUserId) return;

    // Prevent changing own role
    if (member.userId === currentUserId) {
      setError("You cannot change your own role");
      return;
    }

    // Prevent non-owners from changing owner role
    if ((member.role === 'owner' || newRole === 'owner') && currentUserRole !== 'owner') {
      setError("Only the owner can transfer ownership");
      return;
    }

    // Handle ownership transfer specially
    if (newRole === 'owner') {
      setConfirmDialog({
        isOpen: true,
        type: 'transferOwnership',
        targetMember: member,
        newOwner: member
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newPowerLevel = roleToPowerLevel(newRole);
      await setPowerLevel(space.id, member.userId, newPowerLevel);
      
      // Update local state
      setMembers(prev => prev.map(m => 
        m.userId === member.userId 
          ? { ...m, powerLevel: newPowerLevel, role: newRole }
          : m
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change role');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKickMember = async (member: Member) => {
    setConfirmDialog({
      isOpen: true,
      type: 'kick',
      targetMember: member
    });
  };

  const handleBanMember = async (member: Member) => {
    setConfirmDialog({
      isOpen: true,
      type: 'ban',
      targetMember: member
    });
  };

  const handleUnbanMember = async (member: Member) => {
    if (!space) return;

    setIsLoading(true);
    setError(null);

    try {
      await unbanMember(space.id, member.userId);
      
      // Update local state
      setBannedMembers(prev => prev.filter(m => m.userId !== member.userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unban member');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmAction = async () => {
    if (!confirmDialog.targetMember || !space || !confirmDialog.type) return;

    const member = confirmDialog.targetMember;
    setIsLoading(true);
    setError(null);

    try {
      switch (confirmDialog.type) {
        case 'kick':
          await kickMember(space.id, member.userId);
          setMembers(prev => prev.filter(m => m.userId !== member.userId));
          break;
        
        case 'ban':
          await banMember(space.id, member.userId);
          setMembers(prev => prev.filter(m => m.userId !== member.userId));
          setBannedMembers(prev => [...prev, member]);
          break;
        
        case 'transferOwnership':
          if (!confirmDialog.newOwner || !currentUserId) break;
          
          // Transfer ownership: new owner gets owner role, current owner becomes admin
          await Promise.all([
            setPowerLevel(space.id, confirmDialog.newOwner.userId, POWER_LEVELS.OWNER),
            setPowerLevel(space.id, currentUserId, POWER_LEVELS.ADMIN)
          ]);
          
          // Update local state
          setMembers(prev => prev.map(m => {
            if (m.userId === confirmDialog.newOwner?.userId) {
              return { ...m, powerLevel: POWER_LEVELS.OWNER, role: 'owner' as MemberRole };
            } else if (m.userId === currentUserId) {
              return { ...m, powerLevel: POWER_LEVELS.ADMIN, role: 'admin' as MemberRole };
            }
            return m;
          }));
          
          setCurrentUserId(confirmDialog.newOwner.userId); // Update current user
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${confirmDialog.type} member`);
    } finally {
      setIsLoading(false);
      setConfirmDialog({ isOpen: false, type: null, targetMember: null });
    }
  };

  const handleClose = () => {
    onClose();
    setSearchQuery("");
    setFilterType('all');
    setSortType('role');
    setActiveTab('members');
    setError(null);
  };

  if (!space) return null;

  return (
    <>
      <Dialog open={isModalOpen} onOpenChange={handleClose}>
        <DialogContent className="bg-white dark:bg-[#2B2D31] text-black dark:text-white p-0 overflow-hidden max-w-4xl max-h-[85vh]">
          <DialogHeader className="pt-8 px-6">
            <DialogTitle className="text-2xl text-center font-bold">
              {space.name} Members
            </DialogTitle>
            <DialogDescription className="text-center text-zinc-500">
              Manage members, roles, and permissions
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="mx-6 px-4 py-3 bg-red-500/10 border border-red-500 rounded-md">
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}

          <div className="px-6 pb-6">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'members' | 'bans')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="members" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Members ({members.length})
                </TabsTrigger>
                <TabsTrigger value="bans" className="flex items-center gap-2">
                  <Ban className="h-4 w-4" />
                  Banned ({bannedMembers.length})
                </TabsTrigger>
              </TabsList>

              {/* Members Tab */}
              <TabsContent value="members" className="space-y-4">
                {/* Controls */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 text-zinc-400 transform -translate-y-1/2" />
                    <Input
                      placeholder="Search members..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-zinc-300/50 dark:bg-zinc-700 border-0"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex items-center gap-2">
                          <Filter className="h-4 w-4" />
                          Filter
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setFilterType('all')}>
                          All Members
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilterType('online')}>
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                          Online
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilterType('offline')}>
                          <div className="w-2 h-2 bg-gray-500 rounded-full mr-2" />
                          Offline
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setFilterType('admin')}>
                          <Shield className="h-4 w-4 mr-2 text-orange-500" />
                          Administrators
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilterType('moderator')}>
                          <Shield className="h-4 w-4 mr-2 text-blue-500" />
                          Moderators
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilterType('member')}>
                          <Users className="h-4 w-4 mr-2" />
                          Members
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex items-center gap-2">
                          Sort by
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSortType('role')}>
                          By Role
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortType('name')}>
                          By Name
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortType('joined')}>
                          By Join Date
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortType('activity')}>
                          By Activity
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Member List */}
                <ScrollArea className="h-96 w-full">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                    </div>
                  ) : filteredAndSortedMembers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
                      <Users className="h-12 w-12 mb-2" />
                      <p>No members found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredAndSortedMembers.map((member) => {
                        const roleConfig = ROLE_CONFIGS[member.role];
                        const RoleIcon = roleConfig.icon;
                        const canManageMember = canModerate && member.role !== 'owner' && member.userId !== currentUserId;
                        const canChangeRole = isAdmin && member.userId !== currentUserId;
                        
                        return (
                          <div key={member.userId} className="flex items-center justify-between p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                            <div className="flex items-center space-x-3 flex-1">
                              <div className="relative">
                                <Avatar className="h-12 w-12">
                                  <AvatarImage src={member.avatarUrl || undefined} />
                                  <AvatarFallback>
                                    {member.displayName?.substring(0, 2).toUpperCase() || member.userId.substring(1, 3).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                {/* Online indicator */}
                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-[#2B2D31] ${
                                  member.isOnline ? 'bg-green-500' : 'bg-gray-500'
                                }`} />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <p className="font-medium truncate">
                                    {member.displayName || member.userId}
                                    {member.role === 'owner' && <Crown className="h-4 w-4 text-yellow-500 ml-1 inline" />}
                                  </p>
                                  {member.isTyping && (
                                    <div className="flex space-x-1">
                                      <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce" />
                                      <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                                      <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex items-center space-x-2 mt-1">
                                  <Badge 
                                    variant="secondary" 
                                    className={`text-xs ${roleConfig.color} text-white flex items-center gap-1`}
                                  >
                                    <RoleIcon className="h-3 w-3" />
                                    {roleConfig.name}
                                  </Badge>
                                  
                                  {member.joinedAt && (
                                    <div className="flex items-center text-xs text-zinc-500 gap-1">
                                      <Calendar className="h-3 w-3" />
                                      Joined {member.joinedAt.toLocaleDateString()}
                                    </div>
                                  )}
                                  
                                  {member.lastActiveAt && !member.isOnline && (
                                    <div className="flex items-center text-xs text-zinc-500 gap-1">
                                      <Clock className="h-3 w-3" />
                                      {new Date(member.lastActiveAt).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center space-x-2">
                              {canChangeRole && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                                      <RoleIcon className="h-4 w-4" />
                                      Role
                                      <ChevronDown className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {Object.entries(ROLE_CONFIGS).map(([role, config]) => {
                                      const ConfigIcon = config.icon;
                                      // Only owner can assign owner role
                                      if (role === 'owner' && currentUserRole !== 'owner') return null;
                                      // Skip current role
                                      if (role === member.role) return null;
                                      
                                      return (
                                        <DropdownMenuItem 
                                          key={role}
                                          onClick={() => handleRoleChange(member, role as MemberRole)}
                                          className="flex items-center gap-2"
                                        >
                                          <ConfigIcon className="h-4 w-4" />
                                          {config.name}
                                          {role === 'owner' && <ArrowRight className="h-4 w-4 text-yellow-500" />}
                                        </DropdownMenuItem>
                                      );
                                    })}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                              
                              {canManageMember && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem 
                                      onClick={() => handleKickMember(member)}
                                      className="text-yellow-600 flex items-center gap-2"
                                    >
                                      <UserX className="h-4 w-4" />
                                      Kick Member
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleBanMember(member)}
                                      className="text-red-600 flex items-center gap-2"
                                    >
                                      <Ban className="h-4 w-4" />
                                      Ban Member
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Banned Members Tab */}
              <TabsContent value="bans" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Banned Members ({bannedMembers.length})</h3>
                </div>
                
                <ScrollArea className="h-96 w-full">
                  {bannedMembers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
                      <Ban className="h-12 w-12 mb-2" />
                      <p>No banned members</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {bannedMembers.map((member) => (
                        <div key={member.userId} className="flex items-center justify-between p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={member.avatarUrl || undefined} />
                              <AvatarFallback>
                                {member.displayName?.substring(0, 2).toUpperCase() || member.userId.substring(1, 3).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {member.displayName || member.userId}
                              </p>
                              <p className="text-sm text-zinc-500">Banned member</p>
                            </div>
                          </div>
                          
                          {canModerate && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleUnbanMember(member)}
                              disabled={isLoading}
                            >
                              Unban
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      {confirmDialog.isOpen && (
        <Dialog open={confirmDialog.isOpen} onOpenChange={() => setConfirmDialog({ isOpen: false, type: null, targetMember: null })}>
          <DialogContent className="bg-white dark:bg-[#2B2D31] text-black dark:text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Confirm Action
              </DialogTitle>
              <DialogDescription>
                {confirmDialog.type === 'kick' && confirmDialog.targetMember && (
                  <>
                    Are you sure you want to kick <strong>{confirmDialog.targetMember.displayName || confirmDialog.targetMember.userId}</strong> from the server? They will be able to rejoin with a new invite.
                  </>
                )}
                {confirmDialog.type === 'ban' && confirmDialog.targetMember && (
                  <>
                    Are you sure you want to ban <strong>{confirmDialog.targetMember.displayName || confirmDialog.targetMember.userId}</strong> from the server? They will not be able to rejoin unless unbanned.
                  </>
                )}
                {confirmDialog.type === 'transferOwnership' && confirmDialog.targetMember && (
                  <>
                    Are you sure you want to transfer ownership to <strong>{confirmDialog.targetMember.displayName || confirmDialog.targetMember.userId}</strong>? This action cannot be undone and you will become an administrator.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-end space-x-2 pt-6">
              <Button 
                variant="outline" 
                onClick={() => setConfirmDialog({ isOpen: false, type: null, targetMember: null })}
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmAction}
                variant={confirmDialog.type === 'ban' || confirmDialog.type === 'transferOwnership' ? 'destructive' : 'default'}
                disabled={isLoading}
              >
                {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />}
                {confirmDialog.type === 'kick' && 'Kick Member'}
                {confirmDialog.type === 'ban' && 'Ban Member'}
                {confirmDialog.type === 'transferOwnership' && 'Transfer Ownership'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}