import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Clean up after each test
afterEach(() => {
  cleanup()
})

// Mock environment variables if needed
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL = 'https://matrix.test.com'

// =============================================================================
// Matrix SDK Mock
// =============================================================================

vi.mock('matrix-js-sdk', () => ({
  createClient: vi.fn(),
  MatrixEvent: vi.fn(),
  EventType: {
    RoomMember: 'm.room.member',
    RoomMessage: 'm.room.message',
    RoomName: 'm.room.name',
    RoomTopic: 'm.room.topic',
    RoomAvatar: 'm.room.avatar',
    RoomPowerLevels: 'm.room.power_levels',
    SpaceChild: 'm.space.child',
    SpaceParent: 'm.space.parent',
    RoomCreate: 'm.room.create',
    RoomJoinRules: 'm.room.join_rules'
  },
  MsgType: {
    Text: 'm.text',
    Emote: 'm.emote',
    Notice: 'm.notice',
    Image: 'm.image',
    File: 'm.file',
    Audio: 'm.audio',
    Location: 'm.location',
    Video: 'm.video'
  },
  ClientEvent: {
    Sync: 'sync',
    Room: 'Room',
    DeleteRoom: 'DeleteRoom',
    AccountData: 'accountData'
  },
  SyncState: {
    Prepared: 'PREPARED',
    Syncing: 'SYNCING',
    Error: 'ERROR',
    Stopped: 'STOPPED',
    Catchup: 'CATCHUP',
    Reconnecting: 'RECONNECTING'
  },
  RelationType: {
    Annotation: 'm.annotation',
    Replace: 'm.replace',
    Reference: 'm.reference',
    Thread: 'm.thread'
  },
  RoomMemberEvent: {
    Name: 'RoomMember.name',
    Membership: 'RoomMember.membership',
    Typing: 'RoomMember.typing'
  },
  RoomEvent: {
    Timeline: 'Room.timeline',
    MyMembership: 'Room.myMembership',
    Name: 'Room.name',
    Receipt: 'Room.receipt'
  },
  MatrixClient: class MatrixClient {
    on() {}
    off() {}
    removeListener() {}
  }
}))

// =============================================================================
// Next.js Router Mocks - Export for test configuration
// =============================================================================

// These are the actual mock implementations that tests can configure
export const mockRouterPush = vi.fn()
export const mockRouterReplace = vi.fn()
export const mockRouterBack = vi.fn()
export const mockRouterRefresh = vi.fn()

vi.mock('next/router', () => ({
  useRouter: vi.fn(() => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
    back: mockRouterBack,
    pathname: '/',
    query: {},
    asPath: '/'
  }))
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
    back: mockRouterBack,
    refresh: mockRouterRefresh
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams())
}))

// =============================================================================
// Modal Store Mock
// =============================================================================

export const mockModalOnOpen = vi.fn()
export const mockModalOnClose = vi.fn()

vi.mock('@/hooks/use-modal-store', () => ({
  useModal: vi.fn(() => ({
    isOpen: false,
    type: null,
    data: {},
    onOpen: mockModalOnOpen,
    onClose: mockModalOnClose
  }))
}))

// =============================================================================
// MatrixAuthProvider Mock
// =============================================================================

const mockMatrixAuthValue = {
  user: {
    userId: '@testuser:matrix.test.com',
    displayName: 'Test User',
    avatarUrl: null
  },
  session: {
    sessionId: 'test-session-id',
    accessToken: 'test-access-token',
    homeserverUrl: 'https://matrix.test.com',
    userId: '@testuser:matrix.test.com',
    deviceId: 'test-device-id'
  },
  isLoading: false,
  error: null,
  login: vi.fn().mockResolvedValue(true),
  logout: vi.fn().mockResolvedValue(undefined),
  register: vi.fn().mockResolvedValue(true),
  clearError: vi.fn(),
  refreshSession: vi.fn().mockResolvedValue(undefined),
  complete2FALogin: vi.fn()
}

vi.mock('@/components/providers/matrix-auth-provider', () => ({
  MatrixAuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useMatrixAuth: () => mockMatrixAuthValue
}))

// =============================================================================
// MatrixProvider Mock
// =============================================================================

const mockMatrixValue = {
  client: null,
  syncState: 'SYNCING',
  cryptoState: { status: 'ready', isEncryptionSupported: true },
  rooms: [],
  isReady: true,
  isSyncing: false,
  isE2EEEnabled: true,
  syncError: null,
  cryptoError: null,
  getRoom: vi.fn().mockReturnValue(null),
  refreshRooms: vi.fn()
}

vi.mock('@/components/providers/matrix-provider', () => ({
  MatrixProvider: ({ children }: { children: React.ReactNode }) => children,
  useMatrix: () => mockMatrixValue
}))

// =============================================================================
// Matrix Media Mock
// =============================================================================

vi.mock('@/lib/matrix/media', () => ({
  uploadMedia: vi.fn().mockResolvedValue({ contentUri: 'mxc://matrix.test.com/test-media' }),
  mxcToHttpUrl: vi.fn((mxcUrl: string) => mxcUrl ? `https://matrix.test.com/media/${mxcUrl}` : null),
  validateImageFile: vi.fn().mockReturnValue({ valid: true }),
  validateFile: vi.fn().mockReturnValue({ valid: true }),
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  MediaUploadError: class MediaUploadError extends Error {}
}))

// =============================================================================
// Export mock values for test customization
// =============================================================================

export { mockMatrixAuthValue, mockMatrixValue }
