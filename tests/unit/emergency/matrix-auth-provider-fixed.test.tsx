/**
 * EMERGENCY FIX VALIDATION TESTS
 * 
 * These tests verify that the emergency fixes for MatrixAuthProvider work correctly:
 * 1. Circuit breaker prevents infinite loops
 * 2. Defensive coding handles undefined properties
 * 3. Server action failures are handled gracefully
 * 4. Build vs Runtime disconnect is handled
 * 
 * TDD Approach: GREEN phase - verifying fixes work
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// Import the fixed provider
import { MatrixAuthProvider, useMatrixAuth } from '../../../components/providers/matrix-auth-provider-fixed';

// Mock Matrix SDK to avoid external dependencies
vi.mock('matrix-js-sdk', () => ({
  createClient: vi.fn(() => ({
    startClient: vi.fn(),
    stopClient: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    getUser: vi.fn(),
    getUserId: vi.fn(),
  })),
}));

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    pathname: '/',
  })),
}));

// Mock the auth actions
vi.mock('@/lib/matrix/actions/auth', () => ({
  validateCurrentSession: vi.fn(),
  loginAction: vi.fn(),
  logoutAction: vi.fn(),
  registerAction: vi.fn(),
}));

// Mock onboarding hook
vi.mock('@/hooks/use-onboarding', () => ({
  markUserAsNew: vi.fn(),
}));

import { validateCurrentSession, loginAction } from '@/lib/matrix/actions/auth';

describe('EMERGENCY FIX: MatrixAuthProvider Circuit Breaker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Circuit Breaker Pattern', () => {
    test('should prevent infinite loops with circuit breaker', async () => {
      // Mock validateCurrentSession to always fail
      const mockValidateCurrentSession = validateCurrentSession as any;
      mockValidateCurrentSession.mockRejectedValue(
        new Error('Failed to find Server Action "validateCurrentSession"')
      );

      // Track how many times validation is attempted
      let validationAttempts = 0;
      mockValidateCurrentSession.mockImplementation(() => {
        validationAttempts++;
        return Promise.reject(new Error('Failed to find Server Action "validateCurrentSession"'));
      });

      // Test component that uses auth
      function TestComponent() {
        const { isLoading, error, user } = useMatrixAuth();
        return (
          <div>
            <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
            <div data-testid="error">{error || 'no-error'}</div>
            <div data-testid="user">{user ? 'has-user' : 'no-user'}</div>
          </div>
        );
      }

      vi.useFakeTimers();

      render(
        <MatrixAuthProvider>
          <TestComponent />
        </MatrixAuthProvider>
      );

      // Wait for initial validation attempt
      act(() => {
        vi.advanceTimersByTime(200); // Initial delay + validation
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      // Circuit breaker should prevent excessive retry attempts
      // Should be much less than what would cause infinite loop
      expect(validationAttempts).toBeLessThan(5);
      expect(validationAttempts).toBeGreaterThan(0);

      vi.useRealTimers();
    });

    test('should eventually stop attempting validation when circuit breaker opens', async () => {
      const mockValidateCurrentSession = validateCurrentSession as any;
      let attemptCount = 0;

      // Mock to fail first 3 times, then succeed
      mockValidateCurrentSession.mockImplementation(() => {
        attemptCount++;
        if (attemptCount <= 3) {
          return Promise.reject(new Error('Server action failed'));
        }
        return Promise.resolve({ success: true, data: null });
      });

      function TestComponent() {
        const { isLoading, error, refreshSession } = useMatrixAuth();
        
        React.useEffect(() => {
          // Try to trigger additional validation attempts
          const interval = setInterval(() => {
            refreshSession();
          }, 1000);
          
          return () => clearInterval(interval);
        }, [refreshSession]);

        return (
          <div>
            <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
            <div data-testid="error">{error || 'no-error'}</div>
          </div>
        );
      }

      vi.useFakeTimers();

      render(
        <MatrixAuthProvider>
          <TestComponent />
        </MatrixAuthProvider>
      );

      // Fast forward through multiple attempts
      act(() => {
        vi.advanceTimersByTime(10000); // 10 seconds
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      // Circuit breaker should limit attempts even with refreshSession calls
      expect(attemptCount).toBeLessThan(10);

      vi.useRealTimers();
    });
  });

  describe('Defensive Error Handling', () => {
    test('should handle "Failed to find Server Action" errors gracefully', async () => {
      const mockValidateCurrentSession = validateCurrentSession as any;
      mockValidateCurrentSession.mockRejectedValue(
        new Error('Failed to find Server Action "validateCurrentSession"')
      );

      function TestComponent() {
        const { isLoading, error, user } = useMatrixAuth();
        return (
          <div>
            <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
            <div data-testid="error">{error || 'no-error'}</div>
            <div data-testid="user">{user ? 'has-user' : 'no-user'}</div>
          </div>
        );
      }

      vi.useFakeTimers();

      render(
        <MatrixAuthProvider>
          <TestComponent />
        </MatrixAuthProvider>
      );

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      // Should gracefully handle the error without crashing
      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      
      vi.useRealTimers();
    });

    test('should handle "clientModules" undefined errors gracefully', async () => {
      const mockValidateCurrentSession = validateCurrentSession as any;
      mockValidateCurrentSession.mockRejectedValue(
        new Error('Cannot read properties of undefined (reading "clientModules")')
      );

      function TestComponent() {
        const { isLoading, error, user } = useMatrixAuth();
        return (
          <div>
            <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
            <div data-testid="error">{error || 'no-error'}</div>
            <div data-testid="user">{user ? 'has-user' : 'no-user'}</div>
          </div>
        );
      }

      vi.useFakeTimers();

      render(
        <MatrixAuthProvider>
          <TestComponent />
        </MatrixAuthProvider>
      );

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      // Should proceed with degraded authentication
      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      
      vi.useRealTimers();
    });

    test('should handle "workers" undefined errors gracefully', async () => {
      const mockValidateCurrentSession = validateCurrentSession as any;
      mockValidateCurrentSession.mockRejectedValue(
        new Error('Cannot read properties of undefined (reading "workers")')
      );

      function TestComponent() {
        const { isLoading, user } = useMatrixAuth();
        return (
          <div>
            <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
            <div data-testid="user">{user ? 'has-user' : 'no-user'}</div>
          </div>
        );
      }

      vi.useFakeTimers();

      render(
        <MatrixAuthProvider>
          <TestComponent />
        </MatrixAuthProvider>
      );

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      // Should proceed without session but not crash
      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      
      vi.useRealTimers();
    });
  });

  describe('Timeout Prevention', () => {
    test('should timeout session validation after 10 seconds', async () => {
      const mockValidateCurrentSession = validateCurrentSession as any;
      
      // Mock a hanging promise that never resolves
      mockValidateCurrentSession.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      function TestComponent() {
        const { isLoading } = useMatrixAuth();
        return <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>;
      }

      vi.useFakeTimers();

      render(
        <MatrixAuthProvider>
          <TestComponent />
        </MatrixAuthProvider>
      );

      // Should still be loading initially
      expect(screen.getByTestId('loading')).toHaveTextContent('loading');

      // Fast forward past timeout
      act(() => {
        vi.advanceTimersByTime(15000); // 15 seconds (past 10s timeout)
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      vi.useRealTimers();
    });
  });

  describe('Successful Session Validation', () => {
    test('should handle successful session validation correctly', async () => {
      const mockValidateCurrentSession = validateCurrentSession as any;
      const mockUser = { 
        userId: '@test:matrix.org',
        displayName: 'Test User'
      };
      const mockSession = {
        accessToken: 'test-token',
        homeserverUrl: 'https://matrix.org'
      };

      mockValidateCurrentSession.mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          session: mockSession
        }
      });

      function TestComponent() {
        const { isLoading, user, error } = useMatrixAuth();
        return (
          <div>
            <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
            <div data-testid="user">{user ? user.displayName : 'no-user'}</div>
            <div data-testid="error">{error || 'no-error'}</div>
          </div>
        );
      }

      vi.useFakeTimers();

      render(
        <MatrixAuthProvider>
          <TestComponent />
        </MatrixAuthProvider>
      );

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('Test User');
      expect(screen.getByTestId('error')).toHaveTextContent('no-error');

      vi.useRealTimers();
    });

    test('should handle no session (logged out state) correctly', async () => {
      const mockValidateCurrentSession = validateCurrentSession as any;
      mockValidateCurrentSession.mockResolvedValue({
        success: true,
        data: null // No session
      });

      function TestComponent() {
        const { isLoading, user, error } = useMatrixAuth();
        return (
          <div>
            <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
            <div data-testid="user">{user ? 'has-user' : 'no-user'}</div>
            <div data-testid="error">{error || 'no-error'}</div>
          </div>
        );
      }

      vi.useFakeTimers();

      render(
        <MatrixAuthProvider>
          <TestComponent />
        </MatrixAuthProvider>
      );

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      expect(screen.getByTestId('error')).toHaveTextContent('no-error');

      vi.useRealTimers();
    });
  });

  describe('Enhanced Login with Fallbacks', () => {
    test('should handle login with defensive API handling', async () => {
      // Mock fetch to return successful login
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: {
            user: { userId: '@test:matrix.org', displayName: 'Test' },
            session: { accessToken: 'token', homeserverUrl: 'https://matrix.org' }
          }
        })
      }) as any;

      const mockValidateCurrentSession = validateCurrentSession as any;
      mockValidateCurrentSession.mockResolvedValue({
        success: true,
        data: null
      });

      function TestComponent() {
        const { login, isLoading, user, error } = useMatrixAuth();
        const [loginResult, setLoginResult] = React.useState<string>('not-attempted');

        const handleLogin = async () => {
          const result = await login('test', 'password');
          setLoginResult(result === true ? 'success' : String(result));
        };

        return (
          <div>
            <button onClick={handleLogin} data-testid="login-btn">Login</button>
            <div data-testid="login-result">{loginResult}</div>
            <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
            <div data-testid="user">{user ? user.displayName : 'no-user'}</div>
            <div data-testid="error">{error || 'no-error'}</div>
          </div>
        );
      }

      vi.useFakeTimers();

      render(
        <MatrixAuthProvider>
          <TestComponent />
        </MatrixAuthProvider>
      );

      // Wait for initial loading to complete
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      // Trigger login
      const loginBtn = screen.getByTestId('login-btn');
      act(() => {
        loginBtn.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('login-result')).toHaveTextContent('success');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('Test');

      vi.useRealTimers();
    });
  });
});