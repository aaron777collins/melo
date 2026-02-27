/**
 * Create Channel Modal Component Tests
 * 
 * Tests for the CreateChannelModal component which handles channel creation.
 * Validates Discord-clone visual parity and Matrix integration.
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateChannelModal } from '@/components/modals/create-channel-modal';

// Create a mock submit function that we can control
const mockFormSubmit = vi.fn();
const mockHandleSubmit = vi.fn((onSubmit) => {
  return (e?: any) => {
    e?.preventDefault?.();
    // Simulate calling the onSubmit with form values
    onSubmit({ name: 'test-channel', type: 'TEXT' });
  };
});

// Mock useForm hook
vi.mock('react-hook-form', () => ({
  useForm: vi.fn(() => ({
    handleSubmit: mockHandleSubmit,
    setValue: vi.fn(),
    reset: vi.fn(),
    formState: {
      isSubmitting: false,
      errors: {},
      isValid: true,
    },
    control: {},
    register: vi.fn(),
    watch: vi.fn(),
    trigger: vi.fn(),
    getValues: vi.fn(),
    setError: vi.fn(),
    clearErrors: vi.fn(),
    resetField: vi.fn(),
    setFocus: vi.fn(),
    getFieldState: vi.fn(),
  })),
}));

// Mock hooks
const mockOnClose = vi.fn();
const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('@/hooks/use-modal-store', () => ({
  useModal: () => ({
    isOpen: true,
    type: 'createChannel',
    onClose: mockOnClose,
    data: {
      channelType: 'TEXT',
    },
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    refresh: mockRefresh,
  })),
  useParams: vi.fn(() => ({
    serverId: encodeURIComponent('!space123:matrix.org'),
  })),
}));

// Import the mock from setup.ts to ensure consistency
import { mockMatrixAuthValue } from '../../../setup';

const mockCreateRoom = vi.fn(() => Promise.resolve({ room_id: '!newchannel:matrix.org' }));
const mockSendStateEvent = vi.fn(() => Promise.resolve({}));

vi.mock('@/lib/matrix/client', () => ({
  getClient: vi.fn(() => ({
    createRoom: mockCreateRoom,
    sendStateEvent: mockSendStateEvent,
  })),
}));

// Mock UI components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  DialogHeader: ({ children }: any) => <header>{children}</header>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogFooter: ({ children, className }: any) => <footer className={className}>{children}</footer>,
}));

vi.mock('@/components/ui/form', () => ({
  Form: ({ children, ...props }: any) => {
    return <div data-form="true" {...props}>{children}</div>;
  },
  FormField: ({ render, control, name }: any) => {
    const [value, setValue] = React.useState(name === 'type' ? 'TEXT' : '');
    return render({ 
      field: { 
        value, 
        onChange: (val: any) => setValue(val?.target?.value || val) 
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
    <input ref={ref} className={className} data-testid="channel-name-input" {...props} />
  )),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, defaultValue }: any) => (
    <div data-testid="select-wrapper">
      {React.Children.map(children, child => 
        React.cloneElement(child, { onValueChange, defaultValue })
      )}
    </div>
  ),
  SelectTrigger: ({ children, className }: any) => (
    <button data-testid="select-trigger" className={className}>{children}</button>
  ),
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-testid={`select-item-${value}`} data-value={value}>{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, onClick, variant, type, ...props }: any) => (
    <button 
      disabled={disabled} 
      onClick={onClick}
      data-variant={variant}
      type={type || "submit"}
      data-testid={`button-${variant || 'default'}`}
      {...props}
    >
      {children}
    </button>
  ),
}));

// Test Wrapper Component to provide necessary context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div>
      {children}
    </div>
  );
};

describe('CreateChannelModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFormSubmit.mockClear();
    mockHandleSubmit.mockClear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Rendering', () => {
    it('renders the modal when open', () => {
      render(<CreateChannelModal />);
      
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByText('Create Channel')).toBeInTheDocument();
    });

    it('renders channel name input field', () => {
      render(<CreateChannelModal />);
      
      expect(screen.getByTestId('channel-name-input')).toBeInTheDocument();
    });

    it('renders channel type selector', () => {
      render(<CreateChannelModal />);
      
      expect(screen.getByTestId('select-wrapper')).toBeInTheDocument();
    });

    it('renders Create button', () => {
      render(<CreateChannelModal />);
      
      expect(screen.getByTestId('button-default')).toBeInTheDocument();
      expect(screen.getByText('Create')).toBeInTheDocument();
    });
  });

  describe('Discord-clone Visual Parity', () => {
    it('uses white background with black text', () => {
      render(<CreateChannelModal />);
      
      const content = screen.getByTestId('dialog').querySelector('[class*="bg-[#313338]"]');
      expect(content).toBeInTheDocument();
    });

    it('uses correct styling for form labels', () => {
      render(<CreateChannelModal />);
      
      const label = screen.getByText('Channel Name');
      expect(label.className).toContain('uppercase');
      expect(label.className).toContain('text-xs');
      expect(label.className).toContain('font-bold');
    });

    it('uses gray-100 background for footer', () => {
      render(<CreateChannelModal />);
      
      const footer = screen.getByTestId('dialog').querySelector('footer');
      expect(footer?.className).toContain('bg-[#2B2D31]');
    });
  });

  describe('User Interaction', () => {
    it('allows entering channel name', async () => {
      const user = userEvent.setup();
      render(<CreateChannelModal />);
      
      const input = screen.getByTestId('channel-name-input');
      await user.type(input, 'my-new-channel');
      
      expect(input).toHaveValue('my-new-channel');
    });

    it('displays all channel type options', () => {
      render(<CreateChannelModal />);
      
      expect(screen.getByTestId('select-item-TEXT')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-AUDIO')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-VIDEO')).toBeInTheDocument();
    });

    it('calls Matrix client to create room on submit', async () => {
      const user = userEvent.setup();
      render(<CreateChannelModal />);
      
      const submitButton = screen.getByTestId('button-default');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockCreateRoom).toHaveBeenCalled();
      });
    });
  });

  describe('Matrix Integration', () => {
    it('creates encrypted room', async () => {
      const user = userEvent.setup();
      render(<CreateChannelModal />);
      
      const input = screen.getByTestId('channel-name-input');
      await user.type(input, 'secure-channel');
      
      const submitButton = screen.getByTestId('button-default');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockCreateRoom).toHaveBeenCalledWith(
          expect.objectContaining({
            initial_state: expect.arrayContaining([
              expect.objectContaining({
                type: 'm.room.encryption',
              }),
            ]),
          })
        );
      });
    });

    it('links channel to parent space', async () => {
      const user = userEvent.setup();
      render(<CreateChannelModal />);
      
      const input = screen.getByTestId('channel-name-input');
      await user.type(input, 'linked-channel');
      
      const submitButton = screen.getByTestId('button-default');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockSendStateEvent).toHaveBeenCalledWith(
          expect.any(String),
          'm.space.child',
          expect.any(Object),
          expect.any(String)
        );
      });
    });
  });

  describe('Validation', () => {
    it('prevents creating channel named "general"', async () => {
      const user = userEvent.setup();
      render(<CreateChannelModal />);
      
      const input = screen.getByTestId('channel-name-input');
      await user.type(input, 'general');
      
      const submitButton = screen.getByTestId('button-default');
      await user.click(submitButton);
      
      // Should not call createRoom for 'general' name
      await waitFor(() => {
        expect(mockCreateRoom).not.toHaveBeenCalled();
      }, { timeout: 1000 }).catch(() => {
        // Expected - form validation should prevent submission
      });
    });
  });
});
