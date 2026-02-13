/**
 * Notification Service Tests
 *
 * Unit tests for the Matrix notification service functionality
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import {
  isNotificationSupported,
  getNotificationPermission,
  areNotificationsPermitted,
  MatrixNotificationService,
  NotificationType,
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationSettings
} from '../apps/web/services/matrix-notifications';

// Mock browser APIs
Object.defineProperty(global, 'Notification', {
  value: class MockNotification {
    static permission: NotificationPermission = 'default';
    static requestPermission = jest.fn().mockResolvedValue('granted');
    
    constructor(public title: string, public options?: any) {}
    close() {}
  },
  writable: true
});

Object.defineProperty(global, 'window', {
  value: {
    focus: jest.fn()
  },
  writable: true
});

describe('Notification Utilities', () => {
  beforeEach(() => {
    // Reset mock permission state
    (global.Notification as any).permission = 'default';
  });

  test('isNotificationSupported returns true when Notification API exists', () => {
    expect(isNotificationSupported()).toBe(true);
  });

  test('getNotificationPermission returns current permission state', () => {
    (global.Notification as any).permission = 'granted';
    expect(getNotificationPermission()).toBe('granted');
    
    (global.Notification as any).permission = 'denied';
    expect(getNotificationPermission()).toBe('denied');
  });

  test('areNotificationsPermitted returns true only when permission is granted', () => {
    (global.Notification as any).permission = 'granted';
    expect(areNotificationsPermitted()).toBe(true);
    
    (global.Notification as any).permission = 'denied';
    expect(areNotificationsPermitted()).toBe(false);
    
    (global.Notification as any).permission = 'default';
    expect(areNotificationsPermitted()).toBe(false);
  });
});

describe('NotificationSettings', () => {
  test('DEFAULT_NOTIFICATION_SETTINGS has expected structure', () => {
    expect(DEFAULT_NOTIFICATION_SETTINGS).toMatchObject({
      enabled: expect.any(Boolean),
      directMessages: expect.any(Boolean),
      mentions: expect.any(Boolean),
      allRoomMessages: expect.any(Boolean),
      roomInvites: expect.any(Boolean),
      threadReplies: expect.any(Boolean),
      keywords: expect.any(Array),
      sound: expect.any(Boolean),
      duration: expect.any(Number),
      quietHours: expect.any(Object)
    });
  });

  test('Quiet hours configuration is valid', () => {
    const quietHours = DEFAULT_NOTIFICATION_SETTINGS.quietHours;
    expect(quietHours).toHaveProperty('enabled', false);
    expect(quietHours).toHaveProperty('start', '22:00');
    expect(quietHours).toHaveProperty('end', '08:00');
  });
});

describe('MatrixNotificationService', () => {
  let service: MatrixNotificationService;
  let mockClient: any;

  beforeEach(() => {
    service = new MatrixNotificationService();
    
    // Create mock Matrix client
    mockClient = {
      getUserId: jest.fn().mockReturnValue('@test:example.com'),
      on: jest.fn(),
      off: jest.fn(),
      getRoom: jest.fn()
    };
    
    // Set permission to granted for tests
    (global.Notification as any).permission = 'granted';
  });

  test('service can be instantiated', () => {
    expect(service).toBeInstanceOf(MatrixNotificationService);
  });

  test('initialize sets up service with default settings', async () => {
    await service.initialize(mockClient);
    
    const settings = service.getSettings();
    expect(settings).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
  });

  test('initialize with custom settings merges with defaults', async () => {
    const customSettings: Partial<NotificationSettings> = {
      enabled: false,
      mentions: false,
      duration: 10000
    };

    await service.initialize(mockClient, customSettings);
    
    const settings = service.getSettings();
    expect(settings.enabled).toBe(false);
    expect(settings.mentions).toBe(false);
    expect(settings.duration).toBe(10000);
    // Check that defaults are preserved
    expect(settings.directMessages).toBe(DEFAULT_NOTIFICATION_SETTINGS.directMessages);
    expect(settings.sound).toBe(DEFAULT_NOTIFICATION_SETTINGS.sound);
  });

  test('updateSettings merges new settings correctly', async () => {
    await service.initialize(mockClient);
    
    service.updateSettings({
      mentions: false,
      keywords: ['test', 'important']
    });
    
    const settings = service.getSettings();
    expect(settings.mentions).toBe(false);
    expect(settings.keywords).toEqual(['test', 'important']);
    expect(settings.directMessages).toBe(DEFAULT_NOTIFICATION_SETTINGS.directMessages);
  });

  test('startListening sets up Matrix event listeners', async () => {
    await service.initialize(mockClient);
    
    expect(mockClient.on).toHaveBeenCalledWith(
      'Room.timeline',
      expect.any(Function)
    );
    expect(mockClient.on).toHaveBeenCalledWith(
      'RoomMember.membership',
      expect.any(Function)
    );
  });

  test('stopListening removes Matrix event listeners', async () => {
    await service.initialize(mockClient);
    service.stopListening();
    
    expect(mockClient.off).toHaveBeenCalledWith(
      'Room.timeline',
      expect.any(Function)
    );
    expect(mockClient.off).toHaveBeenCalledWith(
      'RoomMember.membership',
      expect.any(Function)
    );
  });

  test('clearAllNotifications works without errors', async () => {
    await service.initialize(mockClient);
    
    expect(() => service.clearAllNotifications()).not.toThrow();
  });
});

describe('NotificationType enum', () => {
  test('contains expected notification types', () => {
    expect(NotificationType.DirectMessage).toBe('dm');
    expect(NotificationType.Mention).toBe('mention');
    expect(NotificationType.RoomMessage).toBe('room_message');
    expect(NotificationType.RoomInvite).toBe('room_invite');
    expect(NotificationType.ThreadReply).toBe('thread_reply');
    expect(NotificationType.KeywordHighlight).toBe('keyword_highlight');
  });
});