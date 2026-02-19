"use client";

import React, { useEffect, useState } from "react";

import { CreateServerModal } from "@/components/modals/create-server-modal";
import { CreateChannelModal } from "@/components/modals/create-channel-modal";
import { InviteModal } from "@/components/modals/invite-modal";
import { EditServerModal } from "@/components/modals/edit-server-modal";
import { MembersModal } from "@/components/modals/members-modal";
import { LeaveServerModal } from "@/components/modals/leave-server-modal";
import { DeleteServerModal } from "@/components/modals/delete-server-modal";
import { DeleteChannelModal } from "@/components/modals/delete-channel-modal";
import { EditChannelModal } from "@/components/modals/edit-channel-modal";
// InitialModal is only rendered on the setup page, not globally
// import { InitialModal } from "@/components/modals/initial-modal";
import { ThreadViewModal } from "@/components/modals/thread-view-modal";
import { ReportMessageModal } from "@/components/modals/report-message-modal";
import { UserSettingsModal } from "@/components/modals/user-settings-modal";
import { CreateRoleModal } from "@/components/modals/create-role-modal";
import { EditRoleModal } from "@/components/modals/edit-role-modal";
import { DeleteRoleModal } from "@/components/modals/delete-role-modal";
import { KickUserModal } from "@/components/modals/kick-user-modal";
import { BanUserModal } from "@/components/modals/ban-user-modal";
import { MuteUserModal } from "@/components/modals/mute-user-modal";
import { BulkKickUsersModal } from "@/components/modals/bulk-kick-users-modal";
import { BulkBanUsersModal } from "@/components/modals/bulk-ban-users-modal";
import { ConfirmDeleteModal } from "@/components/modals/confirm-delete-modal";
import { MemberRoleEditorModal } from "@/components/modals/member-role-editor-modal";
import { RevokeInviteModal } from "@/components/modals/revoke-invite-modal";
import { GifPickerModal } from "@/components/modals/gif-picker-modal";
import { PinnedMessages } from "@/components/pinned-messages";
import { SecurityPromptModal } from "@/components/modals/security-prompt-modal";
import { ServerDiscoveryModal } from "@/components/modals/server-discovery-modal";
import { RecoveryKeyModal } from "@/components/modals/recovery-key-modal";
import { IncomingCallModal } from "@/components/modals/incoming-call-modal";
import { VoiceChannelSettingsModal } from "@/components/modals/voice-channel-settings-modal";

export function ModalProvider() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <>
      {/* Server modals */}
      <CreateServerModal />
      <EditServerModal />
      <LeaveServerModal />
      <DeleteServerModal />
      
      {/* Channel modals */}
      <CreateChannelModal />
      <DeleteChannelModal />
      <EditChannelModal />
      
      {/* Member management modals */}
      <InviteModal />
      <MembersModal />
      
      {/* Role management modals */}
      <CreateRoleModal />
      <EditRoleModal />
      <DeleteRoleModal />
      <MemberRoleEditorModal />
      
      {/* User moderation modals */}
      <KickUserModal />
      <BanUserModal />
      <MuteUserModal />
      <BulkKickUsersModal />
      <BulkBanUsersModal />
      
      {/* Thread and message modals */}
      <ThreadViewModal />
      <ReportMessageModal />
      <ConfirmDeleteModal />
      
      {/* Settings modals */}
      <UserSettingsModal />
      
      {/* Invite management */}
      <RevokeInviteModal />
      
      {/* Misc modals */}
      <GifPickerModal />
      <PinnedMessages />
      <SecurityPromptModal />
      <ServerDiscoveryModal />
      <RecoveryKeyModal />
      <IncomingCallModal />
      <VoiceChannelSettingsModal />
    </>
  );
}
