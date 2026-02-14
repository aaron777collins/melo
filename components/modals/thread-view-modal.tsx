"use client";

import React, { useState, useEffect, useRef } from "react";
import { MatrixEvent, EventType, MsgType, RelationType } from "matrix-js-sdk";
import { format } from "date-fns";
import { MessageSquare, Send, X, ArrowLeft } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useModal } from "@/hooks/use-modal-store";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { ChatItem } from "@/components/chat/chat-item";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface ThreadMessage {
  event: MatrixEvent;
  isInThread: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if an event is a thread reply to a specific root event
 */
function isThreadReplyTo(event: MatrixEvent, rootEventId: string): boolean {
  const relation = event.getRelation();
  return relation?.rel_type === RelationType.Thread && relation.event_id === rootEventId;
}

/**
 * Get display name for a Matrix user
 */
function getDisplayName(event: MatrixEvent): string {
  const sender = event.getSender();
  if (!sender) return "Unknown User";
  
  if (sender.startsWith("@")) {
    const username = sender.split(":")[0].substring(1);
    return username;
  }
  
  return sender;
}

/**
 * Get message content from Matrix event
 */
function getMessageContent(event: MatrixEvent): string {
  const content = event.getContent();
  return content.body || "";
}

// =============================================================================
// Component
// =============================================================================

/**
 * Thread view modal - displays a message thread with replies
 */
export function ThreadViewModal() {
  const { isOpen, onClose, type, data } = useModal();
  const { client, isReady } = useMatrixClient();
  
  const [originalEvent, setOriginalEvent] = useState<MatrixEvent | null>(null);
  const [threadReplies, setThreadReplies] = useState<MatrixEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const isModalOpen = isOpen && type === "threadView";
  const { originalEventId, roomId } = data;
  
  // =============================================================================
  // Effects
  // =============================================================================
  
  /**
   * Load thread data when modal opens
   */
  useEffect(() => {
    if (!isModalOpen || !originalEventId || !roomId || !client || !isReady) {
      return;
    }
    
    loadThreadData();
  }, [isModalOpen, originalEventId, roomId, client, isReady]);
  
  /**
   * Focus textarea when modal opens
   */
  useEffect(() => {
    if (isModalOpen && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isModalOpen]);
  
  /**
   * Auto-scroll to bottom when new replies are loaded
   */
  useEffect(() => {
    if (threadReplies.length > 0 && scrollAreaRef.current) {
      setTimeout(() => {
        const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }, 100);
    }
  }, [threadReplies]);
  
  // =============================================================================
  // Data Loading
  // =============================================================================
  
  /**
   * Load the original event and thread replies
   */
  const loadThreadData = async () => {
    if (!client || !originalEventId || !roomId) return;
    
    setLoading(true);
    try {
      const room = client.getRoom(roomId);
      if (!room) {
        console.error("Room not found:", roomId);
        return;
      }
      
      // Find the original event
      const timeline = room.getLiveTimeline();
      const events = timeline.getEvents();
      const original = events.find(e => e.getId() === originalEventId);
      
      if (original) {
        setOriginalEvent(original);
        
        // Find all thread replies
        const replies = events.filter(event => 
          isThreadReplyTo(event, originalEventId) &&
          event.getType() === EventType.RoomMessage
        ).sort((a, b) => a.getTs() - b.getTs());
        
        setThreadReplies(replies);
      }
    } catch (error) {
      console.error("Failed to load thread data:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // =============================================================================
  // Actions
  // =============================================================================
  
  /**
   * Send a reply to the thread
   */
  const sendReply = async () => {
    if (!client || !originalEventId || !roomId || !replyText.trim()) return;
    
    setSending(true);
    try {
      // Send message with m.thread relation
      await client.sendMessage(roomId, {
        msgtype: MsgType.Text,
        body: replyText.trim(),
        "m.relates_to": {
          rel_type: RelationType.Thread,
          event_id: originalEventId,
        },
      });
      
      setReplyText("");
      
      // Reload thread data to show the new reply
      setTimeout(() => {
        loadThreadData();
      }, 500);
      
    } catch (error) {
      console.error("Failed to send thread reply:", error);
    } finally {
      setSending(false);
    }
  };
  
  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  };
  
  /**
   * Handle modal close
   */
  const handleClose = () => {
    setOriginalEvent(null);
    setThreadReplies([]);
    setReplyText("");
    onClose();
  };
  
  // =============================================================================
  // Render
  // =============================================================================
  
  if (!isModalOpen) return null;
  
  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl h-[80vh] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleClose}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-zinc-500" />
              <DialogTitle>Thread</DialogTitle>
            </div>
            
            <div className="flex-1" />
            
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        {/* Content */}
        <div className="flex flex-col h-full">
          {/* Thread Messages */}
          <ScrollArea ref={scrollAreaRef} className="flex-1 px-6">
            <div className="py-4 space-y-4">
              {/* Loading State */}
              {loading && (
                <div className="text-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">Loading thread...</p>
                </div>
              )}
              
              {/* Original Message */}
              {originalEvent && (
                <div className="border rounded-lg p-4 bg-zinc-50 dark:bg-zinc-800/50">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-zinc-500" />
                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      Original message
                    </span>
                  </div>
                  
                  <ChatItem
                    event={originalEvent}
                    isFirstInGroup={true}
                    isCurrentUser={originalEvent.getSender() === client?.getUserId()}
                    currentUserId={client?.getUserId() ?? undefined}
                    roomId={roomId || ""}
                  />
                </div>
              )}
              
              {/* Separator */}
              {originalEvent && threadReplies.length > 0 && (
                <Separator />
              )}
              
              {/* Thread Replies */}
              {threadReplies.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                    {threadReplies.length} {threadReplies.length === 1 ? 'reply' : 'replies'}
                  </div>
                  
                  {threadReplies.map((reply, index) => (
                    <ChatItem
                      key={reply.getId()}
                      event={reply}
                      isFirstInGroup={index === 0 || threadReplies[index - 1]?.getSender() !== reply.getSender()}
                      isCurrentUser={reply.getSender() === client?.getUserId()}
                      currentUserId={client?.getUserId() ?? undefined}
                      roomId={roomId || ""}
                    />
                  ))}
                </div>
              ) : !loading && originalEvent && (
                <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No replies yet</p>
                  <p className="text-xs">Be the first to reply to this message</p>
                </div>
              )}
            </div>
          </ScrollArea>
          
          {/* Reply Input */}
          <div className="border-t border-zinc-200 dark:border-zinc-700 p-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <Textarea
                  ref={textareaRef}
                  placeholder={`Reply to this thread...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-h-[60px] resize-none"
                  disabled={sending}
                />
                
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-zinc-500">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                  
                  <Button
                    onClick={sendReply}
                    disabled={!replyText.trim() || sending}
                    size="sm"
                    className="gap-2"
                  >
                    {sending ? (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}