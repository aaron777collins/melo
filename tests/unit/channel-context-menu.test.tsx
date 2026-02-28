/**
 * Unit Tests for Channel Context Menu Component
 * 
 * Tests right-click context menu functionality for channels with admin-only delete option.
 * Following TDD methodology - tests written FIRST before implementation.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useModal } from '@/hooks/use-modal-store';
import { ChannelContextMenu } from '@/components/navigation/channel-context-menu';

// Mock the useModal hook
vi.mock('@/hooks/use-modal-store', () => ({
  useModal: vi.fn(),
}));

const mockOnOpen = vi.fn();

describe('ChannelContextMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useModal as any).mockReturnValue({
      onOpen: mockOnOpen,
      onClose: vi.fn(),
      isOpen: false,
      type: null,
      data: {}
    });
  });

  const defaultProps = {
    isVisible: true,
    x: 100,
    y: 200,
    channel: {
      id: 'test-channel-id',
      name: 'test-channel',
      type: 'text' as const
    },
    server: {
      id: 'test-server-id',
      name: 'Test Server'
    },
    canDelete: true,
    onClose: vi.fn()
  };

  describe('Component Rendering', () => {
    it('should render context menu when visible', () => {
      render(<ChannelContextMenu {...defaultProps} />);
      
      const contextMenu = screen.getByTestId('channel-context-menu');
      expect(contextMenu).toBeInTheDocument();
      expect(contextMenu).toHaveAttribute('role', 'menu');
    });

    it('should not render context menu when not visible', () => {
      render(<ChannelContextMenu {...defaultProps} isVisible={false} />);
      
      const contextMenu = screen.queryByTestId('channel-context-menu');
      expect(contextMenu).not.toBeInTheDocument();
    });

    it('should position context menu at specified coordinates', () => {
      render(<ChannelContextMenu {...defaultProps} x={150} y={250} />);
      
      const contextMenu = screen.getByTestId('channel-context-menu');
      expect(contextMenu).toHaveStyle({
        left: '150px',
        top: '250px'
      });
    });
  });

  describe('Delete Channel Option - Admin Permissions', () => {
    it('should show Delete Channel option when canDelete is true', () => {
      render(<ChannelContextMenu {...defaultProps} canDelete={true} />);
      
      const deleteOption = screen.getByRole('menuitem', { name: /delete.*test-channel/i });
      expect(deleteOption).toBeInTheDocument();
      expect(deleteOption).toHaveClass('text-red-400');
    });

    it('should hide Delete Channel option when canDelete is false', () => {
      render(<ChannelContextMenu {...defaultProps} canDelete={false} />);
      
      const deleteOption = screen.queryByRole('menuitem', { name: /delete/i });
      expect(deleteOption).not.toBeInTheDocument();
    });

    it('should trigger delete modal when Delete Channel is clicked', () => {
      render(<ChannelContextMenu {...defaultProps} canDelete={true} />);
      
      const deleteOption = screen.getByRole('menuitem', { name: /delete.*test-channel/i });
      fireEvent.click(deleteOption);

      expect(mockOnOpen).toHaveBeenCalledWith('deleteChannel', {
        channel: defaultProps.channel,
        server: defaultProps.server
      });
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should style Delete Channel option as destructive action', () => {
      render(<ChannelContextMenu {...defaultProps} canDelete={true} />);
      
      const deleteOption = screen.getByRole('menuitem', { name: /delete.*test-channel/i });
      expect(deleteOption).toHaveClass('text-red-400', 'hover:text-red-300');
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper ARIA attributes', () => {
      render(<ChannelContextMenu {...defaultProps} />);
      
      const contextMenu = screen.getByTestId('channel-context-menu');
      expect(contextMenu).toHaveAttribute('role', 'menu');
      expect(contextMenu).toHaveAttribute('aria-label', `Actions for #${defaultProps.channel.name}`);
      expect(contextMenu).toHaveAttribute('tabIndex', '-1');
    });

    it('should focus menu when visible', async () => {
      render(<ChannelContextMenu {...defaultProps} />);
      
      await waitFor(() => {
        const contextMenu = screen.getByTestId('channel-context-menu');
        expect(contextMenu).toHaveFocus();
      });
    });

    it('should handle Escape key to close menu', () => {
      render(<ChannelContextMenu {...defaultProps} />);
      
      const contextMenu = screen.getByTestId('channel-context-menu');
      fireEvent.keyDown(contextMenu, { key: 'Escape' });

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should handle Enter key on delete option', () => {
      render(<ChannelContextMenu {...defaultProps} canDelete={true} />);
      
      const deleteOption = screen.getByRole('menuitem', { name: /delete.*test-channel/i });
      deleteOption.focus();
      fireEvent.keyDown(deleteOption, { key: 'Enter' });

      expect(mockOnOpen).toHaveBeenCalledWith('deleteChannel', {
        channel: defaultProps.channel,
        server: defaultProps.server
      });
    });
  });

  describe('Click Outside Behavior', () => {
    it('should close menu when clicking outside', () => {
      render(<ChannelContextMenu {...defaultProps} />);
      
      const backdrop = screen.getByTestId('channel-context-menu').previousSibling;
      fireEvent.click(backdrop as Element);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should prevent context menu on backdrop', () => {
      render(<ChannelContextMenu {...defaultProps} />);
      
      const backdrop = screen.getByTestId('channel-context-menu').previousSibling;
      const contextMenuEvent = new MouseEvent('contextmenu', { bubbles: true });
      const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault');
      
      fireEvent(backdrop as Element, contextMenuEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle modal open errors gracefully', () => {
      mockOnOpen.mockImplementation(() => {
        throw new Error('Modal error');
      });
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<ChannelContextMenu {...defaultProps} canDelete={true} />);
      
      const deleteOption = screen.getByRole('menuitem', { name: /delete.*test-channel/i });
      fireEvent.click(deleteOption);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to open delete channel modal:', expect.any(Error));
      expect(defaultProps.onClose).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Different Channel Types', () => {
    it('should work with different channel types', () => {
      const voiceChannelProps = {
        ...defaultProps,
        channel: {
          id: 'voice-channel-id',
          name: 'Voice Channel',
          type: 'voice' as const
        }
      };
      
      render(<ChannelContextMenu {...voiceChannelProps} canDelete={true} />);
      
      const deleteOption = screen.getByRole('menuitem', { name: /delete.*voice channel/i });
      expect(deleteOption).toBeInTheDocument();
    });
  });

  describe('Permission Integration', () => {
    it('should display correct channel name in delete option', () => {
      const channelProps = {
        ...defaultProps,
        channel: {
          id: 'special-channel',
          name: 'special-channel-name',
          type: 'text' as const
        }
      };
      
      render(<ChannelContextMenu {...channelProps} canDelete={true} />);
      
      const deleteOption = screen.getByRole('menuitem', { name: /delete.*special-channel-name/i });
      expect(deleteOption).toBeInTheDocument();
    });

    it('should handle general channel (typically not deletable)', () => {
      const generalChannelProps = {
        ...defaultProps,
        channel: {
          id: 'general',
          name: 'general',
          type: 'text' as const
        },
        canDelete: false
      };
      
      render(<ChannelContextMenu {...generalChannelProps} />);
      
      const deleteOption = screen.queryByRole('menuitem', { name: /delete/i });
      expect(deleteOption).not.toBeInTheDocument();
    });
  });

  describe('Viewport Edge Cases', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
    });

    it('should prevent context menu from overflowing right edge', () => {
      render(<ChannelContextMenu {...defaultProps} x={1000} y={200} />);
      
      const contextMenu = screen.getByTestId('channel-context-menu');
      const leftPosition = parseInt(contextMenu.style.left);
      
      expect(leftPosition).toBeLessThanOrEqual(1024 - 160); // window width - menu width
    });

    it('should prevent context menu from overflowing bottom edge', () => {
      render(<ChannelContextMenu {...defaultProps} x={100} y={700} />);
      
      const contextMenu = screen.getByTestId('channel-context-menu');
      const topPosition = parseInt(contextMenu.style.top);
      
      expect(topPosition).toBeLessThanOrEqual(768 - 100); // window height - menu height
    });
  });
});