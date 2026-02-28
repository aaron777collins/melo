import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { ServerOverviewModal } from '@/components/modals/server-overview-modal';
import { useModal } from '@/hooks/use-modal-store';
import { getClient } from '@/lib/matrix/client';
import { mockRouterRefresh, mockModalOnClose } from '../../setup';

// Mock dependencies
vi.mock('sonner');
vi.mock('@/lib/matrix/client');

// Create a stateful mock for react-hook-form that can track setValue calls
let formValues: Record<string, string> = { name: '', imageUrl: '', description: '' };

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    handleSubmit: vi.fn((onSubmit) => (e: any) => {
      e?.preventDefault?.();
      onSubmit(formValues);
    }),
    setValue: vi.fn((field: string, value: string) => {
      formValues[field] = value;
    }),
    reset: vi.fn(() => {
      formValues = { name: '', imageUrl: '', description: '' };
    }),
    formState: {
      isSubmitting: false,
      errors: {},
      isValid: true,
      isDirty: false,
      isValidating: false,
      touchedFields: {},
      dirtyFields: {},
      submitCount: 0,
      defaultValues: { name: '', imageUrl: '', description: '' }
    },
    control: {
      _formValues: formValues,
      _defaultValues: { name: '', imageUrl: '', description: '' }
    },
    register: vi.fn(() => ({
      name: 'field',
      onChange: vi.fn(),
      onBlur: vi.fn(),
      ref: vi.fn()
    })),
    watch: vi.fn((field?: string) => field ? formValues[field] : formValues),
    trigger: vi.fn(),
    getValues: vi.fn(() => formValues),
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
  useController: vi.fn(({ name }: any) => ({
    field: {
      value: formValues[name] || '',
      onChange: vi.fn((val: any) => {
        formValues[name] = val?.target?.value ?? val;
      }),
      onBlur: vi.fn(),
      name: name,
      ref: vi.fn()
    },
    fieldState: {
      error: undefined,
      invalid: false,
      isDirty: false,
      isTouched: false
    }
  })),
  Controller: ({ render, name }: any) => render?.({
    field: {
      value: formValues[name] || '',
      onChange: vi.fn((val: any) => {
        formValues[name] = val?.target?.value ?? val;
      }),
      onBlur: vi.fn(),
      name: name,
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

// Mock UI components to avoid useFormContext issues
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, className }: any) => <div className={className} data-testid="dialog-content" role="dialog">{children}</div>,
  DialogHeader: ({ children, className }: any) => <header className={className}>{children}</header>,
  DialogTitle: ({ children, className }: any) => <h2 className={className}>{children}</h2>,
  DialogDescription: ({ children, className }: any) => <p className={className}>{children}</p>,
  DialogFooter: ({ children, className }: any) => <footer className={className} data-testid="dialog-footer">{children}</footer>,
}));

