"use client";

import React, { useEffect, useState } from "react";

import { EditServerModal } from "@/components/modals/edit-server-modal";
import { LeaveServerModal } from "@/components/modals/leave-server-modal";
import { DeleteServerModal } from "@/components/modals/delete-server-modal";
import { DeleteChannelModal } from "@/components/modals/delete-channel-modal";
import { EditChannelModal } from "@/components/modals/edit-channel-modal";
import { InitialModal } from "@/components/modals/initial-modal";
import { ThreadViewModal } from "@/components/modals/thread-view-modal";
import { ReportMessageModal } from "@/components/modals/report-message-modal";
import { PinnedMessages } from "@/components/pinned-messages";

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
      <InitialModal />
      <ThreadViewModal />
      <ReportMessageModal />
      <PinnedMessages />
      {/* TODO: Add more modals as they're created */}
    </>
  );
}