/**
 * Client-side wrapper component to prevent SSR/SSG execution
 * Use this to wrap components that use Matrix hooks or other client-only dependencies
 */

"use client";

import { useEffect, useState } from "react";

interface ClientWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ClientWrapper({ children, fallback }: ClientWrapperProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return fallback || null;
  }

  return <>{children}</>;
}