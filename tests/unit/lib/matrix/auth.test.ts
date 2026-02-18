import { describe, it, expect, beforeEach, vi, MockedFunction } from 'vitest'
import {
  MatrixAuthError,
  loginWithPassword,
  validateSession,
  logout,
  discoverHomeserver,
  checkUsernameAvailable,
} from '../../../../lib/matrix/auth'
import type {
  MatrixSession,
  AuthError,
  LoginOptions,
} from '../../../../lib/matrix/types/auth'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch as any

// Mock crypto.randomUUID for UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid-1234'),
  },
  writable: true,
  configurable: true,
})

describe('auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockClear()
    
    // Mock environment variables
    process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL = 'https://matrix.example.com'
  })

  describe('MatrixAuthError', () => {
    it('should create error with proper properties', () => {
      const authError: AuthError = {
        code: 'M_FORBIDDEN',
        message: 'Invalid credentials',
        httpStatus: 403,
        details: { retry_after_ms: 5000 }
      }
      
      const error = new MatrixAuthError(authError)
      
      expect(error.name).toBe('MatrixAuthError')
      expect(error.message).toBe('Invalid credentials')
      expect(error.code).toBe('M_FORBIDDEN')
      expect(error.httpStatus).toBe(403)
      expect(error.details).toEqual({ retry_after_ms: 5000 })
    })

    it('should handle minimal error info', () => {
      const authError: AuthError = {
        code: 'M_UNKNOWN',
        message: 'Unknown error'
      }
      
      const error = new MatrixAuthError(authError)
      
      expect(error.code).toBe('M_UNKNOWN')
      expect(error.message).toBe('Unknown error')
      expect(error.httpStatus).toBeUndefined()
      expect(error.details).toBeUndefined()
    })
  })

  describe('loginWithPassword', () => {
    const mockLoginResponse = {
      user_id: '@alice:matrix.example.com',
      access_token: 'access_token_123',
      device_id: 'DEVICE123',
      home_server: 'matrix.example.com',
      well_known: {
        'm.homeserver': { base_url: 'https://matrix.example.com' }
      }
    }

    it('should successfully login with username and password', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockLoginResponse)
      })

      const session = await loginWithPassword('alice', 'password123')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://matrix.example.com/_matrix/client/v3/login',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'm.login.password',
            identifier: { type: 'm.id.user', user: 'alice' },
            password: 'password123'
          })
        })
      )

      expect(session).toEqual({
        sessionId: 'mock-uuid-1234',
        userId: '@alice:matrix.example.com',
        accessToken: 'access_token_123',
        deviceId: 'DEVICE123',
        homeserverUrl: 'https://matrix.example.com',
        createdAt: expect.any(String),
        lastActiveAt: expect.any(String),
        isValid: true
      })
    })

    it('should handle Matrix ID format usernames', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockLoginResponse)
      })

      await loginWithPassword('@alice:matrix.org', 'password123')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            type: 'm.login.password',
            identifier: { type: 'm.id.user', user: '@alice:matrix.org' },
            password: 'password123'
          })
        })
      )
    })

    it('should include optional device information', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockLoginResponse)
      })

      const options: LoginOptions = {
        deviceDisplayName: 'My Device',
        deviceId: 'MYDEVICE123'
      }

      await loginWithPassword('alice', 'password123', options)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            type: 'm.login.password',
            identifier: { type: 'm.id.user', user: 'alice' },
            password: 'password123',
            initial_device_display_name: 'My Device',
            device_id: 'MYDEVICE123'
          })
        })
      )
    })

    it('should use custom homeserver URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockLoginResponse)
      })

      const options: LoginOptions = {
        homeserverUrl: 'https://custom.matrix.org'
      }

      await loginWithPassword('alice', 'password123', options)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom.matrix.org/_matrix/client/v3/login',
        expect.any(Object)
      )
    })

    it('should throw MatrixAuthError on invalid credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: vi.fn().mockResolvedValue({
          errcode: 'M_FORBIDDEN',
          error: 'Invalid username or password'
        })
      })

      await expect(
        loginWithPassword('alice', 'wrongpassword')
      ).rejects.toThrow(MatrixAuthError)
    })

    it('should throw MatrixAuthError on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(
        loginWithPassword('alice', 'password123')
      ).rejects.toThrow(MatrixAuthError)
    })

    it('should handle homeserver rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: vi.fn().mockResolvedValue({
          errcode: 'M_LIMIT_EXCEEDED',
          error: 'Too many requests',
          retry_after_ms: 5000
        })
      })

      await expect(
        loginWithPassword('alice', 'password123')
      ).rejects.toThrow(MatrixAuthError)
    })
  })

  describe('validateSession', () => {
    const mockSession: MatrixSession = {
      sessionId: 'session-123',
      userId: '@alice:matrix.example.com',
      accessToken: 'access_token_123',
      deviceId: 'DEVICE123',
      homeserverUrl: 'https://matrix.example.com',
      createdAt: '2023-01-01T00:00:00.000Z',
      lastActiveAt: '2023-01-01T00:00:00.000Z',
      isValid: true
    }

    it('should validate active session successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          user_id: '@alice:matrix.example.com'
        })
      })

      const result = await validateSession(mockSession)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://matrix.example.com/_matrix/client/v3/account/whoami',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Authorization': 'Bearer access_token_123',
            'Content-Type': 'application/json'
          }
        })
      )

      expect(result.isValid).toBe(true)
      expect(result.userId).toBe('@alice:matrix.example.com')
      expect(result.lastActiveAt).not.toBe(mockSession.lastActiveAt)
    })

    it('should invalidate session with expired token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({
          errcode: 'M_UNKNOWN_TOKEN',
          error: 'Unrecognised access token'
        })
      })

      const result = await validateSession(mockSession)

      expect(result.isValid).toBe(false)
    })

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await validateSession(mockSession)

      expect(result.isValid).toBe(false)
    })

    it('should handle server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({
          errcode: 'M_UNKNOWN',
          error: 'Internal server error'
        })
      })

      const result = await validateSession(mockSession)

      expect(result.isValid).toBe(false)
    })
  })

  describe('logout', () => {
    const mockSession: MatrixSession = {
      sessionId: 'session-123',
      userId: '@alice:matrix.example.com',
      accessToken: 'access_token_123',
      deviceId: 'DEVICE123',
      homeserverUrl: 'https://matrix.example.com',
      createdAt: '2023-01-01T00:00:00.000Z',
      lastActiveAt: '2023-01-01T00:00:00.000Z',
      isValid: true
    }

    it('should logout successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({})
      })

      await logout(mockSession)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://matrix.example.com/_matrix/client/v3/logout',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer access_token_123',
            'Content-Type': 'application/json'
          }
        })
      )
    })

    it('should logout all devices when specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({})
      })

      await logout(mockSession, true)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://matrix.example.com/_matrix/client/v3/logout/all',
        expect.any(Object)
      )
    })

    it('should handle logout errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({
          errcode: 'M_UNKNOWN_TOKEN',
          error: 'Unknown token'
        })
      })

      // Should not throw error even if logout fails
      await expect(logout(mockSession)).resolves.toBeUndefined()
    })

    it('should handle network errors during logout', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // Should not throw error even on network failure
      await expect(logout(mockSession)).resolves.toBeUndefined()
    })
  })

  describe('discoverHomeserver', () => {
    it('should discover homeserver from well-known', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          'm.homeserver': {
            'base_url': 'https://matrix.example.com'
          }
        })
      })

      const result = await discoverHomeserver('example.com')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/.well-known/matrix/client',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      )

      expect(result).toBe('https://matrix.example.com')
    })

    it('should fall back to https://domain when well-known fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      const result = await discoverHomeserver('example.com')

      expect(result).toBe('https://example.com')
    })

    it('should handle malformed well-known response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          // Missing required homeserver info
        })
      })

      const result = await discoverHomeserver('example.com')

      expect(result).toBe('https://example.com')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await discoverHomeserver('example.com')

      expect(result).toBe('https://example.com')
    })

    it('should normalize domain input', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      const result = await discoverHomeserver('EXAMPLE.COM')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/.well-known/matrix/client',
        expect.any(Object)
      )
      expect(result).toBe('https://example.com')
    })
  })

  describe('checkUsernameAvailable', () => {
    it('should return true for available username', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          available: true
        })
      })

      const result = await checkUsernameAvailable('alice', 'https://matrix.example.com')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://matrix.example.com/_matrix/client/v3/register/available?username=alice',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      )

      expect(result).toBe(true)
    })

    it('should return false for unavailable username', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({
          errcode: 'M_USER_IN_USE',
          error: 'Desired user ID is already taken'
        })
      })

      const result = await checkUsernameAvailable('admin', 'https://matrix.example.com')

      expect(result).toBe(false)
    })

    it('should use default homeserver URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          available: true
        })
      })

      await checkUsernameAvailable('alice')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://matrix.example.com/_matrix/client/v3/register/available?username=alice',
        expect.any(Object)
      )
    })

    it('should handle server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({
          errcode: 'M_UNKNOWN',
          error: 'Internal server error'
        })
      })

      const result = await checkUsernameAvailable('alice', 'https://matrix.example.com')

      expect(result).toBe(false)
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await checkUsernameAvailable('alice', 'https://matrix.example.com')

      expect(result).toBe(false)
    })
  })
})