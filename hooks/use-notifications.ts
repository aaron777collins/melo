/**
 * useNotifications Hook
 *
 * React hook for managing notification state and settings.
 * Provides access to the Matrix notification service with reactive state.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { 
  getNotificationService,
  type NotificationSettings,
  type NotificationData,
  DEFAULT_NOTIFICATION_SETTINGS,
  isNotificationSupported,
  getNotificationPermission,
  areNotificationsPermitted,
  requestNotificationPermission
} from "@/lib/matrix/notifications";

// =============================================================================
// Types
// =============================================================================

interface UseNotificationsReturn {
  // Notification data
  notifications: NotificationData[];
  unreadCount: number;
  
  // State
  isLoading: boolean;
  isReady: boolean;
  error: { message: string } | null;
  
  // Settings
  settings: NotificationSettings;
  updateSettings: (newSettings: Partial<NotificationSettings>) => void;
  
  // Permissions
  isSupported: boolean;
  permission: NotificationPermission;
  isPermissionGranted: boolean;
  requestPermission: () => Promise<boolean>;
  
  // Actions
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  testNotification: () => Promise<boolean>;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useNotifications(): UseNotificationsReturn {
  const { client, isReady: isClientReady } = useMatrixClient();
  const service = getNotificationService();
  
  // State
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<{ message: string } | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Load settings from storage
  const loadSettings = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("melo:notification-settings");
        if (saved) {
          const parsedSettings = JSON.parse(saved);
          setSettings({ ...DEFAULT_NOTIFICATION_SETTINGS, ...parsedSettings });
          return parsedSettings;
        }
      }
      return DEFAULT_NOTIFICATION_SETTINGS;
    } catch (error) {
      console.error("Failed to load notification settings:", error);
      return DEFAULT_NOTIFICATION_SETTINGS;
    }
  }, []);

  // Save settings to storage
  const saveSettings = useCallback((newSettings: NotificationSettings) => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("melo:notification-settings", JSON.stringify(newSettings));
      }
    } catch (error) {
      console.error("Failed to save notification settings:", error);
    }
  }, []);

  // Initialize service
  useEffect(() => {
    if (!isClientReady || !client) {
      setIsReady(false);
      setIsLoading(true);
      return;
    }

    const initializeService = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load settings
        const loadedSettings = loadSettings();
        
        // Initialize service
        await service.initialize(client, loadedSettings, (roomId, eventId) => {
          // Handle notification clicks - navigate to room
          if (typeof window !== "undefined") {
            const url = eventId ? `/rooms/${roomId}#${eventId}` : `/rooms/${roomId}`;
            window.location.href = url;
          }
        });

        // Start listening
        await service.startListening();
        
        // Update state
        setNotifications(service.getNotifications());
        setSettings(service.getSettings());
        setIsReady(true);
        
      } catch (error) {
        console.error("Failed to initialize notification service:", error);
        setError({
          message: error instanceof Error ? error.message : "Failed to initialize notifications"
        });
        setIsReady(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeService();

    // Cleanup on unmount or client change
    return () => {
      service.stopListening();
      setIsReady(false);
    };
  }, [isClientReady, client, service, loadSettings]);

  // Update permission state
  useEffect(() => {
    const updatePermission = () => {
      setPermission(getNotificationPermission());
    };
    
    updatePermission();
    
    // Listen for permission changes
    if (typeof window !== "undefined" && 'permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' as PermissionName }).then(
        (permissionStatus) => {
          permissionStatus.addEventListener('change', updatePermission);
          return () => {
            permissionStatus.removeEventListener('change', updatePermission);
          };
        }
      ).catch(() => {
        // Permissions API not supported, that's okay
      });
    }
  }, []);

  // Listen for notification events
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleNewNotification = (event: CustomEvent) => {
      const notification = event.detail as NotificationData;
      setNotifications(prev => [notification, ...prev.slice(0, 99)]);
    };

    const handleNotificationUpdate = (event: CustomEvent) => {
      const updated = event.detail as NotificationData;
      setNotifications(prev => 
        prev.map(n => n.id === updated.id ? updated : n)
      );
    };

    const handleNotificationsReadAll = () => {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const handleNotificationsCleared = () => {
      setNotifications([]);
    };

    window.addEventListener("melo:notification", handleNewNotification as EventListener);
    window.addEventListener("melo:notification-updated", handleNotificationUpdate as EventListener);
    window.addEventListener("melo:notifications-read-all", handleNotificationsReadAll);
    window.addEventListener("melo:notifications-cleared", handleNotificationsCleared);

    return () => {
      window.removeEventListener("melo:notification", handleNewNotification as EventListener);
      window.removeEventListener("melo:notification-updated", handleNotificationUpdate as EventListener);
      window.removeEventListener("melo:notifications-read-all", handleNotificationsReadAll);
      window.removeEventListener("melo:notifications-cleared", handleNotificationsCleared);
    };
  }, []);

  // Actions
  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
    service.updateSettings(newSettings);
  }, [settings, saveSettings, service]);

  const markAsRead = useCallback((notificationId: string) => {
    service.markAsRead(notificationId);
  }, [service]);

  const markAllAsRead = useCallback(() => {
    service.markAllAsRead();
  }, [service]);

  const clearAll = useCallback(() => {
    service.clearAllNotifications();
  }, [service]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const granted = await requestNotificationPermission();
      setPermission(getNotificationPermission());
      return granted;
    } catch (error) {
      console.error("Failed to request notification permission:", error);
      return false;
    }
  }, []);

  const testNotification = useCallback(async (): Promise<boolean> => {
    if (!isReady) return false;
    
    try {
      return await service.testNotification();
    } catch (error) {
      console.error("Test notification failed:", error);
      return false;
    }
  }, [isReady, service]);

  // Computed values
  const unreadCount = notifications.filter(n => !n.read).length;
  const isSupported = isNotificationSupported();
  const isPermissionGranted = areNotificationsPermitted();

  return {
    // Notification data
    notifications,
    unreadCount,
    
    // State
    isLoading,
    isReady,
    error: error || service.getError(),
    
    // Settings
    settings,
    updateSettings,
    
    // Permissions
    isSupported,
    permission,
    isPermissionGranted,
    requestPermission,
    
    // Actions
    markAsRead,
    markAllAsRead,
    clearAll,
    testNotification
  };
}