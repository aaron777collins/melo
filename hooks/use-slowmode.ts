import { useState, useEffect, useCallback } from 'react';
import { SlowmodeSettings } from '@/types/channel';
import { toast } from 'sonner';

/**
 * Manage client-side slowmode rate limiting 
 * @param slowmodeSettings Channel's slowmode configuration
 * @returns Object with rate limiting logic
 */
export function useSlowmode(slowmodeSettings?: SlowmodeSettings) {
  const [lastMessageTime, setLastMessageTime] = useState<number | null>(null);
  const [remainingCooldown, setRemainingCooldown] = useState(0);

  // Check if message can be sent based on slowmode settings
  const canSendMessage = useCallback(() => {
    // No slowmode or disabled
    if (!slowmodeSettings || slowmodeSettings.duration === 0) {
      return true;
    }

    // No previous message, can always send first message
    if (!lastMessageTime) {
      return true;
    }

    const now = Date.now();
    const timeSinceLastMessage = (now - lastMessageTime) / 1000;

    return timeSinceLastMessage >= slowmodeSettings.duration;
  }, [slowmodeSettings, lastMessageTime]);

  // Handle message sending with slowmode restrictions
  const sendMessage = useCallback((sendFn: () => void) => {
    if (!slowmodeSettings || slowmodeSettings.duration === 0) {
      sendFn();
      return;
    }

    if (canSendMessage()) {
      sendFn();
      setLastMessageTime(Date.now());
      setRemainingCooldown(0);
    } else {
      const now = Date.now();
      const remainingTime = Math.ceil(
        slowmodeSettings.duration - (now - (lastMessageTime || 0)) / 1000
      );

      toast.error(`Slowmode active. Please wait ${remainingTime} seconds.`, {
        description: 'Slow down to avoid flooding the channel.',
      });
    }
  }, [slowmodeSettings, canSendMessage, lastMessageTime]);

  // Countdown for remaining cooldown
  useEffect(() => {
    if (!slowmodeSettings || slowmodeSettings.duration === 0) return;

    if (lastMessageTime) {
      const interval = setInterval(() => {
        const now = Date.now();
        const timeSinceLastMessage = Math.ceil((now - lastMessageTime) / 1000);
        const remaining = Math.max(
          slowmodeSettings.duration - timeSinceLastMessage,
          0
        );

        setRemainingCooldown(remaining);

        if (remaining === 0) {
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [lastMessageTime, slowmodeSettings]);

  return {
    sendMessage,
    canSendMessage,
    remainingCooldown,
  };
}