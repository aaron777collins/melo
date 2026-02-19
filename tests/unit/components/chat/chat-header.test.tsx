import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatHeader } from '@/components/chat/chat-header';

// Mock the dependencies
vi.mock('@/components/mobile-toggle', () => ({
  MobileToggle: vi.fn(({ serverId }) => (
    <div data-testid="mobile-toggle" data-server-id={serverId}>Mobile Toggle</div>
  )),
}));

vi.mock('@/components/user-avatar', () => ({
  UserAvatar: vi.fn(({ src, className }) => (
    <div data-testid="user-avatar" data-src={src} className={className}>
      User Avatar
    </div>
  )),
}));

vi.mock('@/components/connection-indicator', () => ({
  ConnectionIndicator: vi.fn(() => (
    <div data-testid="connection-indicator">Connection Indicator</div>
  )),
}));

vi.mock('@/components/chat/chat-video-button', () => ({
  ChatVideoButton: vi.fn(() => (
    <div data-testid="chat-video-button">Video Button</div>
  )),
}));

describe('ChatHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Channel type', () => {
    it('should render hash icon for channel type', () => {
      render(
        <ChatHeader
          serverId="server-123"
          name="general"
          type="channel"
        />
      );

      // Should show hash icon for channels
      const hashIcon = document.querySelector('svg');
      expect(hashIcon).toBeInTheDocument();
      
      // Should show channel name
      expect(screen.getByText('general')).toBeInTheDocument();
      
      // Should not show user avatar for channels
      expect(screen.queryByTestId('user-avatar')).not.toBeInTheDocument();
      
      // Should not show video button for channels
      expect(screen.queryByTestId('chat-video-button')).not.toBeInTheDocument();
    });

    it('should render mobile toggle with correct serverId', () => {
      render(
        <ChatHeader
          serverId="server-123"
          name="general"
          type="channel"
        />
      );

      const mobileToggle = screen.getByTestId('mobile-toggle');
      expect(mobileToggle).toBeInTheDocument();
      expect(mobileToggle).toHaveAttribute('data-server-id', 'server-123');
    });
  });

  describe('Conversation type', () => {
    it('should render user avatar for conversation type', () => {
      render(
        <ChatHeader
          serverId="server-123"
          name="John Doe"
          type="conversation"
          imageUrl="https://example.com/avatar.jpg"
        />
      );

      // Should show user avatar for conversations
      const userAvatar = screen.getByTestId('user-avatar');
      expect(userAvatar).toBeInTheDocument();
      expect(userAvatar).toHaveAttribute('data-src', 'https://example.com/avatar.jpg');
      expect(userAvatar).toHaveClass('h-8', 'w-8', 'md:h-8', 'md:w-8', 'mr-2');
      
      // Should show conversation name
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      
      // Should show video button for conversations
      expect(screen.getByTestId('chat-video-button')).toBeInTheDocument();
      
      // Should not show hash icon for conversations
      const hashIcons = document.querySelectorAll('svg');
      // The only SVG should be from the mocked components, not a hash icon
      expect(hashIcons.length).toBeLessThanOrEqual(1);
    });

    it('should handle conversation without imageUrl', () => {
      render(
        <ChatHeader
          serverId="server-123"
          name="John Doe"
          type="conversation"
        />
      );

      const userAvatar = screen.getByTestId('user-avatar');
      expect(userAvatar).toBeInTheDocument();
      expect(userAvatar).not.toHaveAttribute('data-src');
    });
  });

  describe('Common elements', () => {
    it('should always render connection indicator', () => {
      render(
        <ChatHeader
          serverId="server-123"
          name="test"
          type="channel"
        />
      );

      expect(screen.getByTestId('connection-indicator')).toBeInTheDocument();
    });

    it('should render with correct styling classes', () => {
      const { container } = render(
        <ChatHeader
          serverId="server-123"
          name="test"
          type="channel"
        />
      );

      const headerDiv = container.firstChild as HTMLElement;
      expect(headerDiv).toHaveClass(
        'text-md',
        'font-semibold',
        'px-3',
        'flex',
        'items-center',
        'h-12',
        'border-neutral-200',
        'dark:border-neutral-800',
        'border-b-2'
      );
    });

    it('should render name with correct styling', () => {
      render(
        <ChatHeader
          serverId="server-123"
          name="Test Channel"
          type="channel"
        />
      );

      const nameElement = screen.getByText('Test Channel');
      expect(nameElement.tagName).toBe('P');
      expect(nameElement).toHaveClass(
        'font-semibold',
        'text-md',
        'text-black',
        'dark:text-white'
      );
    });

    it('should position elements correctly', () => {
      const { container } = render(
        <ChatHeader
          serverId="server-123"
          name="test"
          type="conversation"
        />
      );

      // Check that right side elements are in ml-auto container
      const rightSideContainer = container.querySelector('.ml-auto');
      expect(rightSideContainer).toBeInTheDocument();
      expect(rightSideContainer).toHaveClass('flex', 'items-center');
    });
  });

  describe('Props handling', () => {
    it('should handle all props correctly', () => {
      const props = {
        serverId: 'test-server-456',
        name: 'Test Name',
        type: 'channel' as const,
        imageUrl: 'https://example.com/test.jpg'
      };

      render(<ChatHeader {...props} />);

      expect(screen.getByText('Test Name')).toBeInTheDocument();
      const mobileToggle = screen.getByTestId('mobile-toggle');
      expect(mobileToggle).toHaveAttribute('data-server-id', 'test-server-456');
    });
  });
});