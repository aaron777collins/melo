/**
 * useNotifications Hook
 *
 * Provides access to the Matrix notification service with React state management.
 * Handles notification permissions, settings, and integration with the Matrix client.
 * 
 * @module hooks/use-notifications
 * @see {@link ../apps/web/services/matrix-notifications.ts} - Notification service
 * 
 * @example
 * ```tsx
 * import { useNotifications } from '@/hooks/use-notifications';
 * 
 * function NotificationSettings() {
 *   const { 
 *     settings, 
 *     updateSettings, 
 *     isPermissionGranted, 
 *     requestPermission,
 *     testNotification 
 *   } = useNotifications();
 * 
 *   return (
 *     <div>
 *       <button onClick={requestPermission} disabled={isPermissionGranted}>
 *         Enable Notifications
 *       </button>
 *       <label>
 *         <input 
 *           type="checkbox" 
 *           checked={settings.directMessages}
 *           onChange={(e) => updateSettings({ directMessages: e.target.checked })}
 *         />
 *         Direct Messages
 *       </label>
 *     </div>
 *   );
 * }
 * ```
 */

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";

import { useMatrixClient } from "@/hooks/use-matrix-client";
import { 
  getNotificationService,
  initializeNotifications,
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  areNotificationsPermitted,
  type NotificationSettings,
  type NotificationType,
  DEFAULT_NOTIFICATION_SETTINGS,
  MatrixNotificationService
} from "@/apps/web/services/matrix-notifications";

// =============================================================================
// Types
// =============================================================================

/**
 * Return type for the useNotifications hook
 */
interface UseNotificationsReturn {
  /**
   * Current notification settings
   */
  settings: NotificationSettings;

  /**
   * Update notification settings
   */
  updateSettings: (newSettings: Partial<NotificationSettings>) => void;

  /**
   * Whether notifications are supported by the browser
   */
  isSupported: boolean;

  /**
   * Current notification permission status
   */
  permission: NotificationPermission;

  /**
   * Whether notification permission is granted
   */
  isPermissionGranted: boolean;

  /**
   * Request notification permissions from the user
   */
  requestPermission: () => Promise<boolean>;

  /**
   * Whether the notification service is ready and listening
   */
  isReady: boolean;

  /**
   * Test notifications (shows a test notification)
   */
  testNotification: () => Promise<boolean>;

  /**
   * Clear all active notifications
   */
  clearAllNotifications: () => void;

  /**
   * Whether notifications are currently enabled
   */
  isEnabled: boolean;

  /**
   * Error state if initialization failed
   */
  error: Error | null;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Local storage key for notification settings
 */
const SETTINGS_STORAGE_KEY = 'haos-notification-settings';

// =============================================================================
// Custom Errors
// =============================================================================

/**
 * Error thrown when useNotifications is used outside of proper context
 */
class NotificationsContextError extends Error {
  constructor() {
    super(
      "useNotifications requires Matrix client to be ready. " +
        "Ensure your component tree is wrapped with:\n\n" +
        "  <MatrixAuthProvider>\n" +
        "    <MatrixProvider>\n" +
        "      {/* your components */}\n" +
        "    </MatrixProvider>\n" +
        "  </MatrixAuthProvider>\n\n"
    );
    this.name = "NotificationsContextError";
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Load notification settings from localStorage
 */
function loadSettingsFromStorage(): NotificationSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }

  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_NOTIFICATION_SETTINGS;
    }

    const parsed = JSON.parse(stored);
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...parsed };
  } catch (error) {
    console.warn('[useNotifications] Failed to load settings from localStorage:', error);
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

/**
 * Save notification settings to localStorage
 */
function saveSettingsToStorage(settings: NotificationSettings): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('[useNotifications] Failed to save settings to localStorage:', error);
  }
}

/**
 * Navigate to a specific room/thread when notification is clicked
 */