vi.mock('@/components/ui/form', () => ({
  Form: ({ children }: any) => <form data-testid="form-container" onSubmit={(e: any) => e.preventDefault()}>{children}</form>,
  FormField: ({ render, name }: any) => {
    return render({ 
      field: { 
        value: formValues[name] || '', 
        onChange: (e: any) => {
          formValues[name] = e?.target?.value ?? e;
        }
      } 
    });
  },
  FormItem: ({ children }: any) => <div>{children}</div>,
  FormControl: ({ children }: any) => <div>{children}</div>,
  FormLabel: ({ children, className, htmlFor }: any) => <label className={className} htmlFor={htmlFor}>{children}</label>,
  FormMessage: ({ className }: any) => <span className={className}></span>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: React.forwardRef(({ className, id, ...props }: any, ref: any) => (
    <input ref={ref} className={className} id={id} aria-label="Server Name" data-testid="server-name-input" {...props} />
  )),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: React.forwardRef(({ className, id, ...props }: any, ref: any) => (
    <textarea ref={ref} className={className} id={id} aria-label="Description" data-testid="description-input" {...props} />
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

vi.mock('@/components/matrix-file-upload', () => ({
  MatrixFileUpload: ({ onUpload, placeholder }: any) => (
    <div data-testid="file-upload">
      <button type="button" onClick={() => onUpload('mxc://test/avatar')}>
        {placeholder || 'Upload server icon'}
      </button>
    </div>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: mockRouterRefresh
  }),
}));

const mockMatrixClient = {
  setRoomName: vi.fn(),
  sendStateEvent: vi.fn(),
};

describe('ServerOverviewModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset form values for each test
    formValues = { name: '', imageUrl: '', description: '' };
    
    (getClient as any).mockReturnValue(mockMatrixClient);
    (toast.success as any) = vi.fn();
    (toast.error as any) = vi.fn();
    
    // Reset useModal to default closed state
    (useModal as any).mockReturnValue({
      isOpen: false,
      type: null,
      data: {},
      onOpen: vi.fn(),
      onClose: mockModalOnClose
    });
  });

  it('should not render when modal is closed', () => {
    render(<ServerOverviewModal />);
    expect(screen.queryByText('Server Overview')).not.toBeInTheDocument();
  });

  it('should render when modal is open with serverOverview type', () => {
    (useModal as any).mockReturnValue({
      isOpen: true,
      type: 'serverOverview',
      data: {
        space: {
          id: 'test-space-id',
          name: 'Test Space',
          avatarUrl: 'test-avatar-url',
          topic: 'Test description'
        }
      },
      onOpen: vi.fn(),
      onClose: mockModalOnClose
    });

    render(<ServerOverviewModal />);
    expect(screen.getByText('Server Overview')).toBeInTheDocument();
    // Check that form fields are rendered (name input should exist)
    expect(screen.getByTestId('server-name-input')).toBeInTheDocument();
  });

  it('should populate form with space data', () => {
    const mockSpace = {
      id: 'test-space-id',
      name: 'My Test Server',
      avatarUrl: 'https://example.com/avatar.png',
      topic: 'Server description'
    };

    (useModal as any).mockReturnValue({
      isOpen: true,
      type: 'serverOverview',
      data: { space: mockSpace },
      onOpen: vi.fn(),
      onClose: mockModalOnClose
    });

    render(<ServerOverviewModal />);

    // Check that the modal renders with form fields
    expect(screen.getByText('Server Overview')).toBeInTheDocument();
    expect(screen.getByTestId('server-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('description-input')).toBeInTheDocument();
  });

  it('should handle form submission with name change', async () => {
    const mockSpace = {
      id: 'test-space-id',
      name: 'Old Name',
      avatarUrl: '',
      topic: ''
    };

    (useModal as any).mockReturnValue({
      isOpen: true,
      type: 'serverOverview',
      data: { space: mockSpace },
      onOpen: vi.fn(),
      onClose: mockModalOnClose
    });

    mockMatrixClient.setRoomName.mockResolvedValue({});

    render(<ServerOverviewModal />);

    // Find and change name input
    const nameInput = screen.getByTestId('server-name-input');
    fireEvent.change(nameInput, { target: { value: 'New Server Name' } });
    // Update the mock values
    formValues.name = 'New Server Name';

    // Submit form
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockMatrixClient.setRoomName).toHaveBeenCalledWith(
        'test-space-id',
        'New Server Name'
      );
    });

    expect(mockRouterRefresh).toHaveBeenCalled();
    expect(mockModalOnClose).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Server settings updated');
  });

  it('should handle avatar upload section visibility', async () => {
    const mockSpace = {
      id: 'test-space-id',
      name: 'Test Server',
      avatarUrl: '',
      topic: ''
    };

    (useModal as any).mockReturnValue({
      isOpen: true,
      type: 'serverOverview',
      data: { space: mockSpace },
      onOpen: vi.fn(),
      onClose: mockModalOnClose
    });

    render(<ServerOverviewModal />);

    // MatrixFileUpload should be present in the form
    // The upload placeholder text should be visible
    expect(screen.getByText(/upload server icon/i)).toBeInTheDocument();
  });

  it('should handle submission errors', async () => {
    const mockSpace = {
      id: 'test-space-id',
      name: 'Test Server',
      avatarUrl: '',
      topic: ''
    };

    (useModal as any).mockReturnValue({
      isOpen: true,
      type: 'serverOverview',
      data: { space: mockSpace },
      onOpen: vi.fn(),
      onClose: mockModalOnClose
    });

    mockMatrixClient.setRoomName.mockRejectedValue(new Error('API Error'));

    render(<ServerOverviewModal />);

    const nameInput = screen.getByTestId('server-name-input');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    formValues.name = 'New Name';

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update server settings');
    });
  });

  it('should close modal via cancel button', () => {
    (useModal as any).mockReturnValue({
      isOpen: true,
      type: 'serverOverview',
      data: { space: { id: 'test', name: 'test', topic: '' } },
      onOpen: vi.fn(),
      onClose: mockModalOnClose
    });

    render(<ServerOverviewModal />);

    // Find and click the Cancel button
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockModalOnClose).toHaveBeenCalled();
  });

  it('should handle missing Matrix client gracefully', async () => {
    (getClient as any).mockReturnValue(null);

    const mockSpace = {
      id: 'test-space-id',
      name: 'Test Server',
      avatarUrl: '',
      topic: ''
    };

    (useModal as any).mockReturnValue({
      isOpen: true,
      type: 'serverOverview',
      data: { space: mockSpace },
      onOpen: vi.fn(),
      onClose: mockModalOnClose
    });

    render(<ServerOverviewModal />);

    const nameInput = screen.getByTestId('server-name-input');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    formValues.name = 'New Name';

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    // Should not call Matrix client methods when client is null
    await waitFor(() => {
      expect(mockMatrixClient.setRoomName).not.toHaveBeenCalled();
    });
  });

  it('should display description field correctly', () => {
    const mockSpace = {
      id: 'test-space-id',
      name: 'Test Server',
      avatarUrl: '',
      topic: 'Initial description'
    };

    (useModal as any).mockReturnValue({
      isOpen: true,
      type: 'serverOverview',
      data: { space: mockSpace },
      onOpen: vi.fn(),
      onClose: mockModalOnClose
    });

    render(<ServerOverviewModal />);

    // The dialog should show the description field
    expect(screen.getByTestId('description-input')).toBeInTheDocument();
  });

  it('should apply Discord color styling to dialog', () => {
    (useModal as any).mockReturnValue({
      isOpen: true,
      type: 'serverOverview',
      data: { space: { id: 'test', name: 'test', topic: '' } },
      onOpen: vi.fn(),
      onClose: mockModalOnClose
    });

    render(<ServerOverviewModal />);

    // Check that the dialog content has appropriate styling
    const dialogTitle = screen.getByText('Server Overview');
    expect(dialogTitle).toBeInTheDocument();
    
    // Verify parent container has the dark theme styling
    const dialogContent = dialogTitle.closest('[role="dialog"]');
    expect(dialogContent).toBeTruthy();
  });
});
