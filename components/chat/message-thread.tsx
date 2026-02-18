/**
 * Message Thread Component
 * 
 * Renders a thread view for Matrix messages, showing the root message and all replies.
 * Supports real-time updates and thread navigation.
 */

"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, ChevronUp, ChevronDown, User, Send, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

import { useMatrixClient } from '@/hooks/use-matrix-client';
import { ThreadManager, ThreadSummary, ThreadReply, ThreadOptions } from '@/lib/matrix/chat/thread-manager';
import type { MatrixEvent } from '@/lib/matrix/matrix-sdk-exports';

// =============================================================================
// Types
// =============================================================================

interface MessageThreadProps {
  /** Room ID containing the thread */
  roomId: string;
  /** Root event ID that started the thread */
  rootEventId: string;
  /** Whether to show as expanded thread view or compact summary */
  expanded?: boolean;
  /** Maximum replies to show initially */
  maxReplies?: number;
  /** Additional CSS classes */
  className?: string;
  /** Callback when thread is expanded/collapsed */
  onExpandChange?: (expanded: boolean) => void;
  /** Custom thread options */
  threadOptions?: ThreadOptions;
}

interface ThreadMessageProps {
  /** Thread reply data */
  reply: ThreadReply;
  /** Whether this is the current user's message */
  isOwnMessage: boolean;
  /** Room ID for context */
  roomId: string;
}

interface ThreadInputProps {
  /** Room ID */
  roomId: string;
  /** Root event ID to reply to */
  rootEventId: string;
  /** Thread manager instance */
  threadManager: ThreadManager;
  /** Callback when message sent */
  onMessageSent?: () => void;
}

// =============================================================================
// Thread Message Component
// =============================================================================

