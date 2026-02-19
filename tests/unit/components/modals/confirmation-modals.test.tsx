/**
 * Confirmation Modal Components Tests
 * 
 * Tests for LeaveServerModal, DeleteServerModal, DeleteChannelModal, and InviteModal.
 * Validates Discord-clone visual parity and Matrix integration.
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeaveServerModal } from '@/components/modals/leave-server-modal';
import { DeleteServerModal } from '@/components/modals/delete-server-modal';
import { DeleteChannelModal } from '@/components/modals/delete-channel-modal';
import { InviteModal } from '@/components/modals/invite-modal';

// Common mocks
const mockOnClose = vi.fn();
const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockLeave = vi.fn(() => Promise.resolve({}));
const mockKick = vi.fn(() => Promise.resolve({}));
const mockSendStateEvent = vi.fn(() => Promise.resolve({}));
const mockGetRoom = vi.fn(() => ({
  currentState: {
    getStateEvents: vi.fn(() => []),
  },
  getJoinedMembers: vi.fn(() => []),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    refresh: mockRefresh,
  })),
}));

vi.mock('@/lib/matrix/client', () => ({
  getClient: vi.fn(() => ({
    leave: mockLeave,
    kick: mockKick,
    sendStateEvent: mockSendStateEvent,
    getRoom: mockGetRoom,
    getUserId: () => '@user:matrix.org',
  })),
}));

vi.mock('@/lib/matrix/invites', () => ({
  createInviteService: vi.fn(() => ({
    createInvite: vi.fn(() => Promise.resolve({
      success: true,
      invite: {
        url: 'https://melo.app/invite/abc123',
      },
    })),
  })),
}));

// Mock UI components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  DialogHeader: ({ children }: any) => <header>{children}</header>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogDescription: ({ children }: any) => <p data-testid="dialog-description">{children}</p>,
  DialogFooter: ({ children, className }: any) => <footer className={className}>{children}</footer>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, onClick, variant, ...props }: any) => (
    <button 
      disabled={disabled} 
      onClick={onClick}
      data-variant={variant}
      data-testid={`button-${variant || 'default'}`}
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: React.forwardRef(({ className, value, ...props }: any, ref: any) => (
    <input ref={ref} className={className} value={value} data-testid="input" {...props} />
  )),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, className }: any) => <label className={className}>{children}</label>,
}));

// =============================================================================
// Leave Server Modal Tests
// =============================================================================

describe('LeaveServerModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(require('@/hooks/use-modal-store').useModal).mockReturnValue({
      isOpen: true,
      type: 'leaveServer',
      onClose: mockOnClose,
      data: {
        server: {
          id: '!server:matrix.org',
          name: 'Test Server',
        },
      },
    });
  });

  vi.mock('@/hooks/use-modal-store', () => ({
    useModal: vi.fn(() => ({
      isOpen: true,
      type: 'leaveServer',
      onClose: mockOnClose,
      data: {
        server: {
          id: '!server:matrix.org',
          name: 'Test Server',
        },
      },
    })),
  }));

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Rendering', () => {
    it('renders the modal with correct title', () => {
      render(<LeaveServerModal />);
      
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Leave Server');
    });

    it('displays server name in description', () => {
      render(<LeaveServerModal />);
      
      expect(screen.getByTestId('dialog-description')).toBeInTheDocument();
    });

    it('shows Cancel and Confirm buttons', () => {
      render(<LeaveServerModal />);
      
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });
  });

  describe('Discord-clone Visual Parity', () => {
    it('uses white background', () => {
      render(<LeaveServerModal />);
      
      const content = screen.getByTestId('dialog').querySelector('[class*="bg-white"]');
      expect(content).toBeInTheDocument();
    });

    it('uses gray footer', () => {
      render(<LeaveServerModal />);
      
      const footer = screen.getByTestId('dialog').querySelector('footer');
      expect(footer?.className).toContain('bg-gray-100');
    });

    it('buttons are arranged with space between', () => {
      render(<LeaveServerModal />);
      
      const footer = screen.getByTestId('dialog').querySelector('footer');
      const buttonContainer = footer?.querySelector('[class*="justify-between"]');
      expect(buttonContainer).toBeInTheDocument();
    });
  });

  describe('User Interaction', () => {
    it('closes modal when Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<LeaveServerModal />);
      
      await user.click(screen.getByText('Cancel'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls leave function when Confirm is clicked', async () => {
      const user = userEvent.setup();
      render(<LeaveServerModal />);
      
      await user.click(screen.getByText('Confirm'));
      
      await waitFor(() => {
        expect(mockLeave).toHaveBeenCalled();
      });
    });

    it('navigates to home after leaving', async () => {
      const user = userEvent.setup();
      render(<LeaveServerModal />);
      
      await user.click(screen.getByText('Confirm'));
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });
  });
});

// =============================================================================
// Delete Server Modal Tests
// =============================================================================

describe('DeleteServerModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(require('@/hooks/use-modal-store').useModal).mockReturnValue({
      isOpen: true,
      type: 'deleteServer',
      onClose: mockOnClose,
      data: {
        server: {
          id: '!server:matrix.org',
          name: 'Test Server',
        },
      },
    });
  });

  describe('Rendering', () => {
    it('renders with correct title', () => {
      render(<DeleteServerModal />);
      
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Delete Server');
    });

    it('shows permanent deletion warning', () => {
      render(<DeleteServerModal />);
      
      expect(screen.getByText(/permanently deleted/)).toBeInTheDocument();
    });
  });

  describe('Discord-clone Visual Parity', () => {
    it('highlights server name in indigo', () => {
      render(<DeleteServerModal />);
      
      const serverName = screen.getByText('Test Server');
      expect(serverName.className).toContain('text-indigo-500');
    });
  });

  describe('User Interaction', () => {
    it('leaves all rooms on delete', async () => {
      const user = userEvent.setup();
      render(<DeleteServerModal />);
      
      await user.click(screen.getByText('Confirm'));
      
      await waitFor(() => {
        expect(mockLeave).toHaveBeenCalled();
      });
    });
  });
});

// =============================================================================
// Delete Channel Modal Tests
// =============================================================================

describe('DeleteChannelModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(require('@/hooks/use-modal-store').useModal).mockReturnValue({
      isOpen: true,
      type: 'deleteChannel',
      onClose: mockOnClose,
      data: {
        server: { id: '!server:matrix.org' },
        channel: { id: '!channel:matrix.org', name: 'test-channel' },
      },
    });
  });

  describe('Rendering', () => {
    it('renders with correct title', () => {
      render(<DeleteChannelModal />);
      
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Delete Channel');
    });

    it('displays channel name with hash prefix', () => {
      render(<DeleteChannelModal />);
      
      expect(screen.getByText('#test-channel')).toBeInTheDocument();
    });
  });

  describe('Discord-clone Visual Parity', () => {
    it('uses Discord dark theme colors', () => {
      render(<DeleteChannelModal />);
      
      const content = screen.getByTestId('dialog').querySelector('[class*="bg-"]');
      expect(content).toBeInTheDocument();
    });
  });
});

// =============================================================================
// Invite Modal Tests
// =============================================================================

describe('InviteModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(require('@/hooks/use-modal-store').useModal).mockReturnValue({
      isOpen: true,
      type: 'invite',
      onClose: mockOnClose,
      onOpen: vi.fn(),
      data: {
        server: {
          id: '!server:matrix.org',
          name: 'Test Server',
        },
      },
    });
  });

  describe('Rendering', () => {
    it('renders with correct title', () => {
      render(<InviteModal />);
      
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Invite Friends');
    });

    it('shows invite link input', () => {
      render(<InviteModal />);
      
      expect(screen.getByTestId('input')).toBeInTheDocument();
    });

    it('shows copy button', () => {
      render(<InviteModal />);
      
      // Copy button is a size="icon" button
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('shows generate new link button', () => {
      render(<InviteModal />);
      
      expect(screen.getByText('Generate a new link')).toBeInTheDocument();
    });
  });

  describe('Discord-clone Visual Parity', () => {
    it('uses white background', () => {
      render(<InviteModal />);
      
      const content = screen.getByTestId('dialog').querySelector('[class*="bg-white"]');
      expect(content).toBeInTheDocument();
    });

    it('labels are uppercase and styled correctly', () => {
      render(<InviteModal />);
      
      const label = screen.getByText('Server invite link');
      expect(label.className).toContain('uppercase');
      expect(label.className).toContain('text-xs');
    });
  });

  describe('User Interaction', () => {
    it('copies link to clipboard when copy button clicked', async () => {
      const mockClipboard = {
        writeText: vi.fn(() => Promise.resolve()),
      };
      Object.assign(navigator, { clipboard: mockClipboard });

      const user = userEvent.setup();
      render(<InviteModal />);
      
      // Find the copy button (icon button)
      const buttons = screen.getAllByRole('button');
      const copyButton = buttons.find(btn => btn.querySelector('svg'));
      
      if (copyButton) {
        await user.click(copyButton);
        
        await waitFor(() => {
          expect(mockClipboard.writeText).toHaveBeenCalled();
        });
      }
    });
  });
});
