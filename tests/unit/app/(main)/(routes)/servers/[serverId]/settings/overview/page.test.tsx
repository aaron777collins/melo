import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import ServerOverviewPage from '@/app/(main)/(routes)/servers/[serverId]/settings/overview/page';
import { getClient } from '@/lib/matrix/client';
import { useSpaces } from '@/hooks/use-spaces';
import { mockRouterRefresh } from '../../../../../../../setup';

// Mock dependencies
vi.mock('sonner');
vi.mock('@/lib/matrix/client');
vi.mock('@/hooks/use-spaces');

const mockMatrixClient = {
  setRoomName: vi.fn(),
  sendStateEvent: vi.fn(),
};

const defaultMockUseSpaces = {
  spaces: [],
  isLoading: false,
  error: null,
  refetch: vi.fn(),
  allChannels: [],
  directMessages: []
};

describe('ServerOverviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getClient as any).mockReturnValue(mockMatrixClient);
    (useSpaces as any).mockReturnValue(defaultMockUseSpaces);
    (toast.success as any) = vi.fn();
    (toast.error as any) = vi.fn();
  });

  it('should show loading state when spaces are loading', () => {
    (useSpaces as any).mockReturnValue({
      ...defaultMockUseSpaces,
      isLoading: true
    });

    const props = {
      params: { serverId: 'test-space-id' }
    };

    render(<ServerOverviewPage {...props} />);

    // Should show loading spinner, not the page content
    expect(screen.queryByText('Server Overview')).not.toBeInTheDocument();
    // Loading state shows a spinner
    const loadingElement = document.querySelector('.animate-spin');
    expect(loadingElement).toBeInTheDocument();
  });

  it('should show not found message when space does not exist', () => {
    (useSpaces as any).mockReturnValue({
      ...defaultMockUseSpaces,
      spaces: [],
      isLoading: false
    });

    const props = {
      params: { serverId: 'non-existent-id' }
    };

    render(<ServerOverviewPage {...props} />);

    expect(screen.getByText(/Server not found/)).toBeInTheDocument();
  });

  it('should render server overview form when space exists', () => {
    const mockSpace = {
      id: 'test-space-id',
      name: 'My Test Server',
      avatarUrl: 'https://example.com/avatar.png',
      topic: 'Server description',
      memberCount: 25,
      channels: [],
      hasUnread: false
    };

    (useSpaces as any).mockReturnValue({
      ...defaultMockUseSpaces,
      spaces: [mockSpace],
      isLoading: false
    });

    const props = {
      params: { serverId: 'test-space-id' }
    };

    render(<ServerOverviewPage {...props} />);

    expect(screen.getByText('Server Overview')).toBeInTheDocument();
    expect(screen.getByText('Customize your server settings and appearance')).toBeInTheDocument();
  });

  it('should display server information in form', () => {
    const mockSpace = {
      id: 'test-space-id',
      name: 'Gaming Community',
      avatarUrl: 'mxc://matrix.org/avatar123',
      topic: 'A place for gamers',
      memberCount: 50,
      channels: [],
      hasUnread: false
    };

    (useSpaces as any).mockReturnValue({
      ...defaultMockUseSpaces,
      spaces: [mockSpace],
      isLoading: false
    });

    const props = {
      params: { serverId: 'test-space-id' }
    };

    render(<ServerOverviewPage {...props} />);

    expect(screen.getByDisplayValue('Gaming Community')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A place for gamers')).toBeInTheDocument();
  });

  it('should handle form submission with updated server name', async () => {
    const mockSpace = {
      id: 'test-space-id',
      name: 'Old Server Name',
      avatarUrl: '',
      topic: 'Old description',
      memberCount: 10,
      channels: [],
      hasUnread: false
    };

    (useSpaces as any).mockReturnValue({
      ...defaultMockUseSpaces,
      spaces: [mockSpace],
      isLoading: false
    });

    mockMatrixClient.setRoomName.mockResolvedValue({});
    mockMatrixClient.sendStateEvent.mockResolvedValue({});

    const props = {
      params: { serverId: 'test-space-id' }
    };

    render(<ServerOverviewPage {...props} />);

    // Update server name
    const nameInput = screen.getByDisplayValue('Old Server Name');
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
  });

  it('should handle form submission with updated description', async () => {
    const mockSpace = {
      id: 'test-space-id',
      name: 'Test Server',
      avatarUrl: '',
      topic: 'Old description',
      memberCount: 15,
      channels: [],
      hasUnread: false
    };

    (useSpaces as any).mockReturnValue({
      ...defaultMockUseSpaces,
      spaces: [mockSpace],
      isLoading: false
    });

    mockMatrixClient.sendStateEvent.mockResolvedValue({});

    const props = {
      params: { serverId: 'test-space-id' }
    };

    render(<ServerOverviewPage {...props} />);

    // Update description
    const descInput = screen.getByDisplayValue('Old description');
    fireEvent.change(descInput, { target: { value: 'New server description' } });

    // Submit form
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockMatrixClient.sendStateEvent).toHaveBeenCalledWith(
        'test-space-id',
        'm.room.topic',
        { topic: 'New server description' }
      );
    });
  });

  it('should show success message on successful update', async () => {
    const mockSpace = {
      id: 'test-space-id',
      name: 'Test Server',
      avatarUrl: '',
      topic: 'Test description',
      memberCount: 5,
      channels: [],
      hasUnread: false
    };

    (useSpaces as any).mockReturnValue({
      ...defaultMockUseSpaces,
      spaces: [mockSpace],
      isLoading: false
    });

    mockMatrixClient.setRoomName.mockResolvedValue({});

    const props = {
      params: { serverId: 'test-space-id' }
    };

    render(<ServerOverviewPage {...props} />);

    const nameInput = screen.getByDisplayValue('Test Server');
    fireEvent.change(nameInput, { target: { value: 'Updated Server' } });

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Server settings updated successfully');
    });
  });

  it('should show error message on failed update', async () => {
    const mockSpace = {
      id: 'test-space-id',
      name: 'Test Server',
      avatarUrl: '',
      topic: 'Test description',
      memberCount: 5,
      channels: [],
      hasUnread: false
    };

    (useSpaces as any).mockReturnValue({
      ...defaultMockUseSpaces,
      spaces: [mockSpace],
      isLoading: false
    });

    mockMatrixClient.setRoomName.mockRejectedValue(new Error('Update failed'));

    const props = {
      params: { serverId: 'test-space-id' }
    };

    render(<ServerOverviewPage {...props} />);

    const nameInput = screen.getByDisplayValue('Test Server');
    fireEvent.change(nameInput, { target: { value: 'Updated Server' } });

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update server settings');
    });
  });

  it('should apply Discord styling', () => {
    const mockSpace = {
      id: 'test-space-id',
      name: 'Test Server',
      avatarUrl: '',
      topic: 'Test',
      memberCount: 1,
      channels: [],
      hasUnread: false
    };

    (useSpaces as any).mockReturnValue({
      ...defaultMockUseSpaces,
      spaces: [mockSpace],
      isLoading: false
    });

    const props = {
      params: { serverId: 'test-space-id' }
    };

    render(<ServerOverviewPage {...props} />);

    // Check for Discord color classes
    const pageElement = screen.getByTestId('server-overview-page');
    expect(pageElement).toHaveClass('bg-[#36393f]');

    const cardElement = screen.getByTestId('server-overview-card');
    expect(cardElement).toHaveClass('bg-[#2B2D31]');
  });

  it('should handle avatar upload component visibility', () => {
    const mockSpace = {
      id: 'test-space-id',
      name: 'Test Server',
      avatarUrl: '',
      topic: 'Test',
      memberCount: 1,
      channels: [],
      hasUnread: false
    };

    (useSpaces as any).mockReturnValue({
      ...defaultMockUseSpaces,
      spaces: [mockSpace],
      isLoading: false
    });

    const props = {
      params: { serverId: 'test-space-id' }
    };

    render(<ServerOverviewPage {...props} />);

    // Test that MatrixFileUpload component is present
    expect(screen.getByText(/upload server icon/i)).toBeInTheDocument();
  });

  it('should display server statistics', () => {
    const mockSpace = {
      id: 'test-space-id',
      name: 'Test Server',
      avatarUrl: '',
      topic: 'Test',
      memberCount: 42,
      channels: [{ id: 'ch1' }, { id: 'ch2' }, { id: 'ch3' }],
      hasUnread: true
    };

    (useSpaces as any).mockReturnValue({
      ...defaultMockUseSpaces,
      spaces: [mockSpace],
      isLoading: false
    });

    const props = {
      params: { serverId: 'test-space-id' }
    };

    render(<ServerOverviewPage {...props} />);

    // Check statistics are displayed
    expect(screen.getByText('42')).toBeInTheDocument(); // Member count
    expect(screen.getByText('3')).toBeInTheDocument(); // Channel count
    expect(screen.getByText('Members')).toBeInTheDocument();
    expect(screen.getByText('Channels')).toBeInTheDocument();
  });
});
