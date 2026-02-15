"use client";

import React, { useCallback, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

import { useModal } from "@/hooks/use-modal-store";
import { useSecurityPrompt } from "@/hooks/use-security-prompt";

export function LeaveServerModal() {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();
  const { prompts } = useSecurityPrompt();

  const isModalOpen = isOpen && type === "leaveServer";
  const { server } = data;

  const handleLeaveServer = useCallback(async () => {
    if (!server) return false;

    try {
      await axios.patch(`/api/servers/${server.id}/leave`);
      
      onClose();
      router.refresh();
      router.push("/");
      return true;
    } catch (error) {
      console.error("Failed to leave server:", error);
      return false;
    }
  }, [server, onClose, router]);

  // Trigger security prompt when modal should open
  useEffect(() => {
    if (isModalOpen && server) {
      prompts.leaveServer(server.name, handleLeaveServer);
      onClose(); // Close the old modal immediately
    }
  }, [isModalOpen, server, prompts, handleLeaveServer, onClose]);

  // Return empty component as security prompt handles the UI
  return null;
}
