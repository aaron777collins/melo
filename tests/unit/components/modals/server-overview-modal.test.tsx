import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ServerOverviewModal } from '@/components/modals/server-overview-modal';
import { useModal } from '@/hooks/use-modal-store';
import { getClient } from '@/lib/matrix/client';

// Mock dependencies
vi.mock('next/navigation');
vi.mock('sonner');
vi.mock('@/hooks/use-modal-store');
vi.mock('@/lib/matrix/client');

const mockRouter = {
  refresh: vi.fn(),
};

const mockMatrixClient = {
  setRoomName: vi.fn(),
  sendStateEvent: vi.fn(),
};

const mockModalStore = {
  isOpen: false,
  type: null,
  data: {},
  onClose: vi.fn(),
};

describe('ServerOverviewModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue(mockRouter);
    (getClient as any).mockReturnValue(mockMatrixClient);
    (useModal as any).mockReturnValue(mockModalStore);
    (toast.success as any).mockImplementation(() => {});
    (toast.error as any).mockImplementation(() => {});
  });

  it('should not render when modal is closed', () => {
    render(<ServerOverviewModal />);
    expect(screen.queryByText('Server Overview')).not.toBeInTheDocument();
  });

  it('should render when modal is open with serverOverview type', () => {
    (useModal as any).mockReturnValue({
      ...mockModalStore,
      isOpen: true,
      type: 'serverOverview',
      data: {
        space: {
          id: 'test-space-id',
          name: 'Test Space',
          avatarUrl: 'test-avatar-url'
        }
      }
    });

    render(<ServerOverviewModal />);
    expect(screen.getByText('Server Overview')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Space')).toBeInTheDocument();
  });

  it('should populate form with space data', () => {
    const mockSpace = {
      id: 'test-space-id',
      name: 'My Test Server',
      avatarUrl: 'https://example.com/avatar.png'
    };

    (useModal as any).mockReturnValue({
      ...mockModalStore,
      isOpen: true,
      type: 'serverOverview',
      data: { space: mockSpace }
    });

    render(<ServerOverviewModal />);

    expect(screen.getByDisplayValue('My Test Server')).toBeInTheDocument();
  });

  it('should handle form submission with name change', async () => {
    const mockSpace = {
      id: 'test-space-id',
      name: 'Old Name',
      avatarUrl: ''
    };

    (useModal as any).mockReturnValue({
      ...mockModalStore,
      isOpen: true,
      type: 'serverOverview',
      data: { space: mockSpace }
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

    expect(mockRouter.refresh).toHaveBeenCalled();
    expect(mockModalStore.onClose).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Server settings updated');
  });

  it('should handle avatar upload', async () => {
    const mockSpace = {
      id: 'test-space-id',
      name: 'Test Server',
      avatarUrl: ''
    };

    (useModal as any).mockReturnValue({
      ...mockModalStore,
      isOpen: true,
      type: 'serverOverview',
      data: { space: mockSpace }
    });

    mockMatrixClient.sendStateEvent.mockResolvedValue({});

    render(<ServerOverviewModal />);

    // Find MatrixFileUpload and simulate upload
    const fileUpload = screen.getByText(/upload server/i).closest('div');
    expect(fileUpload).toBeInTheDocument();
  });

  it('should handle submission errors', async () => {
    const mockSpace = {
      id: 'test-space-id',
      name: 'Test Server',
      avatarUrl: ''
    };

    (useModal as any).mockReturnValue({
      ...mockModalStore,
      isOpen: true,
      type: 'serverOverview',
      data: { space: mockSpace }
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

  it('should close modal when handleClose is called', () => {
    (useModal as any).mockReturnValue({
      ...mockModalStore,
      isOpen: true,
      type: 'serverOverview',
      data: { space: { id: 'test', name: 'test' } }
    });

    render(<ServerOverviewModal />);

    // Find and click close button (X button or overlay)
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockModalStore.onClose).toHaveBeenCalled();
  });

  it('should handle missing Matrix client gracefully', async () => {
    (getClient as any).mockReturnValue(null);

    const mockSpace = {
      id: 'test-space-id',
      name: 'Test Server',
      avatarUrl: ''
    };

    (useModal as any).mockReturnValue({
      ...mockModalStore,
      isOpen: true,
      type: 'serverOverview',
      data: { space: mockSpace }
    });

    render(<ServerOverviewModal />);

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    // Should not proceed with form submission
    expect(mockMatrixClient.setRoomName).not.toHaveBeenCalled();
  });

  it('should apply Discord color styling', () => {
    (useModal as any).mockReturnValue({
      ...mockModalStore,
      isOpen: true,
      type: 'serverOverview',
      data: { space: { id: 'test', name: 'test' } }
    });

    render(<ServerOverviewModal />);

    const dialogContent = screen.getByRole('dialog');
    expect(dialogContent).toHaveClass('bg-[#313338]', 'text-white');
  });
});