/**
 * Matrix Reaction Types
 * 
 * TypeScript types for Matrix m.reaction events and emoji reaction handling.
 * Follows the Matrix specification for message annotations.
 * 
 * @see https://spec.matrix.org/v1.6/client-server-api/#mreaction
 */

// =============================================================================
// Core Reaction Types
// =============================================================================

/**
 * A single reaction on a message
 */
export interface MessageReaction {
  /** The emoji key (e.g., "👍", "😄") */
  key: string;
  /** Users who reacted with this emoji */
  users: Set<string>;
  /** Total count of this reaction */
  count: number;
  /** Whether current user reacted with this */
  currentUserReacted: boolean;
}

/**
 * All reactions for a message
 */
export interface MessageReactions {
  /** Event ID of the message */
  eventId: string;
  /** Map of emoji key to reaction data */
  reactions: Map<string, MessageReaction>;
  /** Total reaction count across all emoji */
  totalCount: number;
}

/**
 * Result of a reaction operation (add/remove/toggle)
 */
export interface ReactionResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Event ID of the created reaction (for add operations) */
  eventId?: string;
  /** Error message if operation failed */
  error?: string;
}

/**
 * Options for reaction operations
 */
export interface ReactionOptions {
  /** Maximum reactions to track per message */
  maxReactions?: number;
  /** Include reactions from specific users only */
  filterByUsers?: string[];
  /** Exclude specific emoji */
  excludeEmoji?: string[];
  /** Include redacted reactions in count */
  includeRedacted?: boolean;
}

// =============================================================================
// Matrix Event Types for Reactions
// =============================================================================

/**
 * Matrix m.reaction event content
 * 
 * @see https://spec.matrix.org/v1.6/client-server-api/#mreaction
 */
export interface MatrixReactionEventContent {
  'm.relates_to': MatrixReactionRelation;
}

/**
 * Relation data for a reaction
 */
export interface MatrixReactionRelation {
  /** Relation type - always 'm.annotation' for reactions */
  rel_type: 'm.annotation';
  /** Event ID of the message being reacted to */
  event_id: string;
  /** The emoji key (e.g., "👍", "😄", "🎉") */
  key: string;
}

/**
 * Parsed reaction event data
 */
export interface ReactionEvent {
  /** The reaction event ID */
  eventId: string;
  /** Target message event ID */
  targetEventId: string;
  /** Emoji key */
  emoji: string;
  /** User who reacted */
  sender: string;
  /** Timestamp of the reaction */
  timestamp: number;
  /** Whether this event is redacted (reaction removed) */
  isRedacted: boolean;
}

// =============================================================================
// Aggregation Types
// =============================================================================

/**
 * Summary of top reactions in a room/context
 */
export interface TopReaction {
  /** The emoji */
  emoji: string;
  /** Number of unique users who used this emoji */
  count: number;
  /** List of user IDs who reacted with this emoji */
  users: string[];
}

/**
 * Reaction aggregation for multiple messages
 */
export interface ReactionAggregation {
  /** Map of event ID to reactions */
  byEventId: Map<string, MessageReactions>;
  /** Top reactions across all messages */
  topReactions: TopReaction[];
  /** Total reactions counted */
  totalReactions: number;
}

// =============================================================================
// Component Props Types
// =============================================================================

/**
 * Props for the MessageReactions component
 */
export interface MessageReactionsProps {
  /** Room ID containing the message */
  roomId: string;
  /** Event ID of the message */
  eventId: string;
  /** Whether to show add reaction button */
  showAddButton?: boolean;
  /** Maximum reactions to display */
  maxReactions?: number;
  /** Additional CSS classes */
  className?: string;
  /** Custom reaction options */
  reactionOptions?: ReactionOptions;
  /** Callback when reaction state changes */
  onReactionChange?: (reactions: MessageReactions) => void;
}

/**
 * Props for the ReactionBadge component
 */
export interface ReactionBadgeProps {
  /** Reaction data */
  reaction: MessageReaction;
  /** Whether current user has this reaction */
  isCurrentUser: boolean;
  /** Callback to toggle reaction */
  onToggle: () => void;
  /** List of users for tooltip */
  userList: string[];
}

/**
 * Props for the EmojiPicker component
 */
export interface EmojiPickerProps {
  /** Callback when emoji is selected */
  onEmojiSelect: (emoji: string) => void;
  /** Whether picker is open */
  open: boolean;
  /** Callback to close picker */
  onClose: () => void;
  /** List of frequently used emoji */
  recentEmoji?: string[];
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if content is a valid reaction event content
 */
export function isReactionEventContent(content: unknown): content is MatrixReactionEventContent {
  if (!content || typeof content !== 'object') return false;
  
  const maybeContent = content as Record<string, unknown>;
  const relation = maybeContent['m.relates_to'];
  
  if (!relation || typeof relation !== 'object') return false;
  
  const maybeRelation = relation as Record<string, unknown>;
  
  return (
    maybeRelation.rel_type === 'm.annotation' &&
    typeof maybeRelation.event_id === 'string' &&
    typeof maybeRelation.key === 'string'
  );
}

/**
 * Type guard to check if result is a successful reaction result
 */
export function isSuccessfulReactionResult(result: ReactionResult): result is ReactionResult & { success: true } {
  return result.success === true;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create an empty MessageReactions object
 */
export function createEmptyReactions(eventId: string): MessageReactions {
  return {
    eventId,
    reactions: new Map(),
    totalCount: 0,
  };
}

/**
 * Convert MessageReactions to a serializable format
 */
export function serializeReactions(reactions: MessageReactions): {
  eventId: string;
  reactions: Array<[string, Omit<MessageReaction, 'users'> & { users: string[] }]>;
  totalCount: number;
} {
  return {
    eventId: reactions.eventId,
    reactions: Array.from(reactions.reactions.entries()).map(([key, reaction]) => [
      key,
      {
        key: reaction.key,
        users: Array.from(reaction.users),
        count: reaction.count,
        currentUserReacted: reaction.currentUserReacted,
      },
    ]),
    totalCount: reactions.totalCount,
  };
}

/**
 * Convert serialized reactions back to MessageReactions
 */
export function deserializeReactions(serialized: ReturnType<typeof serializeReactions>): MessageReactions {
  const reactions = new Map<string, MessageReaction>();
  
  for (const [key, reaction] of serialized.reactions) {
    reactions.set(key, {
      key: reaction.key,
      users: new Set(reaction.users),
      count: reaction.count,
      currentUserReacted: reaction.currentUserReacted,
    });
  }
  
  return {
    eventId: serialized.eventId,
    reactions,
    totalCount: serialized.totalCount,
  };
}

/**
 * Common emoji list for quick reactions
 */
export const COMMON_EMOJI = [
  '👍', '👎', '❤️', '😄', '😢', '😡', '😮', '👏',
  '🎉', '🔥', '💯', '⚡', '⭐', '✅', '❌', '❓'
] as const;

export type CommonEmoji = typeof COMMON_EMOJI[number];
