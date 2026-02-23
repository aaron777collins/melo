"use client";

import React, { useState, useEffect } from "react";
import {
  Check,
  Gavel,
  Loader2,
  MoreVertical,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Ban,
  Volume2,
  VolumeX
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
  DropdownMenuSubTrigger
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useModal } from "@/hooks/use-modal-store";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { getClient } from "@/lib/matrix/client";
import { MemberRole } from "@/lib/melo-types";

type MemberRoleType = keyof typeof MemberRole;

const roleIconMap: Record<MemberRoleType, JSX.Element | null> = {
  GUEST: null,
  MODERATOR: <ShieldCheck className="h-4 w-4 ml-2 text-indigo-500" />,
  ADMIN: <ShieldAlert className="h-4 w-4 ml-2 text-rose-500" />
};

interface MemberInfo {
  id: string;
  name: string;
  avatarUrl?: string;
  role: MemberRoleType;
  powerLevel: number;
}

export function MembersModal() {
  const { isOpen, onOpen, onClose, type, data } = useModal();
  const { client } = useMatrixClient();
  const [loadingId, setLoadingId] = useState("");
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserPowerLevel, setCurrentUserPowerLevel] = useState(0);

  const isModalOpen = isOpen && type === "members";
  const { space, server } = data;

  // Get room ID from space or server
  const roomId = space?.id || server?.id;

  // Load members when modal opens
  useEffect(() => {
    if (isModalOpen && roomId) {
      loadMembers();
    }
  }, [isModalOpen, roomId]);

  const loadMembers = async () => {
    const matrixClient = client || getClient();
    if (!matrixClient || !roomId) return;

    setIsLoadingMembers(true);
    try {
      const decodedRoomId = decodeURIComponent(roomId);
      const room = matrixClient.getRoom(decodedRoomId);
      if (!room) return;

      const userId = matrixClient.getUserId();
      setCurrentUserId(userId);

      // Get power levels
      const powerLevelsEvent = room.currentState.getStateEvents("m.room.power_levels", "");
      const powerLevels = powerLevelsEvent?.getContent() || {};
      const usersPowerLevels = powerLevels.users || {};

      // Get current user's power level
      const myPowerLevel = usersPowerLevels[userId || ""] || powerLevels.users_default || 0;
      setCurrentUserPowerLevel(myPowerLevel);

      // Get all joined members
      const joinedMembers = room.getJoinedMembers();
      const memberInfos: MemberInfo[] = joinedMembers.map((member: any) => {
        const memberPowerLevel = usersPowerLevels[member.userId] || powerLevels.users_default || 0;
        
        // Determine role based on power level
        let role: MemberRoleType = "GUEST";
        if (memberPowerLevel >= 100) {
          role = "ADMIN";
        } else if (memberPowerLevel >= 50) {
          role = "MODERATOR";
        }

        return {
          id: member.userId,
          name: member.name || member.userId.split(':')[0].slice(1),
          avatarUrl: member.getAvatarUrl(
            matrixClient.baseUrl,
            40,
            40,
            "crop",
            false,
            false
          ) || undefined,
          role,
          powerLevel: memberPowerLevel
        };
      });

      // Sort: admins first, then mods, then guests
      memberInfos.sort((a, b) => b.powerLevel - a.powerLevel);
      setMembers(memberInfos);
    } catch (error) {
      console.error("Failed to load members:", error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const onKick = (member: MemberInfo) => {
    // Open the dedicated kick modal
    onOpen("kickUser", {
      targetUser: {
        id: member.id,
        name: member.name,
        avatarUrl: member.avatarUrl
      },
      serverId: roomId
    });
  };

  const onBan = (member: MemberInfo) => {
    // Open the dedicated ban modal
    onOpen("banUser", {
      targetUser: {
        id: member.id,
        name: member.name,
        avatarUrl: member.avatarUrl
      },
      serverId: roomId
    });
  };

  const onMute = (member: MemberInfo) => {
    // Open the dedicated mute modal
    onOpen("muteUser", {
      targetUser: {
        id: member.id,
        name: member.name,
        avatarUrl: member.avatarUrl
      },
      serverId: roomId
    });
  };

  const onRoleChange = async (memberId: string, role: MemberRoleType) => {
    if (!roomId) return;
    
    try {
      setLoadingId(memberId);
      const matrixClient = client || getClient();
      if (!matrixClient) return;

      const decodedRoomId = decodeURIComponent(roomId);
      
      // Convert role to power level
      let newPowerLevel = 0;
      switch (role) {
        case "ADMIN":
          newPowerLevel = 100;
          break;
        case "MODERATOR":
          newPowerLevel = 50;
          break;
        case "GUEST":
        default:
          newPowerLevel = 0;
          break;
      }

      // Get current power levels
      const room = matrixClient.getRoom(decodedRoomId);
      if (!room) return;

      const powerLevelsEvent = room.currentState.getStateEvents("m.room.power_levels", "");
      const currentPowerLevels = powerLevelsEvent?.getContent() || {};
      
      // Update power level for this user
      const updatedPowerLevels = {
        ...currentPowerLevels,
        users: {
          ...currentPowerLevels.users,
          [memberId]: newPowerLevel
        }
      };

      await matrixClient.sendStateEvent(
        decodedRoomId,
        "m.room.power_levels",
        updatedPowerLevels,
        ""
      );

      // Refresh member list
      await loadMembers();
    } catch (error) {
      console.error("Failed to change role:", error);
    } finally {
      setLoadingId("");
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#313338] text-white overflow-hidden">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold text-white">
            Manage Members
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-400">
            {members.length} Members
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="mt-8 max-h-[420px] pr-6">
          {isLoadingMembers ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : (
            members.map((member) => (
              <div key={member.id} className="flex items-center gap-x-2 mb-6" data-testid={`member-${member.id}`}>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.avatarUrl} />
                  <AvatarFallback className="bg-[#5865F2] text-white text-xs">
                    {member.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-y-1">
                  <div className="text-xs font-semibold flex items-center text-white">
                    {member.name}
                    {roleIconMap[member.role]}
                  </div>
                  <p className="text-xs text-zinc-400">{member.id}</p>
                </div>
                {currentUserId !== member.id &&
                  loadingId !== member.id &&
                  currentUserPowerLevel > member.powerLevel && (
                    <div className="ml-auto">
                      <DropdownMenu>
                        <DropdownMenuTrigger data-testid={`member-actions-${member.id}`}>
                          <MoreVertical className="h-4 w-4 text-zinc-400 hover:text-white" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="left" className="bg-[#2B2D31] border-zinc-600">
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="flex items-center text-white hover:bg-[#313338] focus:bg-[#313338]">
                              <ShieldQuestion className="w-4 h-4 mr-2" />
                              <span>Role</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent className="bg-[#2B2D31] border-zinc-600">
                                <DropdownMenuItem
                                  onClick={() => onRoleChange(member.id, "GUEST")}
                                  className="text-white hover:bg-[#313338] focus:bg-[#313338]"
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  Guest
                                  {member.role === "GUEST" && (
                                    <Check className="h-4 w-4 ml-auto text-green-400" />
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => onRoleChange(member.id, "MODERATOR")}
                                  className="text-white hover:bg-[#313338] focus:bg-[#313338]"
                                >
                                  <ShieldCheck className="h-4 w-4 mr-2" />
                                  Moderator
                                  {member.role === "MODERATOR" && (
                                    <Check className="h-4 w-4 ml-auto text-green-400" />
                                  )}
                                </DropdownMenuItem>
                                {currentUserPowerLevel >= 100 && (
                                  <DropdownMenuItem
                                    onClick={() => onRoleChange(member.id, "ADMIN")}
                                    className="text-white hover:bg-[#313338] focus:bg-[#313338]"
                                  >
                                    <ShieldAlert className="h-4 w-4 mr-2" />
                                    Admin
                                    {member.role === "ADMIN" && (
                                      <Check className="h-4 w-4 ml-auto text-green-400" />
                                    )}
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator className="bg-zinc-600" />
                          <DropdownMenuItem 
                            onClick={() => onMute(member)}
                            className="text-yellow-400 hover:bg-[#313338] focus:bg-[#313338]"
                            data-testid={`mute-user-${member.id}`}
                          >
                            <VolumeX className="h-4 w-4 mr-2" />
                            Mute
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onKick(member)}
                            className="text-orange-400 hover:bg-[#313338] focus:bg-[#313338]"
                            data-testid={`kick-user-${member.id}`}
                          >
                            <Gavel className="h-4 w-4 mr-2" />
                            Kick
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onBan(member)}
                            className="text-red-400 hover:bg-[#313338] focus:bg-[#313338] hover:text-red-300"
                            data-testid={`ban-user-${member.id}`}
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Ban
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                {loadingId === member.id && (
                  <Loader2 className="animate-spin text-zinc-400 ml-auto w-4 h-4" />
                )}
              </div>
            ))
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
