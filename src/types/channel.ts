export interface SlowmodeSettings {
  /**
   * Slowmode duration in seconds
   * 0 means slowmode is disabled
   */
  duration: number;

  /**
   * Timestamp of when the last message was sent
   * Used for tracking rate limiting
   */
  lastMessageTimestamp?: number;
}

/**
 * Possible slowmode duration options
 */
export const SLOWMODE_DURATION_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '5 seconds', value: 5 },
  { label: '10 seconds', value: 10 },
  { label: '30 seconds', value: 30 },
  { label: '1 minute', value: 60 },
  { label: '2 minutes', value: 120 },
  { label: '5 minutes', value: 300 },
  { label: '10 minutes', value: 600 },
  { label: '15 minutes', value: 900 },
] as const;