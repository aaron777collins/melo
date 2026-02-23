import { describe, it, expect, beforeEach, vi, MockedFunction } from 'vitest'
import {
  ServerSettingsManager,
  ServerSettingsError,
  getServerSettings,
  updateServerName,
  updateServerDescription, 
  updateServerAvatar,
  updateServerSettings,
  checkServerSettingsPermissions,
} from '../../../../lib/matrix/server-settings'
import type {
  ServerSettings,
  ServerSettingsUpdateRequest,
  ServerSettingsUpdateResult,
  ServerSettingsPermissions,
} from '../../../../lib/matrix/types/server-settings'
import { getClient } from '../../../../lib/matrix/client'

// Mock the Matrix client
vi.mock('../../../../lib/matrix/client')
const mockGetClient = vi.mocked(getClient)

// Mock Matrix client methods
const mockMatrixClient = {
  getUserId: vi.fn(),
  getRoom: vi.fn(),
  sendStateEvent: vi.fn(),
  setPowerLevel: vi.fn(),
  mxcUrlToHttp: vi.fn(),
} as any

describe('server-settings', () => {
  const mockRoomId = '!server:matrix.example.com'
  const mockUserId = '@admin:matrix.example.com'
  
  // State that can be updated by tests - use object reference to ensure mutable state
  const roomState = {
    data: {} as Record<string, any>
  }
  
  const mockRoom = {
    getRoomId: vi.fn(() => mockRoomId),
    getName: vi.fn(() => roomState.data['m.room.name']?.name || 'Test Server'),
    getMyMembership: vi.fn(() => 'join'),
    currentState: {
      getStateEvents: vi.fn((eventType: string) => {
        const content = roomState.data[eventType];
        return content ? { getContent: () => content } : null;
      }),
      mayClientSendStateEvent: vi.fn(() => true),
    },
    getLiveTimeline: vi.fn(() => ({
      getState: vi.fn(() => ({
        getStateEvents: vi.fn(),
      })),
    })),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset room state using object reference
    roomState.data = {
      'm.room.name': { name: 'Test Server' },
      'm.room.topic': null,
      'm.room.avatar': null,
    }
    
    mockGetClient.mockReturnValue(mockMatrixClient)
    mockMatrixClient.getUserId.mockReturnValue(mockUserId)
    mockMatrixClient.getRoom.mockReturnValue(mockRoom)
    
    // Mock sendStateEvent to update room state
    mockMatrixClient.sendStateEvent.mockImplementation(async (roomId: string, eventType: string, content: any) => {
      // Update the shared roomState object
      roomState.data[eventType] = content;
      return { event_id: '$event123' };
    })
  })

  describe('ServerSettingsError', () => {
    it('should create error with proper properties', () => {
      const error = new ServerSettingsError('M_FORBIDDEN', 'Access denied', 403, 'name')
      
      expect(error.name).toBe('ServerSettingsError')
      expect(error.message).toBe('Access denied')
      expect(error.code).toBe('M_FORBIDDEN')
      expect(error.httpStatus).toBe(403)
      expect(error.field).toBe('name')
    })

    it('should handle minimal error info', () => {
      const error = new ServerSettingsError('M_UNKNOWN', 'Unknown error')
      
      expect(error.code).toBe('M_UNKNOWN')
      expect(error.message).toBe('Unknown error')
      expect(error.httpStatus).toBeUndefined()
      expect(error.field).toBeUndefined()
    })
  })

  describe('getServerSettings', () => {
    it('should retrieve current server settings successfully', async () => {
      // Set up room state
      roomState.data = {
        'm.room.name': { name: 'Test Server' },
        'm.room.topic': { topic: 'A test server for testing' },
        'm.room.avatar': { url: 'mxc://matrix.example.com/avatar123' }
      }

      const settings = await getServerSettings(mockRoomId)

      expect(settings).toEqual({
        name: 'Test Server',
        description: 'A test server for testing',
        avatarUrl: 'mxc://matrix.example.com/avatar123'
      })
    })

    it('should handle missing optional settings', async () => {
      // Set up minimal room state
      roomState.data = {
        'm.room.name': { name: 'Minimal Server' },
        'm.room.topic': null,
        'm.room.avatar': null
      }

      const settings = await getServerSettings(mockRoomId)

      expect(settings).toEqual({
        name: 'Minimal Server',
        description: null,
        avatarUrl: null
      })
    })

    it('should throw error when room not found', async () => {
      mockMatrixClient.getRoom.mockReturnValue(null)

      await expect(getServerSettings(mockRoomId))
        .rejects
        .toThrow('Room not found')
    })

    it('should throw error when client not available', async () => {
      mockGetClient.mockReturnValue(null)

      await expect(getServerSettings(mockRoomId))
        .rejects
        .toThrow('Matrix client not available')
    })
  })

  describe('updateServerName', () => {
    it('should update server name successfully', async () => {
      mockMatrixClient.sendStateEvent.mockResolvedValue({ event_id: '$event123' })

      const result = await updateServerName(mockRoomId, 'New Server Name')

      expect(mockMatrixClient.sendStateEvent).toHaveBeenCalledWith(
        mockRoomId,
        'm.room.name',
        { name: 'New Server Name' },
        ''
      )
      expect(result.success).toBe(true)
      expect(result.settings?.name).toBe('New Server Name')
    })

    it('should handle permission errors', async () => {
      mockMatrixClient.sendStateEvent.mockRejectedValue({
        errcode: 'M_FORBIDDEN',
        error: 'Insufficient power level',
        httpStatus: 403
      })

      const result = await updateServerName(mockRoomId, 'New Server Name')

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('M_FORBIDDEN')
      expect(result.error?.field).toBe('name')
    })

    it('should validate name input', async () => {
      // Empty name
      await expect(updateServerName(mockRoomId, ''))
        .rejects
        .toThrow('Server name cannot be empty')

      // Too long name
      const longName = 'x'.repeat(256)
      await expect(updateServerName(mockRoomId, longName))
        .rejects
        .toThrow('Server name must be 255 characters or less')
    })
  })

  describe('updateServerDescription', () => {
    it('should update server description successfully', async () => {
      mockMatrixClient.sendStateEvent.mockResolvedValue({ event_id: '$event123' })

      const result = await updateServerDescription(mockRoomId, 'New description')

      expect(mockMatrixClient.sendStateEvent).toHaveBeenCalledWith(
        mockRoomId,
        'm.room.topic',
        { topic: 'New description' },
        ''
      )
      expect(result.success).toBe(true)
      expect(result.settings?.description).toBe('New description')
    })

    it('should clear description when null provided', async () => {
      mockMatrixClient.sendStateEvent.mockResolvedValue({ event_id: '$event123' })

      const result = await updateServerDescription(mockRoomId, null)

      expect(mockMatrixClient.sendStateEvent).toHaveBeenCalledWith(
        mockRoomId,
        'm.room.topic',
        { topic: '' },
        ''
      )
      expect(result.success).toBe(true)
      expect(result.settings?.description).toBe(null)
    })

    it('should validate description length', async () => {
      const longDescription = 'x'.repeat(1001)
      
      await expect(updateServerDescription(mockRoomId, longDescription))
        .rejects
        .toThrow('Server description must be 1000 characters or less')
    })
  })

  describe('updateServerAvatar', () => {
    it('should update server avatar successfully', async () => {
      mockMatrixClient.sendStateEvent.mockResolvedValue({ event_id: '$event123' })

      const avatarUrl = 'mxc://matrix.example.com/newavatar123'
      const result = await updateServerAvatar(mockRoomId, avatarUrl)

      expect(mockMatrixClient.sendStateEvent).toHaveBeenCalledWith(
        mockRoomId,
        'm.room.avatar',
        { url: avatarUrl },
        ''
      )
      expect(result.success).toBe(true)
      expect(result.settings?.avatarUrl).toBe(avatarUrl)
    })

    it('should clear avatar when null provided', async () => {
      mockMatrixClient.sendStateEvent.mockResolvedValue({ event_id: '$event123' })

      const result = await updateServerAvatar(mockRoomId, null)

      expect(mockMatrixClient.sendStateEvent).toHaveBeenCalledWith(
        mockRoomId,
        'm.room.avatar',
        {},
        ''
      )
      expect(result.success).toBe(true)
      expect(result.settings?.avatarUrl).toBe(null)
    })

    it('should validate MXC URL format', async () => {
      // Invalid URL format
      await expect(updateServerAvatar(mockRoomId, 'https://example.com/avatar.png'))
        .rejects
        .toThrow('Server avatar URL must be a valid MXC URL')

      // Empty URL
      await expect(updateServerAvatar(mockRoomId, ''))
        .rejects
        .toThrow('Server avatar URL must be a valid MXC URL')
    })
  })

  describe('updateServerSettings', () => {
    it('should update multiple settings simultaneously', async () => {
      mockMatrixClient.sendStateEvent.mockResolvedValue({ event_id: '$event123' })

      const updateRequest: ServerSettingsUpdateRequest = {
        name: 'New Server Name',
        description: 'New description',
        avatarUrl: 'mxc://matrix.example.com/newavatar'
      }

      const result = await updateServerSettings(mockRoomId, updateRequest)

      // Should make 3 separate API calls
      expect(mockMatrixClient.sendStateEvent).toHaveBeenCalledTimes(3)
      
      // Verify individual calls
      expect(mockMatrixClient.sendStateEvent).toHaveBeenCalledWith(
        mockRoomId, 'm.room.name', { name: 'New Server Name' }, ''
      )
      expect(mockMatrixClient.sendStateEvent).toHaveBeenCalledWith(
        mockRoomId, 'm.room.topic', { topic: 'New description' }, ''
      )
      expect(mockMatrixClient.sendStateEvent).toHaveBeenCalledWith(
        mockRoomId, 'm.room.avatar', { url: 'mxc://matrix.example.com/newavatar' }, ''
      )

      expect(result.success).toBe(true)
      expect(result.settings).toEqual(updateRequest)
    })

    it('should handle partial failures gracefully', async () => {
      // First call succeeds, second fails, third succeeds
      mockMatrixClient.sendStateEvent
        .mockResolvedValueOnce({ event_id: '$event1' })
        .mockRejectedValueOnce({
          errcode: 'M_FORBIDDEN',
          error: 'Cannot change topic'
        })
        .mockResolvedValueOnce({ event_id: '$event3' })

      const updateRequest: ServerSettingsUpdateRequest = {
        name: 'New Server Name',
        description: 'New description',
        avatarUrl: 'mxc://matrix.example.com/newavatar'
      }

      const result = await updateServerSettings(mockRoomId, updateRequest)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('M_FORBIDDEN')
      expect(result.error?.field).toBe('description')
    })

    it('should validate all fields before making API calls', async () => {
      const invalidRequest: ServerSettingsUpdateRequest = {
        name: '', // Invalid: empty
        description: 'x'.repeat(1001), // Invalid: too long
        avatarUrl: 'https://invalid.com/avatar.png' // Invalid: not MXC
      }

      await expect(updateServerSettings(mockRoomId, invalidRequest))
        .rejects
        .toThrow() // Should throw validation error before making any API calls

      expect(mockMatrixClient.sendStateEvent).not.toHaveBeenCalled()
    })
  })

  describe('checkServerSettingsPermissions', () => {
    it('should check user permissions correctly for admin', async () => {
      // Set up power levels in room state
      roomState.data['m.room.power_levels'] = {
        users: { [mockUserId]: 100 },
        events: {
          'm.room.name': 50,
          'm.room.topic': 50, 
          'm.room.avatar': 50
        }
      }

      const permissions = await checkServerSettingsPermissions(mockRoomId, mockUserId)

      expect(permissions).toEqual({
        canEditName: true,
        canEditDescription: true,
        canEditAvatar: true,
        canEditAll: true
      })
    })

    it('should check user permissions correctly for limited user', async () => {
      // Set up power levels in room state
      roomState.data['m.room.power_levels'] = {
        users: { [mockUserId]: 25 },
        events: {
          'm.room.name': 50,
          'm.room.topic': 25,
          'm.room.avatar': 50
        }
      }

      const permissions = await checkServerSettingsPermissions(mockRoomId, mockUserId)

      expect(permissions).toEqual({
        canEditName: false,
        canEditDescription: true,
        canEditAvatar: false,
        canEditAll: false
      })
    })

    it('should handle missing power levels event', async () => {
      roomState.data['m.room.power_levels'] = null

      const permissions = await checkServerSettingsPermissions(mockRoomId, mockUserId)

      // Default Matrix behavior: users can edit if not specified
      expect(permissions.canEditAll).toBe(false)
    })
  })

  describe('ServerSettingsManager', () => {
    let manager: ServerSettingsManager

    beforeEach(() => {
      manager = new ServerSettingsManager(mockRoomId)
    })

    it('should initialize with room ID', () => {
      expect(manager.getRoomId()).toBe(mockRoomId)
    })

    it('should get current settings', async () => {
      roomState.data['m.room.name'] = { name: 'Manager Test' }

      const settings = await manager.getCurrentSettings()
      expect(settings.name).toBe('Manager Test')
    })

    it('should update settings using manager', async () => {
      mockMatrixClient.sendStateEvent.mockResolvedValue({ event_id: '$event123' })

      const result = await manager.updateSettings({
        name: 'Manager Updated'
      })

      expect(result.success).toBe(true)
      expect(mockMatrixClient.sendStateEvent).toHaveBeenCalledWith(
        mockRoomId,
        'm.room.name',
        { name: 'Manager Updated' },
        ''
      )
    })

    it('should check permissions using manager', async () => {
      roomState.data['m.room.power_levels'] = {
        users: { [mockUserId]: 100 },
        events: {}
      }

      const permissions = await manager.checkPermissions(mockUserId)
      expect(permissions.canEditAll).toBe(true)
    })
  })
})