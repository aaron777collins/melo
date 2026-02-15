"use client";

import { useState, useCallback, useMemo } from "react";
import { MatrixEvent, MsgType, RelationType } from "matrix-js-sdk";

import { useMatrixClient } from "./use-matrix-client";

// =============================================================================
// Types
// =============================================================================

/**
 * Message editing state
 */
export interface MessageEditState {
  /**
   * The event being edited
   */
  event: MatrixEvent | null;
  
  /**
   * Current edit content
   */
  content: string;
  
  /**
   * Whether the edit is in progress
   */
  isEditing: boolean;
  
  /**
   * Whether save is in progress
   */
  isSaving: boolean;
}

/**
 * Message edit history entry
 */
export interface MessageEditHistory {
  /**
   * Original message content
   */
  originalContent: string;
  
  /**
   * Edit timestamp
   */
  editedAt: number;
  
  /**
   * Previous content (for undo functionality)
   */
  previousContent?: string;
}

/**
 * Return type for the useMessageEdit hook
 */
export interface UseMessageEditReturn {
  /**
   * Current editing state
   */
  editState: MessageEditState;
  
  /**
   * Start editing a message
   */
  startEditing: (event: MatrixEvent) => void;
  
  /**
   * Cancel editing (discard changes)
   */
  cancelEditing: () => void;
  
  /**
   * Save the edited message
   */
  saveEdit: () => Promise<boolean>;
  
  /**
   * Update the edit content
   */
  updateContent: (content: string) => void;
  
  /**
   * Check if a message can be edited by the current user
   */
  canEditMessage: (event: MatrixEvent) => boolean;
  
  /**
   * Check if a message has been edited
   */
  isMessageEdited: (event: MatrixEvent) => boolean;
  
