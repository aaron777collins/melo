import { create } from 'zustand';
import { useMatrixClient } from '@/hooks/use-matrix-client';
import { useEffect, useState } from 'react';

// DM conversation interface
export interface DMConversation {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  lastMessage?: {
    text: string;
    timestamp: number;
    senderId: string;
  };
  unreadCount: number;
  isOnline: boolean;
}

// DM store interface
interface DMStore {
  conversations: DMConversation[];
  setConversations: (conversations: DMConversation[]) => void;
  updateUnreadCount: (dmId: string, count: number) => void;
  markAsRead: (dmId: string) => void;
  addConversation: (conversation: DMConversation) => void;
  removeConversation: (dmId: string) => void;
}

// Zustand store for DM management
export const useDMStore = create<DMStore>((set, get) => ({
  conversations: [],
  
  setConversations: (conversations) => set({ conversations }),
  
  updateUnreadCount: (dmId, count) => set((state) => ({
    conversations: state.conversations.map(dm =>
      dm.id === dmId ? { ...dm, unreadCount: count } : dm
    )
  })),
  
  markAsRead: (dmId) => set((state) => ({
    conversations: state.conversations.map(dm =>
      dm.id === dmId ? { ...dm, unreadCount: 0 } : dm
    )
  })),
  
  addConversation: (conversation) => set((state) => ({
    conversations: [...state.conversations.filter(dm => dm.id !== conversation.id), conversation]
  })),
  
  removeConversation: (dmId) => set((state) => ({
    conversations: state.conversations.filter(dm => dm.id !== dmId)
  })),
}));

/**
 * Hook for managing DM unread state and data
 * Integrates with Matrix client to fetch and track DM conversations
 */
export function useDMUnread() {
  const { client, isReady } = useMatrixClient();
  const { 
    conversations, 
    setConversations, 
    updateUnreadCount, 
    markAsRead,
    addConversation,
    removeConversation 
  } = useDMStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load DM conversations from Matrix
  useEffect(() => {
    if (!client || !isReady || typeof client.getRooms !== 'function') return;

    const loadDMConversations = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get all rooms from Matrix client
        const rooms = client.getRooms();
        
        // Filter for direct message rooms
        const dmRooms = rooms.filter(room => {
          const isDirect = room.isDirect?.() || room.tags?.['m.direct'];
          return isDirect && room.getJoinedMemberCount() === 2;
        });

        // Convert to DM conversation format
        const dmConversations: DMConversation[] = dmRooms.map(room => {
          const roomId = room.roomId;
          const members = room.getJoinedMembers();
          const currentUserId = client.getUserId();
          
          // Find the other member (not current user)
          const otherMember = members.find(member => member.userId !== currentUserId);
          
          // Get unread count
          const unreadCount = room.getUnreadNotificationCount() || 0;
          
          // Get last message
          const timeline = room.getLiveTimeline();
          const events = timeline.getEvents();
          const lastMessageEvent = events
            .filter(event => event.getType() === 'm.room.message')
            .pop();

          let lastMessage = undefined;
          if (lastMessageEvent) {
            const content = lastMessageEvent.getContent();
            lastMessage = {
              text: content.body || '',
              timestamp: lastMessageEvent.getTs(),
              senderId: lastMessageEvent.getSender() || '',
            };
          }

          return {
            id: roomId,
            userId: otherMember?.userId || 'unknown',
            displayName: otherMember?.name || 'Unknown User',
            avatarUrl: otherMember?.getAvatarUrl(client.baseUrl, 32, 32, 'crop') || undefined,
            lastMessage,
            unreadCount,
            isOnline: false, // TODO: Implement presence tracking
          };
        });

        setConversations(dmConversations);
      } catch (err) {
        console.error('Failed to load DM conversations:', err);
        setError('Failed to load DM conversations');
      } finally {
        setIsLoading(false);
      }
    };

    loadDMConversations();

    // Set up real-time updates for unread counts (if supported)
    let cleanupEventListener: (() => void) | undefined;
    
    if (typeof client.on === 'function') {
      const handleTimelineEvent = (event: any, room: any) => {
        if (room?.isDirect?.() && event.getType() === 'm.room.message') {
          const roomId = room.roomId;
          const unreadCount = room.getUnreadNotificationCount() || 0;
          updateUnreadCount(roomId, unreadCount);
        }
      };

      client.on('Room.timeline' as any, handleTimelineEvent);

      cleanupEventListener = () => {
        if (typeof client.off === 'function') {
          client.off('Room.timeline' as any, handleTimelineEvent);
        }
      };
    }

    return cleanupEventListener;
  }, [client, isReady, setConversations, updateUnreadCount]);

  // Get total unread count across all DMs
  const totalUnreadCount = conversations.reduce((total, dm) => total + dm.unreadCount, 0);

  return {
    conversations,
    isLoading,
    error,
    totalUnreadCount,
    updateUnreadCount,
    markAsRead,
    addConversation,
    removeConversation,
  };
}

/**
 * Hook to mark a DM as read when opened
 */
export function useDMReadReceipt(roomId: string | null) {
  const { client } = useMatrixClient();
  const { markAsRead } = useDMStore();

  useEffect(() => {
    if (!roomId || !client) return;

    // Mark as read in local store
    markAsRead(roomId);

    // Send read receipt to Matrix (if supported)
    if (typeof client.getRoom === 'function') {
      const room = client.getRoom(roomId);
      if (room && typeof room.getLiveTimeline === 'function') {
        const timeline = room.getLiveTimeline();
        if (timeline && typeof timeline.getEvents === 'function') {
          const events = timeline.getEvents();
          const lastEvent = events.pop();
          if (lastEvent && typeof client.sendReadReceipt === 'function') {
            client.sendReadReceipt(lastEvent).catch(err => {
              console.error('Failed to send read receipt:', err);
            });
          }
        }
      }
    }
  }, [roomId, client, markAsRead]);
}