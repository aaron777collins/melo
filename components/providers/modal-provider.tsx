"use client";

import React, { useEffect, useState } from "react";

import { EditServerModal } from "@/components/modals/edit-server-modal";
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
import { KickUserModal } from "@/components/modals/kick-user-modal";
import { BanUserModal } from "@/components/modals/ban-user-modal";
import { MuteUserModal } from "@/components/modals/mute-user-modal";
import { ConfirmDeleteModal } from "@/components/modals/confirm-delete-modal";
import { MemberRoleEditorModal } from "@/components/modals/member-role-editor-modal";
import { InviteModal } from "@/components/modals/invite-modal";
import { RevokeInviteModal } from "@/components/modals/revoke-invite-modal";
import { GifPickerModal } from "@/components/modals/gif-picker-modal";
import { PinnedMessages } from "@/components/pinned-messages";
import { SecurityPromptModal } from "@/components/modals/security-prompt-modal";

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
      <EditServerModal />
      <LeaveServerModal />
      <DeleteServerModal />
      <DeleteChannelModal />
      <EditChannelModal />
      {/* InitialModal removed - only shows on /setup page */}
      <ThreadViewModal />
      <ReportMessageModal />
      <UserSettingsModal />
      <CreateRoleModal />
      <KickUserModal />
      <BanUserModal />
      <MuteUserModal />
      <ConfirmDeleteModal />
      <MemberRoleEditorModal />
      <InviteModal />
      <RevokeInviteModal />
      <GifPickerModal />
      <PinnedMessages />
      <SecurityPromptModal />
      {/* TODO: Add more modals as they're created */}
    </>
  );
}