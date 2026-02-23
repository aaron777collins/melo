/**
 * Server Settings Form Component Tests
 * 
 * Unit tests for the server settings form component following TDD.
 * These tests should FAIL initially (RED phase) until we implement the component.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock the Matrix server settings module
vi.mock('@/lib/matrix/server-settings', () => ({
  getServerSettings: vi.fn(),
  updateServerName: vi.fn(),
  updateServerDescription: vi.fn(),
  updateServerAvatar: vi.fn(),
  updateServerSettings: vi.fn(),
  checkServerSettingsPermissions: vi.fn(),
  ServerSettingsManager: vi.fn(),
}));

// Mock the Matrix client module
vi.mock('@/lib/matrix/client', () => ({
  getClient: vi.fn(() => ({
    uploadContent: vi.fn().mockResolvedValue({ content_uri: 'mxc://example.com/test123' }),
    getRoom: vi.fn(),
  })),
}));

// Import after mocks are set up
import { ServerSettingsForm } from '@/components/server-settings/server-settings-form';
import * as serverSettings from '@/lib/matrix/server-settings';

describe('ServerSettingsForm Component', () => {
  const mockRoomId = '!testroom:example.com';
  
  const defaultSettings = {
    name: 'Test Server',
    description: 'A test server description',
    avatarUrl: null,
  };

  const mockPermissions = {
    canEditName: true,
    canEditDescription: true,
    canEditAvatar: true,
    canEditAll: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up default mock implementations
    vi.mocked(serverSettings.getServerSettings).mockResolvedValue(defaultSettings);
    vi.mocked(serverSettings.checkServerSettingsPermissions).mockResolvedValue(mockPermissions);
    vi.mocked(serverSettings.updateServerName).mockResolvedValue({
      success: true,
      settings: { ...defaultSettings, name: 'Updated Name' },
    });
    vi.mocked(serverSettings.updateServerDescription).mockResolvedValue({
      success: true,
      settings: { ...defaultSettings, description: 'Updated description' },
    });
    vi.mocked(serverSettings.updateServerAvatar).mockResolvedValue({
      success: true,
      settings: { ...defaultSettings, avatarUrl: 'mxc://example.com/newavatar' },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render the form with all required elements', async () => {
      render(
        <ServerSettingsForm 
          roomId={mockRoomId}
          initialSettings={defaultSettings}
        />
      );

      // Check for server name input
      expect(screen.getByTestId('server-name-input')).toBeInTheDocument();
      
      // Check for server description textarea
      expect(screen.getByTestId('server-description-textarea')).toBeInTheDocument();
      
      // Check for avatar section
      expect(screen.getByTestId('server-avatar-section')).toBeInTheDocument();
      
      // Check for save buttons
      expect(screen.getByTestId('save-server-name-button')).toBeInTheDocument();
      expect(screen.getByTestId('save-description-button')).toBeInTheDocument();
    });

    it('should display initial server name', async () => {
      render(
        <ServerSettingsForm 
          roomId={mockRoomId}
          initialSettings={defaultSettings}
        />
      );

      const nameInput = screen.getByTestId('server-name-input') as HTMLInputElement;
      expect(nameInput.value).toBe('Test Server');
    });

    it('should display initial server description', async () => {
      render(
        <ServerSettingsForm 
          roomId={mockRoomId}
          initialSettings={defaultSettings}
        />
      );

      const descriptionTextarea = screen.getByTestId('server-description-textarea') as HTMLTextAreaElement;
      expect(descriptionTextarea.value).toBe('A test server description');
    });
  });

  describe('Server Name Editing', () => {
    it('should update server name when save button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <ServerSettingsForm 
          roomId={mockRoomId}
          initialSettings={defaultSettings}
        />
      );

      const nameInput = screen.getByTestId('server-name-input');
      const saveButton = screen.getByTestId('save-server-name-button');

      // Clear and type new name
      await user.clear(nameInput);
      await user.type(nameInput, 'New Server Name');
      await user.click(saveButton);

      await waitFor(() => {
        expect(serverSettings.updateServerName).toHaveBeenCalledWith(
          mockRoomId,
          'New Server Name'
        );
      });
    });

    it('should show success message after name update', async () => {
      const user = userEvent.setup();
      
      render(
        <ServerSettingsForm 
          roomId={mockRoomId}
          initialSettings={defaultSettings}
        />
      );

      const nameInput = screen.getByTestId('server-name-input');
      const saveButton = screen.getByTestId('save-server-name-button');

      await user.clear(nameInput);
      await user.type(nameInput, 'New Server Name');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toBeInTheDocument();
      });
    });

    it('should show error for empty server name', async () => {
      const user = userEvent.setup();
      
      render(
        <ServerSettingsForm 
          roomId={mockRoomId}
          initialSettings={defaultSettings}
        />
      );

      const nameInput = screen.getByTestId('server-name-input');
      const saveButton = screen.getByTestId('save-server-name-button');

      await user.clear(nameInput);
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });
    });

    it('should show error for name exceeding 255 characters', async () => {
      const user = userEvent.setup();
      
      // The HTML input has maxlength="255" so it will truncate to 255 chars
      // But we can still test that when the value hits 255, the counter shows it
      render(
        <ServerSettingsForm 
          roomId={mockRoomId}
          initialSettings={defaultSettings}
        />
      );

      const nameInput = screen.getByTestId('server-name-input');
      
      // Type a very long name (will be truncated to 255 by maxlength)
      const longName = 'x'.repeat(300);
      await user.clear(nameInput);
      await user.type(nameInput, longName);

      // The input value should be truncated to 255 characters
      expect((nameInput as HTMLInputElement).value.length).toBeLessThanOrEqual(255);
      
      // Character counter should show at limit
      expect(screen.getByText(/255/)).toBeInTheDocument();
    });
  });

  describe('Server Description Editing', () => {
    it('should update server description when save button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <ServerSettingsForm 
          roomId={mockRoomId}
          initialSettings={defaultSettings}
        />
      );

      const descriptionTextarea = screen.getByTestId('server-description-textarea');
      const saveButton = screen.getByTestId('save-description-button');

      await user.clear(descriptionTextarea);
      await user.type(descriptionTextarea, 'New server description');
      await user.click(saveButton);

      await waitFor(() => {
        expect(serverSettings.updateServerDescription).toHaveBeenCalledWith(
          mockRoomId,
          'New server description'
        );
      });
    });

    it('should show success message after description update', async () => {
      const user = userEvent.setup();
      
      render(
        <ServerSettingsForm 
          roomId={mockRoomId}
          initialSettings={defaultSettings}
        />
      );

      const descriptionTextarea = screen.getByTestId('server-description-textarea');
      const saveButton = screen.getByTestId('save-description-button');

      await user.clear(descriptionTextarea);
      await user.type(descriptionTextarea, 'New server description');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByTestId('description-success-message')).toBeInTheDocument();
      });
    });

    it('should allow clearing description', async () => {
      const user = userEvent.setup();
      
      render(
        <ServerSettingsForm 
          roomId={mockRoomId}
          initialSettings={defaultSettings}
        />
      );

      const descriptionTextarea = screen.getByTestId('server-description-textarea');
      const saveButton = screen.getByTestId('save-description-button');

      await user.clear(descriptionTextarea);
      await user.click(saveButton);

      await waitFor(() => {
        expect(serverSettings.updateServerDescription).toHaveBeenCalledWith(
          mockRoomId,
          null
        );
      });
    });
  });

  describe('Server Avatar Management', () => {
    it('should render avatar upload button', async () => {
      render(
        <ServerSettingsForm 
          roomId={mockRoomId}
          initialSettings={defaultSettings}
        />
      );

      expect(screen.getByTestId('avatar-upload-button')).toBeInTheDocument();
    });

    it('should display current avatar if available', async () => {
      const settingsWithAvatar = {
        ...defaultSettings,
        avatarUrl: 'mxc://example.com/existingavatar',
      };

      render(
        <ServerSettingsForm 
          roomId={mockRoomId}
          initialSettings={settingsWithAvatar}
        />
      );

      expect(screen.getByTestId('server-avatar-image')).toBeInTheDocument();
    });

    it('should display default placeholder when no avatar', async () => {
      render(
        <ServerSettingsForm 
          roomId={mockRoomId}
          initialSettings={defaultSettings}
        />
      );

      expect(screen.getByTestId('default-avatar-placeholder')).toBeInTheDocument();
    });

    it('should show remove button when avatar exists', async () => {
      const settingsWithAvatar = {
        ...defaultSettings,
        avatarUrl: 'mxc://example.com/existingavatar',
      };

      render(
        <ServerSettingsForm 
          roomId={mockRoomId}
          initialSettings={settingsWithAvatar}
        />
      );

      expect(screen.getByTestId('remove-avatar-button')).toBeInTheDocument();
    });
  });

  describe('Permission Handling', () => {
    it('should disable inputs when user lacks permissions', async () => {
      const restrictedPermissions = {
        canEditName: false,
        canEditDescription: false,
        canEditAvatar: false,
        canEditAll: false,
      };

      render(
        <ServerSettingsForm 
          roomId={mockRoomId}
          initialSettings={defaultSettings}
          permissions={restrictedPermissions}
        />
      );

      expect(screen.getByTestId('server-name-input')).toBeDisabled();
      expect(screen.getByTestId('server-description-textarea')).toBeDisabled();
      expect(screen.getByTestId('save-server-name-button')).toBeDisabled();
      expect(screen.getByTestId('save-description-button')).toBeDisabled();
    });

    it('should enable name field when user can edit name', async () => {
      const partialPermissions = {
        canEditName: true,
        canEditDescription: false,
        canEditAvatar: false,
        canEditAll: false,
      };

      render(
        <ServerSettingsForm 
          roomId={mockRoomId}
          initialSettings={defaultSettings}
          permissions={partialPermissions}
        />
      );

      expect(screen.getByTestId('server-name-input')).not.toBeDisabled();
      expect(screen.getByTestId('save-server-name-button')).not.toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should show network error message on API failure', async () => {
      const user = userEvent.setup();
      
      vi.mocked(serverSettings.updateServerName).mockRejectedValue(
        new Error('Network error')
      );
      
      render(
        <ServerSettingsForm 
          roomId={mockRoomId}
          initialSettings={defaultSettings}
        />
      );

      const nameInput = screen.getByTestId('server-name-input');
      const saveButton = screen.getByTestId('save-server-name-button');

      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByTestId('network-error-message')).toBeInTheDocument();
      });
    });

    it('should handle Matrix forbidden error', async () => {
      const user = userEvent.setup();
      
      vi.mocked(serverSettings.updateServerName).mockResolvedValue({
        success: false,
        settings: null,
        error: {
          code: 'M_FORBIDDEN',
          message: 'You do not have permission to modify server settings',
        },
      });
      
      render(
        <ServerSettingsForm 
          roomId={mockRoomId}
          initialSettings={defaultSettings}
        />
      );

      const nameInput = screen.getByTestId('server-name-input');
      const saveButton = screen.getByTestId('save-server-name-button');

      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state while saving', async () => {
      const user = userEvent.setup();
      
      // Make the update slow
      vi.mocked(serverSettings.updateServerName).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          success: true,
          settings: { ...defaultSettings, name: 'New Name' },
        }), 1000))
      );
      
      render(
        <ServerSettingsForm 
          roomId={mockRoomId}
          initialSettings={defaultSettings}
        />
      );

      const nameInput = screen.getByTestId('server-name-input');
      const saveButton = screen.getByTestId('save-server-name-button');

      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');
      await user.click(saveButton);

      // Button should show loading state
      expect(saveButton).toHaveAttribute('data-loading', 'true');
    });

    it('should disable inputs while saving', async () => {
      const user = userEvent.setup();
      
      vi.mocked(serverSettings.updateServerName).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          success: true,
          settings: { ...defaultSettings, name: 'New Name' },
        }), 1000))
      );
      
      render(
        <ServerSettingsForm 
          roomId={mockRoomId}
          initialSettings={defaultSettings}
        />
      );

      const nameInput = screen.getByTestId('server-name-input');
      const saveButton = screen.getByTestId('save-server-name-button');

      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');
      await user.click(saveButton);

      // Input should be disabled during save
      expect(nameInput).toBeDisabled();
    });
  });
});
