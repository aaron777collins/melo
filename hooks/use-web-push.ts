/**
 * useWebPush Hook
 * 
 * React hook for managing Web Push API subscriptions and notifications.
 * Provides a complete interface for push notification functionality.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useMatrixClient } from "./use-matrix-client";

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface WebPushSubscription {
  id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  deviceId: string;
  userAgent: string;
  createdAt: string;
}

export interface WebPushCapabilities {
  isSupported: boolean;
  isPushManagerSupported: boolean;
  isServiceWorkerSupported: boolean;
  isNotificationSupported: boolean;
}

export interface WebPushPermissions {
  notification: NotificationPermission;
  canRequestPermission: boolean;
}

export interface WebPushError {
  code: string;
  message: string;
  details?: any;
}

interface UseWebPushOptions {
  vapidPublicKey?: string;
  serviceWorkerPath?: string;
  autoSubscribe?: boolean;
  onNotificationClick?: (data: any) => void;
  onSubscriptionChange?: (subscription: WebPushSubscription | null) => void;
  onError?: (error: WebPushError) => void;
}

interface UseWebPushReturn {
  // Subscription state
  subscription: WebPushSubscription | null;
  isSubscribed: boolean;
  isLoading: boolean;
  
  // Capabilities and permissions
  capabilities: WebPushCapabilities;
  permissions: WebPushPermissions;
  
  // Error state
  error: WebPushError | null;
  lastError: WebPushError | null;
  
  // Actions
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  requestPermission: () => Promise<boolean>;
  testNotification: () => Promise<boolean>;
  refreshSubscription: () => Promise<boolean>;
  
  // Service Worker management
  serviceWorkerRegistration: ServiceWorkerRegistration | null;
  registerServiceWorker: () => Promise<ServiceWorkerRegistration | null>;
  
  // Utilities
  clearError: () => void;
  checkBrowserCompatibility: () => WebPushCapabilities;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useWebPush(options: UseWebPushOptions = {}): UseWebPushReturn {
  const {
    vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    serviceWorkerPath = '/push-sw.js',
    autoSubscribe = false,
    onNotificationClick,
    onSubscriptionChange,
    onError
  } = options;
  
  const { client, isReady: isClientReady } = useMatrixClient();
  
  // State
  const [subscription, setSubscription] = useState<WebPushSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<WebPushError | null>(null);
  const [lastError, setLastError] = useState<WebPushError | null>(null);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null);
  
  // Refs for managing state updates
  const isInitialized = useRef(false);
  const currentDeviceId = useRef<string | null>(null);
  
  // Check browser capabilities
  const checkBrowserCompatibility = useCallback((): WebPushCapabilities => {
    const isSupported = typeof window !== "undefined" && "serviceWorker" in navigator;
    const isPushManagerSupported = isSupported && "PushManager" in window;
    const isServiceWorkerSupported = isSupported && "serviceWorker" in navigator;
    const isNotificationSupported = isSupported && "Notification" in window;
    
    return {
      isSupported: isSupported && isPushManagerSupported && isNotificationSupported,
      isPushManagerSupported,
      isServiceWorkerSupported,
      isNotificationSupported
    };
  }, []);
  
  const capabilities = checkBrowserCompatibility();
  
  // Get current permissions
  const getPermissions = useCallback((): WebPushPermissions => {
    if (!capabilities.isNotificationSupported) {
      return {
        notification: 'denied',
        canRequestPermission: false
      };
    }
    
    return {
      notification: Notification.permission,
      canRequestPermission: Notification.permission === 'default'
    };
  }, [capabilities.isNotificationSupported]);
  
  const [permissions, setPermissions] = useState<WebPushPermissions>(getPermissions());
  
  // Generate or get device ID
  const getDeviceId = useCallback((): string => {
    if (currentDeviceId.current) {
      return currentDeviceId.current;
    }
    
    if (typeof window === "undefined") {
      return 'server-side';
    }
    
    // Try to get from localStorage first
    let deviceId = localStorage.getItem('melo:device-id');
    
    if (!deviceId) {
      // Generate new device ID
      const userAgent = navigator.userAgent || 'unknown';
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 9);
      
      deviceId = `${userAgent.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '')}-${timestamp}-${random}`;
      localStorage.setItem('melo:device-id', deviceId);
    }
    
    currentDeviceId.current = deviceId;
    return deviceId;
  }, []);
  
  // Error handling
  const handleError = useCallback((error: WebPushError) => {
    console.error('Web Push Error:', error);
    setError(error);
    setLastError(error);
    onError?.(error);
  }, [onError]);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // Convert native push subscription to our format
  const convertSubscription = useCallback((pushSubscription: PushSubscription): WebPushSubscription => {
    const subscriptionJson = pushSubscription.toJSON();
    
    return {
      id: crypto.randomUUID(),
      endpoint: subscriptionJson.endpoint!,
      keys: {
        p256dh: subscriptionJson.keys!.p256dh!,
        auth: subscriptionJson.keys!.auth!
      },
      deviceId: getDeviceId(),
      userAgent: navigator.userAgent,
      createdAt: new Date().toISOString()
    };
  }, [getDeviceId]);
  
  // Register service worker
  const registerServiceWorker = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    if (!capabilities.isServiceWorkerSupported) {
      handleError({
        code: 'SERVICE_WORKER_NOT_SUPPORTED',
        message: 'Service Worker not supported in this browser'
      });
      return null;
    }
    
    try {
      const registration = await navigator.serviceWorker.register(serviceWorkerPath, {
        scope: '/'
      });
      
      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      
      setServiceWorkerRegistration(registration);
      
      // Send user info to service worker if client is available
      if (isClientReady && client) {
        registration.active?.postMessage({
          type: 'SET_USER_INFO',
          payload: {
            userId: client.getUserId(),
            deviceId: getDeviceId()
          }
        });
      }
      
      console.log('Service worker registered successfully');
      return registration;
    } catch (error) {
      handleError({
        code: 'SERVICE_WORKER_REGISTRATION_FAILED',
        message: 'Failed to register service worker',
        details: error
      });
      return null;
    }
  }, [capabilities.isServiceWorkerSupported, serviceWorkerPath, handleError, isClientReady, client, getDeviceId]);
  
  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!capabilities.isNotificationSupported) {
      handleError({
        code: 'NOTIFICATIONS_NOT_SUPPORTED',
        message: 'Notifications not supported in this browser'
      });
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission === 'denied') {
      handleError({
        code: 'NOTIFICATIONS_DENIED',
        message: 'Notification permission has been denied'
      });
      return false;
    }
    
    try {
      const permission = await Notification.requestPermission();
      setPermissions(getPermissions());
      
      const granted = permission === 'granted';
      
      if (!granted) {
        handleError({
          code: 'PERMISSION_DENIED',
          message: 'User denied notification permission'
        });
      }
      
      return granted;
    } catch (error) {
      handleError({
        code: 'PERMISSION_REQUEST_FAILED',
        message: 'Failed to request notification permission',
        details: error
      });
      return false;
    }
  }, [capabilities.isNotificationSupported, handleError, getPermissions]);
  
  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!capabilities.isSupported) {
      handleError({
        code: 'PUSH_NOT_SUPPORTED',
        message: 'Push notifications not supported in this browser'
      });
      return false;
    }
    
    if (!vapidPublicKey) {
      handleError({
        code: 'VAPID_KEY_MISSING',
        message: 'VAPID public key not configured'
      });
      return false;
    }
    
    if (!isClientReady || !client) {
      handleError({
        code: 'MATRIX_CLIENT_NOT_READY',
        message: 'Matrix client not ready'
      });
      return false;
    }
    
    setIsLoading(true);
    clearError();
    
    try {
      // Request permission first
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        return false;
      }
      
      // Register service worker
      const registration = serviceWorkerRegistration || await registerServiceWorker();
      if (!registration) {
        return false;
      }
      
      // Convert VAPID key to Uint8Array
      const vapidKeyBytes = Uint8Array.from(
        atob(vapidPublicKey.replace(/-/g, '+').replace(/_/g, '/')),
        c => c.charCodeAt(0)
      );
      
      // Subscribe to push notifications
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKeyBytes
      });
      
      // Convert to our subscription format
      const webPushSubscription = convertSubscription(pushSubscription);
      
      // Send subscription to server
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: client.getUserId(),
          deviceId: webPushSubscription.deviceId,
          subscription: {
            endpoint: webPushSubscription.endpoint,
            keys: webPushSubscription.keys
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to register push subscription');
      }
      
      setSubscription(webPushSubscription);
      onSubscriptionChange?.(webPushSubscription);
      
      console.log('Successfully subscribed to push notifications');
      return true;
      
    } catch (error: any) {
      handleError({
        code: 'SUBSCRIPTION_FAILED',
        message: error.message || 'Failed to subscribe to push notifications',
        details: error
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [
    capabilities.isSupported,
    vapidPublicKey,
    isClientReady,
    client,
    requestPermission,
    serviceWorkerRegistration,
    registerServiceWorker,
    convertSubscription,
    onSubscriptionChange,
    handleError,
    clearError
  ]);
  
  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!subscription) {
      console.log('No active subscription to unsubscribe');
      return true;
    }
    
    setIsLoading(true);
    clearError();
    
    try {
      // Unsubscribe from browser
      if (serviceWorkerRegistration) {
        const pushSubscription = await serviceWorkerRegistration.pushManager.getSubscription();
        if (pushSubscription) {
          await pushSubscription.unsubscribe();
        }
      }
      
      // Remove from server
      const response = await fetch(`/api/notifications/subscribe?deviceId=${subscription.deviceId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        console.warn('Failed to remove subscription from server');
      }
      
      setSubscription(null);
      onSubscriptionChange?.(null);
      
      console.log('Successfully unsubscribed from push notifications');
      return true;
      
    } catch (error: any) {
      handleError({
        code: 'UNSUBSCRIPTION_FAILED',
        message: error.message || 'Failed to unsubscribe from push notifications',
        details: error
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [subscription, serviceWorkerRegistration, onSubscriptionChange, handleError, clearError]);
  
  // Refresh subscription
  const refreshSubscription = useCallback(async (): Promise<boolean> => {
    if (!capabilities.isSupported) {
      return false;
    }
    
    try {
      const registration = serviceWorkerRegistration || await registerServiceWorker();
      if (!registration) {
        return false;
      }
      
      const pushSubscription = await registration.pushManager.getSubscription();
      
      if (pushSubscription) {
        const webPushSubscription = convertSubscription(pushSubscription);
        setSubscription(webPushSubscription);
        onSubscriptionChange?.(webPushSubscription);
        return true;
      } else {
        setSubscription(null);
        onSubscriptionChange?.(null);
        return false;
      }
    } catch (error: any) {
      handleError({
        code: 'REFRESH_FAILED',
        message: error.message || 'Failed to refresh subscription',
        details: error
      });
      return false;
    }
  }, [capabilities.isSupported, serviceWorkerRegistration, registerServiceWorker, convertSubscription, onSubscriptionChange, handleError]);
  
  // Test notification
  const testNotification = useCallback(async (): Promise<boolean> => {
    if (!subscription) {
      handleError({
        code: 'NO_SUBSCRIPTION',
        message: 'Not subscribed to push notifications'
      });
      return false;
    }
    
    try {
      const response = await fetch(`/api/notifications/push?userId=${client?.getUserId() || 'test'}`);
      
      if (!response.ok) {
        throw new Error('Test notification request failed');
      }
      
      console.log('Test notification sent');
      return true;
    } catch (error: any) {
      handleError({
        code: 'TEST_NOTIFICATION_FAILED',
        message: error.message || 'Failed to send test notification',
        details: error
      });
      return false;
    }
  }, [subscription, client, handleError]);
  
  // Initialize the hook
  useEffect(() => {
    if (isInitialized.current || !capabilities.isSupported) {
      return;
    }
    
    isInitialized.current = true;
    
    const initialize = async () => {
      // Register service worker
      await registerServiceWorker();
      
      // Check for existing subscription
      await refreshSubscription();
      
      // Auto-subscribe if enabled and permissions are granted
      if (autoSubscribe && Notification.permission === 'granted' && !subscription) {
        await subscribe();
      }
    };
    
    initialize().catch(error => {
      console.error('Failed to initialize Web Push:', error);
    });
  }, [capabilities.isSupported, registerServiceWorker, refreshSubscription, autoSubscribe, subscription, subscribe]);
  
  // Update permissions when they change
  useEffect(() => {
    if (!capabilities.isNotificationSupported) {
      return;
    }
    
    const updatePermissions = () => {
      setPermissions(getPermissions());
    };
    
    // Listen for permission changes (where supported)
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' as PermissionName }).then(
        (permissionStatus) => {
          permissionStatus.addEventListener('change', updatePermissions);
          return () => {
            permissionStatus.removeEventListener('change', updatePermissions);
          };
        }
      ).catch(() => {
        // Permissions API not supported, that's okay
      });
    }
  }, [capabilities.isNotificationSupported, getPermissions]);
  
  // Computed values
  const isSubscribed = subscription !== null;
  
  return {
    // Subscription state
    subscription,
    isSubscribed,
    isLoading,
    
    // Capabilities and permissions
    capabilities,
    permissions,
    
    // Error state
    error,
    lastError,
    
    // Actions
    subscribe,
    unsubscribe,
    requestPermission,
    testNotification,
    refreshSubscription,
    
    // Service Worker management
    serviceWorkerRegistration,
    registerServiceWorker,
    
    // Utilities
    clearError,
    checkBrowserCompatibility
  };
}