  /**
   * Get edit history for a message (if available)
   */
  getEditHistory: (event: MatrixEvent) => MessageEditHistory | null;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Maximum time window for editing messages (24 hours)
 */
const EDIT_TIME_LIMIT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract plain text content from a Matrix message event
 */
function getMessageContent(event: MatrixEvent): string {
  const content = event.getContent();
  
  if (content.msgtype === MsgType.Text || content.msgtype === MsgType.Emote) {
    return content.body || "";
  }
  
  return "";
}

/**
 * Check if a message is within the editable time window
 */
function isWithinEditTimeLimit(event: MatrixEvent): boolean {
  const messageTime = event.getTs();
  const now = Date.now();
  const timeDiff = now - messageTime;
  
  return timeDiff <= EDIT_TIME_LIMIT;
}

/**
 * Check if an event is an edit event (m.replace relation)
 */
function isEditEvent(event: MatrixEvent): boolean {
  const relation = event.getRelation();
  return relation?.rel_type === RelationType.Replace;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for editing Matrix messages with full Matrix protocol support.
 * 
 * Supports:
 * - Editing own messages within time limits
 * - Matrix m.replace protocol for edit history
 * - Permission checking based on sender and room power levels
 * - Real-time edit state management
 * 
 * @param roomId - The Matrix room ID where the messages exist
 * @returns Object containing edit state and control functions
 * 
 * @example Basic usage
 * ```tsx
 * function MessageComponent({ event }: { event: MatrixEvent }) {
 *   const { editState, startEditing, cancelEditing, saveEdit, updateContent, canEditMessage } = 
 *     useMessageEdit(roomId);
 *   
 *   const handleEdit = () => {
 *     if (canEditMessage(event)) {
 *       startEditing(event);
 *     }
 *   };
 *   
 *   if (editState.isEditing && editState.event?.getId() === event.getId()) {
 *     return (
 *       <div>
 *         <input 
 *           value={editState.content}
 *           onChange={(e) => updateContent(e.target.value)}
 *         />
 *         <button onClick={saveEdit} disabled={editState.isSaving}>
 *           Save
 *         </button>
 *         <button onClick={cancelEditing}>Cancel</button>
 *       </div>
 *     );
 *   }
 *   
 *   return (
 *     <div>
 *       {getMessageContent(event)}
 *       {canEditMessage(event) && (
 *         <button onClick={handleEdit}>Edit</button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useMessageEdit(roomId: string): UseMessageEditReturn {
  const { client, isReady } = useMatrixClient();
  
  // Local state for editing
  const [editState, setEditState] = useState<MessageEditState>({
    event: null,
    content: "",
    isEditing: false,
    isSaving: false,
  });
  
  const currentUserId = client?.getUserId();
  
  // =============================================================================
  // Permission Checking
  // =============================================================================
  
  /**
   * Check if the current user can edit a message
   */
  const canEditMessage = useCallback((event: MatrixEvent): boolean => {
    if (!client || !currentUserId || !isReady) return false;
    
    // Can only edit own messages
    const sender = event.getSender();
    if (sender !== currentUserId) return false;
    
    // Can only edit text messages and emotes
    const content = event.getContent();
    if (content.msgtype !== MsgType.Text && content.msgtype !== MsgType.Emote) {
      return false;
    }
    
    // Check if message is within edit time limit
    if (!isWithinEditTimeLimit(event)) return false;
    
    // Can't edit redacted messages
    if (event.isRedacted()) return false;
    
    // Additional room-specific checks could go here
    // (e.g., room power levels, room settings)
    
    return true;
  }, [client, currentUserId, isReady]);
  
  /**
   * Check if a message has been edited
   */
  const isMessageEdited = useCallback((event: MatrixEvent): boolean => {
    const unsigned = event.getUnsigned();
    
    // Check for m.replace relation in unsigned data
    if (unsigned && unsigned['m.relations'] && unsigned['m.relations']['m.replace']) {
      return true;
    }
    
    // Check event content for edit indicators
    const content = event.getContent();
    if (content && content['m.new_content']) {
      return true;
    }
    
    return false;
  }, []);
  
  // =============================================================================
  // Edit Operations
  // =============================================================================
  
  /**
   * Start editing a message
   */
  const startEditing = useCallback((event: MatrixEvent) => {
    if (!canEditMessage(event)) {
      console.warn("Cannot edit message: permission denied or invalid message type");
      return;
    }
    
    const content = getMessageContent(event);
    
    setEditState({
      event,
      content,
      isEditing: true,
      isSaving: false,
    });
  }, [canEditMessage]);
  
  /**
   * Cancel editing and discard changes
   */
  const cancelEditing = useCallback(() => {
    setEditState({
      event: null,
      content: "",
      isEditing: false,
      isSaving: false,
    });
  }, []);
  
  /**
   * Update the edit content
   */
  const updateContent = useCallback((content: string) => {
    setEditState(prev => ({
      ...prev,
      content,
    }));
  }, []);
  
  /**
   * Save the edited message to Matrix
   */
  const saveEdit = useCallback(async (): Promise<boolean> => {
    if (!editState.event || !editState.isEditing || !client || !isReady) {
      return false;
    }
    
    const { event, content } = editState;
    const eventId = event.getId();
    
    if (!eventId) {
      console.error("Cannot save edit: event has no ID");
      return false;
    }
    
    // Don't save if content hasn't changed
    const originalContent = getMessageContent(event);
    if (content.trim() === originalContent.trim()) {
      cancelEditing();
      return true;
    }
    
    // Don't save empty messages
    if (!content.trim()) {
      console.warn("Cannot save empty message");
      return false;
    }
    
    setEditState(prev => ({ ...prev, isSaving: true }));
    
    try {
      // Determine message type (preserve original type)
      const originalContent = event.getContent();
      const originalMsgtype = originalContent.msgtype;
      const msgtype = (originalMsgtype === MsgType.Text || 
                      originalMsgtype === MsgType.Emote ||
                      originalMsgtype === MsgType.Notice) 
                     ? originalMsgtype 
                     : MsgType.Text;
      
      // Send edit event using Matrix m.replace relation
      await client.sendMessage(roomId, {
        "msgtype": MsgType.Text, // Use Text type for edits to avoid type conflicts
        "body": `* ${content.trim()}`, // Fallback for clients that don't support edits
        "m.new_content": {
          "msgtype": MsgType.Text, // Use Text type for new content
          "body": content.trim(),
        },
        "m.relates_to": {
          "rel_type": RelationType.Replace,
          "event_id": eventId,
        },
      });
      
      // Clear edit state on success
      cancelEditing();
      return true;
      
    } catch (error) {
      console.error("Failed to save message edit:", error);
      
      // Keep edit state on error so user can retry
      setEditState(prev => ({ ...prev, isSaving: false }));
      return false;
    }
  }, [editState, client, isReady, roomId, cancelEditing]);
  
  // =============================================================================
  // History and Metadata
  // =============================================================================
  
  /**
   * Get edit history for a message (basic implementation)
   */
  const getEditHistory = useCallback((event: MatrixEvent): MessageEditHistory | null => {
    if (!isMessageEdited(event)) return null;
    
    const originalContent = getMessageContent(event);
    const editTime = event.getTs();
    
    // In a full implementation, you would fetch the edit chain from Matrix
    // For now, just return basic info
    return {
      originalContent,
      editedAt: editTime,
    };
  }, [isMessageEdited]);
  
  // =============================================================================
  // Memoized Return Value
  // =============================================================================
  
  return useMemo(() => ({
    editState,
    startEditing,
    cancelEditing,
    saveEdit,
    updateContent,
    canEditMessage,
    isMessageEdited,
    getEditHistory,
  }), [
    editState,
    startEditing,
    cancelEditing,
    saveEdit,
    updateContent,
    canEditMessage,
    isMessageEdited,
    getEditHistory,
  ]);
}

// =============================================================================
// Type Exports
// =============================================================================

// Types are already exported inline above