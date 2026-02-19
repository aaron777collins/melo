/**
 * Create Server Modal Component Tests
 * 
 * Tests for the CreateServerModal component which handles server/space creation.
 * Validates Discord-clone visual parity and Matrix integration.
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateServerModal } from '@/components/modals/create-server-modal';

// Mock hooks
const mockOnClose = vi.fn();
const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('@/hooks/use-modal-store', () => ({
  useModal: vi.fn(() => ({
    isOpen: true,
    type: 'createServer',
    onClose: mockOnClose,
    data: {},
  })),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    refresh: mockRefresh,
  })),
}));

vi.mock('@/components/providers/matrix-auth-provider', () => ({
  useMatrixAuth: vi.fn(() => ({
    session: {
      userId: '@testuser:matrix.org',
    },
  })),
}));

const mockCreateRoom = vi.fn(() => Promise.resolve({ room_id: '!newroom:matrix.org' }));
const mockSendStateEvent = vi.fn(() => Promise.resolve({}));

vi.mock('@/lib/matrix/client', () => ({
  getClient: vi.fn(() => ({
    createRoom: mockCreateRoom,
    sendStateEvent: mockSendStateEvent,
  })),
}));

vi.mock('@/components/matrix-file-upload', () => ({
  MatrixFileUpload: ({ onUpload, placeholder }: any) => (
    <div data-testid="file-upload">
      <button onClick={() => onUpload('mxc://test/avatar')}>
        {placeholder}
      </button>
    </div>
  ),
}));

// Mock UI components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  DialogHeader: ({ children }: any) => <header>{children}</header>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children, className }: any) => <footer className={className}>{children}</footer>,
}));

vi.mock('@/components/ui/form', () => ({
  Form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
  FormField: ({ render, control, name }: any) => {
    const [value, setValue] = React.useState('');
    return render({ 
      field: { 
        value, 
        onChange: (e: any) => setValue(e?.target?.value || e) 
      } 
    });
  },
  FormItem: ({ children }: any) => <div>{children}</div>,
  FormControl: ({ children }: any) => <div>{children}</div>,
  FormLabel: ({ children, className }: any) => <label className={className}>{children}</label>,
  FormMessage: () => null,
}));

vi.mock('@/components/ui/input', () => ({
  Input: React.forwardRef(({ className, ...props }: any, ref: any) => (
    <input ref={ref} className={className} data-testid="server-name-input" {...props} />
  )),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, onClick, variant, type, ...props }: any) => (
    <button 
      disabled={disabled} 
      onClick={onClick}
      data-variant={variant}
      type={type}
      data-testid={`button-${variant || 'default'}`}
      {...props}
    >
      {children}
    </button>
  ),
}));

describe('CreateServerModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Rendering', () => {
    it('renders the modal when open', () => {
      render(<CreateServerModal />);
      
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByText('Customize your server')).toBeInTheDocument();
    });

    it('displays the correct description text', () => {
      render(<CreateServerModal />);
      
      expect(screen.getByText(/Give your server a personality/)).toBeInTheDocument();
    });

    it('renders server name input field', () => {
      render(<CreateServerModal />);
      
      expect(screen.getByTestId('server-name-input')).toBeInTheDocument();
    });

    it('renders file upload component', () => {
      render(<CreateServerModal />);
      
      expect(screen.getByTestId('file-upload')).toBeInTheDocument();
    });

    it('renders Create button', () => {
      render(<CreateServerModal />);
      
      expect(screen.getByTestId('button-primary')).toBeInTheDocument();
      expect(screen.getByText('Create')).toBeInTheDocument();
    });
  });

  describe('Discord-clone Visual Parity', () => {
    it('uses white background with black text', () => {
      render(<CreateServerModal />);
      
      const content = screen.getByTestId('dialog').querySelector('[class*="bg-white"]');
      expect(content).toBeInTheDocument();
    });

    it('uses correct styling for form labels', () => {
      render(<CreateServerModal />);
      
      const label = screen.getByText('Server Name');
      expect(label.className).toContain('uppercase');
      expect(label.className).toContain('text-xs');
      expect(label.className).toContain('font-bold');
    });

    it('uses gray-100 background for footer', () => {
      render(<CreateServerModal />);
      
      const footer = screen.getByTestId('dialog').querySelector('footer');
      expect(footer?.className).toContain('bg-gray-100');
    });
  });

  describe('User Interaction', () => {
    it('allows entering server name', async () => {
      const user = userEvent.setup();
      render(<CreateServerModal />);
      
      const input = screen.getByTestId('server-name-input');
      await user.type(input, 'My Test Server');
      
      expect(input).toHaveValue('My Test Server');
    });

    it('calls Matrix client to create room on submit', async () => {
      const user = userEvent.setup();
      render(<CreateServerModal />);
      
      const input = screen.getByTestId('server-name-input');
      await user.type(input, 'My Test Server');
      
      const submitButton = screen.getByTestId('button-primary');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockCreateRoom).toHaveBeenCalled();
      });
    });

    it('closes modal and navigates after successful creation', async () => {
      const user = userEvent.setup();
      render(<CreateServerModal />);
      
      const input = screen.getByTestId('server-name-input');
      await user.type(input, 'My Test Server');
      
      const submitButton = screen.getByTestId('button-primary');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Matrix Integration', () => {
    it('creates encrypted room with correct settings', async () => {
      const user = userEvent.setup();
      render(<CreateServerModal />);
      
      const input = screen.getByTestId('server-name-input');
      await user.type(input, 'Encrypted Server');
      
      const submitButton = screen.getByTestId('button-primary');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockCreateRoom).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Encrypted Server',
            creation_content: { type: 'm.space' },
            initial_state: expect.arrayContaining([
              expect.objectContaining({
                type: 'm.room.encryption',
              }),
            ]),
          })
        );
      });
    });

    it('creates default general channel after space creation', async () => {
      const user = userEvent.setup();
      render(<CreateServerModal />);
      
      const input = screen.getByTestId('server-name-input');
      await user.type(input, 'Test Server');
      
      const submitButton = screen.getByTestId('button-primary');
      await user.click(submitButton);
      
      await waitFor(() => {
        // Should be called twice: once for space, once for general channel
        expect(mockCreateRoom).toHaveBeenCalledTimes(2);
      });
    });
  });
});
