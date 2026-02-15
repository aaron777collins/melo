"use client";

/**
 * Member Role Editor Modal
 *
 * Modal wrapper for the MemberRoleEditor component.
 * Integrates with the modal store for global modal management.
 */

import React from "react";
import { useModal } from "@/hooks/use-modal-store";
import { MemberRoleEditor } from "@/components/server/member-role-editor";

export function MemberRoleEditorModal() {
  const { isOpen, onClose, type, data } = useModal();

  const isModalOpen = isOpen && type === "memberRoleEditor";
  const { member, serverId, userPowerLevel, onSuccess } = data;

  if (!isModalOpen || !member || !serverId || userPowerLevel === undefined) {
    return null;
  }

  return (
    <MemberRoleEditor
      isOpen={isModalOpen}
      onClose={onClose}
      member={member}
      serverId={serverId}
      userPowerLevel={userPowerLevel}
      onSuccess={onSuccess}
    />
  );
}