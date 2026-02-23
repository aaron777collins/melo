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
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useParams: vi.fn(() => ({ serverId: 'test-server', channelId: 'test-channel' }))
}))

// =============================================================================
// Modal Store Mock
// =============================================================================

export const mockModalOnOpen = vi.fn()
export const mockModalOnClose = vi.fn()

// Create a more explicit mock implementation
const mockModalReturn = {
  isOpen: false,
  type: null,
  data: {},
  onOpen: mockModalOnOpen,
  onClose: mockModalOnClose
}

vi.mock('@/hooks/use-modal-store', () => ({
  useModal: vi.fn(() => mockModalReturn)
}))

// Also mock the actual file path without alias as fallback
vi.mock('../../../hooks/use-modal-store', () => ({
  useModal: vi.fn(() => mockModalReturn)
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
// LiveKit SDK Mock - Prevents rate limiting and connection issues
// =============================================================================

const mockRoom = {
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
  off: vi.fn(),
  state: 'disconnected',
  participants: new Map(),
  localParticipant: {
    identity: 'test-user',
    publishTrack: vi.fn().mockResolvedValue(undefined),
    unpublishTrack: vi.fn().mockResolvedValue(undefined),
    audioTracks: new Map(),
    videoTracks: new Map()
  },
  remoteParticipants: new Map(),
  name: 'test-room'
}

vi.mock('livekit-client', () => ({
  Room: vi.fn().mockImplementation(() => mockRoom),
  RoomEvent: {
    Connected: 'connected',
    Disconnected: 'disconnected',
    ParticipantConnected: 'participantConnected',
    ParticipantDisconnected: 'participantDisconnected',
    TrackPublished: 'trackPublished',
    TrackUnpublished: 'trackUnpublished'
  },
  ConnectionState: {
    Connected: 'connected',
    Disconnected: 'disconnected',
    Connecting: 'connecting',
    Reconnecting: 'reconnecting'
  },
  VideoPresets: {
    h720: {
      resolution: { width: 1280, height: 720 },
      encoding: { maxBitrate: 3000000 }
    }
  },
  AudioPresets: {
    music: { 
      bitrate: 128000,
      maxBitrate: 128000 
    }
  },
  createLocalAudioTrack: vi.fn().mockResolvedValue({
    kind: 'audio',
    sid: 'audio-track-id',
    muted: false
  }),
  createLocalVideoTrack: vi.fn().mockResolvedValue({
    kind: 'video',
    sid: 'video-track-id',
    muted: false
  }),
  LocalTrack: vi.fn(),
  RemoteTrack: vi.fn(),
  Track: {
    Kind: {
      Audio: 'audio',
      Video: 'video'
    }
  }
}))

// =============================================================================
// Matrix Client Hook Mock
// =============================================================================

const mockMatrixClient = {
  sendMessage: vi.fn().mockResolvedValue({ event_id: 'test-event-id' }),
  createRoom: vi.fn().mockResolvedValue({ room_id: '!test-room:matrix.test.com' }),
  joinRoom: vi.fn().mockResolvedValue({}),
  leaveRoom: vi.fn().mockResolvedValue({}),
  on: vi.fn(),
  off: vi.fn(),
  removeListener: vi.fn(),
  isInitialized: true
}

// Create matrix client mock return value
const mockMatrixClientReturn = {
  client: mockMatrixClient, 
  isReady: true
}

export const mockUseMatrixClient = vi.fn(() => mockMatrixClientReturn)

vi.mock('@/hooks/use-matrix-client', () => ({
  useMatrixClient: mockUseMatrixClient
}))

// Also mock the actual file path without alias as fallback
vi.mock('../../../hooks/use-matrix-client', () => ({
  useMatrixClient: mockUseMatrixClient
}))

// =============================================================================
// Mentions Hook Mock - These are globals that test files can override
// =============================================================================

export const mockMentionsHandleInputChange = vi.fn()
export const mockMentionsUserSelect = vi.fn()
export const mockMentionsChannelSelect = vi.fn()
export const mockMentionsCloseAutocomplete = vi.fn()
export const mockMentionsParseMentions = vi.fn((text: string) => ({ text, mentions: [] }))

// NOTE: Individual test files should define their own vi.mock for @/hooks/use-mentions
// if they need custom behavior. This is a base default.

// =============================================================================
// Emoji Autocomplete Hook Mock
// =============================================================================

export const mockEmojiHandleInputChange = vi.fn()
export const mockEmojiSelectEmoji = vi.fn()
export const mockEmojiCloseAutocomplete = vi.fn()

// NOTE: Individual test files should define their own vi.mock for @/hooks/use-emoji-autocomplete
// if they need custom behavior.

// =============================================================================
// Accessibility Hook Mock
// =============================================================================

export const mockAnnounce = vi.fn()
export const mockAccessibilityReturn = {
  announce: mockAnnounce,
  effectivePreferences: {
    reducedMotion: false,
    highContrast: false,
    screenReader: false,
    enhancedFocus: false,
    reduceMotion: false,
  },
}

vi.mock('@/src/hooks/use-accessibility', () => ({
  useAccessibility: vi.fn(() => mockAccessibilityReturn)
}))

vi.mock('../../../src/hooks/use-accessibility', () => ({
  useAccessibility: vi.fn(() => mockAccessibilityReturn)
}))

// =============================================================================
// Export mock values for test customization
// =============================================================================

export { mockMatrixAuthValue, mockMatrixValue, mockMatrixClient, mockRoom }
