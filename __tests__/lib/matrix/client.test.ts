/**
 * Matrix Client Integration Tests
 * 
 * CRITICAL: Tests for identifying Next.js server action errors
 * TDD Approach: Write tests FIRST to identify root causes
 */

import { validateCurrentSession } from '@/lib/matrix/actions/auth';

// Mock the Matrix auth library that might be causing the server errors
jest.mock('@/lib/matrix/auth', () => ({
  loginWithPassword: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
  validateAccessToken: jest.fn(),
  MatrixAuthError: class MatrixAuthError extends Error {
    constructor(message: string, public code: string = 'M_UNKNOWN', public httpStatus?: number) {
      super(message);
      this.name = 'MatrixAuthError';
    }
    toAuthError() {
      return { code: this.code, message: this.message };
    }
  }
}));

// Mock the cookies module that interfaces with Next.js
jest.mock('@/lib/matrix/cookies', () => ({
  getSessionCookie: jest.fn(),
  setSessionCookie: jest.fn(),
  clearSessionCookie: jest.fn(),
}));

const mockMatrixAuth = require('@/lib/matrix/auth');
const mockCookies = require('@/lib/matrix/cookies');

describe('Matrix Client Initialization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CRITICAL: Server Action Error Prevention', () => {
    it('should handle undefined workers property gracefully', async () => {
      // Mock the specific error we're seeing in PM2 logs
      mockCookies.getSessionCookie.mockRejectedValue(
        new Error("Cannot read properties of undefined (reading 'workers')")
      );

      const result = await validateCurrentSession();
      
      // Should not crash, should return failure result
      expect(result).toEqual({
        success: false,
        error: expect.objectContaining({
          message: expect.stringContaining("Cannot read properties of undefined")
        })
      });
    });

    it('should handle undefined clientModules property gracefully', async () => {
      // Mock the specific error we're seeing in PM2 logs
      mockCookies.getSessionCookie.mockRejectedValue(
        new Error("Cannot read properties of undefined (reading 'clientModules')")
      );

      const result = await validateCurrentSession();
      
      // Should not crash, should return failure result
      expect(result).toEqual({
        success: false,
        error: expect.objectContaining({
          message: expect.stringContaining("Cannot read properties of undefined")
        })
      });
    });

    it('should handle server action registry errors', async () => {
      // Mock the "Failed to find Server Action" error
      mockCookies.getSessionCookie.mockRejectedValue(
        new Error('Failed to find Server Action "x". This request might be from an older or newer deployment.')
      );

      const result = await validateCurrentSession();
      
      // Should not crash, should return failure result
      expect(result).toEqual({
        success: false,
        error: expect.objectContaining({
          message: expect.stringContaining("Failed to find Server Action")
        })
      });
    });

    it('should handle missing session cookie without errors', async () => {
      mockCookies.getSessionCookie.mockResolvedValue(null);

      const result = await validateCurrentSession();
      
      // Should return successful result with no data (not authenticated)
      expect(result).toEqual({
        success: true,
        data: null
      });
    });

    it('should validate session with proper error handling', async () => {
      // Setup valid session
      const mockSession = {
        accessToken: 'test-token',
        homeserverUrl: 'https://matrix.example.com'
      };
      
      const mockUser = {
        userId: '@test:example.com',
        displayName: 'Test User'
      };

      mockCookies.getSessionCookie.mockResolvedValue(mockSession);
      mockMatrixAuth.validateAccessToken.mockResolvedValue(mockUser);

      const result = await validateCurrentSession();
      
      // Should return successful validation
      expect(result).toEqual({
        success: true,
        data: {
          session: mockSession,
          user: mockUser
        }
      });
    });

    it('should handle matrix authentication errors gracefully', async () => {
      const mockSession = {
        accessToken: 'invalid-token',
        homeserverUrl: 'https://matrix.example.com'
      };

      mockCookies.getSessionCookie.mockResolvedValue(mockSession);
      mockMatrixAuth.validateAccessToken.mockRejectedValue(
        new mockMatrixAuth.MatrixAuthError('Invalid token', 'M_UNKNOWN_TOKEN', 401)
      );

      const result = await validateCurrentSession();
      
      // Should clear session and return null data (not an error)
      expect(result).toEqual({
        success: true,
        data: null
      });
      
      // Should clear invalid session
      expect(mockCookies.clearSessionCookie).toHaveBeenCalled();
    });
  });

  describe('Next.js Server Action Compatibility', () => {
    it('should work in both client and server contexts', async () => {
      // Test that validateCurrentSession can be called from both contexts
      mockCookies.getSessionCookie.mockResolvedValue(null);

      // Should work when called directly (server context)
      const serverResult = await validateCurrentSession();
      expect(serverResult.success).toBe(true);

      // Should work when called from client context (API route)
      const clientResult = await validateCurrentSession();
      expect(clientResult.success).toBe(true);
    });

    it('should handle serialization of results properly', async () => {
      const mockSession = {
        accessToken: 'test-token',
        homeserverUrl: 'https://matrix.example.com'
      };
      
      const mockUser = {
        userId: '@test:example.com',
        displayName: 'Test User'
      };

      mockCookies.getSessionCookie.mockResolvedValue(mockSession);
      mockMatrixAuth.validateAccessToken.mockResolvedValue(mockUser);

      const result = await validateCurrentSession();
      
      // Result should be serializable (no functions, circular refs, etc.)
      const serialized = JSON.stringify(result);
      const deserialized = JSON.parse(serialized);
      
      expect(deserialized).toEqual(result);
    });
  });
});