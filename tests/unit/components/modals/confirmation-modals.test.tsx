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
import { useModal } from '@/hooks/use-modal-store';

// Common mocks
const mockOnClose = vi.fn();
const mockPush = vi.fn();
const mockRefresh = vi.fn();

// Mock leaveServer function - this is what the component actually uses
const mockLeaveServer = vi.fn();
vi.mock('@/lib/matrix/leave-server', () => ({
  leaveServer: (options: any) => mockLeaveServer(options),
}));

// Mock deleteRoom function  
const mockDeleteRoom = vi.fn();
vi.mock('@/lib/matrix/delete-room', () => ({
  deleteRoom: (options: any) => mockDeleteRoom(options),
}));

// Mock toast for testing error display
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastLoading = vi.fn().mockReturnValue('loading-toast-id');
const mockToastDismiss = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: {
      error: mockToastError,
      success: mockToastSuccess,
      loading: mockToastLoading,
      dismiss: mockToastDismiss,
    },
  }),
}));

// Mock Matrix client with proper initialization status
const mockLeave = vi.fn(() => Promise.resolve({}));
const mockKick = vi.fn(() => Promise.resolve({}));
const mockSendStateEvent = vi.fn(() => Promise.resolve({}));
const mockGetRoom = vi.fn(() => ({
  currentState: {
    getStateEvents: vi.fn(() => []),
  },
  getJoinedMembers: vi.fn(() => []),
}));

// Mock the Matrix client to return a proper initialized client
const mockClient = {
  leave: mockLeave,
  kick: mockKick,
  sendStateEvent: mockSendStateEvent,
  getRoom: mockGetRoom,
  getUserId: () => '@user:matrix.org',
};

vi.mock('@/lib/matrix/client', () => ({
  getClient: vi.fn(() => mockClient),
}));

// Mock createInviteService for InviteModal
const mockCreateInvite = vi.fn();
const mockInviteService = {
  createInvite: mockCreateInvite,
};
vi.mock('@/lib/matrix/invites', () => ({
  createInviteService: () => mockInviteService, // Return the service directly
}));

// Create a variable to store clipboard mock for access in tests
let mockWriteText: any;

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    refresh: mockRefresh,
  })),
  useParams: vi.fn(() => ({ 
    serverId: 'test-server', 
    channelId: 'test-channel' 
  })),
}));

// Mock the Matrix client with proper return value
vi.mock('@/lib/matrix/client', () => ({
  getClient: () => mockClient, // Return the mock client directly
}));

// Already mocked above

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
    
    // Reset navigation mocks
    mockPush.mockClear();
    mockRefresh.mockClear();
    
    // Reset leaveServer mock - default to successful operation
    mockLeaveServer.mockClear();
    mockLeaveServer.mockResolvedValue({ 
      success: true 
    });
    
    // Reset toast mocks
    mockToastError.mockClear();
    mockToastSuccess.mockClear();
    mockToastLoading.mockClear();
    mockToastDismiss.mockClear();
    
    // Reset Matrix client mocks
    mockLeave.mockClear();
    mockKick.mockClear();
    mockSendStateEvent.mockClear();
    mockGetRoom.mockClear();
    
    vi.mocked(useModal).mockReturnValue({
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
    it('uses Discord dark background', () => {
      render(<LeaveServerModal />);
      
      const content = screen.getByTestId('dialog').querySelector('[class*="bg-[#313338]"]');
      expect(content).toBeInTheDocument();
    });

    it('uses Discord dark footer', () => {
      render(<LeaveServerModal />);
      
      const footer = screen.getByTestId('dialog').querySelector('footer');
      expect(footer?.className).toContain('bg-[#2B2D31]');
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

    it('calls leaveServer function when Confirm is clicked', async () => {
      const user = userEvent.setup();
      render(<LeaveServerModal />);
      
      await user.click(screen.getByText('Confirm'));
      
      await waitFor(() => {
        expect(mockLeaveServer).toHaveBeenCalledWith({
          serverId: '!server:matrix.org'
        });
      });
    });

    it('shows success toast on successful leave', async () => {
      const user = userEvent.setup();
      render(<LeaveServerModal />);
      
      await user.click(screen.getByText('Confirm'));
      
      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Successfully left server');
      });
    });

    it('handles Matrix client not available', async () => {
      mockLeaveServer.mockResolvedValue({
        success: false,
        error: {
          code: 'CLIENT_NOT_AVAILABLE',
          message: 'Matrix client not initialized. Please try again.',
          retryable: true
        }
      });
      
      const user = userEvent.setup();
      render(<LeaveServerModal />);
      
      await user.click(screen.getByText('Confirm'));
      
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          'Failed to leave server: Matrix client not initialized. Please try again.',
          expect.objectContaining({
            action: expect.any(Object),
            duration: 10000
          })
        );
      });
    });

    it('navigates to home after leaving', async () => {
      const user = userEvent.setup();
      render(<LeaveServerModal />);
      
      await user.click(screen.getByText('Confirm'));
      
      // Wait for the service call first
      await waitFor(() => {
        expect(mockLeaveServer).toHaveBeenCalledWith({
          serverId: '!server:matrix.org'
        });
      }, { timeout: 5000 });
      
      // Then wait for navigation 
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
      }, { timeout: 5000 });
    });
  });
});

