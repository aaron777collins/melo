/**
 * MatrixAuthProvider Unit Tests
 * 
 * CRITICAL: Tests for fixing infinite render loop and server action errors
 * TDD Approach: Write tests FIRST to identify the exact issues
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MatrixAuthProvider, useMatrixAuth } from '@/components/providers/matrix-auth-provider';

// Mock the auth actions that are causing server action errors
jest.mock('@/lib/matrix/actions/auth', () => ({
  validateCurrentSession: jest.fn(),
  loginAction: jest.fn(),
  logoutAction: jest.fn(),
  registerAction: jest.fn(),
}));

// Mock the onboarding hook
jest.mock('@/hooks/use-onboarding', () => ({
  markUserAsNew: jest.fn(),
}));

const mockValidateCurrentSession = require('@/lib/matrix/actions/auth').validateCurrentSession;

// Test component to consume the auth context
function TestConsumer() {
  const { user, isLoading, error } = useMatrixAuth();
  
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="user">{user ? user.displayName : 'no-user'}</div>
      <div data-testid="error">{error || 'no-error'}</div>
    </div>
  );
}

describe('MatrixAuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Console spy to detect infinite renders
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('CRITICAL: Infinite Render Loop Prevention', () => {
    it('should not cause infinite renders when session validation succeeds', async () => {
      // Setup: Mock successful session validation
      mockValidateCurrentSession.mockResolvedValue({
        success: true,
        data: {
          user: { userId: '@test:example.com', displayName: 'Test User' },
          session: { accessToken: 'test-token', homeserverUrl: 'https://example.com' }
        }
      });

      // Render the component
      render(
        <MatrixAuthProvider>
          <TestConsumer />
        </MatrixAuthProvider>
      );

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      // Count render cycles by checking console logs
      const renderLogs = (console.log as jest.Mock).mock.calls.filter(
        call => call[0] && call[0].includes('[MatrixAuthProvider] 🎯 Component render')
      );

      // Should have maximum of 2 renders: initial + after validation
      expect(renderLogs.length).toBeLessThanOrEqual(2);
      
      // Should show user data
      expect(screen.getByTestId('user')).toHaveTextContent('Test User');
    });

    it('should not cause infinite renders when session validation fails', async () => {
      // Setup: Mock failed session validation
      mockValidateCurrentSession.mockResolvedValue({
        success: true,
        data: null
      });

      // Render the component
      render(
        <MatrixAuthProvider>
          <TestConsumer />
        </MatrixAuthProvider>
      );

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      // Count render cycles by checking console logs
      const renderLogs = (console.log as jest.Mock).mock.calls.filter(
        call => call[0] && call[0].includes('[MatrixAuthProvider] 🎯 Component render')
      );

      // Should have maximum of 2 renders: initial + after validation
      expect(renderLogs.length).toBeLessThanOrEqual(2);
      
      // Should show no user
      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
    });

    it('should handle session validation timeout without infinite loop', async () => {
      // Setup: Mock slow/hanging session validation
      mockValidateCurrentSession.mockImplementation(() => 
        new Promise((resolve) => {
          setTimeout(() => resolve({ success: true, data: null }), 15000);
        })
      );

      // Render the component
      render(
        <MatrixAuthProvider>
          <TestConsumer />
        </MatrixAuthProvider>
      );

      // Should timeout and complete loading within reasonable time
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      }, { timeout: 12000 });

      // Should handle timeout gracefully
      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
    });

    it('should handle server action errors without crashing', async () => {
      // Setup: Mock server action error (the "workers"/"clientModules" error)
      mockValidateCurrentSession.mockRejectedValue(
        new Error("Cannot read properties of undefined (reading 'workers')")
      );

      // Render the component
      render(
        <MatrixAuthProvider>
          <TestConsumer />
        </MatrixAuthProvider>
      );

      // Should recover from error and complete loading
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      // Should show no user but no error (graceful handling)
      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      expect(screen.getByTestId('error')).toHaveTextContent('no-error');
    });
  });

  describe('Stable Callback Dependencies', () => {
    it('should not recreate onAuthChange callback unnecessarily', async () => {
      const onAuthChange = jest.fn();
      
      mockValidateCurrentSession.mockResolvedValue({
        success: true,
        data: null
      });

      const { rerender } = render(
        <MatrixAuthProvider onAuthChange={onAuthChange}>
          <TestConsumer />
        </MatrixAuthProvider>
      );

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      // Re-render with same props
      rerender(
        <MatrixAuthProvider onAuthChange={onAuthChange}>
          <TestConsumer />
        </MatrixAuthProvider>
      );

      // onAuthChange should only be called once for the initial null result
      expect(onAuthChange).toHaveBeenCalledTimes(1);
      expect(onAuthChange).toHaveBeenCalledWith(null);
    });
  });

  describe('useEffect Dependency Stability', () => {
    it('should not trigger useEffect repeatedly with stable dependencies', async () => {
      mockValidateCurrentSession.mockResolvedValue({
        success: true,
        data: null
      });

      render(
        <MatrixAuthProvider>
          <TestConsumer />
        </MatrixAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      // validateCurrentSession should only be called once
      expect(mockValidateCurrentSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Boundary Behavior', () => {
    it('should handle auth action errors gracefully', async () => {
      // Mock the specific server action errors we're seeing
      mockValidateCurrentSession.mockRejectedValue(
        new Error("Cannot read properties of undefined (reading 'clientModules')")
      );

      render(
        <MatrixAuthProvider>
          <TestConsumer />
        </MatrixAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      // Should not crash the app
      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
    });
  });
});