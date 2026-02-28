/**
 * Unit Tests: DM Conversation Component
 * 
 * Task: ST-P2-04-C - DM conversation interface with message history and send functionality
 * TDD Approach: RED → GREEN → REFACTOR
 * 
 * Tests cover AC-4 and AC-5 from US-P2-04:
 * - AC-4: Complete DM conversation interface (history, input, send)  
 * - AC-5: Send DM message functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { vi, describe, test, expect, beforeEach } from 'vitest';

// Components under test
import { DMConversation } from '@/components/dm/dm-conversation';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/hooks/use-matrix-client', () => ({
  useMatrixClient: vi.fn(),
}));

vi.mock('@/hooks/use-room-messages', () => ({
  useRoomMessages: vi.fn(),
}));

vi.mock('@/hooks/use-modal-store', () => ({
  useModal: vi.fn(),
}));

vi.mock('@/hooks/use-chat-scroll', () => ({
  useChatScroll: vi.fn(),
}));

vi.mock('@/components/chat/chat-item', () => ({
  ChatItem: () => <div data-testid="chat-item">Mock Chat Item</div>,
}));

vi.mock('@/components/emoji-picker', () => ({
  EmojiPicker: ({ onChange }: { onChange: (emoji: string) => void }) => (
    <button onClick={() => onChange('😀')} data-testid="emoji-picker">😀</button>
  ),
}));

// Mock Matrix client and hooks
const mockMatrixClient = {
  sendMessage: vi.fn(),
  getUser: vi.fn(),
  getUserId: vi.fn(() => '@testuser:example.com'),
  on: vi.fn(),
  off: vi.fn(),
};

const mockUseMatrixClient = vi.mocked((await import('@/hooks/use-matrix-client')).useMatrixClient);
const mockUseRoomMessages = vi.mocked((await import('@/hooks/use-room-messages')).useRoomMessages);
const mockUseModal = vi.mocked((await import('@/hooks/use-modal-store')).useModal);
const mockUseChatScroll = vi.mocked((await import('@/hooks/use-chat-scroll')).useChatScroll);
const mockRouter = { push: vi.fn() };
const mockUseRouter = vi.mocked(useRouter);

// Mock messages for testing
const mockMessages = [
  {
    getId: () => '1',
    getContent: () => ({ body: 'Hello there!' }),
    getSender: () => '@otheruser:example.com',
    getTs: () => Date.now() - 60000,
    isRedacted: () => false,
  },
  {
    getId: () => '2', 
    getContent: () => ({ body: 'Hi! How are you?' }),
    getSender: () => '@testuser:example.com',
    getTs: () => Date.now() - 30000,
    isRedacted: () => false,
  },
];

describe('DMConversation Component - TDD Unit Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default mock returns
    mockUseRouter.mockReturnValue(mockRouter);
    mockUseMatrixClient.mockReturnValue({
      client: mockMatrixClient,
      isReady: true,
    });
    
    mockUseRoomMessages.mockReturnValue({
      messages: mockMessages,
      isLoading: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      isLoadingMore: false,
    });
    
    mockUseModal.mockReturnValue({
      onOpen: vi.fn(),
    });

    mockUseChatScroll.mockReturnValue();
  });

  // ========================================
  // AC-4 TESTS: Complete DM Conversation Interface
  // ========================================

  describe('AC-4: DM Conversation Interface Elements', () => {
    test('renders DM conversation container with correct data-testid', () => {
      render(
        <DMConversation 
          roomId="!test:example.com"
          recipientName="TestUser"
        />
      );
      
      const dmConversation = screen.getByTestId('dm-conversation');
      expect(dmConversation).toBeInTheDocument();
    });

    test('displays DM conversation header with recipient name', () => {
      render(
        <DMConversation 
          roomId="!test:example.com"
          recipientName="TestUser"
        />
      );
      
      const header = screen.getByTestId('dm-header');
      expect(header).toBeInTheDocument();
      expect(screen.getByText('TestUser')).toBeInTheDocument();
    });

    test('renders message history area with correct data-testid', () => {
      render(
        <DMConversation 
          roomId="!test:example.com"
          recipientName="TestUser"
        />
      );
      
      const messagesArea = screen.getByTestId('dm-messages');
      expect(messagesArea).toBeInTheDocument();
    });

    test('displays existing messages in conversation history', async () => {
      render(
        <DMConversation 
          roomId="!test:example.com"
          recipientName="TestUser"
        />
      );
      
      // Should show messages from mock data
      await waitFor(() => {
        expect(screen.getByText('Hello there!')).toBeInTheDocument();
        expect(screen.getByText('Hi! How are you?')).toBeInTheDocument();
      });
    });

    test('renders message input field with correct placeholder', () => {
      render(
        <DMConversation 
          roomId="!test:example.com"
          recipientName="TestUser"
        />
      );
      
      const messageInput = screen.getByTestId('dm-message-input');
      expect(messageInput).toBeInTheDocument();
      expect(messageInput).toHaveAttribute('placeholder', 'Message @TestUser');
    });

    test('renders send button with correct data-testid', () => {
      render(
        <DMConversation 
          roomId="!test:example.com"
          recipientName="TestUser"
        />
      );
      
      const sendButton = screen.getByTestId('dm-send-button');
      expect(sendButton).toBeInTheDocument();
    });
  });

  // ========================================  
  // AC-5 TESTS: Send DM Message Functionality
  // ========================================

  describe('AC-5: Send DM Message Functionality', () => {
    test('allows typing in message input field', async () => {
      const user = userEvent.setup();
      
      render(
        <DMConversation 
          roomId="!test:example.com"
          recipientName="TestUser"
        />
      );
      
      const messageInput = screen.getByTestId('dm-message-input');
      
      await user.type(messageInput, 'Test message');
      expect(messageInput).toHaveValue('Test message');
    });

    test('send button is disabled when input is empty', () => {
      render(
        <DMConversation 
          roomId="!test:example.com"
          recipientName="TestUser"
        />
      );
      
      const sendButton = screen.getByTestId('dm-send-button');
      expect(sendButton).toBeDisabled();
    });

    test('send button is enabled when input has content', async () => {
      const user = userEvent.setup();
      
      render(
        <DMConversation 
          roomId="!test:example.com"
          recipientName="TestUser"
        />
      );
      
      const messageInput = screen.getByTestId('dm-message-input');
      const sendButton = screen.getByTestId('dm-send-button');
      
      await user.type(messageInput, 'Test message');
      expect(sendButton).toBeEnabled();
    });

    test('sends message via Matrix client when send button clicked', async () => {
      const user = userEvent.setup();
      mockMatrixClient.sendMessage.mockResolvedValue({ event_id: 'event123' });
      
      render(
        <DMConversation 
          roomId="!test:example.com"
          recipientName="TestUser"
        />
      );
      
      const messageInput = screen.getByTestId('dm-message-input');
      const sendButton = screen.getByTestId('dm-send-button');
      
      // Type message and send
      await user.type(messageInput, 'Hello from test');
      await user.click(sendButton);
      
      // Verify Matrix client called correctly
      expect(mockMatrixClient.sendMessage).toHaveBeenCalledWith(
        '!test:example.com',
        {
          msgtype: 'm.text',
          body: 'Hello from test',
        }
      );
    });

    test('sends message via Matrix client when Enter key pressed', async () => {
      const user = userEvent.setup();
      mockMatrixClient.sendMessage.mockResolvedValue({ event_id: 'event123' });
      
      render(
        <DMConversation 
          roomId="!test:example.com"
          recipientName="TestUser"
        />
      );
      
      const messageInput = screen.getByTestId('dm-message-input');
      
      // Type message and press Enter
      await user.type(messageInput, 'Hello from Enter key');
      await user.keyboard('{Enter}');
      
      // Verify Matrix client called correctly
      expect(mockMatrixClient.sendMessage).toHaveBeenCalledWith(
        '!test:example.com',
        {
          msgtype: 'm.text',
          body: 'Hello from Enter key',
        }
      );
    });

    test('clears input field after successful message send', async () => {
      const user = userEvent.setup();
      mockMatrixClient.sendMessage.mockResolvedValue({ event_id: 'event123' });
      
      render(
        <DMConversation 
          roomId="!test:example.com"
          recipientName="TestUser"
        />
      );
      
      const messageInput = screen.getByTestId('dm-message-input');
      const sendButton = screen.getByTestId('dm-send-button');
      
      // Type and send message
      await user.type(messageInput, 'Test clear input');
      await user.click(sendButton);
      
      // Wait for send to complete and input to clear
      await waitFor(() => {
        expect(messageInput).toHaveValue('');
      });
    });

    test('shows loading state when sending message', async () => {
      const user = userEvent.setup();
      
      // Make sendMessage hang to test loading state
      let resolvePromise: Function;
      const pendingPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      mockMatrixClient.sendMessage.mockReturnValue(pendingPromise);
      
      render(
        <DMConversation 
          roomId="!test:example.com"
          recipientName="TestUser"
        />
      );
      
      const messageInput = screen.getByTestId('dm-message-input');
      const sendButton = screen.getByTestId('dm-send-button');
      
      // Start sending message
      await user.type(messageInput, 'Loading test');
      await user.click(sendButton);
      
      // Should show loading state
      expect(sendButton).toBeDisabled();
      expect(messageInput).toBeDisabled();
      
      // Resolve to cleanup
      resolvePromise!({ event_id: 'event123' });
    });

    test('handles message send error gracefully', async () => {
      const user = userEvent.setup();
      mockMatrixClient.sendMessage.mockRejectedValue(new Error('Network error'));
      
      render(
        <DMConversation 
          roomId="!test:example.com"
          recipientName="TestUser"
        />
      );
      
      const messageInput = screen.getByTestId('dm-message-input');
      const sendButton = screen.getByTestId('dm-send-button');
      
      // Try to send message
      await user.type(messageInput, 'Error test');
      await user.click(sendButton);
      
      // Should show error toast
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to send message. Please try again.');
      });
      
      // Input should remain enabled for retry
      expect(sendButton).toBeEnabled();
      expect(messageInput).toBeEnabled();
    });
  });

  // ========================================
  // INTEGRATION TESTS
  // ========================================

  describe('Integration Tests', () => {
    test('handles Matrix client not ready state', () => {
      mockUseMatrixClient.mockReturnValue({
        client: mockMatrixClient,
        isReady: false,
      });
      
      render(
        <DMConversation 
          roomId="!test:example.com"
          recipientName="TestUser"
        />
      );
      
      const messageInput = screen.getByTestId('dm-message-input');
      const sendButton = screen.getByTestId('dm-send-button');
      
      expect(messageInput).toBeDisabled();
      expect(sendButton).toBeDisabled();
    });

    test('handles loading messages state', () => {
      mockUseRoomMessages.mockReturnValue({
        messages: [],
        isLoading: true,
        hasMore: false,
        loadMore: vi.fn(),
        error: null,
        isLoadingMore: false,
      });
      
      render(
        <DMConversation 
          roomId="!test:example.com"
          recipientName="TestUser"
        />
      );
      
      expect(screen.getByText('Loading messages...')).toBeInTheDocument();
    });

    test('handles message loading error state', () => {
      mockUseRoomMessages.mockReturnValue({
        messages: [],
        isLoading: false,
        hasMore: false,
        loadMore: vi.fn(),
        error: new Error('Failed to load'),
        isLoadingMore: false,
      });
      
      render(
        <DMConversation 
          roomId="!test:example.com"
          recipientName="TestUser"
        />
      );
      
      expect(screen.getByText('Something went wrong!')).toBeInTheDocument();
    });

    test('handles empty conversation state', () => {
      mockUseRoomMessages.mockReturnValue({
        messages: [],
        isLoading: false,
        hasMore: false,
        loadMore: vi.fn(),
        error: null,
        isLoadingMore: false,
      });
      
      render(
        <DMConversation 
          roomId="!test:example.com"
          recipientName="TestUser"
        />
      );
      
      // Should show empty state message or welcome
      const dmMessages = screen.getByTestId('dm-messages');
      expect(dmMessages).toBeInTheDocument();
    });

    test('passes roomId correctly to Matrix hooks', () => {
      render(
        <DMConversation 
          roomId="!test:example.com"
          recipientName="TestUser"
        />
      );
      
      expect(mockUseRoomMessages).toHaveBeenCalledWith('!test:example.com');
    });
  });

  // ========================================
  // MOBILE RESPONSIVENESS TESTS  
  // ========================================

  describe('Mobile Responsiveness', () => {
    test('renders correctly on mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <DMConversation 
          roomId="!test:example.com"
          recipientName="TestUser"
        />
      );
      
      const dmConversation = screen.getByTestId('dm-conversation');
      expect(dmConversation).toBeInTheDocument();
      expect(dmConversation).toHaveClass('flex', 'flex-col', 'h-full');
    });

    test('input remains accessible on mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <DMConversation 
          roomId="!test:example.com"
          recipientName="TestUser"
        />
      );
      
      const messageInput = screen.getByTestId('dm-message-input');
      expect(messageInput).toBeInTheDocument();
      expect(messageInput).toBeEnabled();
    });
  });

  // ========================================
  // ACCESSIBILITY TESTS
  // ========================================

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      render(
        <DMConversation 
          roomId="!test:example.com"
          recipientName="TestUser"
        />
      );
      
      const messageInput = screen.getByTestId('dm-message-input');
      expect(messageInput).toHaveAttribute('aria-label', 'Type message for TestUser');
      
      const sendButton = screen.getByTestId('dm-send-button');
      expect(sendButton).toHaveAttribute('aria-label', 'Send message to TestUser');
    });

    test('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <DMConversation 
          roomId="!test:example.com"
          recipientName="TestUser"
        />
      );
      
      const messageInput = screen.getByTestId('dm-message-input');
      
      // Focus directly on the input field (more realistic user interaction)
      await user.click(messageInput);
      expect(messageInput).toHaveFocus();
      
      // Should be able to type
      await user.type(messageInput, 'Keyboard test');
      expect(messageInput).toHaveValue('Keyboard test');
    });
  });
});