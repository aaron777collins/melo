'use client';

import { useState, useEffect, useCallback } from 'react';
import { getClientPushService } from '@/lib/notifications/push-service-client';

export interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  permission: NotificationPermission;
}

export interface UsePushNotificationsReturn extends PushNotificationState {
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  sendTestNotification: () => Promise<boolean>;
  requestPermission: () => Promise<boolean>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
    error: null,
    permission: 'default'
  });

  // Check initial state
  useEffect(() => {
    async function checkState() {
      try {
        const pushService = getClientPushService();
        const isSupported = pushService.isSupported();
        
        if (!isSupported) {
          setState(prev => ({
            ...prev,
            isSupported: false,
            isLoading: false,
            error: 'Push notifications are not supported in this browser'
          }));
          return;
        }

        const permission = typeof Notification !== 'undefined' ? Notification.permission : 'default';
        const isSubscribed = await pushService.isSubscribed();

        setState(prev => ({
          ...prev,
          isSupported: true,
          isSubscribed,
          permission,
          isLoading: false
        }));

      } catch (error) {
        console.error('Error checking push notification state:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    }

    checkState();
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const pushService = getClientPushService();
      const permission = await pushService.requestPermission();
      
      setState(prev => ({
        ...prev,
        permission,
        error: permission === 'denied' ? 'Notification permission denied' : null
      }));

      return permission === 'granted';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to request permission';
      setState(prev => ({ ...prev, error: errorMessage }));
      return false;
    }
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      if (state.permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          throw new Error('Notification permission required');
        }
      }

      const pushService = getClientPushService();
      
      // Generate unique device ID
      const deviceId = localStorage.getItem('haos:device-id') || (() => {
        const id = crypto.randomUUID();
        localStorage.setItem('haos:device-id', id);
        return id;
      })();

      // Subscribe to push notifications (this handles server registration internally)
      const success = await pushService.subscribe('current-user', deviceId);

      if (!success) {
        throw new Error('Failed to subscribe to push notifications');
      }

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        isLoading: false
      }));

      return true;

    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      const errorMessage = error instanceof Error ? error.message : 'Subscription failed';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      return false;
    }
  }, [state.permission, requestPermission]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const pushService = getClientPushService();
      
      const deviceId = localStorage.getItem('haos:device-id');
      if (!deviceId) {
        throw new Error('No device ID found');
      }

      // Unsubscribe from push manager (this handles server removal internally)
      const success = await pushService.unsubscribe(deviceId);

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false
      }));

      return success;

    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unsubscription failed';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      return false;
    }
  }, []);

  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    try {
      const pushService = getClientPushService();
      return await pushService.sendTestNotification('current-user');

    } catch (error) {
      console.error('Failed to send test notification:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Test notification failed'
      }));
      return false;
    }
  }, []);

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendTestNotification,
    requestPermission
  };
}