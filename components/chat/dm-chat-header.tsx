// Temporary stub for DM chat header component to get build working
// TODO: Restore full implementation from components-needing-migration/dm-chat-header.tsx
// after apps/web integration is complete

"use client";

import React from "react";

interface DMChatHeaderProps {
  roomId: string;
}

export const DMChatHeader = ({ roomId }: DMChatHeaderProps) => {
  return (
    <div className="text-md font-semibold px-3 flex items-center h-12 border-neutral-200 dark:border-neutral-800 border-b-2">
      DM Chat (Feature in development)
    </div>
  );
};