const ThreadMessage: React.FC<ThreadMessageProps> = ({
  reply,
  isOwnMessage,
  roomId,
}) => {
  const getUserDisplayName = useCallback((userId: string) => {
    // Extract username from Matrix user ID
    return userId.split(':')[0].replace('@', '');
  }, []);

  const getRelativeTime = useCallback((timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  }, []);

  return (
    <div className={`flex gap-3 p-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarImage src={`/api/avatar/${reply.sender}`} />
        <AvatarFallback>
          <User className="w-4 h-4" />
        </AvatarFallback>
      </Avatar>
      
      <div className={`flex-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm">
            {getUserDisplayName(reply.sender)}
          </span>
          <span className="text-xs text-muted-foreground">
            {getRelativeTime(reply.timestamp)}
          </span>
          {reply.isEdited && (
            <Badge variant="secondary" className="text-xs">
              Edited
            </Badge>
          )}
        </div>
        
        <div className={`
          p-2 rounded-lg max-w-md
          ${isOwnMessage 
            ? 'bg-primary text-primary-foreground ml-auto' 
            : 'bg-muted'
          }
          ${reply.isRedacted ? 'opacity-50 italic' : ''}
        `}>
          {reply.isRedacted ? (
            <span className="text-sm">Message deleted</span>
          ) : (
            <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Thread Input Component
// =============================================================================

const ThreadInput: React.FC<ThreadInputProps> = ({
  roomId,
  rootEventId,
  threadManager,
  onMessageSent,
}) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = useCallback(async () => {
    if (!message.trim() || sending) return;

    setSending(true);
    try {
      const result = await threadManager.sendThreadReply(roomId, rootEventId, message.trim());
      
      if (result.success) {
        setMessage('');
        onMessageSent?.();
      } else {
        console.error('Failed to send thread reply:', result.error);
      }
    } catch (error) {
      console.error('Error sending thread reply:', error);
    } finally {
      setSending(false);
    }
  }, [message, sending, threadManager, roomId, rootEventId, onMessageSent]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="flex items-end gap-2 p-3 border-t bg-background">
      <Textarea
        placeholder="Reply to thread..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={sending}
        className="flex-1 min-h-[80px] resize-none"
        rows={2}
      />
      <Button
        onClick={handleSend}
        disabled={!message.trim() || sending}
        size="icon"
        className="mb-1"
      >
        {sending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
};

// =============================================================================
// Main Thread Component
// =============================================================================

export const MessageThread: React.FC<MessageThreadProps> = ({
  roomId,
  rootEventId,
  expanded = false,
  maxReplies = 10,
  className = '',
  onExpandChange,
  threadOptions = {},
}) => {
  const { client, isReady } = useMatrixClient();
  const [threadManager, setThreadManager] = useState<ThreadManager | null>(null);
  const [threadSummary, setThreadSummary] = useState<ThreadSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(expanded);

  // Initialize thread manager
  useEffect(() => {
    if (client && isReady) {
      import('@/lib/matrix/chat/thread-manager').then(({ ThreadManager }) => {
        const manager = new ThreadManager(client);
        setThreadManager(manager);
      });
    }
  }, [client, isReady]);

  // Load thread data
  const loadThreadData = useCallback(async () => {
    if (!threadManager || !roomId || !rootEventId) return;

    setLoading(true);
    setError(null);

    try {
      const options = {
        maxReplies: isExpanded ? 100 : maxReplies,
        includeEdited: true,
        includeRedacted: false,
        ...threadOptions,
      };

      const summary = await threadManager.getThreadSummary(roomId, rootEventId, options);
      setThreadSummary(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load thread');
      console.error('Failed to load thread:', err);
    } finally {
      setLoading(false);
    }
  }, [threadManager, roomId, rootEventId, isExpanded, maxReplies, threadOptions]);

  // Load data when dependencies change
  useEffect(() => {
    loadThreadData();
  }, [loadThreadData]);

  // Handle expand/collapse
  const handleExpandToggle = useCallback(() => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onExpandChange?.(newExpanded);
  }, [isExpanded, onExpandChange]);

  // Handle message sent (refresh thread)
  const handleMessageSent = useCallback(() => {
    loadThreadData();
  }, [loadThreadData]);

  // Get current user ID
  const currentUserId = client?.getUserId();

  // Memoized thread content
  const threadContent = useMemo(() => {
    if (!threadSummary) return null;

    const replies = threadSummary.recentReplies.sort((a, b) => a.timestamp - b.timestamp);

    return (
      <div className="space-y-1">
        {replies.map((reply) => (
          <ThreadMessage
            key={reply.eventId}
            reply={reply}
            isOwnMessage={reply.sender === currentUserId}
            roomId={roomId}
          />
        ))}
        
        {!isExpanded && threadSummary.hasMoreReplies && (
          <div className="text-center py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExpandToggle}
              className="text-muted-foreground"
            >
              <ChevronDown className="w-4 h-4 mr-1" />
              Show {threadSummary.metadata.replyCount - threadSummary.recentReplies.length} more replies
            </Button>
          </div>
        )}
      </div>
    );
  }, [threadSummary, isExpanded, currentUserId, roomId, handleExpandToggle]);

  // Don't render if no thread data
  if (!threadSummary && !loading) {
    return null;
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm">
              Thread {threadSummary ? `(${threadSummary.metadata.replyCount} replies)` : ''}
            </span>
          </div>
          
          {isExpanded && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExpandToggle}
              className="h-6 w-6"
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        {threadSummary && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {threadSummary.metadata.participants.size} participants
            </span>
            <Separator orientation="vertical" className="h-3" />
            <span>
              Last reply {formatDistanceToNow(new Date(threadSummary.metadata.latestReplyTs), { addSuffix: true })}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}

        {error && (
          <div className="p-4 text-center text-destructive">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={loadThreadData} className="mt-2">
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && threadSummary && (
          <ScrollArea className={isExpanded ? "max-h-96" : "max-h-48"}>
            {threadContent}
          </ScrollArea>
        )}
      </CardContent>

      {isExpanded && threadManager && (
        <CardFooter className="p-0">
          <ThreadInput
            roomId={roomId}
            rootEventId={rootEventId}
            threadManager={threadManager}
            onMessageSent={handleMessageSent}
          />
        </CardFooter>
      )}
    </Card>
  );
};

// =============================================================================
// Export
// =============================================================================

export default MessageThread;