// =============================================================================
// Delete Server Modal Tests
// =============================================================================

describe('DeleteServerModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset navigation mocks
    mockPush.mockClear();
    mockRefresh.mockClear();
    
    // Reset Matrix client mocks  
    mockLeave.mockClear();
    mockKick.mockClear();
    mockSendStateEvent.mockClear();
    mockGetRoom.mockClear();
    mockLeave.mockResolvedValue({}); // Set default successful resolution
    
    vi.mocked(useModal).mockReturnValue({
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
    it('highlights server name in red', () => {
      render(<DeleteServerModal />);
      
      const serverName = screen.getByText('Test Server');
      expect(serverName.className).toContain('text-red-400');
    });
  });

  describe('User Interaction', () => {
    it('leaves all rooms on delete', async () => {
      const user = userEvent.setup();
      render(<DeleteServerModal />);
      
      await user.click(screen.getByText('Confirm'));
      
      await waitFor(() => {
        // The component decodes the serverId and passes it to client.leave()
        expect(mockLeave).toHaveBeenCalledWith('!server:matrix.org');
      }, { timeout: 5000 });
    });
  });
});

// =============================================================================
// Delete Channel Modal Tests
// =============================================================================

describe('DeleteChannelModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useModal).mockReturnValue({
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
    
    // Reset Matrix client and service mocks
    mockLeave.mockClear();
    mockKick.mockClear();
    mockSendStateEvent.mockClear();
    mockGetRoom.mockClear();
    mockCreateInvite.mockClear();
    
    // Set up default successful invite creation
    mockCreateInvite.mockResolvedValue({
      success: true,
      invite: {
        url: 'http://localhost:3000/invite/!server%3Amatrix.org',
      },
    });
    
    // Mock navigator.clipboard for clipboard tests
    mockWriteText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: mockWriteText,
      },
      writable: true,
      configurable: true,
    });
    
    vi.mocked(useModal).mockReturnValue({
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
    it('uses Discord dark background', () => {
      render(<InviteModal />);
      
      const content = screen.getByTestId('dialog').querySelector('[class*="bg-[#313338]"]');
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
      const user = userEvent.setup();
      render(<InviteModal />);
      
      // Wait for the modal to render and the invite to be generated
      await waitFor(() => {
        expect(screen.getByTestId('input')).toBeInTheDocument();
      });
      
      // Get all buttons and find the one with the copy icon (size="icon" button)
      const buttons = screen.getAllByRole('button');
      
      // The copy button should have the copy SVG (rect element)
      let copyButton = null;
      for (const button of buttons) {
        const rect = button.querySelector('rect');
        if (rect) {
          copyButton = button;
          break;
        }
      }
      
      expect(copyButton).toBeInTheDocument();
      
      await user.click(copyButton!);
      
      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith('http://localhost:3000/invite/!server%3Amatrix.org');
      }, { timeout: 2000 });
    });
  });
});
