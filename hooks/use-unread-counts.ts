import { useState, useEffect } from 'react';
import { useMatrixClient } from '@/hooks/use-matrix-client';
import { UnreadCounts, NotificationCounts } from '@/types/notifications';

export function useUnreadCounts() {
  const matrixClient = useMatrixClient();
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({
    servers: {},
    channels: {},
    directMessages: {},
    totalUnread: 0,
  });

  useEffect(() => {
    if (!matrixClient) return;

    // Function to calculate unread counts
    const calculateUnreadCounts = () => {
      const newUnreadCounts: UnreadCounts = {
        servers: {},
        channels: {},
        directMessages: {},
        totalUnread: 0,
      };

      // Iterate through all joined rooms
      matrixClient.getRooms().forEach(room => {
        const roomId = room.roomId;
        const notification: NotificationCounts = {
          totalUnread: 0,
          mentionsUnread: 0,
          unreadMessages: 0,
        };

        // Count unread messages
        const roomSummary = matrixClient.getRoomSummary(roomId);
        if (roomSummary) {
          notification.totalUnread = roomSummary.unreadNotificationCount || 0;
          notification.mentionsUnread = roomSummary.highlightNotificationCount || 0;
          notification.unreadMessages = roomSummary.unreadCount || 0;
        }

        // Categorize room type
        if (room.isDirectMessage()) {
          newUnreadCounts.directMessages[roomId] = notification;
        } else if (room.getType() === 'm.space') {
          newUnreadCounts.servers[roomId] = notification;
        } else {
          newUnreadCounts.channels[roomId] = notification;
        }

        // Update total unread
        newUnreadCounts.totalUnread += notification.totalUnread;
      });

      setUnreadCounts(newUnreadCounts);
    };

    // Initial calculation
    calculateUnreadCounts();

    // Listen for room events that might change unread status
    const roomEventListeners = [
      'Room.timeline',
      'Room.accountData', 
      'Room.receipt', 
      'Room.tags'
    ];

    roomEventListeners.forEach(eventType => {
      matrixClient.on(eventType, calculateUnreadCounts);
    });

    // Cleanup listeners
    return () => {
      roomEventListeners.forEach(eventType => {
        matrixClient.off(eventType, calculateUnreadCounts);
      });
    };
  }, [matrixClient]);

  return {
    unreadCounts,
    resetUnreadForRoom: (roomId: string) => {
      if (matrixClient) {
        matrixClient.sendReadReceipt(roomId);
      }
    },
  };
}