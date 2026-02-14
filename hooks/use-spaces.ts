// Temporary stub for use-spaces hook to get build working
// TODO: Restore full implementation from hooks-needing-migration/use-spaces.ts
// after apps/web integration is complete

export const useSpaces = () => {
  return {
    spaces: [],
    loading: false,
    error: null,
    refetch: () => Promise.resolve()
  };
};

export const useUnreadDMCount = () => {
  return {
    count: 0
  };
};