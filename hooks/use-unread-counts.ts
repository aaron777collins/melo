"use client";

import { useState, useEffect, useCallback } from 'react';
import { NotificationCountType } from 'matrix-js-sdk';
import { useMatrixClient } from '@/hooks/use-matrix-client';
import { UnreadCounts, NotificationCounts } from '@/types/notifications';

export function useUnreadCounts() {
  const { client: matrixClient, isReady } = useMatrixClient();
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({
    servers: {},
    channels: {},
    directMessages: {},
    totalUnread: 0,
  });

  // Function to calculate unread counts
  const calculateUnreadCounts = useCallback(() => {
    if (!matrixClient || !isReady) return;

    const newUnreadCounts: UnreadCounts = {
      servers: {},
      channels: {},
      directMessages: {},
      totalUnread: 0,
    };

    try {
      // Get all joined rooms from the Matrix client
      const rooms = matrixClient.getRooms();
      
      rooms.forEach(room => {
        const roomId = room.roomId;
        const notification: NotificationCounts = {
          totalUnread: 0,
          mentionsUnread: 0,
          unreadMessages: 0,
        };

        // Count unread using Matrix SDK methods
        const unreadCount = room.getUnreadNotificationCount(NotificationCountType.Total) || 0;
        const highlightCount = room.getUnreadNotificationCount(NotificationCountType.Highlight) || 0;
        
        notification.totalUnread = unreadCount;
        notification.mentionsUnread = highlightCount;
        notification.unreadMessages = unreadCount;

        // Categorize room type - check if it's a DM
        const isDM = room.getJoinedMemberCount() === 2 && 
          room.getMyMembership() === 'join';
        
        // Check if it's a space (server equivalent)
        const isSpace = room.isSpaceRoom?.() ?? false;
        
        if (isDM) {
          newUnreadCounts.directMessages[roomId] = notification;
        } else if (isSpace) {
          newUnreadCounts.servers[roomId] = notification;
        } else {
          newUnreadCounts.channels[roomId] = notification;
        }

        // Update total unread
        newUnreadCounts.totalUnread += notification.totalUnread;
      });

      setUnreadCounts(newUnreadCounts);
    } catch (error) {
      console.error('Error calculating unread counts:', error);
    }
  }, [matrixClient, isReady]);

  useEffect(() => {
    if (!matrixClient || !isReady) return;

    // Initial calculation
    calculateUnreadCounts();

    // Listen for room events that might change unread status
    const handleRoomEvent = () => calculateUnreadCounts();

    // Use the correct event types for matrix-js-sdk
    matrixClient.on('Room.timeline' as any, handleRoomEvent);
    matrixClient.on('Room.receipt' as any, handleRoomEvent);
    matrixClient.on('Room.accountData' as any, handleRoomEvent);

    // Cleanup listeners
    return () => {
      matrixClient.off('Room.timeline' as any, handleRoomEvent);
      matrixClient.off('Room.receipt' as any, handleRoomEvent);
      matrixClient.off('Room.accountData' as any, handleRoomEvent);
    };
  }, [matrixClient, isReady, calculateUnreadCounts]);

  const resetUnreadForRoom = useCallback((roomId: string) => {
    if (!matrixClient || !isReady) return;
    
    try {
      const room = matrixClient.getRoom(roomId);
      if (room) {
        // Get the latest event to mark as read
        const timeline = room.getLiveTimeline();
        const events = timeline.getEvents();
        if (events.length > 0) {
          const latestEvent = events[events.length - 1];
          matrixClient.sendReadReceipt(latestEvent);
        }
      }
    } catch (error) {
      console.error('Error resetting unread for room:', error);
    }
  }, [matrixClient, isReady]);

  return {
    unreadCounts,
    resetUnreadForRoom,
    refresh: calculateUnreadCounts,
  };
}
