/**
 * useNotificationProvider Hook
 *
 * A provider-style hook that initializes notifications for the entire app.
 * This should be used at the app root level to ensure notifications are 
 * set up globally.
 * 
 * @module hooks/use-notification-provider
 */

"use client";

import { useEffect, useState } from "react";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { useNotifications } from "@/hooks/use-notifications";

// =============================================================================
// Types
// =============================================================================

interface UseNotificationProviderReturn {
  /**
   * Whether the notification service has been initialized
   */
  isInitialized: boolean;
  
  /**
   * Whether there was an error during initialization
   */
  hasError: boolean;
  
  /**
   * Error message if initialization failed
   */
  error?: string;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Initialize and manage notifications at the app level.
 * 
 * This hook should be called once at the root of your app to set up
 * the notification system. It handles initialization, permission requests,
 * and error handling automatically.
 * 
 * @returns Initialization status and error information
 * 
 * @example
 * ```tsx
 * // In your root app component or layout
 * function App() {
 *   const { isInitialized, hasError } = useNotificationProvider();
 *   
 *   if (hasError) {
 *     console.warn('Notifications failed to initialize');
 *   }
 *   
 *   return (
 *     <div>
 *       {isInitialized && (
 *         <div className="notification-status">
 *           🔔 Notifications ready
 *         </div>
 *       )}
 *       {/* rest of your app * /}
 *     </div>
 *   );
 * }
 * ```
 */
export function useNotificationProvider(): UseNotificationProviderReturn {
  const { client, isReady: isClientReady } = useMatrixClient();
  const { 
    isSupported, 
    isPermissionGranted, 
    requestPermission,
    isReady: isNotificationReady,
    error: notificationError
  } = useNotifications();
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    // Reset error state when dependencies change
    setHasError(false);
    setErrorMessage(undefined);
    
    // Don't initialize if client isn't ready
    if (!isClientReady || !client) {
      setIsInitialized(false);
      return;
    }

    // Don't initialize if notifications aren't supported
    if (!isSupported) {
      setHasError(true);
      setErrorMessage('Notifications not supported by this browser');
      setIsInitialized(false);
      return;
    }

    // Initialize notifications
    const initializeNotifications = async () => {
      try {
        // Request permission if not already granted
        if (!isPermissionGranted) {
          console.log('[NotificationProvider] Requesting notification permission...');
          await requestPermission();
          // If permission denied, requestPermission should throw or we'll check status after
        }

        console.log('[NotificationProvider] Notifications initialized successfully');
        setIsInitialized(isNotificationReady);
        
      } catch (error) {
        console.error('[NotificationProvider] Failed to initialize notifications:', error);
        setHasError(true);
        setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
        setIsInitialized(false);
      }
    };

    initializeNotifications();
  }, [
    isClientReady, 
    client, 
    isSupported, 
    isPermissionGranted, 
    requestPermission,
    isNotificationReady
  ]);

  // Handle notification errors
  useEffect(() => {
    if (notificationError) {
      console.error('[NotificationProvider] Notification error:', notificationError);
      setHasError(true);
      setErrorMessage(notificationError.message);
    }
  }, [notificationError]);

  return {
    isInitialized,
    hasError,
    error: errorMessage
  };
}

export type { UseNotificationProviderReturn };