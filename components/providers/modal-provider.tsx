"use client";

// Temporary stub for modal provider to get build working
// TODO: Restore full implementation from components-needing-migration/modal-provider.tsx
// after apps/web integration is complete

import React, { useEffect, useState } from "react";

export const ModalProvider = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <>
      {/* TODO: Restore all modal components after migration */}
    </>
  );
};