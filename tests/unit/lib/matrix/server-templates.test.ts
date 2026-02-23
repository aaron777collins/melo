import { describe, it, expect, beforeEach, vi, MockedFunction } from 'vitest'
import {
  MatrixServerTemplateService,
  createServerTemplateService,
  SERVER_TEMPLATES,
  type ServerTemplate,
  type CreateServerFromTemplateOptions,
  type CreateServerResult,
} from '../../../../lib/matrix/server-templates'
import type { MatrixClient, Room, ICreateRoomOpts, Visibility } from '../../../../lib/matrix/matrix-sdk-exports'

// Mock Matrix client
const mockMatrixClient = {
  createRoom: vi.fn(),
  sendStateEvent: vi.fn(),
  getDomain: vi.fn(() => 'example.com'),
} as unknown as MatrixClient

describe('server-templates', () => {
  let service: MatrixServerTemplateService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new MatrixServerTemplateService(mockMatrixClient)
  })

  describe('SERVER_TEMPLATES data structure', () => {
    it('should have all required template categories', () => {
      const categories = new Set(SERVER_TEMPLATES.map(t => t.category))
      expect(categories).toContain('gaming')
      expect(categories).toContain('community') 
      expect(categories).toContain('education')
      expect(categories).toContain('work')
      expect(categories).toContain('creative')
      expect(categories).toContain('hobby')
    })

    it('should have at least one featured template', () => {
      const featuredTemplates = SERVER_TEMPLATES.filter(t => t.featured)
      expect(featuredTemplates.length).toBeGreaterThan(0)
    })

    it('should have valid template structure for each template', () => {
      SERVER_TEMPLATES.forEach(template => {
        // Required properties
        expect(template.id).toBeDefined()
        expect(template.name).toBeDefined()
        expect(template.description).toBeDefined()
        expect(template.category).toBeDefined()
        expect(template.icon).toBeDefined()
        expect(typeof template.featured).toBe('boolean')

        // Structure validation
        expect(template.structure).toBeDefined()
        expect(template.structure.server).toBeDefined()
        expect(template.structure.categories).toBeDefined()
        expect(Array.isArray(template.structure.categories)).toBe(true)

        // Server settings validation
        const server = template.structure.server
        expect(server.visibility).toBeDefined()
        expect(server.joinRule).toBeDefined()
        expect(typeof server.encrypted).toBe('boolean')
        expect(server.powerLevels).toBeDefined()

        // Categories validation
        template.structure.categories.forEach(category => {
          expect(category.name).toBeDefined()
          expect(category.order).toBeDefined()
          expect(Array.isArray(category.channels)).toBe(true)

          // Channels validation
          category.channels.forEach(channel => {
            expect(channel.name).toBeDefined()
            expect(channel.type).toMatch(/^(text|voice|announcement)$/)
            expect(typeof channel.order).toBe('number')
          })
        })
      })
    })
  })

  describe('MatrixServerTemplateService', () => {
    describe('getTemplates', () => {
      it('should return all available templates', () => {
        const templates = service.getTemplates()
        expect(templates).toEqual(SERVER_TEMPLATES)
        expect(templates.length).toBeGreaterThan(0)
      })
    })

    describe('getTemplatesByCategory', () => {
      it('should return only gaming templates', () => {
        const gamingTemplates = service.getTemplatesByCategory('gaming')
        gamingTemplates.forEach(template => {
          expect(template.category).toBe('gaming')
        })
        expect(gamingTemplates.length).toBeGreaterThan(0)
      })

      it('should return only work templates', () => {
        const workTemplates = service.getTemplatesByCategory('work')
        workTemplates.forEach(template => {
          expect(template.category).toBe('work')
        })
      })
    })

    describe('getFeaturedTemplates', () => {
      it('should return only featured templates', () => {
        const featuredTemplates = service.getFeaturedTemplates()
        featuredTemplates.forEach(template => {
          expect(template.featured).toBe(true)
        })
        expect(featuredTemplates.length).toBeGreaterThan(0)
      })
    })

    describe('getTemplateById', () => {
      it('should return template by id', () => {
        const template = service.getTemplateById('gaming-community')
        expect(template).toBeDefined()
        expect(template?.id).toBe('gaming-community')
      })

      it('should return undefined for non-existent id', () => {
        const template = service.getTemplateById('non-existent')
        expect(template).toBeUndefined()
      })
    })

    describe('createServerFromTemplate', () => {
      const mockRoom = { room_id: 'mock-room-id' } as Room

      beforeEach(() => {
        ;(mockMatrixClient.createRoom as MockedFunction<typeof mockMatrixClient.createRoom>)
          .mockResolvedValue(mockRoom)
        ;(mockMatrixClient.sendStateEvent as MockedFunction<typeof mockMatrixClient.sendStateEvent>)
          .mockResolvedValue({} as any)
      })

      it('should create server from gaming template successfully', async () => {
        const template = SERVER_TEMPLATES.find(t => t.id === 'gaming-community')!
        const options: CreateServerFromTemplateOptions = {
          name: 'Test Gaming Server',
          description: 'Test server',
          template,
        }

        const result = await service.createServerFromTemplate(options)

        expect(result.success).toBe(true)
        expect(result.server).toBeDefined()
        expect(result.server!.name).toBe('Test Gaming Server')
        expect(mockMatrixClient.createRoom).toHaveBeenCalled()
      })

      it('should create all channels from template structure', async () => {
        const template = SERVER_TEMPLATES.find(t => t.id === 'gaming-community')!
        const totalChannels = template.structure.categories.reduce(
          (total, category) => total + category.channels.length,
          0
        )

        const options: CreateServerFromTemplateOptions = {
          name: 'Test Server',
          template,
        }

        const result = await service.createServerFromTemplate(options)

        expect(result.success).toBe(true)
        expect(result.server!.rooms).toHaveLength(totalChannels)
        expect(mockMatrixClient.createRoom).toHaveBeenCalledTimes(totalChannels + 1) // +1 for space
      })

      it('should handle Matrix API errors gracefully', async () => {
        const template = SERVER_TEMPLATES.find(t => t.id === 'gaming-community')!
        ;(mockMatrixClient.createRoom as MockedFunction<typeof mockMatrixClient.createRoom>)
          .mockRejectedValue(new Error('Matrix API error'))

        const options: CreateServerFromTemplateOptions = {
          name: 'Test Server',
          template,
        }

        const result = await service.createServerFromTemplate(options)

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
        expect(result.server).toBeUndefined()
      })

      it('should create public server when isPublic is true', async () => {
        const template = SERVER_TEMPLATES.find(t => t.id === 'gaming-community')!
        const options: CreateServerFromTemplateOptions = {
          name: 'Public Server',
          template,
          isPublic: true,
        }

        await service.createServerFromTemplate(options)

        const createRoomCall = (mockMatrixClient.createRoom as MockedFunction<typeof mockMatrixClient.createRoom>).mock.calls[0]
        const spaceOptions = createRoomCall[0] as ICreateRoomOpts
        expect(spaceOptions.visibility).toBe('public')
      })
    })
  })

  describe('createServerTemplateService factory', () => {
    it('should create service instance', () => {
      const service = createServerTemplateService(mockMatrixClient)
      expect(service).toBeInstanceOf(MatrixServerTemplateService)
    })
  })
})