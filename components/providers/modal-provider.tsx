"use client";

import React, { useEffect, useState } from "react";

import { CreateServerModal } from "@/components/modals/create-server-modal";
import { InviteModal } from "@/components/modals/invite-modal";
import { EditServerModal } from "@/components/modals/edit-server-modal";
import { MembersModal } from "@/components/modals/members-modal";
import { CreateChannelModal } from "@/components/modals/create-channel-modal";
import { LeaveServerModal } from "@/components/modals/leave-server-modal";
import { DeleteServerModal } from "@/components/modals/delete-server-modal";
import { DeleteChannelModal } from "@/components/modals/delete-channel-modal";
import { EditChannelModal } from "@/components/modals/edit-channel-modal";
import { MessageFileModal } from "@/components/modals/message-file-modal";
import { DeleteMessageModal } from "@/components/modals/delete-message-modal";
import { QuickSwitcherModal } from "@/apps/web/components/modals/quick-switcher-modal";
import { useModal } from "@/hooks/use-modal-store";

export function ModalProvider() {
  const [isMounted, setIsMounted] = useState(false);
  const { onOpen } = useModal();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Global hotkey handler for Ctrl+K (Quick Switcher)
  useEffect(() => {
    if (!isMounted) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+K or Cmd+K to open quick switcher
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        // Don't trigger if user is typing in an input/textarea
        const activeElement = document.activeElement;
        const isInInput = activeElement?.tagName === "INPUT" || 
                         activeElement?.tagName === "TEXTAREA" || 
                         activeElement?.getAttribute("contenteditable") === "true";
        
        if (!isInInput) {
          event.preventDefault();
          onOpen("quickSwitcher");
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMounted, onOpen]);

  if (!isMounted) return null;

  return (
    <>
      <CreateServerModal />
      <InviteModal />
      <EditServerModal />
      <MembersModal />
      <CreateChannelModal />
      <LeaveServerModal />
      <DeleteServerModal />
      <DeleteChannelModal />
      <EditChannelModal />
      <MessageFileModal />
      <DeleteMessageModal />
      <QuickSwitcherModal />
    </>
  );
}
