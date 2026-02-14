// Temporary stub for DM chat input component to get build working
// TODO: Restore full implementation from components-needing-migration/dm-chat-input.tsx
// after apps/web integration is complete

"use client";

import React from "react";

interface DMChatInputProps {
  roomId: string;
}

export const DMChatInput = ({ roomId }: DMChatInputProps) => {
  return (
    <div className="px-4 py-4">
      <div className="bg-zinc-200/90 dark:bg-zinc-700/75 px-6 py-3 rounded-md">
        DM Input (Feature in development)
      </div>
    </div>
  );
};