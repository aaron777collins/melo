import { describe, it, expect, beforeEach, vi, MockedFunction } from 'vitest'
import {
  getAccessControlConfig,
  getClientAccessControlConfig,
  getHomeserverFromUserId,
  normalizeHomeserverUrl,
  extractDomain,
  homeserversMatch,
  isLoginAllowed,
  isUserAllowed,
  isLoginAllowedWithInvite,
  getAccessControlStatus,
  AccessControlConfig,
  LoginValidationResult,
} from '../../../../lib/matrix/access-control'

// Mock environment variables
const mockEnv = vi.hoisted(() => ({
  MELO_PUBLIC_MODE: undefined as string | undefined,
  NEXT_PUBLIC_MATRIX_HOMESERVER_URL: undefined as string | undefined,
}))

// Mock the server-invites module that's required dynamically
vi.mock('../../../../lib/matrix/server-invites', () => ({
  serverCheckHasValidInvite: vi.fn(),
  serverMarkInviteUsed: vi.fn(),
}))

// Also mock it for require() calls
vi.doMock('../../../../lib/matrix/server-invites', () => ({
  serverCheckHasValidInvite: vi.fn(),
  serverMarkInviteUsed: vi.fn(),
}))

describe('access-control', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset environment variables properly
    delete process.env.MELO_PUBLIC_MODE
    delete process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL
    
    // Mock console.log and console.warn to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  describe('getAccessControlConfig', () => {
    it('should return private mode as default when no env vars are set', () => {
      const config = getAccessControlConfig()
      
      expect(config.privateMode).toBe(true)
      expect(config.publicMode).toBe(false)
      expect(config.inviteOnly).toBe(true)
      expect(config.allowedHomeserver).toBeNull()
    })

    it('should enable public mode when MELO_PUBLIC_MODE=true', () => {
      process.env.MELO_PUBLIC_MODE = 'true'
      
      const config = getAccessControlConfig()
      
      expect(config.privateMode).toBe(false)
      expect(config.publicMode).toBe(true)
      expect(config.inviteOnly).toBe(false)
    })

    it('should remain in private mode when MELO_PUBLIC_MODE=false', () => {
      process.env.MELO_PUBLIC_MODE = 'false'
      
      const config = getAccessControlConfig()
      
      expect(config.privateMode).toBe(true)
      expect(config.publicMode).toBe(false)
      expect(config.inviteOnly).toBe(true)
    })

    it('should use configured homeserver URL', () => {
      process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL = 'https://matrix.example.com'
      
      const config = getAccessControlConfig()
      
      expect(config.allowedHomeserver).toBe('https://matrix.example.com')
    })
  })

  describe('getClientAccessControlConfig', () => {
    it('should return only client-safe config properties', () => {
      process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL = 'https://matrix.example.com'
      
      const config = getClientAccessControlConfig()
      
      expect(config).toHaveProperty('privateMode')
      expect(config).toHaveProperty('allowedHomeserver')
      expect(config).toHaveProperty('inviteOnly')
      expect(config).not.toHaveProperty('publicMode')
      expect(Object.keys(config)).toHaveLength(3)
    })
  })

  describe('getHomeserverFromUserId', () => {
    it('should extract homeserver from valid Matrix user ID', () => {
      expect(getHomeserverFromUserId('@alice:matrix.org')).toBe('matrix.org')
      expect(getHomeserverFromUserId('@bob:example.com')).toBe('example.com')
      expect(getHomeserverFromUserId('@user:homeserver.local')).toBe('homeserver.local')
    })

    it('should return empty string for invalid user IDs', () => {
      expect(getHomeserverFromUserId('alice')).toBe('')
      expect(getHomeserverFromUserId('alice:matrix.org')).toBe('')
      expect(getHomeserverFromUserId('@alice')).toBe('')
      expect(getHomeserverFromUserId('')).toBe('')
    })
  })

  describe('normalizeHomeserverUrl', () => {
    it('should remove trailing slashes and convert to lowercase', () => {
      expect(normalizeHomeserverUrl('https://Matrix.Example.COM/')).toBe('https://matrix.example.com')
      expect(normalizeHomeserverUrl('https://example.com///')).toBe('https://example.com')
      expect(normalizeHomeserverUrl('HTTP://MATRIX.ORG')).toBe('http://matrix.org')
    })

    it('should handle URLs without trailing slashes', () => {
      expect(normalizeHomeserverUrl('https://matrix.org')).toBe('https://matrix.org')
    })
  })

  describe('extractDomain', () => {
    it('should extract domain from valid URLs', () => {
      expect(extractDomain('https://matrix.org')).toBe('matrix.org')
      expect(extractDomain('http://example.com:8080')).toBe('example.com')
      expect(extractDomain('https://matrix.example.com/path')).toBe('matrix.example.com')
    })

    it('should handle URLs without protocol', () => {
      expect(extractDomain('matrix.org')).toBe('matrix.org')
      // 'example.com:8080' without protocol is parsed as scheme:path, so hostname is empty
      expect(extractDomain('example.com:8080')).toBe('')
    })

    it('should normalize domain to lowercase', () => {
      expect(extractDomain('https://MATRIX.ORG')).toBe('matrix.org')
      expect(extractDomain('EXAMPLE.COM')).toBe('example.com')
    })
  })

  describe('homeserversMatch', () => {
    it('should match identical URLs', () => {
      expect(homeserversMatch('https://matrix.org', 'https://matrix.org')).toBe(true)
      expect(homeserversMatch('http://example.com', 'http://example.com')).toBe(true)
    })

    it('should match URLs with different trailing slashes', () => {
      expect(homeserversMatch('https://matrix.org/', 'https://matrix.org')).toBe(true)
      expect(homeserversMatch('https://example.com///', 'https://example.com')).toBe(true)
    })

    it('should match URLs with different cases', () => {
      expect(homeserversMatch('https://MATRIX.ORG', 'https://matrix.org')).toBe(true)
      expect(homeserversMatch('HTTPS://Example.Com', 'https://example.com')).toBe(true)
    })

    it('should match URLs with different protocols', () => {
      expect(homeserversMatch('https://matrix.org', 'http://matrix.org')).toBe(true)
      expect(homeserversMatch('http://example.com', 'https://example.com')).toBe(true)
    })

    it('should not match different domains', () => {
      expect(homeserversMatch('https://matrix.org', 'https://example.com')).toBe(false)
      expect(homeserversMatch('https://sub.example.com', 'https://example.com')).toBe(false)
    })

    it('should handle mixed URL formats', () => {
      expect(homeserversMatch('matrix.org', 'https://matrix.org')).toBe(true)
      // 'example.com:8080' without protocol has empty hostname, so won't match
      expect(homeserversMatch('example.com:8080', 'https://example.com:8080')).toBe(false)
    })
  })

  describe('isLoginAllowed', () => {
    beforeEach(() => {
      // Default to private mode with configured homeserver
      process.env.MELO_PUBLIC_MODE = undefined
      process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL = 'https://matrix.example.com'
    })

    it('should allow login in public mode', () => {
      process.env.MELO_PUBLIC_MODE = 'true'
      
      const result = isLoginAllowed('https://matrix.org')
      
      expect(result.allowed).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('should allow login from configured homeserver in private mode', () => {
      const result = isLoginAllowed('https://matrix.example.com')
      
      expect(result.allowed).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('should reject login from external homeserver in private mode', () => {
      const result = isLoginAllowed('https://matrix.org')
      
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('This is a private server. External accounts require an invitation from a server administrator.')
      expect(result.code).toBe('M_FORBIDDEN')
    })

    it('should allow login when no homeserver is configured (with warning)', () => {
      delete process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL
      
      const result = isLoginAllowed('https://matrix.org')
      
      expect(result.allowed).toBe(true)
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Private mode is active but NEXT_PUBLIC_MATRIX_HOMESERVER_URL is not configured')
      )
    })

    it('should handle URL variations correctly', () => {
      // Should match despite different URL formats
      expect(isLoginAllowed('https://matrix.example.com/')).toEqual({ allowed: true })
      expect(isLoginAllowed('HTTPS://MATRIX.EXAMPLE.COM')).toEqual({ allowed: true })
      expect(isLoginAllowed('http://matrix.example.com')).toEqual({ allowed: true })
    })
  })

  describe('isUserAllowed', () => {
    beforeEach(() => {
      process.env.MELO_PUBLIC_MODE = undefined
      process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL = 'https://matrix.example.com'
    })

    it('should allow user in public mode', () => {
      process.env.MELO_PUBLIC_MODE = 'true'
      
      const result = isUserAllowed('@alice:matrix.org')
      
      expect(result.allowed).toBe(true)
    })

    it('should allow user from configured homeserver', () => {
      const result = isUserAllowed('@alice:matrix.example.com')
      
      expect(result.allowed).toBe(true)
    })

    it('should reject user from external homeserver', () => {
      const result = isUserAllowed('@alice:matrix.org')
      
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('Your account is from an external homeserver. Contact an administrator for an invitation.')
      expect(result.code).toBe('M_FORBIDDEN')
    })

    it('should reject invalid user ID format', () => {
      const result = isUserAllowed('invalid-user-id')
      
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('Invalid Matrix user ID format.')
      expect(result.code).toBe('M_FORBIDDEN')
    })

    it('should allow any user when no homeserver is configured', () => {
      delete process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL
      
      const result = isUserAllowed('@alice:matrix.org')
      
      expect(result.allowed).toBe(true)
    })
  })

  describe('isLoginAllowedWithInvite', () => {
    beforeEach(() => {
      delete process.env.MELO_PUBLIC_MODE
      process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL = 'https://matrix.example.com'
    })

    it('should allow user from configured homeserver without invite check', () => {
      const result = isLoginAllowedWithInvite('https://matrix.example.com', '@alice:matrix.example.com')
      
      expect(result.allowed).toBe(true)
      // No invite check needed for same homeserver users
    })

    it('should allow external user with valid invite', async () => {
      // Mock server-invites module to return true for valid invite
      const mockServerInvites = await import('../../../../lib/matrix/server-invites')
      vi.mocked(mockServerInvites.serverCheckHasValidInvite).mockReturnValue(true)
      
      const result = isLoginAllowedWithInvite('https://matrix.org', '@invited:matrix.org')
      
      expect(result.allowed).toBe(true)
      expect(mockServerInvites.serverCheckHasValidInvite).toHaveBeenCalledWith('@invited:matrix.org')
    })

    it('should reject external user without valid invite', async () => {
      // Mock server-invites module to return false for no invite
      const mockServerInvites = await import('../../../../lib/matrix/server-invites')
      vi.mocked(mockServerInvites.serverCheckHasValidInvite).mockReturnValue(false)
      
      const result = isLoginAllowedWithInvite('https://matrix.org', '@uninvited:matrix.org')
      
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('invitation from an administrator')
      expect(result.code).toBe('INVITE_REQUIRED')
      expect(mockServerInvites.serverCheckHasValidInvite).toHaveBeenCalledWith('@uninvited:matrix.org')
    })

    it('should fall back to homeserver validation if no userId provided', () => {
      const result = isLoginAllowedWithInvite('https://matrix.org')
      
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('M_FORBIDDEN')
    })
  })

  describe('getAccessControlStatus', () => {
    it('should report properly configured private mode', () => {
      process.env.MELO_PUBLIC_MODE = undefined
      process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL = 'https://matrix.example.com'
      
      const status = getAccessControlStatus()
      
      expect(status.isConfigured).toBe(true)
      expect(status.mode).toBe('private')
      expect(status.privateMode).toBe(true)
      expect(status.publicMode).toBe(false)
      expect(status.inviteOnly).toBe(true)
      expect(status.allowedHomeserver).toBe('https://matrix.example.com')
      expect(status.warnings).toHaveLength(0)
    })

    it('should report public mode with warning', () => {
      process.env.MELO_PUBLIC_MODE = 'true'
      process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL = 'https://matrix.example.com'
      
      const status = getAccessControlStatus()
      
      expect(status.isConfigured).toBe(false)
      expect(status.mode).toBe('public')
      expect(status.privateMode).toBe(false)
      expect(status.publicMode).toBe(true)
      expect(status.inviteOnly).toBe(false)
      expect(status.warnings).toHaveLength(1)
      expect(status.warnings[0]).toContain('PUBLIC MODE is enabled')
    })

    it('should report misconfigured private mode', () => {
      delete process.env.MELO_PUBLIC_MODE
      delete process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL
      
      const status = getAccessControlStatus()
      
      expect(status.isConfigured).toBe(false) // privateMode && !!allowedHomeserver = true && false = false
      expect(status.mode).toBe('private')
      expect(status.privateMode).toBe(true)
      expect(status.allowedHomeserver).toBeNull()
      expect(status.warnings).toHaveLength(1)
      expect(status.warnings[0]).toContain('Private mode is active but NEXT_PUBLIC_MATRIX_HOMESERVER_URL is not set')
    })
  })
})