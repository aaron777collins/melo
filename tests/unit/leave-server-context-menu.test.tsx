/**
 * Tests for Leave Server Context Menu Feature (ST-P2-02-A)
 * User Story: US-P2-02 Leave Server UI Integration
 * 
 * Testing ACs:
 * - AC-1: Server Context Menu appears on right-click with Leave Server option
 * - AC-3: LeaveServerModal opens when Leave Server is clicked
 * 
 * TDD Phase: RED - These tests should FAIL initially
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useRouter } from 'next/navigation';
import { useModal } from '@/hooks/use-modal-store';
import { useSpaces } from '@/hooks/use-spaces';
import { SpacesNavigation } from '@/components/navigation/spaces-navigation';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(() => '/servers/test-server-id'),
}));

// Mock modal store
vi.mock('@/hooks/use-modal-store', () => ({
  useModal: vi.fn(),
}));

// Mock spaces hook
vi.mock('@/hooks/use-spaces', () => ({
  useSpaces: vi.fn(),
}));

// Mock ActionTooltip to avoid tooltip rendering issues in tests
vi.mock('@/components/action-tooltip', () => ({
  ActionTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockRouter = {
  push: vi.fn(),
};

const mockModal = {
  onOpen: vi.fn(),
  onClose: vi.fn(),
  isOpen: false,
  type: null,
  data: {},
};

const mockSpaces = [
  {
    id: 'test-server-1',
    name: 'Test Server 1',
    avatarUrl: null,
    topic: null,
    memberCount: 5,
    isOwner: false,
    childRoomIds: [],
    joinRule: 'invite' as const,
    canonicalAlias: null,
    currentUserPowerLevel: 0,
    hasUnread: false,
    unreadMentionCount: 0,
  },
  {
    id: 'test-server-2', 
    name: 'Test Server 2',
    avatarUrl: 'https://example.com/avatar.jpg',
    topic: 'Test server topic',
    memberCount: 10,
    isOwner: false,
    childRoomIds: [],
    joinRule: 'invite' as const,
    canonicalAlias: null,
    currentUserPowerLevel: 0,
    hasUnread: false,
    unreadMentionCount: 0,
  },
];

describe('Leave Server Context Menu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue(mockRouter);
    (useModal as any).mockReturnValue(mockModal);
    (useSpaces as any).mockReturnValue({
      spaces: mockSpaces,
      isLoading: false,
      error: null,
    });
  });

  describe('AC-1: Server Context Menu appears on right-click with Leave Server option', () => {
    it('should show context menu when right-clicking on a server icon', async () => {
      render(<SpacesNavigation />);

      // Find the first server item
      const serverButton = screen.getAllByRole('button')[1]; // Skip "Add server" button
      
      // Right-click on the server
      fireEvent.contextMenu(serverButton);

      // Context menu should appear
      await waitFor(() => {
        expect(screen.getByTestId('server-context-menu')).toBeInTheDocument();
      });
    });

    it('should show "Leave Server" option in the context menu', async () => {
      render(<SpacesNavigation />);

      const serverButton = screen.getAllByRole('button')[1];
      fireEvent.contextMenu(serverButton);

      await waitFor(() => {
        const contextMenu = screen.getByTestId('server-context-menu');
        expect(contextMenu).toBeInTheDocument();
        
        const leaveOption = screen.getByText('Leave Server');
        expect(leaveOption).toBeInTheDocument();
      });
    });

    it('should show context menu for servers with avatar images', async () => {
      render(<SpacesNavigation />);

      // Get server with avatar (Test Server 2)
      const serverButtons = screen.getAllByRole('button');
      const serverWithAvatar = serverButtons[2]; // Skip "Add server" and first server
      
      fireEvent.contextMenu(serverWithAvatar);

      await waitFor(() => {
        expect(screen.getByTestId('server-context-menu')).toBeInTheDocument();
        expect(screen.getByText('Leave Server')).toBeInTheDocument();
      });
    });

    it('should position context menu at cursor location', async () => {
      render(<SpacesNavigation />);

      const serverButton = screen.getAllByRole('button')[1];
      
      // Right-click at specific coordinates
      fireEvent.contextMenu(serverButton, {
        clientX: 100,
        clientY: 200,
      });

      await waitFor(() => {
        const contextMenu = screen.getByTestId('server-context-menu');
        expect(contextMenu).toBeInTheDocument();
        // Context menu should be positioned near the click location
        // (Implementation will handle exact positioning)
      });
    });
  });

  describe('AC-3: LeaveServerModal opens when Leave Server is clicked', () => {
    it('should open LeaveServerModal when clicking Leave Server in context menu', async () => {
      render(<SpacesNavigation />);

      const serverButton = screen.getAllByRole('button')[1];
      fireEvent.contextMenu(serverButton);

      await waitFor(() => {
        const leaveOption = screen.getByText('Leave Server');
        fireEvent.click(leaveOption);
      });

      // Should call modal.onOpen with leaveServer type and server data
      expect(mockModal.onOpen).toHaveBeenCalledWith('leaveServer', {
        server: expect.objectContaining({
          id: mockSpaces[0].id,
          name: mockSpaces[0].name,
        }),
      });
    });

    it('should pass correct server data to the modal', async () => {
      render(<SpacesNavigation />);

      // Right-click on second server (with avatar)
      const serverButtons = screen.getAllByRole('button');
      const secondServer = serverButtons[2];
      
      fireEvent.contextMenu(secondServer);

      await waitFor(() => {
        const leaveOption = screen.getByText('Leave Server');
        fireEvent.click(leaveOption);
      });

      expect(mockModal.onOpen).toHaveBeenCalledWith('leaveServer', {
        server: expect.objectContaining({
          id: mockSpaces[1].id,
          name: mockSpaces[1].name,
          imageUrl: mockSpaces[1].avatarUrl,
        }),
      });
    });

    it('should close context menu after clicking Leave Server', async () => {
      render(<SpacesNavigation />);

      const serverButton = screen.getAllByRole('button')[1];
      fireEvent.contextMenu(serverButton);

      await waitFor(() => {
        const leaveOption = screen.getByText('Leave Server');
        fireEvent.click(leaveOption);
      });

      // Context menu should disappear
      await waitFor(() => {
        expect(screen.queryByTestId('server-context-menu')).not.toBeInTheDocument();
      });
    });
  });

  describe('Context Menu Interaction', () => {
    it('should close context menu when clicking outside', async () => {
      render(<SpacesNavigation />);

      const serverButton = screen.getAllByRole('button')[1];
      fireEvent.contextMenu(serverButton);

      await waitFor(() => {
        expect(screen.getByTestId('server-context-menu')).toBeInTheDocument();
      });

      // Click on the backdrop (the fixed div covering the screen)
      const backdrop = screen.getByTestId('server-context-menu').previousElementSibling as HTMLElement;
      fireEvent.click(backdrop);

      await waitFor(() => {
        expect(screen.queryByTestId('server-context-menu')).not.toBeInTheDocument();
      });
    });

    it('should close context menu when pressing Escape key', async () => {
      render(<SpacesNavigation />);

      const serverButton = screen.getAllByRole('button')[1];
      fireEvent.contextMenu(serverButton);

      await waitFor(() => {
        expect(screen.getByTestId('server-context-menu')).toBeInTheDocument();
      });

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByTestId('server-context-menu')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing server data gracefully', async () => {
      (useSpaces as jest.Mock).mockReturnValue({
        spaces: [{ id: 'server-without-name' }], // Minimal server data
        isLoading: false,
        error: null,
      });

      render(<SpacesNavigation />);

      const serverButton = screen.getAllByRole('button')[1];
      fireEvent.contextMenu(serverButton);

      await waitFor(() => {
        const leaveOption = screen.getByText('Leave Server');
        fireEvent.click(leaveOption);
      });

      // Should still call modal.onOpen even with minimal data
      expect(mockModal.onOpen).toHaveBeenCalledWith('leaveServer', {
        server: expect.objectContaining({
          id: 'server-without-name',
        }),
      });
    });
  });
});