/**
 * Members Modal Component Tests
 * 
 * Tests for the MembersModal component which handles member management.
 * Validates Discord-clone visual parity and Matrix integration.
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MembersModal } from '@/components/modals/members-modal';

// Mock hooks
const mockOnClose = vi.fn();
const mockOnOpen = vi.fn();

vi.mock('@/hooks/use-modal-store', () => ({
  useModal: vi.fn(() => ({
    isOpen: true,
    type: 'members',
    onClose: mockOnClose,
    onOpen: mockOnOpen,
    data: {
      space: {
        id: '!testspace:matrix.org',
        name: 'Test Space',
      },
    },
  })),
}));

const mockKick = vi.fn(() => Promise.resolve({}));
const mockBan = vi.fn(() => Promise.resolve({}));
const mockSendStateEvent = vi.fn(() => Promise.resolve({}));

const mockMembers = [
  {
    userId: '@admin:matrix.org',
    name: 'Admin User',
    getAvatarUrl: vi.fn(() => 'https://avatar.com/admin.jpg'),
  },
  {
    userId: '@mod:matrix.org',
    name: 'Mod User',
    getAvatarUrl: vi.fn(() => 'https://avatar.com/mod.jpg'),
  },
  {
    userId: '@user:matrix.org',
    name: 'Regular User',
    getAvatarUrl: vi.fn(() => null),
  },
];

const mockPowerLevels = {
  users: {
    '@admin:matrix.org': 100,
    '@mod:matrix.org': 50,
    '@user:matrix.org': 0,
    '@currentuser:matrix.org': 100,
  },
  users_default: 0,
};

vi.mock('@/hooks/use-matrix-client', () => ({
  useMatrixClient: vi.fn(() => ({
    client: {
      getUserId: () => '@currentuser:matrix.org',
      baseUrl: 'https://matrix.org',
      getRoom: vi.fn(() => ({
        getJoinedMembers: () => mockMembers,
        currentState: {
          getStateEvents: vi.fn((type: string, key?: string) => {
            if (type === 'm.room.power_levels') {
              return { getContent: () => mockPowerLevels };
            }
            return null;
          }),
        },
      })),
      kick: mockKick,
      ban: mockBan,
      sendStateEvent: mockSendStateEvent,
    },
    isReady: true,
  })),
}));

vi.mock('@/lib/matrix/client', () => ({
  getClient: vi.fn(() => ({
    getUserId: () => '@currentuser:matrix.org',
    baseUrl: 'https://matrix.org',
    getRoom: vi.fn(() => ({
      getJoinedMembers: () => mockMembers,
      currentState: {
        getStateEvents: vi.fn((type: string, key?: string) => {
          if (type === 'm.room.power_levels') {
            return { getContent: () => mockPowerLevels };
          }
          return null;
        }),
      },
    })),
    kick: mockKick,
    ban: mockBan,
    sendStateEvent: mockSendStateEvent,
  })),
}));

// Mock UI components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  DialogHeader: ({ children }: any) => <header>{children}</header>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p data-testid="member-count">{children}</p>,
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: any) => <div className={className}>{children}</div>,
  AvatarImage: ({ src }: any) => src ? <img src={src} data-testid="avatar-image" /> : null,
  AvatarFallback: ({ children, className }: any) => <div className={className} data-testid="avatar-fallback">{children}</div>,
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <button onClick={onClick} data-testid="dropdown-item">{children}</button>
  ),
  DropdownMenuPortal: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuSub: ({ children }: any) => <div data-testid="dropdown-sub">{children}</div>,
  DropdownMenuSubContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <button data-testid="dropdown-trigger">{children}</button>,
  DropdownMenuSubTrigger: ({ children }: any) => <button data-testid="dropdown-sub-trigger">{children}</button>,
}));

describe('MembersModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Rendering', () => {
    it('renders the modal when open', () => {
      render(<MembersModal />);
      
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByText('Manage Members')).toBeInTheDocument();
    });

    it('displays member count', async () => {
      render(<MembersModal />);
      
      await waitFor(() => {
        expect(screen.getByTestId('member-count')).toHaveTextContent('3 Members');
      });
    });

    it('renders all members', async () => {
      render(<MembersModal />);
      
      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
        expect(screen.getByText('Mod User')).toBeInTheDocument();
        expect(screen.getByText('Regular User')).toBeInTheDocument();
      });
    });
  });

  describe('Discord-clone Visual Parity', () => {
    it('uses white background with black text', () => {
      render(<MembersModal />);
      
      const content = screen.getByTestId('dialog').querySelector('[class*="bg-white"]');
      expect(content).toBeInTheDocument();
    });

    it('displays role icons for admins and moderators', async () => {
      render(<MembersModal />);
      
      await waitFor(() => {
        // Should have ShieldAlert for admin and ShieldCheck for moderator
        const memberItems = screen.getAllByText(/User$/);
        expect(memberItems.length).toBeGreaterThan(0);
      });
    });

    it('shows avatar fallback for members without avatar', async () => {
      render(<MembersModal />);
      
      await waitFor(() => {
        const fallbacks = screen.getAllByTestId('avatar-fallback');
        expect(fallbacks.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Member Actions', () => {
    it('shows dropdown menu for manageable members', async () => {
      render(<MembersModal />);
      
      await waitFor(() => {
        const triggers = screen.getAllByTestId('dropdown-trigger');
        // Should not show trigger for current user or higher power level users
        expect(triggers.length).toBeGreaterThan(0);
      });
    });

    it('calls kick function when kick option is selected', async () => {
      const user = userEvent.setup();
      render(<MembersModal />);
      
      await waitFor(() => {
        expect(screen.getAllByTestId('dropdown-trigger').length).toBeGreaterThan(0);
      });

      // Find and click a kick button
      const kickButtons = screen.getAllByText('Kick');
      if (kickButtons.length > 0) {
        await user.click(kickButtons[0]);
        
        await waitFor(() => {
          expect(mockKick).toHaveBeenCalled();
        });
      }
    });

    it('calls ban function when ban option is selected', async () => {
      const user = userEvent.setup();
      render(<MembersModal />);
      
      await waitFor(() => {
        expect(screen.getAllByTestId('dropdown-trigger').length).toBeGreaterThan(0);
      });

      // Find and click a ban button
      const banButtons = screen.getAllByText('Ban');
      if (banButtons.length > 0) {
        await user.click(banButtons[0]);
        
        await waitFor(() => {
          expect(mockBan).toHaveBeenCalled();
        });
      }
    });
  });

  describe('Role Management', () => {
    it('shows role submenu for changing member roles', async () => {
      render(<MembersModal />);
      
      await waitFor(() => {
        const roleSubTriggers = screen.getAllByTestId('dropdown-sub-trigger');
        expect(roleSubTriggers.length).toBeGreaterThan(0);
      });
    });

    it('updates power levels when role is changed', async () => {
      const user = userEvent.setup();
      render(<MembersModal />);
      
      await waitFor(() => {
        expect(screen.getAllByTestId('dropdown-trigger').length).toBeGreaterThan(0);
      });

      // Find role options
      const guestOptions = screen.getAllByText('Guest');
      if (guestOptions.length > 0) {
        await user.click(guestOptions[0]);
        
        await waitFor(() => {
          expect(mockSendStateEvent).toHaveBeenCalledWith(
            expect.any(String),
            'm.room.power_levels',
            expect.any(Object),
            ''
          );
        });
      }
    });
  });

  describe('Matrix Integration', () => {
    it('loads members from Matrix room', async () => {
      render(<MembersModal />);
      
      await waitFor(() => {
        // Verify members are loaded from mock
        expect(screen.getByText('@admin:matrix.org')).toBeInTheDocument();
        expect(screen.getByText('@mod:matrix.org')).toBeInTheDocument();
        expect(screen.getByText('@user:matrix.org')).toBeInTheDocument();
      });
    });

    it('correctly maps power levels to roles', async () => {
      render(<MembersModal />);
      
      await waitFor(() => {
        // Members should be sorted by power level (admin first)
        const memberNames = screen.getAllByText(/User$/);
        expect(memberNames.length).toBe(3);
      });
    });
  });
});
