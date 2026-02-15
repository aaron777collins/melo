"use client";

import React from "react";
import { Member, Profile } from "@/lib/haos-types";
import { Crown, ShieldAlert, ShieldCheck } from "lucide-react";

import { UserAvatar } from "@/components/user-avatar";
import { ActionTooltip } from "@/components/action-tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface MemberSidebarProps {
  members: (Member & { profile: Profile })[];
  onlineMembers?: string[]; // Array of online member IDs
  className?: string;
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

export function MemberSidebar({ members, onlineMembers = [], className }: MemberSidebarProps) {
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
}

function MemberItem({ member, isOnline }: MemberItemProps) {
  const roleIcon = roleIconMap[member.role as keyof typeof roleIconMap];
  const roleColor = roleColorMap[member.role as keyof typeof roleColorMap];

  return (
    <ActionTooltip
      side="left"
      label={`${member.profile.name}${member.role !== 'GUEST' ? ` • ${member.role}` : ''}`}
    >
      <div className="group flex items-center gap-x-2 w-full p-2 rounded-md transition hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 cursor-pointer">
        {/* Avatar with online indicator */}
        <div className="relative">
          <UserAvatar 
            src={member.profile.imageUrl}
            className="h-8 w-8"
          />
          {/* Online status indicator */}
          <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-[#2b2d31] ${
            isOnline ? 'bg-green-500' : 'bg-zinc-500'
          }`} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Name with role color */}
          <div className="flex items-center gap-1">
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
      </div>
    </ActionTooltip>
  );
}