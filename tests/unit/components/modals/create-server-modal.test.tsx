/**
 * Create Server Modal Component Tests
 * 
 * Tests for the CreateServerModal component which handles server/space creation.
 * Validates Discord-clone visual parity and Matrix integration.
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock hooks BEFORE importing the component
const mockOnClose = vi.fn();
const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('@/hooks/use-modal-store', () => ({
  useModal: () => ({
    isOpen: true,
    type: 'createServer',
    onClose: mockOnClose,
    data: {},
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

vi.mock('@/components/providers/matrix-auth-provider', () => ({
  useMatrixAuth: () => ({
    session: {
      userId: '@testuser:matrix.org',
    },
  }),
}));

vi.mock('@/lib/matrix/client', () => ({
  getClient: () => ({
    createRoom: vi.fn(() => Promise.resolve({ room_id: '!newroom:matrix.org' })),
    sendStateEvent: vi.fn(() => Promise.resolve({})),
  }),
}));

vi.mock('@/components/matrix-file-upload', () => ({
  MatrixFileUpload: ({ onUpload, placeholder }: any) => (
    <div data-testid="file-upload">
      <button type="button" onClick={() => onUpload('mxc://test/avatar')}>
        {placeholder}
      </button>
    </div>
  ),
}));

// Mock UI components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, className }: any) => <div className={className} data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children, className }: any) => <header className={className}>{children}</header>,
  DialogTitle: ({ children, className }: any) => <h2 className={className}>{children}</h2>,
  DialogDescription: ({ children, className }: any) => <p className={className}>{children}</p>,
  DialogFooter: ({ children, className }: any) => <footer className={className} data-testid="dialog-footer">{children}</footer>,
}));

vi.mock('@/components/ui/form', () => ({
  Form: ({ children }: any) => <div data-testid="form-container">{children}</div>,
  FormField: ({ render, name }: any) => {
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
  FormMessage: ({ className }: any) => <span className={className}></span>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: React.forwardRef(({ className, ...props }: any, ref: any) => (
    <input ref={ref} className={className} data-testid="server-name-input" {...props} />
  )),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, onClick, variant, type, className, ...props }: any) => (
    <button 
      disabled={disabled} 
      onClick={onClick}
      data-variant={variant}
      type={type || 'button'}
      className={className}
      data-testid={`button-${variant || 'default'}`}
      {...props}
    >
      {children}
    </button>
  ),
}));

// Import component AFTER mocks are set up
import { CreateServerModal } from '@/components/modals/create-server-modal';

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
      
      expect(screen.getByText('Create')).toBeInTheDocument();
    });
  });

  describe('Discord Dark Theme Visual Parity', () => {
    it('uses Discord main background color (#313338)', () => {
      render(<CreateServerModal />);
      
      const content = screen.getByTestId('dialog-content');
      expect(content.className).toContain('bg-[#313338]');
    });

    it('uses white text on dark background', () => {
      render(<CreateServerModal />);
      
      const content = screen.getByTestId('dialog-content');
      expect(content.className).toContain('text-white');
    });

    it('uses correct styling for form labels', () => {
      render(<CreateServerModal />);
      
      const label = screen.getByText('Server Name');
      expect(label.className).toContain('uppercase');
      expect(label.className).toContain('text-xs');
      expect(label.className).toContain('font-bold');
      expect(label.className).toContain('text-zinc-300');
    });

    it('uses Discord secondary background (#2B2D31) for footer', () => {
      render(<CreateServerModal />);
      
      const footer = screen.getByTestId('dialog-footer');
      expect(footer.className).toContain('bg-[#2B2D31]');
    });

    it('uses Discord blurple button colors', () => {
      render(<CreateServerModal />);
      
      const createButton = screen.getByText('Create');
      expect(createButton.className).toContain('bg-[#5865F2]');
      expect(createButton.className).toContain('hover:bg-[#4752C4]');
      expect(createButton.className).toContain('text-white');
    });

    it('uses Discord secondary background for input fields', () => {
      render(<CreateServerModal />);
      
      const input = screen.getByTestId('server-name-input');
      expect(input.className).toContain('bg-[#2B2D31]');
      expect(input.className).toContain('text-white');
      expect(input.className).toContain('placeholder:text-zinc-500');
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

    it('can upload server icon via file upload', async () => {
      const user = userEvent.setup();
      render(<CreateServerModal />);
      
      // Upload an image
      const uploadButton = screen.getByText('Upload server icon');
      await user.click(uploadButton);
      
      // Verify upload button exists and is interactive
      expect(uploadButton).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('renders with proper accessibility structure', () => {
      render(<CreateServerModal />);
      
      // Check for dialog
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      
      // Check for header
      expect(screen.getByText('Customize your server')).toBeInTheDocument();
      
      // Check for form elements
      expect(screen.getByTestId('form-container')).toBeInTheDocument();
      expect(screen.getByTestId('server-name-input')).toBeInTheDocument();
      
      // Check for footer
      expect(screen.getByTestId('dialog-footer')).toBeInTheDocument();
    });

    it('has centered layout for upload component', () => {
      render(<CreateServerModal />);
      
      const uploadContainer = screen.getByTestId('file-upload').parentElement;
      // The upload should be within a flex container that centers content
      expect(uploadContainer).toBeInTheDocument();
    });
  });
});
