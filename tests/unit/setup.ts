import { expect, afterEach } from 'vitest'
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

// Mock Matrix SDK for testing
vi.mock('matrix-js-sdk', () => ({
  createClient: vi.fn(),
  MatrixEvent: vi.fn(),
  EventType: {
    RoomMember: 'm.room.member',
    RoomMessage: 'm.room.message',
    RoomName: 'm.room.name',
    RoomTopic: 'm.room.topic',
    RoomAvatar: 'm.room.avatar'
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
  }
}))

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/'
  })
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn()
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams()
}))