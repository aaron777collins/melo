"use client";

import React from "react";
import { Edit, Hash, Lock, Mic, Trash, Video, UserPlus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { ActionTooltip } from "@/components/action-tooltip";
import { ModalType, useModal } from "@/hooks/use-modal-store";

// Matrix types
import { SpaceChannel, ChannelType } from "@/lib/matrix/types/space";
import { MemberRole } from "../../apps/web/services/matrix-member";
import { MatrixRoom } from "../../apps/web/services/matrix-room";
import { useRoom } from "@/hooks/use-room";

interface ServerChannelProps {
  channel: SpaceChannel;
  server: {
    id: string;
    name: string;
  };
  role?: MemberRole;
}

const iconMap = {
  text: Hash,
  voice: Mic,
  audio: Mic, // Audio channels use the same icon as voice
  video: Video,
  announcement: Hash, // Use hash for announcement channels too
} as const;

export function ServerChannel({
  channel,
  server,
  role
}: ServerChannelProps) {
  const { onOpen } = useModal();
  const params = useParams();
  const router = useRouter();
  
  // Get room data for real-time updates
  const { room, isLoading, error } = useRoom(channel.id);

  const Icon = iconMap[channel.type] || Hash;

  const onClick = () =>
    router.push(`/servers/${params?.serverId}/channels/${channel.id}`);

  const onAction = (e: React.MouseEvent, action: ModalType) => {
    e.stopPropagation();

    onOpen(action, { 
      spaceChannel: channel,
      space: {
        id: server.id,
        name: server.name,
        avatarUrl: null,
        topic: null,
        memberCount: 0,
        isOwner: false,
        childRoomIds: [],
        joinRule: 'invite' as const,
        canonicalAlias: null,
        currentUserPowerLevel: 0,
        hasUnread: false,
        unreadMentionCount: 0
      }
    });
  };

  // Check permissions for actions
  const canEdit = role === 'owner' || role === 'admin' || role === 'moderator';
  const canDelete = (role === 'owner' || role === 'admin') && channel.name !== "general";
  const canInvite = role !== 'restricted';

  // Use real-time data if available, fallback to prop data
  const displayName = room?.name || channel.name;
  const hasUnread = room ? false : channel.hasUnread; // TODO: Implement unread detection from room data
  const mentionCount = room ? 0 : channel.mentionCount; // TODO: Implement mention count from room data
  
  // Determine if this is the active channel
  const isActive = params?.channelId === channel.id;
  
  // Special styling for general channel (protected)
  const isGeneralChannel = channel.name === "general";

  return (
    <button
      className={cn(
        "group px-2 py-2 rounded-md flex items-center gap-x-2 w-full hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 transition mb-1",
        isActive && "bg-zinc-700/20 dark:bg-zinc-700"
      )}
      onClick={onClick}
    >
      <Icon className={cn(
        "flex-shrink-0 w-5 h-5 text-zinc-500 dark:text-zinc-400",
        isActive && "text-primary dark:text-zinc-200"
      )} />
      
      <p
        className={cn(
          "line-clamp-1 font-semibold text-sm text-zinc-500 group-hover:text-zinc-600 dark:text-zinc-400 dark:group-hover:text-zinc-300 transition",
          isActive && "text-primary dark:text-zinc-200 dark:group-hover:text-white",
          hasUnread && !isActive && "text-white dark:text-white font-bold"
        )}
      >
        {displayName}
      </p>

      {/* Unread indicators */}
      {hasUnread && !isActive && (
        <div className="ml-auto flex items-center gap-x-1">
          <div className="w-2 h-2 bg-white rounded-full" />
        </div>
      )}

      {/* Mention count badge */}
      {mentionCount > 0 && !isActive && (
        <div className="ml-auto flex items-center">
          <div className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
            {mentionCount > 99 ? "99+" : mentionCount}
          </div>
        </div>
      )}

      {/* Hover actions for channels (except general) */}
      {!isGeneralChannel && (
        <div className="ml-auto flex items-center gap-x-2">
          {canInvite && (
            <ActionTooltip label="Invite">
              <UserPlus
                onClick={(e) => onAction(e, "invite")}
                className="hidden group-hover:block w-4 h-4 text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 transition"
              />
            </ActionTooltip>
          )}
          {canEdit && (
            <ActionTooltip label="Edit">
              <Edit
                onClick={(e) => onAction(e, "editChannel")}
                className="hidden group-hover:block w-4 h-4 text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 transition"
              />
            </ActionTooltip>
          )}
          {canDelete && (
            <ActionTooltip label="Delete">
              <Trash
                onClick={(e) => onAction(e, "deleteChannel")}
                className="hidden group-hover:block w-4 h-4 text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 transition"
              />
            </ActionTooltip>
          )}
        </div>
      )}

      {/* Lock icon for general channel */}
      {isGeneralChannel && (
        <Lock className="ml-auto w-4 h-4 text-zinc-500 dark:text-zinc-400" />
      )}
    </button>
  );
}