function createNotificationClickHandler(router: any) {
  return (roomId: string, eventId: string, threadId?: string) => {
    try {
      // Build the navigation URL
      let url = `/rooms/${roomId}`;
      
      // Add event anchor if provided
      if (eventId && eventId !== 'test') {
        url += `#${eventId}`;
      }
      
      // Add thread parameter if this is a thread reply
      if (threadId) {
        url += `?thread=${threadId}`;
      }
      
      // Navigate to the room
      router.push(url);
      
      console.log(`[useNotifications] Navigating to: ${url}`);
    } catch (error) {
      console.error('[useNotifications] Failed to navigate from notification click:', error);
    }
  };
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook to manage Matrix notifications with React state integration.
 * 
 * Provides notification settings management, permission handling, and
 * integration with the Matrix client for real-time notifications.
 * 
 * @returns Object containing notification state and management functions
 * 
 * @example Basic usage
 * ```tsx
 * function App() {
 *   const { 
 *     isSupported, 
 *     isPermissionGranted, 
 *     requestPermission, 
 *     settings, 
 *     updateSettings 
 *   } = useNotifications();
 * 
 *   useEffect(() => {
 *     if (isSupported && !isPermissionGranted) {
 *       requestPermission();
 *     }
 *   }, [isSupported, isPermissionGranted, requestPermission]);
 * 
 *   return (
 *     <div>
 *       {isSupported ? (
 *         <NotificationSettings 
 *           settings={settings} 
 *           onUpdateSettings={updateSettings}
 *         />
 *       ) : (
 *         <div>Notifications not supported</div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 * 
 * @example Settings panel
 * ```tsx
 * function NotificationSettingsPanel() {
 *   const { 
 *     settings, 
 *     updateSettings, 
 *     testNotification, 
 *     isPermissionGranted 
 *   } = useNotifications();
 * 
 *   return (
 *     <div className="settings-panel">
 *       <h3>Notification Settings</h3>
 *       
 *       {!isPermissionGranted && (
 *         <div className="permission-warning">
 *           Notifications require permission to work properly.
 *         </div>
 *       )}
 * 
 *       <label>
 *         <input
 *           type="checkbox"
 *           checked={settings.enabled}
 *           onChange={(e) => updateSettings({ enabled: e.target.checked })}
 *         />
 *         Enable Notifications
 *       </label>
 * 
 *       <label>
 *         <input
 *           type="checkbox"
 *           checked={settings.directMessages}
 *           onChange={(e) => updateSettings({ directMessages: e.target.checked })}
 *         />
 *         Direct Messages
 *       </label>
 * 
 *       <button onClick={testNotification}>
 *         Test Notification
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useNotifications(): UseNotificationsReturn {
  const { client, isReady: isClientReady } = useMatrixClient();
  const router = useRouter();
  
  // State management
  const [settings, setSettingsState] = useState<NotificationSettings>(loadSettingsFromStorage);
  const [permission, setPermission] = useState<NotificationPermission>(() => 
    isNotificationSupported() ? getNotificationPermission() : 'denied'
  );
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Ref to track service instance and prevent double initialization
  const serviceRef = useRef<MatrixNotificationService | null>(null);
  const initializationRef = useRef<Promise<void> | null>(null);

  // =============================================================================
  // Computed Values
  // =============================================================================

  const isSupported = useMemo(() => isNotificationSupported(), []);
  const isPermissionGranted = useMemo(() => permission === 'granted', [permission]);
  const isEnabled = useMemo(() => settings.enabled && isPermissionGranted, [settings.enabled, isPermissionGranted]);

  // =============================================================================
  // Settings Management
  // =============================================================================

  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettingsState(prev => {
      const updated = { ...prev, ...newSettings };
      
      // Save to localStorage
      saveSettingsToStorage(updated);
      
      // Update service if it exists
      if (serviceRef.current) {
        serviceRef.current.updateSettings(newSettings);
      }
      
      return updated;
    });
  }, []);

  // =============================================================================
  // Permission Management
  // =============================================================================

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError(new Error('Notifications not supported by this browser'));
      return false;
    }

    try {
      setError(null);
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);
      
      return newPermission === 'granted';
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to request permission');
      setError(error);
      console.error('[useNotifications] Permission request failed:', error);
      return false;
    }
  }, [isSupported]);

  // =============================================================================
  // Service Management
  // =============================================================================

  const initializeService = useCallback(async () => {
    if (!client || !isClientReady) {
      return;
    }

    // Prevent double initialization
    if (initializationRef.current) {
      await initializationRef.current;
      return;
    }

    const initPromise = (async () => {
      try {
        setError(null);
        
        // Get or create service instance
        const service = getNotificationService();
        serviceRef.current = service;
        
        // Create navigation handler
        const onNotificationClick = createNotificationClickHandler(router);
        
        // Initialize the service
        await service.initialize(client, settings, onNotificationClick);
        
        setIsReady(true);
        console.log('[useNotifications] Service initialized successfully');
        
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to initialize notifications');
        setError(error);
        setIsReady(false);
        console.error('[useNotifications] Service initialization failed:', error);
      }
    })();
    
    initializationRef.current = initPromise;
    await initPromise;
    initializationRef.current = null;
  }, [client, isClientReady, settings, router]);

  // =============================================================================
  // Service Actions
  // =============================================================================

  const testNotification = useCallback(async (): Promise<boolean> => {
    if (!serviceRef.current) {
      throw new Error('Notification service not ready');
    }

    try {
      return await serviceRef.current.testNotification();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Test notification failed');
      setError(error);
      console.error('[useNotifications] Test notification failed:', error);
      return false;
    }
  }, []);

  const clearAllNotifications = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.clearAllNotifications();
    }
  }, []);

  // =============================================================================
  // Effects
  // =============================================================================

  // Monitor permission changes (user might change it in browser settings)
  useEffect(() => {
    if (!isSupported) return;

    const checkPermission = () => {
      const currentPermission = getNotificationPermission();
      if (currentPermission !== permission) {
        setPermission(currentPermission);
      }
    };

    // Check periodically (browser permission could change)
    const interval = setInterval(checkPermission, 5000);
    
    // Check on window focus
    const handleFocus = () => checkPermission();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isSupported, permission]);

  // Initialize service when client becomes ready
  useEffect(() => {
    if (isClientReady && client && !isReady && !initializationRef.current) {
      initializeService();
    }
  }, [isClientReady, client, isReady, initializeService]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (serviceRef.current) {
        serviceRef.current.stopListening();
        serviceRef.current = null;
      }
    };
  }, []);

  // =============================================================================
  // Return Value
  // =============================================================================

  return useMemo(
    () => ({
      settings,
      updateSettings,
      isSupported,
      permission,
      isPermissionGranted,
      requestPermission,
      isReady,
      testNotification,
      clearAllNotifications,
      isEnabled,
      error,
    }),
    [
      settings,
      updateSettings,
      isSupported,
      permission,
      isPermissionGranted,
      requestPermission,
      isReady,
      testNotification,
      clearAllNotifications,
      isEnabled,
      error,
    ]
  );
}

// =============================================================================
// Type Exports
// =============================================================================

export type { 
  UseNotificationsReturn,
  NotificationSettings,
  NotificationType
};

// Re-export useful functions and constants for convenience
export {
  isNotificationSupported,
  areNotificationsPermitted,
  DEFAULT_NOTIFICATION_SETTINGS
};