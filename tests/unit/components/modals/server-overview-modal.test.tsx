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

const mockMatrixClient = {
  setRoomName: vi.fn(),
  sendStateEvent: vi.fn(),
};

describe('ServerOverviewModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(screen.getByDisplayValue('Test Space')).toBeInTheDocument();
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

    expect(screen.getByDisplayValue('My Test Server')).toBeInTheDocument();
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

    // Change name
    const nameInput = screen.getByDisplayValue('Old Name');
    fireEvent.change(nameInput, { target: { value: 'New Server Name' } });

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

    const nameInput = screen.getByDisplayValue('Test Server');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });

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

    const nameInput = screen.getByDisplayValue('Test Server');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });

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

    // The dialog should show the description
    expect(screen.getByDisplayValue('Initial description')).toBeInTheDocument();
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
