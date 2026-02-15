"use client";

import React, { useState, useEffect } from "react";
import { Member, Profile } from "@/lib/haos-types";
import { Crown, ShieldAlert, ShieldCheck, UserX, Ban, MoreVertical } from "lucide-react";

import { UserAvatar } from "@/components/user-avatar";
import { ActionTooltip } from "@/components/action-tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useModal } from "@/hooks/use-modal-store";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { createModerationService } from "@/lib/matrix/moderation";

interface MemberSidebarProps {
  members: (Member & { profile: Profile })[];
  onlineMembers?: string[]; // Array of online member IDs
  className?: string;
  /** Server/Space ID for moderation actions */
  serverId?: string;
  /** Room ID for context */
  roomId?: string;
}

const roleIconMap = {
  GUEST: null,
  MODERATOR: <ShieldCheck className="h-4 w-4 text-indigo-500" />,
  ADMIN: <ShieldAlert className="h-4 w-4 text-rose-500" />
};

const roleColorMap = {
  GUEST: "text-zinc-500 dark:text-zinc-400", 
  MODERATOR: "text-indigo-500",
  ADMIN: "text-rose-500"
};

export function MemberSidebar({ members, onlineMembers = [], className, serverId, roomId }: MemberSidebarProps) {
  // Group members by online status and role
  const groupedMembers = React.useMemo(() => {
    const online = members.filter(member => onlineMembers.includes(member.id));
    const offline = members.filter(member => !onlineMembers.includes(member.id));
    
    // Sort by role hierarchy: ADMIN > MODERATOR > GUEST
    const roleOrder = { ADMIN: 0, MODERATOR: 1, GUEST: 2 };
    const sortByRole = (a: typeof members[0], b: typeof members[0]) => {
      const roleA = roleOrder[a.role as keyof typeof roleOrder] ?? 2;
      const roleB = roleOrder[b.role as keyof typeof roleOrder] ?? 2;
      return roleA - roleB;
    };
    
    return {
      online: online.sort(sortByRole),
      offline: offline.sort(sortByRole)
    };
  }, [members, onlineMembers]);

  return (
    <div className={`flex flex-col h-full w-60 bg-[#f2f3f5] dark:bg-[#2b2d31] ${className}`}>
      <div className="flex-1">
        <ScrollArea className="h-full px-3 py-4">
          {/* Online Members */}
          {groupedMembers.online.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  Online — {groupedMembers.online.length}
                </h3>
              </div>
              <div className="space-y-1">
                {groupedMembers.online.map((member) => (
                  <MemberItem 
                    key={member.id} 
                    member={member} 
                    isOnline={true}
                    serverId={serverId}
                    roomId={roomId}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Separator between online and offline */}
          {groupedMembers.online.length > 0 && groupedMembers.offline.length > 0 && (
            <Separator className="my-4 bg-zinc-300 dark:bg-zinc-700" />
          )}

          {/* Offline Members */}
          {groupedMembers.offline.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  Offline — {groupedMembers.offline.length}
                </h3>
              </div>
              <div className="space-y-1">
                {groupedMembers.offline.map((member) => (
                  <MemberItem 
                    key={member.id} 
                    member={member} 
                    isOnline={false}
                    serverId={serverId}
                    roomId={roomId}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {members.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No members in this channel
              </p>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

interface MemberItemProps {
  member: Member & { profile: Profile };
  isOnline: boolean;
  serverId?: string;
  roomId?: string;
}

function MemberItem({ member, isOnline, serverId, roomId }: MemberItemProps) {
  const { onOpen } = useModal();
  const { client } = useMatrixClient();
  const [canKick, setCanKick] = useState(false);
  const [canBan, setCanBan] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'moderator' | 'member'>('member');

  const roleIcon = roleIconMap[member.role as keyof typeof roleIconMap];
  const roleColor = roleColorMap[member.role as keyof typeof roleColorMap];

  // Check permissions when component mounts or dependencies change
  useEffect(() => {
    const checkPermissions = async () => {
      if (!client || !serverId) return;
      
      const currentUserId = client.getUserId();
      if (!currentUserId) return;

      // Skip permission checks for self
      if (currentUserId === member.id) {
        setCanKick(false);
        setCanBan(false);
        return;
      }

      const moderationService = createModerationService(client);
      
      try {
        const [kickPermission, banPermission, currentUserRole] = await Promise.all([
          moderationService.hasPermission(serverId, currentUserId, 'KICK', member.id),
          moderationService.hasPermission(serverId, currentUserId, 'BAN', member.id),
          moderationService.getUserRole(serverId, currentUserId)
        ]);

        setCanKick(kickPermission);
        setCanBan(banPermission);
        setUserRole(currentUserRole);
      } catch (error) {
        console.error('Error checking permissions:', error);
        setCanKick(false);
        setCanBan(false);
      }
    };

    checkPermissions();
  }, [client, serverId, member.id]);

  const handleKickUser = () => {
    if (!serverId || !canKick) return;

    onOpen("kickUser", {
      targetUser: {
        id: member.id,
        name: member.profile.name,
        avatarUrl: member.profile.imageUrl
      },
      serverId,
      roomId
    });
  };

  const handleBanUser = () => {
    if (!serverId || !canBan) return;

    // TODO: Implement ban user modal (similar to kick)
    console.log('Ban user not implemented yet:', member.profile.name);
  };

  const handleViewProfile = () => {
    onOpen("userProfile", {
      userId: member.id,
      spaceId: serverId
    });
  };

  // Check if current user can moderate this member
  const showModerationMenu = (canKick || canBan) && client?.getUserId() !== member.id;

  return (
    <div className="group flex items-center gap-x-2 w-full p-2 rounded-md transition hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 relative">
      {/* Avatar with online indicator */}
      <div className="relative">
        <ActionTooltip
          side="left"
          label={`${member.profile.name}${member.role !== 'GUEST' ? ` • ${member.role}` : ''}`}
        >
          <div onClick={handleViewProfile} className="cursor-pointer hover:opacity-80 transition-opacity">
            <UserAvatar 
              src={member.profile.imageUrl}
              className="h-8 w-8"
            />
            {/* Online status indicator */}
            <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-[#2b2d31] ${
              isOnline ? 'bg-green-500' : 'bg-zinc-500'
            }`} />
          </div>
        </ActionTooltip>
      </div>

      <div className="flex-1 min-w-0" onClick={handleViewProfile}>
        {/* Name with role color */}
        <div className="flex items-center gap-1 cursor-pointer">
          <p className={`text-sm font-medium truncate ${
            isOnline 
              ? `text-zinc-900 dark:text-zinc-100 ${member.role !== 'GUEST' ? roleColor : ''}` 
              : 'text-zinc-500 dark:text-zinc-400'
          }`}>
            {member.profile.name}
          </p>
          {roleIcon && (
            <div className="flex-shrink-0">
              {roleIcon}
            </div>
          )}
        </div>
        
        {/* Optional status or activity */}
        {member.role === 'ADMIN' && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Administrator
          </p>
        )}
        {member.role === 'MODERATOR' && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Moderator
          </p>
        )}
      </div>

      {/* Moderation Menu */}
      {showModerationMenu && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center h-6 w-6 rounded hover:bg-zinc-600/50 transition-colors">
                <MoreVertical className="h-4 w-4 text-zinc-400 hover:text-zinc-300" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="left" className="w-48">
              <DropdownMenuItem onClick={handleViewProfile}>
                View Profile
              </DropdownMenuItem>
              
              {(canKick || canBan) && <DropdownMenuSeparator />}
              
              {canKick && (
                <DropdownMenuItem 
                  onClick={handleKickUser}
                  className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Kick User
                </DropdownMenuItem>
              )}
              
              {canBan && (
                <DropdownMenuItem 
                  onClick={handleBanUser}
                  className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Ban User
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}