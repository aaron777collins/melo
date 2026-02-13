/**
 * Chat Components
 * 
 * Complete Discord-style messaging interface for HAOS v2.
 * Export all chat-related components for easy importing.
 */

// Main components
export { ChatInterface } from './chat-interface';
export { MessageList } from './message-list';
export { Message, shouldGroupMessages } from './message';
export { ChatInput } from './chat-input';
export { ChatHeader } from './chat-header';

// Supporting components
export { MessageActions } from './message-actions';
export { MessageAttachment } from './message-attachment';

// Types
export type { ChatInterfaceProps, ChatState } from './chat-interface';
export type { MessageListProps, MessageListRef } from './message-list';
export type { MessageProps, UserInfo, ParsedMessageContent } from './message';
export type { ChatInputProps } from './chat-input';
export type { ChatHeaderProps } from './chat-header';
export type { MessageActionsProps } from './message-actions';
export type { MessageAttachmentProps } from './message-attachment';

// Re-export defaults for convenience
export { default as DefaultChatInterface } from './chat-interface';
export { default as DefaultMessageList } from './message-list';
export { default as DefaultMessage } from './message';
export { default as DefaultChatInput } from './chat-input';
export { default as DefaultChatHeader } from './chat-header';
export { default as DefaultMessageActions } from './message-actions';