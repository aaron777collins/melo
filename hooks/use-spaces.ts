// Temporary stub for use-spaces hook to get build working
// TODO: Restore full implementation from hooks-needing-migration/use-spaces.ts
// after apps/web integration is complete

interface SpaceStub {
  id: string;
  name: string;
  avatarUrl: string;
  hasUnread: boolean;
  mentionCount: number;
}

export const useSpaces = () => {
  return {
    spaces: [] as SpaceStub[],
    isLoading: false,
    error: null,
    refetch: () => Promise.resolve()
  };
};

export const useUnreadDMCount = () => {
  return 0;
};