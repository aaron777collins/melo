"use client";

import { useEffect, useState, useCallback } from 'react';
import { serviceWorkerManager } from '@/lib/pwa/service-worker-registration';

export interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  hasUpdate: boolean;
  isInstalling: boolean;
  isWaiting: boolean;
  isActive: boolean;
  error: string | null;
}

export interface ServiceWorkerActions {
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
  skipWaiting: () => void;
  refresh: () => void;
}

export function useServiceWorker(): ServiceWorkerState & ServiceWorkerActions {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isOnline: true,
    hasUpdate: false,
    isInstalling: false,
    isWaiting: false,
    isActive: false,
    error: null,
  });

  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const updateState = useCallback((updates: Partial<ServiceWorkerState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const register = useCallback(async () => {
    try {
      updateState({ error: null, isInstalling: true });
      
      const reg = await serviceWorkerManager.register();
      setRegistration(reg ?? null);
      
      updateState({
        isRegistered: !!reg,
        isInstalling: false,
        isActive: !!reg?.active,
        isWaiting: !!reg?.waiting,
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to register service worker';
      updateState({
        error: errorMessage,
        isInstalling: false,
        isRegistered: false,
      });
      console.error('[SW Hook] Registration failed:', error);
    }
  }, [updateState]);

  const unregister = useCallback(async () => {
    try {
      updateState({ error: null });
      await serviceWorkerManager.unregister();
      setRegistration(null);
      
      updateState({
        isRegistered: false,
        isActive: false,
        isWaiting: false,
        hasUpdate: false,
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unregister service worker';
      updateState({ error: errorMessage });
      console.error('[SW Hook] Unregistration failed:', error);
    }
  }, [updateState]);

  const checkForUpdates = useCallback(async () => {
    try {
      updateState({ error: null });
      await serviceWorkerManager.checkForUpdates();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check for updates';
      updateState({ error: errorMessage });
      console.error('[SW Hook] Update check failed:', error);
    }
  }, [updateState]);

  const skipWaiting = useCallback(() => {
    try {
      serviceWorkerManager.skipWaiting();
      updateState({ hasUpdate: false, isWaiting: false });
    } catch (error) {
      console.error('[SW Hook] Skip waiting failed:', error);
    }
  }, [updateState]);

  const refresh = useCallback(() => {
    skipWaiting();
    // The service worker will trigger a page reload when it takes control
  }, [skipWaiting]);

  // Initialize service worker
  useEffect(() => {
    const initialize = async () => {
      // Check if service worker is supported
      const isSupported = serviceWorkerManager.isServiceWorkerSupported();
      const isOnline = serviceWorkerManager.getOnlineStatus();
      
      updateState({
        isSupported,
        isOnline,
      });

      if (!isSupported) {
        console.warn('[SW Hook] Service workers are not supported');
        return;
      }

      // Check if service worker is already registered
      if ('serviceWorker' in navigator) {
        try {
          const existingRegistration = await navigator.serviceWorker.getRegistration();
          if (existingRegistration) {
            setRegistration(existingRegistration);
            updateState({
              isRegistered: true,
              isActive: !!existingRegistration.active,
              isWaiting: !!existingRegistration.waiting,
              hasUpdate: !!existingRegistration.waiting,
            });
          }
        } catch (error) {
          console.error('[SW Hook] Failed to get existing registration:', error);
        }
      }

      // Auto-register service worker
      if (isSupported && process.env.NODE_ENV === 'production') {
        await register();
      }
    };

    initialize();
  }, [register, updateState]);

  // Setup event listeners
  useEffect(() => {
    if (!serviceWorkerManager.isServiceWorkerSupported()) {
      return;
    }

    // Listen for update events
    const handleUpdate = (registration: ServiceWorkerRegistration) => {
      updateState({
        hasUpdate: true,
        isWaiting: !!registration.waiting,
      });
    };

    // Listen for online/offline events
    const handleOnline = () => {
      updateState({ isOnline: true });
    };

    const handleOffline = () => {
      updateState({ isOnline: false });
    };

    // Register listeners
    serviceWorkerManager.onUpdate(handleUpdate);
    serviceWorkerManager.onOnline(handleOnline);
    serviceWorkerManager.onOffline(handleOffline);

    // Also listen to native events as backup
    const handleWindowOnline = () => updateState({ isOnline: true });
    const handleWindowOffline = () => updateState({ isOnline: false });

    window.addEventListener('online', handleWindowOnline);
    window.addEventListener('offline', handleWindowOffline);

    // Listen to service worker state changes
    if ('serviceWorker' in navigator) {
      const handleServiceWorkerMessage = (event: MessageEvent) => {
        const { data } = event;
        
        if (data && data.type) {
          switch (data.type) {
            case 'SW_UPDATE_AVAILABLE':
              updateState({ hasUpdate: true });
              break;
            case 'SW_OFFLINE_READY':
              break;
            case 'SW_BACKGROUND_SYNC_SUCCESS':
            case 'SW_BACKGROUND_SYNC_FAILED':
              // These are handled by the service worker manager
              break;
          }
        }
      };

      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

      return () => {
        window.removeEventListener('online', handleWindowOnline);
        window.removeEventListener('offline', handleWindowOffline);
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      };
    }

    return () => {
      window.removeEventListener('online', handleWindowOnline);
      window.removeEventListener('offline', handleWindowOffline);
    };
  }, [updateState]);

  // Monitor registration state changes
  useEffect(() => {
    if (!registration) return;

    const handleStateChange = () => {
      updateState({
        isActive: !!registration.active,
        isWaiting: !!registration.waiting,
        isInstalling: !!registration.installing,
        hasUpdate: !!registration.waiting,
      });
    };

    // Monitor the installing worker
    if (registration.installing) {
      registration.installing.addEventListener('statechange', handleStateChange);
    }

    // Monitor the waiting worker
    if (registration.waiting) {
      registration.waiting.addEventListener('statechange', handleStateChange);
    }

    // Monitor the active worker
    if (registration.active) {
      registration.active.addEventListener('statechange', handleStateChange);
    }

    return () => {
      if (registration.installing) {
        registration.installing.removeEventListener('statechange', handleStateChange);
      }
      if (registration.waiting) {
        registration.waiting.removeEventListener('statechange', handleStateChange);
      }
      if (registration.active) {
        registration.active.removeEventListener('statechange', handleStateChange);
      }
    };
  }, [registration, updateState]);

  return {
    ...state,
    register,
    unregister,
    checkForUpdates,
    skipWaiting,
    refresh,
  };
}

// Hook for simpler offline detection
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// Hook to detect if running as PWA
export function useIsPWA(): boolean {
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkPWA = () => {
      const isPWAMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any)?.standalone === true ||
        document.referrer.includes('android-app://');
      
      setIsPWA(isPWAMode);
      
      if (isPWAMode) {
        document.body.classList.add('pwa-mode');
      } else {
        document.body.classList.remove('pwa-mode');
      }
    };

    checkPWA();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = () => checkPWA();
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      (mediaQuery as any).addListener(handleChange);
      return () => (mediaQuery as any).removeListener(handleChange);
    }
  }, []);

  return isPWA;
}