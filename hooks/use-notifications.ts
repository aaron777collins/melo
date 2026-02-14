// Temporary stub for use-notifications hook to get build working
// TODO: Restore full implementation from hooks-needing-migration/use-notifications.ts
// after apps/web integration is complete

export const useNotifications = () => {
  return {
    notifications: [],
    isLoading: false,
    markAsRead: () => {},
    markAllAsRead: () => {},
    settings: {
      enabled: true,
      sound: true,
      desktop: true,
      directMessages: true,
      mentions: true,
      replies: true,
      reactions: true,
      threadReplies: true,
      roomInvites: true,
      allRoomMessages: false,
      keywords: [] as string[],
      duration: 5000,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      },
    },
    updateSettings: (settings: any) => {},
    isSupported: true,
    permission: 'granted',
    isPermissionGranted: true,
    requestPermission: () => Promise.resolve(),
    testNotification: () => Promise.resolve(),
    isReady: true
  };
};