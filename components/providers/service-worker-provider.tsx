"use client";

import { useEffect } from 'react';

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator
    ) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[ServiceWorker] Registration successful:', registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    // New service worker available, show update notification
                    console.log('[ServiceWorker] New content available, please refresh');
                    
                    // You can show a toast notification here
                    // For now, we'll auto-update
                    if (installingWorker.state === 'installed') {
                      installingWorker.postMessage({ action: 'skipWaiting' });
                    }
                  } else {
                    // Content is cached for offline use
                    console.log('[ServiceWorker] Content is cached for offline use');
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('[ServiceWorker] Registration failed:', error);
        });

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { data } = event;
        
        if (data && data.type === 'SW_UPDATE_AVAILABLE') {
          // Handle service worker update available
          console.log('[ServiceWorker] Update available');
        }
      });

      // Handle service worker controller change (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Reload the page to get the new content
        window.location.reload();
      });

      // Handle offline/online status
      const handleOnlineStatus = () => {
        if (navigator.onLine) {
          console.log('[ServiceWorker] Back online');
          // You can show a toast notification that user is back online
        } else {
          console.log('[ServiceWorker] Gone offline');
          // You can show a toast notification that user is offline
        }
      };

      window.addEventListener('online', handleOnlineStatus);
      window.addEventListener('offline', handleOnlineStatus);

      // Cleanup
      return () => {
        window.removeEventListener('online', handleOnlineStatus);
        window.removeEventListener('offline', handleOnlineStatus);
      };
    }
  }, []);

  return <>{children}</>;
}

// Hook to check if app is running as PWA
export function useIsPWA() {
  useEffect(() => {
    const isPWA = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window as any).navigator?.standalone === true ||
      document.referrer.includes('android-app://');
      
    if (isPWA) {
      console.log('[PWA] Running as installed PWA');
      // Add PWA-specific styles or behavior
      document.body.classList.add('pwa-mode');
    }
  }, []);
}

// Component for PWA install prompt
export function PWAInstallPrompt() {
  useEffect(() => {
    let deferredPrompt: any;

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      // Stash the event so it can be triggered later
      deferredPrompt = e;
      
      // You can show your own install prompt UI here
      console.log('[PWA] Install prompt available');
    };

    const handleAppInstalled = () => {
      console.log('[PWA] App installed');
      deferredPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return null;
}