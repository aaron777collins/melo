"use client";

import React, { useCallback, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

import { useModal } from "@/hooks/use-modal-store";
import { useSecurityPrompt } from "@/hooks/use-security-prompt";

export function DeleteServerModal() {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();
  const { prompts } = useSecurityPrompt();

  const isModalOpen = isOpen && type === "deleteServer";
  const { server } = data;

  const handleDeleteServer = useCallback(async () => {
    if (!server) return false;

    try {
      await axios.delete(`/api/servers/${server.id}`);
      
      onClose();
      router.refresh();
      router.push("/");
      return true;
    } catch (error) {
      console.error("Failed to delete server:", error);
      return false;
    }
  }, [server, onClose, router]);

  // Trigger security prompt when modal should open
  useEffect(() => {
    if (isModalOpen && server) {
      prompts.deleteServer(server.name, handleDeleteServer);
      onClose(); // Close the old modal immediately
    }
  }, [isModalOpen, server, prompts, handleDeleteServer, onClose]);

  // Return empty component as security prompt handles the UI
  return null;
}
