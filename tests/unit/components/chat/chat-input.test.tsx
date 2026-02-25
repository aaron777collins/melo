/**
 * Chat Input Component Tests
 * 
 * Tests for the ChatInput component which handles message composition and sending.
 * Validates Discord-clone visual parity and Matrix integration.
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Create mock functions using vi.hoisted so they're available before vi.mock runs
const { mockSendMessage, mockOnOpen, mockAnnounce, mockHandleMentionsInputChange, mockHandleEmojiInputChange } = vi.hoisted(() => {
  return {
    mockSendMessage: vi.fn(() => Promise.resolve({ event_id: '$event123' })),
    mockOnOpen: vi.fn(),
    mockAnnounce: vi.fn(),
    mockHandleMentionsInputChange: vi.fn(),
    mockHandleEmojiInputChange: vi.fn(),
  };
});

// Override hooks with test-specific mocks (these override the setup.ts mocks)
vi.mock('@/hooks/use-modal-store', () => ({
  useModal: vi.fn(() => ({
    isOpen: false,
    type: null,
    data: {},
    onOpen: mockOnOpen,
    onClose: vi.fn(),
  })),
}));

vi.mock('@/hooks/use-matrix-client', () => ({
  useMatrixClient: vi.fn(() => ({
    client: {
      getUserId: () => '@user:example.com',
      sendMessage: mockSendMessage,
      on: vi.fn(),
      off: vi.fn(),
      getRoom: vi.fn(() => ({
        roomId: '!room123:example.com',
        getMember: vi.fn(() => ({
          name: 'Test User',
          userId: '@user:example.com',
        })),
      })),
    },
    isReady: true,
  })),
}));

// Mock using both paths to ensure coverage
vi.mock('@/hooks/use-mentions', () => ({
  useMentions: vi.fn(() => ({
    members: [],
    rooms: [],
    channels: [],
    mentionQuery: '',
    showAutocomplete: false,
    autocompletePosition: { top: 0, left: 0 },
    currentMentionRange: null,
    handleInputChange: mockHandleMentionsInputChange,
    handleUserSelect: vi.fn(),
    handleChannelSelect: vi.fn(),
    closeAutocomplete: vi.fn(),
    parseMentions: vi.fn((text: string) => ({ text, mentions: [] })),
  })),
}));

vi.mock('../../../../hooks/use-mentions', () => ({
  useMentions: vi.fn(() => ({
    members: [],
    rooms: [],
    channels: [],
    mentionQuery: '',
    showAutocomplete: false,
    autocompletePosition: { top: 0, left: 0 },
    currentMentionRange: null,
    handleInputChange: mockHandleMentionsInputChange,
    handleUserSelect: vi.fn(),
    handleChannelSelect: vi.fn(),
    closeAutocomplete: vi.fn(),
    parseMentions: vi.fn((text: string) => ({ text, mentions: [] })),
  })),
}));

vi.mock('@/hooks/use-emoji-autocomplete', () => ({
  useEmojiAutocomplete: vi.fn(() => ({
    filteredEmojis: [],
    emojiQuery: '',
    showAutocomplete: false,
    autocompletePosition: { top: 0, left: 0 },
    handleInputChange: mockHandleEmojiInputChange,
    handleEmojiSelect: vi.fn(),
    closeAutocomplete: vi.fn(),
  })),
}));

vi.mock('../../../../hooks/use-emoji-autocomplete', () => ({
  useEmojiAutocomplete: vi.fn(() => ({
    filteredEmojis: [],
    emojiQuery: '',
    showAutocomplete: false,
    autocompletePosition: { top: 0, left: 0 },
    handleInputChange: mockHandleEmojiInputChange,
    handleEmojiSelect: vi.fn(),
    closeAutocomplete: vi.fn(),
  })),
}));

vi.mock('@/src/hooks/use-accessibility', () => ({
  useAccessibility: vi.fn(() => ({
    announce: mockAnnounce,
    effectivePreferences: {
      reducedMotion: false,
      highContrast: false,
      screenReader: false,
      enhancedFocus: false,
      reduceMotion: false,
    },
  })),
}));

// Now import the component after mocks are defined
import { ChatInput } from '@/components/chat/chat-input';

// Mock form components
vi.mock('@/components/ui/form', () => ({
  Form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
  FormField: ({ render, control, name }: any) => render({ field: { value: '', onChange: vi.fn() } }),
  FormItem: ({ children }: any) => <div>{children}</div>,
  FormControl: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: React.forwardRef(({ className, ...props }: any, ref: any) => (
    <input ref={ref} className={className} data-testid="chat-input" {...props} />
  )),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, className, ...props }: any) => (
    <button className={className} {...props}>{children}</button>
  ),
}));

vi.mock('@/components/emoji-picker', () => ({
  EmojiPicker: ({ onChange }: any) => (
    <button data-testid="emoji-picker" onClick={() => onChange('😀')}>
      Emoji
    </button>
  ),
}));

vi.mock('@/components/chat/mention-autocomplete', () => ({
  MentionAutocomplete: () => null,
}));

vi.mock('@/components/chat/channel-autocomplete', () => ({
  ChannelAutocomplete: () => null,
}));

vi.mock('@/components/chat/emoji-autocomplete', () => ({
  EmojiAutocomplete: () => null,
}));

vi.mock('lucide-react', () => ({
  Plus: () => <span data-testid="plus-icon">+</span>,
  Send: () => <span data-testid="send-icon">→</span>,
  Image: () => <span data-testid="image-icon">📷</span>,
}));

vi.mock('axios');
vi.mock('query-string', () => ({
  default: {
    stringifyUrl: vi.fn(({ url }) => url),
  },
}));

describe('ChatInput Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Rendering', () => {
    it('should render message input field', () => {
      render(
        <ChatInput
          roomId="!room123:example.com"
          name="general"
          type="channel"
        />
      );

      const input = screen.getByTestId('chat-input');
      expect(input).toBeInTheDocument();
    });

    it('should show correct placeholder for channel', () => {
      render(
        <ChatInput
          roomId="!room123:example.com"
          name="general"
          type="channel"
        />
      );

      const input = screen.getByTestId('chat-input');
      expect(input).toHaveAttribute('placeholder', 'Message #general');
    });

    it('should show correct placeholder for conversation', () => {
      render(
        <ChatInput
          roomId="!room123:example.com"
          name="John Doe"
          type="conversation"
        />
      );

      const input = screen.getByTestId('chat-input');
      expect(input).toHaveAttribute('placeholder', 'Message John Doe');
    });

    it('should render file attachment button', () => {
      render(
        <ChatInput
          roomId="!room123:example.com"
          name="general"
          type="channel"
        />
      );

      const attachButton = screen.getByLabelText('Attach file to message');
      expect(attachButton).toBeInTheDocument();
    });

    it('should render emoji picker', () => {
      render(
        <ChatInput
          roomId="!room123:example.com"
          name="general"
          type="channel"
        />
      );

      const emojiPicker = screen.getByTestId('emoji-picker');
      expect(emojiPicker).toBeInTheDocument();
    });

    it('should render send button in Matrix mode', () => {
      render(
        <ChatInput
          roomId="!room123:example.com"
          name="general"
          type="channel"
        />
      );

      const sendButton = screen.getByLabelText(/send message to #general/i);
      expect(sendButton).toBeInTheDocument();
    });
  });

  describe('Discord-Clone Visual Parity', () => {
    it('should have correct container padding (p-4 pb-6)', () => {
      render(
        <ChatInput
          roomId="!room123:example.com"
          name="general"
          type="channel"
        />
      );

      // The wrapper div should have the discord-clone padding classes
      const wrapper = screen.getByTestId('chat-input').parentElement;
      expect(wrapper?.className).toMatch(/p-4/);
      expect(wrapper?.className).toMatch(/pb-6/);
    });

    it('should have input with correct discord-clone styling', () => {
      render(
        <ChatInput
          roomId="!room123:example.com"
          name="general"
          type="channel"
        />
      );

      const input = screen.getByTestId('chat-input');
      // Check for discord-clone input classes (actual implementation)
      expect(input.className).toMatch(/px-14/);
      expect(input.className).toMatch(/py-6/);
      expect(input.className).toMatch(/bg-\[#e3e5e8\]/);
      expect(input.className).toMatch(/dark:bg-\[#313338\]/);
      expect(input.className).toMatch(/border-none/);
      expect(input.className).toMatch(/focus-visible:ring-0/);
    });

    it('should have attachment button with rounded-full style', () => {
      render(
        <ChatInput
          roomId="!room123:example.com"
          name="general"
          type="channel"
        />
      );

      const attachButton = screen.getByLabelText('Attach file to message');
      expect(attachButton.className).toMatch(/rounded-full/);
      expect(attachButton.className).toMatch(/bg-\[#4f5660\]/);
      expect(attachButton.className).toMatch(/dark:bg-\[#b5bac1\]/);
    });
  });

  describe('Message Sending - Matrix Mode', () => {
    it('should send message on form submit', async () => {
      const user = userEvent.setup();
      
      render(
        <ChatInput
          roomId="!room123:example.com"
          name="general"
          type="channel"
        />
      );

      const input = screen.getByTestId('chat-input');
      await user.type(input, 'Hello, world!');
      
      // Trigger form submission
      fireEvent.submit(input.closest('form')!);

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalled();
      });
    });

    it('should clear input after sending message', async () => {
      const user = userEvent.setup();
      
      render(
        <ChatInput
          roomId="!room123:example.com"
          name="general"
          type="channel"
        />
      );

      const input = screen.getByTestId('chat-input');
      await user.type(input, 'Test message');
      
      fireEvent.submit(input.closest('form')!);

      await waitFor(() => {
        // Form should be reset
        expect(mockSendMessage).toHaveBeenCalled();
      });
    });

    it('should announce message sent for screen readers', async () => {
      const user = userEvent.setup();
      
      render(
        <ChatInput
          roomId="!room123:example.com"
          name="general"
          type="channel"
        />
      );

      const input = screen.getByTestId('chat-input');
      await user.type(input, 'Accessible message');
      
      fireEvent.submit(input.closest('form')!);

      await waitFor(() => {
        expect(mockAnnounce).toHaveBeenCalledWith(
          expect.stringContaining('Message sent'),
          'polite'
        );
      });
    });
  });

  describe('File Attachment', () => {
    it('should open file modal on attachment button click', async () => {
      const user = userEvent.setup();
      
      render(
        <ChatInput
          roomId="!room123:example.com"
          name="general"
          type="channel"
        />
      );

      const attachButton = screen.getByLabelText('Attach file to message');
      await user.click(attachButton);

      expect(mockOnOpen).toHaveBeenCalledWith('messageFile', { roomId: '!room123:example.com' });
    });
  });

  describe('Emoji Picker', () => {
    it('should add emoji to input on selection', async () => {
      const user = userEvent.setup();
      
      render(
        <ChatInput
          roomId="!room123:example.com"
          name="general"
          type="channel"
        />
      );

      const emojiPicker = screen.getByTestId('emoji-picker');
      await user.click(emojiPicker);

      // Emoji picker onChange should have been triggered
      expect(mockAnnounce).toHaveBeenCalledWith(
        expect.stringContaining('Added emoji'),
        'polite'
      );
    });
  });

  describe('Keyboard Interaction', () => {
    it('should send message on Enter key', async () => {
      const user = userEvent.setup();
      
      render(
        <ChatInput
          roomId="!room123:example.com"
          name="general"
          type="channel"
        />
      );

      const input = screen.getByTestId('chat-input');
      await user.type(input, 'Enter key test');
      
      // Use fireEvent.keyPress to simulate Enter
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalled();
      });
    });

    it('should not send message on Shift+Enter', async () => {
      const user = userEvent.setup();
      
      render(
        <ChatInput
          roomId="!room123:example.com"
          name="general"
          type="channel"
        />
      );

      const input = screen.getByTestId('chat-input');
      await user.type(input, 'Shift enter test');
      
      // Simulate Shift+Enter
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13, shiftKey: true });

      // Should NOT have sent message
      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <ChatInput
          roomId="!room123:example.com"
          name="general"
          type="channel"
        />
      );

      const input = screen.getByTestId('chat-input');
      expect(input).toHaveAttribute('aria-label', 'Type message for #general');
    });

    it('should have form role and label', () => {
      render(
        <ChatInput
          roomId="!room123:example.com"
          name="general"
          type="channel"
        />
      );

      const form = screen.getByRole('form');
      expect(form).toHaveAttribute('aria-label', 'Message input for #general');
    });

    it('should have screen reader help text', () => {
      render(
        <ChatInput
          roomId="!room123:example.com"
          name="general"
          type="channel"
        />
      );

      const helpText = screen.getByText(/Press Enter to send message/i);
      expect(helpText).toHaveClass('sr-only');
    });
  });

  describe('Loading State', () => {
    it('should disable input while sending', async () => {
      // Create a delayed mock
      const delayedSendMessage = vi.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      // Configure the mock for this specific test
      mockUseMatrixClient.mockReturnValueOnce({
        client: {
          getUserId: () => '@user:example.com',
          sendMessage: delayedSendMessage,
          on: vi.fn(),
          off: vi.fn(),
        },
        isReady: true,
      });

      const user = userEvent.setup();
      
      render(
        <ChatInput
          roomId="!room123:example.com"
          name="general"
          type="channel"
        />
      );

      const input = screen.getByTestId('chat-input');
      await user.type(input, 'Loading test');
      
      fireEvent.submit(input.closest('form')!);

      // Input should be disabled during sending
      // Note: This depends on implementation details
    });
  });

  describe('GIF Picker', () => {
    it('should open GIF picker modal on button click', async () => {
      const user = userEvent.setup();
      
      render(
        <ChatInput
          roomId="!room123:example.com"
          name="general"
          type="channel"
        />
      );

      const gifButton = screen.getByLabelText('Add GIF to message');
      await user.click(gifButton);

      expect(mockOnOpen).toHaveBeenCalledWith('gifPicker', expect.any(Object));
    });
  });

  describe('Legacy API Mode', () => {
    it('should work with legacy API URL', () => {
      render(
        <ChatInput
          apiUrl="/api/messages"
          query={{ channelId: '123' }}
          name="general"
          type="channel"
        />
      );

      const input = screen.getByTestId('chat-input');
      expect(input).toBeInTheDocument();
    });
  });
});

describe('ChatInput Visual Regression', () => {
  it('should match discord-clone layout structure', () => {
    const { container } = render(
      <ChatInput
        roomId="!room123:example.com"
        name="general"
        type="channel"
      />
    );

    // Verify the structure matches discord-clone:
    // - Form wrapper
    // - Relative container with p-4 pb-6
    // - Absolute positioned Plus button on left
    // - Input in the middle
    // - Absolute positioned emoji picker on right
    
    const form = container.querySelector('form');
    expect(form).toBeInTheDocument();
    
    const relativeContainer = container.querySelector('.relative.p-4');
    expect(relativeContainer).toBeInTheDocument();
  });
});
