/**
 * Server Settings Page Tests
 * 
 * Unit tests for the /server-settings page following TDD approach.
 * These tests should FAIL initially (RED phase) until we implement the page.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/server-settings',
  useSearchParams: () => new URLSearchParams(),
}));

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
    getUserId: vi.fn(() => '@testuser:example.com'),
  })),
}));

// Mock use-spaces hook
vi.mock('@/hooks/use-spaces', () => ({
  useSpaces: () => ({
    spaces: [{
      id: '!testserver:example.com',
      name: 'Test Server',
      roomId: '!testserver:example.com',
      avatarUrl: null,
      memberCount: 10,
      joinRule: 'public',
    }],
    currentSpace: {
      id: '!testserver:example.com',
      name: 'Test Server',
      roomId: '!testserver:example.com',
      avatarUrl: null,
      memberCount: 10,
      joinRule: 'public',
    },
    isLoading: false,
    error: null,
  }),
}));

// Import after mocks
import ServerSettingsPage from '@/app/server-settings/page';
import * as serverSettings from '@/lib/matrix/server-settings';

describe('ServerSettingsPage', () => {
  const mockSettings = {
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
    
    vi.mocked(serverSettings.getServerSettings).mockResolvedValue(mockSettings);
    vi.mocked(serverSettings.checkServerSettingsPermissions).mockResolvedValue(mockPermissions);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Page Structure', () => {
    it('should render the page with correct heading', async () => {
      render(<ServerSettingsPage />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toHaveTextContent(/server settings/i);
      });
    });

    it('should render the server settings form', async () => {
      render(<ServerSettingsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('server-name-input')).toBeInTheDocument();
        expect(screen.getByTestId('server-description-textarea')).toBeInTheDocument();
        expect(screen.getByTestId('server-avatar-section')).toBeInTheDocument();
      });
    });

    it('should display the main content area', async () => {
      render(<ServerSettingsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('main-content')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator while fetching settings', async () => {
      // Make the fetch slow
      vi.mocked(serverSettings.getServerSettings).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockSettings), 1000))
      );

      render(<ServerSettingsPage />);

      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error state when settings fetch fails', async () => {
      vi.mocked(serverSettings.getServerSettings).mockRejectedValue(
        new Error('Failed to fetch settings')
      );

      render(<ServerSettingsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeInTheDocument();
      });
    });

    it('should show message when no server is selected', async () => {
      vi.mock('@/hooks/use-spaces', () => ({
        useSpaces: () => ({
          spaces: [],
          currentSpace: null,
          isLoading: false,
          error: null,
        }),
      }));

      render(<ServerSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText(/no server selected/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', async () => {
      render(<ServerSettingsPage />);

      await waitFor(() => {
        const nameInput = screen.getByTestId('server-name-input');
        expect(nameInput).toHaveAccessibleName();
        
        const descriptionTextarea = screen.getByTestId('server-description-textarea');
        expect(descriptionTextarea).toHaveAccessibleName();
      });
    });

    it('should have proper heading hierarchy', async () => {
      render(<ServerSettingsPage />);

      await waitFor(() => {
        const h1 = screen.getByRole('heading', { level: 1 });
        expect(h1).toBeInTheDocument();
      });
    });
  });

  describe('Responsiveness', () => {
    it('should render form elements at mobile width', async () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      window.dispatchEvent(new Event('resize'));

      render(<ServerSettingsPage />);

      await waitFor(() => {
        const nameInput = screen.getByTestId('server-name-input');
        expect(nameInput).toBeVisible();
        
        const descriptionTextarea = screen.getByTestId('server-description-textarea');
        expect(descriptionTextarea).toBeVisible();
      });
    });
  });
});
