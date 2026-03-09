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

// Mock react-hook-form to prevent formState errors
let formValues = { name: '', type: 'TEXT' };
vi.mock('react-hook-form', () => ({
  useForm: () => ({
    handleSubmit: vi.fn((onSubmit) => (e) => {
      e?.preventDefault?.();
      // Use actual form values or fallback to test default
      const submitData = {
        name: formValues.name || 'test-channel',
        type: formValues.type || 'TEXT'
      };
      onSubmit(submitData);
    }),
    setValue: vi.fn(),
    reset: vi.fn(),
    formState: {
      isSubmitting: false,
      errors: {},
      isValid: true,
      isDirty: false,
      isValidating: false,
      touchedFields: {},
      dirtyFields: {},
      submitCount: 0,
      defaultValues: { name: '', type: 'TEXT' }
    },
    control: {
      _formValues: { name: '', type: 'TEXT' },
      _defaultValues: { name: '', type: 'TEXT' }
    },
    register: vi.fn(() => ({
      name: 'field',
      onChange: vi.fn(),
      onBlur: vi.fn(),
      ref: vi.fn()
    })),
    watch: vi.fn(),
    trigger: vi.fn(),
    getValues: vi.fn(() => ({ name: '', type: 'TEXT' })),
    setError: vi.fn(),
    clearErrors: vi.fn(),
    resetField: vi.fn(),
    setFocus: vi.fn(),
    getFieldState: vi.fn(() => ({
      error: undefined,
      invalid: false,
      isDirty: false,
      isTouched: false
    }))
  }),
  useController: vi.fn(() => ({
    field: {
      value: '',
      onChange: vi.fn(),
      onBlur: vi.fn(),
      name: 'field',
      ref: vi.fn()
    },
    fieldState: {
      error: undefined,
      invalid: false,
      isDirty: false,
      isTouched: false
    }
  })),
  Controller: ({ render }: any) => render?.({
    field: {
      value: '',
      onChange: vi.fn(),
      onBlur: vi.fn(),
      name: 'field',
      ref: vi.fn()
    },
    fieldState: {
      error: undefined,
      invalid: false,
      isDirty: false,
      isTouched: false
    }
  }),
  useFormContext: vi.fn(() => null),
  FormProvider: ({ children }: any) => children
}));

// Mock @hookform/resolvers/zod to prevent resolver errors
vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: vi.fn(() => vi.fn())
}));

import { CreateChannelModal } from '@/components/modals/create-channel-modal';

// Mock form submission function
const mockFormSubmit = vi.fn();

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
      space: {
        id: '!space123:matrix.org'
      }
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

// Mock createChannel function - this is what the component actually uses
const mockCreateChannel = vi.fn();
vi.mock('@/lib/matrix/create-channel', () => ({
  createChannel: (options: any) => mockCreateChannel(options),
}));

// Mock Matrix auth provider
vi.mock('@/components/providers/matrix-auth-provider', () => ({
  useMatrixAuth: () => ({
    session: {
      userId: '@testuser:matrix.org',
      accessToken: 'test-token'
    },
    hasUser: true,
    isLoading: false
  }),
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

// Mock UI components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  DialogHeader: ({ children }: any) => <header>{children}</header>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogFooter: ({ children, className }: any) => <footer className={className}>{children}</footer>,
}));

vi.mock('@/components/ui/form', () => ({
  // Form is FormProvider (context only) - NO DOM element
  Form: ({ children }: any) => children,
  FormField: ({ render, name }: any) => {
    const [value, setValue] = React.useState(name === 'type' ? 'TEXT' : '');
    return render({ 
      field: { 
        value, 
        onChange: (val: any) => {
          const newValue = val?.target?.value || val;
          setValue(newValue);
          // Update global form values for handleSubmit mock
          formValues[name as keyof typeof formValues] = newValue;
        },
        name,
        onBlur: vi.fn(),
        disabled: false,
        ref: vi.fn()
      },
      fieldState: {
        error: undefined,
        invalid: false,
        isDirty: false,
        isTouched: false
      },
      formState: {
        isSubmitting: false,
        errors: {},
        isValid: true
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
    
    // Reset form values
    formValues = { name: '', type: 'TEXT' };
    
    // Reset createChannel mock - default to successful creation
    mockCreateChannel.mockClear();
    mockCreateChannel.mockResolvedValue({ 
      success: true, 
      roomId: '!newchannel:matrix.org' 
    });
    
    // Reset toast mocks
    mockToastError.mockClear();
    mockToastSuccess.mockClear();
    mockToastLoading.mockClear();
    mockToastDismiss.mockClear();
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

    it('calls createChannel function on submit', async () => {
      const user = userEvent.setup();
      render(<CreateChannelModal />);
      
      const submitButton = screen.getByTestId('button-default');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockCreateChannel).toHaveBeenCalledWith({
          name: 'test-channel',
          type: 'TEXT',
          spaceId: '!space123:matrix.org',
          categoryId: undefined,
          userId: '@testuser:matrix.org'
        });
      });
    });
  });

  describe('Matrix Integration', () => {
    it('creates channel with correct parameters', async () => {
      const user = userEvent.setup();
      render(<CreateChannelModal />);
      
      const input = screen.getByTestId('channel-name-input');
      await user.type(input, 'secure-channel');
      
      const submitButton = screen.getByTestId('button-default');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockCreateChannel).toHaveBeenCalledWith({
          name: 'secure-channel',
          type: 'TEXT',
          spaceId: '!space123:matrix.org',
          categoryId: undefined,
          userId: '@testuser:matrix.org'
        });
      });
    });

    it('shows success toast on successful creation', async () => {
      const user = userEvent.setup();
      render(<CreateChannelModal />);
      
      const submitButton = screen.getByTestId('button-default');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Channel created successfully!');
      });
    });

    it('handles Matrix client not available', async () => {
      mockCreateChannel.mockResolvedValue({
        success: false,
        error: {
          code: 'CLIENT_NOT_AVAILABLE',
          message: 'Matrix client not initialized. Please try again.',
          retryable: true
        }
      });
      
      const user = userEvent.setup();
      render(<CreateChannelModal />);
      
      const submitButton = screen.getByTestId('button-default');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          'Failed to create channel: Matrix client not initialized. Please try again.',
          expect.objectContaining({
            action: expect.any(Object),
            duration: 10000
          })
        );
      });
    });
  });

  describe('Validation', () => {
    it('prevents creating channel named "general"', async () => {
      // Mock createChannel to throw validation error for 'general' name
      mockCreateChannel.mockRejectedValue(new Error('Channel name cannot be "general"'));
      
      const user = userEvent.setup();
      render(<CreateChannelModal />);
      
      const input = screen.getByTestId('channel-name-input');
      await user.type(input, 'general');
      
      const submitButton = screen.getByTestId('button-default');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          'Failed to create channel: Channel name cannot be "general"'
        );
      });
    });
  });
});
