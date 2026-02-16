"use client";

import { useEffect } from 'react';
import { serviceWorkerManager } from '@/lib/pwa/service-worker-registration';

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Auto-register service worker in production
    if (process.env.NODE_ENV === 'production') {
      serviceWorkerManager.register().catch((error) => {
        console.error('[ServiceWorker Provider] Registration failed:', error);
      });
    }
  }, []);

  return <>{children}</>;
}

// Legacy PWA install prompt - replaced by the dedicated component
export function PWAInstallPrompt() {
  return null; // This is now handled by components/pwa/install-prompt.tsx
}