'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPushService } from '@/lib/notifications/push-service';

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
        const pushService = getPushService();
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

        const permission = Notification.permission;
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
      if (typeof Notification === 'undefined') {
        throw new Error('Notifications are not supported');
      }

      const permission = await Notification.requestPermission();
      
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

      const pushService = getPushService();
      
      // Generate unique device ID
      const deviceId = localStorage.getItem('haos:device-id') || (() => {
        const id = crypto.randomUUID();
        localStorage.setItem('haos:device-id', id);
        return id;
      })();

      // Subscribe to push notifications
      const subscription = await pushService.requestPermissionAndSubscribe(
        'current-user', // In real app, get from auth context
        deviceId
      );

      if (!subscription) {
        throw new Error('Failed to create push subscription');
      }

      // Send subscription to server
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: 'current-user', // In real app, get from auth context
          deviceId,
          subscription: subscription.subscription
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to register subscription');
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
      const pushService = getPushService();
      
      const deviceId = localStorage.getItem('haos:device-id');
      if (!deviceId) {
        throw new Error('No device ID found');
      }

      // Unsubscribe from push manager
      const success = await pushService.unsubscribe();
      
      if (success) {
        // Remove from server
        const response = await fetch(`/api/notifications/subscribe?deviceId=${deviceId}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          console.warn('Failed to remove subscription from server');
        }
      }

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
      const response = await fetch('/api/notifications/push?userId=current-user');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send test notification');
      }

      const result = await response.json();
      console.log('Test notification sent:', result);
      return result.success;

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