/**
 * Matrix Permissions Service
 * 
 * Maps granular UI permissions to Matrix power levels and state events.
 * Provides utilities for managing role-based permissions in Matrix spaces.
 */

import { MatrixClient } from "matrix-js-sdk";
import { getClient } from "./client";

// =============================================================================
// Types
// =============================================================================

/**
 * Granular permission structure for HAOS roles
 */
export interface HaosPermissions {
  // === Server Management ===
  /** Can change server name, icon, banner */
  manageServer: boolean;
  /** Can create, edit, delete roles */
  manageRoles: boolean;
  /** Can create, edit, delete channels */
  manageChannels: boolean;
  /** Can manage server-wide settings */
  manageServerSettings: boolean;
  /** Can view server analytics and audit logs */
  viewServerInsights: boolean;

  // === Member Management ===
  /** Can kick members from the server */
  kickMembers: boolean;
  /** Can ban members from the server */
  banMembers: boolean;
  /** Can timeout/mute members temporarily */
  timeoutMembers: boolean;
  /** Can move members between voice channels */
  moveMembers: boolean;
  /** Can manage member roles (assign/remove) */
  manageMemberRoles: boolean;

  // === Channel Permissions ===
  /** Can view channels */
  viewChannels: boolean;
  /** Can send messages in text channels */
  sendMessages: boolean;
  /** Can send messages in threads */
  sendMessagesInThreads: boolean;
  /** Can create public threads */
  createPublicThreads: boolean;
  /** Can create private threads */
  createPrivateThreads: boolean;
  /** Can send embedded content (links, files) */
  embedLinks: boolean;
  /** Can attach files to messages */
  attachFiles: boolean;
  /** Can add reactions to messages */
  addReactions: boolean;
  /** Can use external emojis and stickers */
  useExternalEmojis: boolean;
  /** Can read message history */
  readMessageHistory: boolean;

  // === Voice Permissions ===
  /** Can connect to voice channels */
  connect: boolean;
  /** Can speak in voice channels */
  speak: boolean;
  /** Can use voice activation (no push-to-talk) */
  useVoiceActivation: boolean;
  /** Can share screen in voice channels */
  shareScreen: boolean;
  /** Can use video in voice channels */
  useVideo: boolean;

  // === Advanced Permissions ===
  /** Can delete messages from others */
  manageMessages: boolean;
  /** Can pin/unpin messages */
  pinMessages: boolean;
  /** Can mention @everyone and @here */
  mentionEveryone: boolean;
  /** Can create server invites */
  createInvites: boolean;
  /** Can use slash commands */
  useSlashCommands: boolean;
  /** Can change own nickname */
  changeNickname: boolean;
  /** Can change other members' nicknames */
  manageNicknames: boolean;

  // === Administrative ===
  /** Can access administrative features */
  administrator: boolean;
}

/**
 * Permission category for organizing UI
 */
export interface PermissionCategory {
  id: string;
  name: string;
  description: string;
  permissions: (keyof HaosPermissions)[];
  icon: string;
}

/**
 * Permission template for different role types
 */
export interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  permissions: HaosPermissions;
  recommendedPowerLevel: number;
  color: string;
}

/**
 * Matrix event mapping for permissions
 */
export interface MatrixPermissionMapping {
  /** Matrix event type */
  eventType: string;
  /** Required power level for this event */
  powerLevel: number;
  /** Whether this applies to state events */
  isStateEvent: boolean;
  /** Room-level vs space-level permission */
  scope: 'room' | 'space' | 'both';
}

// =============================================================================
// Permission Categories
// =============================================================================

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: 'general',
    name: 'General Permissions',
    description: 'Basic server and channel access',
    icon: 'settings',
    permissions: [
      'viewChannels',
      'changeNickname',
      'useSlashCommands',
      'createInvites'
    ]
  },
  {
    id: 'text',
    name: 'Text Permissions',
    description: 'Text channel and messaging permissions',
    icon: 'message-square',
    permissions: [
      'sendMessages',
      'sendMessagesInThreads',
      'createPublicThreads',
      'createPrivateThreads',
      'embedLinks',
      'attachFiles',
      'addReactions',
      'useExternalEmojis',
      'readMessageHistory'
    ]
  },
  {
    id: 'voice',
    name: 'Voice Permissions',
    description: 'Voice and video channel permissions',
    icon: 'mic',
    permissions: [
      'connect',
      'speak',
      'useVoiceActivation',
      'shareScreen',
      'useVideo'
    ]
  },
  {
    id: 'moderation',
    name: 'Moderation Permissions',
    description: 'Member and content moderation',
    icon: 'shield',
    permissions: [
      'kickMembers',
      'banMembers',
      'timeoutMembers',
      'moveMembers',
      'manageMessages',
      'pinMessages',
      'mentionEveryone',
      'manageNicknames'
    ]
  },
  {
    id: 'management',
    name: 'Management Permissions',
    description: 'Server and role management',
    icon: 'crown',
    permissions: [
      'manageServer',
      'manageRoles',
      'manageChannels',
      'manageServerSettings',
      'manageMemberRoles',
      'viewServerInsights',
      'administrator'
    ]
  }
];

// =============================================================================
// Permission Templates
// =============================================================================

export const PERMISSION_TEMPLATES: PermissionTemplate[] = [
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Full server control with all permissions',
    recommendedPowerLevel: 100,
    color: '#f04747',
    permissions: {
      // Server Management
      manageServer: true,
      manageRoles: true,
      manageChannels: true,
      manageServerSettings: true,
      viewServerInsights: true,
      
      // Member Management
      kickMembers: true,
      banMembers: true,
      timeoutMembers: true,
      moveMembers: true,
      manageMemberRoles: true,
      
      // Channel Permissions
      viewChannels: true,
      sendMessages: true,
      sendMessagesInThreads: true,
      createPublicThreads: true,
      createPrivateThreads: true,
      embedLinks: true,
      attachFiles: true,
      addReactions: true,
      useExternalEmojis: true,
      readMessageHistory: true,
      
      // Voice Permissions
      connect: true,
      speak: true,
      useVoiceActivation: true,
      shareScreen: true,
      useVideo: true,
      
      // Advanced Permissions
      manageMessages: true,
      pinMessages: true,
      mentionEveryone: true,
      createInvites: true,
      useSlashCommands: true,
      changeNickname: true,
      manageNicknames: true,
      
      // Administrative
      administrator: true,
    }
  },
  {
    id: 'moderator',
    name: 'Moderator',
    description: 'Can moderate members and manage channels',
    recommendedPowerLevel: 50,
    color: '#7289da',
    permissions: {
      // Server Management
      manageServer: false,
      manageRoles: false,
      manageChannels: true,
      manageServerSettings: false,
      viewServerInsights: true,
      
      // Member Management
      kickMembers: true,
      banMembers: true,
      timeoutMembers: true,
      moveMembers: true,
      manageMemberRoles: false,
      
      // Channel Permissions
      viewChannels: true,
      sendMessages: true,
      sendMessagesInThreads: true,
      createPublicThreads: true,
      createPrivateThreads: true,
      embedLinks: true,
      attachFiles: true,
      addReactions: true,
      useExternalEmojis: true,
      readMessageHistory: true,
      
      // Voice Permissions
      connect: true,
      speak: true,
      useVoiceActivation: true,
      shareScreen: true,
      useVideo: true,
      
      // Advanced Permissions
      manageMessages: true,
      pinMessages: true,
      mentionEveryone: true,
      createInvites: true,
      useSlashCommands: true,
      changeNickname: true,
      manageNicknames: true,
      
      // Administrative
      administrator: false,
    }
  },
  {
    id: 'member',
    name: 'Member',
    description: 'Standard member permissions for regular users',
    recommendedPowerLevel: 0,
    color: '#99aab5',
    permissions: {
      // Server Management
      manageServer: false,
      manageRoles: false,
      manageChannels: false,
      manageServerSettings: false,
      viewServerInsights: false,
      
      // Member Management
      kickMembers: false,
      banMembers: false,
      timeoutMembers: false,
      moveMembers: false,
      manageMemberRoles: false,
      
      // Channel Permissions
      viewChannels: true,
      sendMessages: true,
      sendMessagesInThreads: true,
      createPublicThreads: true,
      createPrivateThreads: false,
      embedLinks: true,
      attachFiles: true,
      addReactions: true,
      useExternalEmojis: true,
      readMessageHistory: true,
      
      // Voice Permissions
      connect: true,
      speak: true,
      useVoiceActivation: true,
      shareScreen: false,
      useVideo: true,
      
      // Advanced Permissions
      manageMessages: false,
      pinMessages: false,
      mentionEveryone: false,
      createInvites: false,
      useSlashCommands: true,
      changeNickname: true,
      manageNicknames: false,
      
      // Administrative
      administrator: false,
    }
  }
];

// =============================================================================
// Matrix Power Level Mappings
// =============================================================================

/**
 * Maps HAOS permissions to Matrix event types and required power levels
 */
export const MATRIX_PERMISSION_MAPPINGS: Record<keyof HaosPermissions, MatrixPermissionMapping[]> = {
  // Server Management
  manageServer: [
    { eventType: 'm.room.name', powerLevel: 100, isStateEvent: true, scope: 'both' },
    { eventType: 'm.room.avatar', powerLevel: 100, isStateEvent: true, scope: 'both' },
    { eventType: 'm.room.topic', powerLevel: 100, isStateEvent: true, scope: 'both' }
  ],
  manageRoles: [
    { eventType: 'm.room.power_levels', powerLevel: 100, isStateEvent: true, scope: 'both' }
  ],
  manageChannels: [
    { eventType: 'm.space.child', powerLevel: 50, isStateEvent: true, scope: 'space' },
    { eventType: 'm.room.create', powerLevel: 50, isStateEvent: true, scope: 'both' }
  ],
  manageServerSettings: [
    { eventType: 'm.room.join_rules', powerLevel: 100, isStateEvent: true, scope: 'both' },
    { eventType: 'm.room.history_visibility', powerLevel: 100, isStateEvent: true, scope: 'both' }
  ],
  viewServerInsights: [], // Custom permission, not directly mapped to Matrix

  // Member Management
  kickMembers: [
    { eventType: 'kick', powerLevel: 50, isStateEvent: false, scope: 'both' }
  ],
  banMembers: [
    { eventType: 'ban', powerLevel: 50, isStateEvent: false, scope: 'both' }
  ],
  timeoutMembers: [], // Custom implementation
  moveMembers: [], // Custom implementation for voice channels
  manageMemberRoles: [
    { eventType: 'm.room.power_levels', powerLevel: 50, isStateEvent: true, scope: 'both' }
  ],

  // Channel Permissions
  viewChannels: [
    { eventType: 'm.room.message', powerLevel: 0, isStateEvent: false, scope: 'room' }
  ],
  sendMessages: [
    { eventType: 'm.room.message', powerLevel: 0, isStateEvent: false, scope: 'room' }
  ],
  sendMessagesInThreads: [
    { eventType: 'm.room.message', powerLevel: 0, isStateEvent: false, scope: 'room' }
  ],
  createPublicThreads: [
    { eventType: 'm.room.message', powerLevel: 0, isStateEvent: false, scope: 'room' }
  ],
  createPrivateThreads: [
    { eventType: 'm.room.message', powerLevel: 25, isStateEvent: false, scope: 'room' }
  ],
  embedLinks: [
    { eventType: 'm.room.message', powerLevel: 0, isStateEvent: false, scope: 'room' }
  ],
  attachFiles: [
    { eventType: 'm.room.message', powerLevel: 0, isStateEvent: false, scope: 'room' }
  ],
  addReactions: [
    { eventType: 'm.reaction', powerLevel: 0, isStateEvent: false, scope: 'room' }
  ],
  useExternalEmojis: [], // Custom permission
  readMessageHistory: [
    { eventType: 'events_default', powerLevel: 0, isStateEvent: false, scope: 'room' }
  ],

  // Voice Permissions
  connect: [], // Custom permission for voice channels
  speak: [], // Custom permission for voice channels
  useVoiceActivation: [], // Custom permission
  shareScreen: [], // Custom permission
  useVideo: [], // Custom permission

  // Advanced Permissions
  manageMessages: [
    { eventType: 'redact', powerLevel: 50, isStateEvent: false, scope: 'room' }
  ],
  pinMessages: [
    { eventType: 'm.room.pinned_events', powerLevel: 50, isStateEvent: true, scope: 'room' }
  ],
  mentionEveryone: [], // Custom permission
  createInvites: [
    { eventType: 'invite', powerLevel: 25, isStateEvent: false, scope: 'both' }
  ],
  useSlashCommands: [], // Custom permission
  changeNickname: [
    { eventType: 'm.room.member', powerLevel: 0, isStateEvent: true, scope: 'room' }
  ],
  manageNicknames: [
    { eventType: 'm.room.member', powerLevel: 50, isStateEvent: true, scope: 'room' }
  ],

  // Administrative
  administrator: [
    { eventType: 'state_default', powerLevel: 100, isStateEvent: true, scope: 'both' }
  ]
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get permission template by ID
 */
export function getPermissionTemplate(templateId: string): PermissionTemplate | null {
  return PERMISSION_TEMPLATES.find(template => template.id === templateId) || null;
}

/**
 * Calculate the minimum power level required for a set of permissions
 */
export function calculateRequiredPowerLevel(permissions: HaosPermissions): number {
  let maxPowerLevel = 0;

  for (const [permission, enabled] of Object.entries(permissions)) {
    if (!enabled) continue;

    const mappings = MATRIX_PERMISSION_MAPPINGS[permission as keyof HaosPermissions];
    for (const mapping of mappings) {
      maxPowerLevel = Math.max(maxPowerLevel, mapping.powerLevel);
    }
  }

  return maxPowerLevel;
}

/**
 * Generate Matrix power levels content from HAOS permissions
 */
export function generateMatrixPowerLevels(
  permissions: HaosPermissions,
  basePowerLevel: number = 0,
  existingPowerLevels?: any
): any {
  const powerLevels = {
    ban: 50,
    kick: 50,
    invite: 25,
    redact: 50,
    events_default: 0,
    state_default: 50,
    users_default: 0,
    events: {},
    ...existingPowerLevels
  };

  // Apply permission mappings
  for (const [permission, enabled] of Object.entries(permissions)) {
    if (!enabled) continue;

    const mappings = MATRIX_PERMISSION_MAPPINGS[permission as keyof HaosPermissions];
    for (const mapping of mappings) {
      if (mapping.isStateEvent) {
        if (mapping.eventType === 'state_default') {
          powerLevels.state_default = Math.max(powerLevels.state_default, mapping.powerLevel);
        } else if (mapping.eventType === 'events_default') {
          powerLevels.events_default = Math.max(powerLevels.events_default, mapping.powerLevel);
        } else {
          powerLevels.events[mapping.eventType] = mapping.powerLevel;
        }
      } else {
        // Regular events
        if (mapping.eventType === 'ban') {
          powerLevels.ban = mapping.powerLevel;
        } else if (mapping.eventType === 'kick') {
          powerLevels.kick = mapping.powerLevel;
        } else if (mapping.eventType === 'invite') {
          powerLevels.invite = mapping.powerLevel;
        } else if (mapping.eventType === 'redact') {
          powerLevels.redact = mapping.powerLevel;
        }
      }
    }
  }

  return powerLevels;
}

/**
 * Check if a user has a specific permission based on their power level
 */
export function hasPermission(
  userPowerLevel: number,
  permission: keyof HaosPermissions,
  roomPowerLevels?: any
): boolean {
  const mappings = MATRIX_PERMISSION_MAPPINGS[permission];
  
  for (const mapping of mappings) {
    let requiredLevel = mapping.powerLevel;
    
    // Check if there's a room-specific override
    if (roomPowerLevels) {
      if (mapping.eventType in roomPowerLevels.events) {
        requiredLevel = roomPowerLevels.events[mapping.eventType];
      } else if (mapping.eventType === 'ban') {
        requiredLevel = roomPowerLevels.ban || 50;
      } else if (mapping.eventType === 'kick') {
        requiredLevel = roomPowerLevels.kick || 50;
      } else if (mapping.eventType === 'invite') {
        requiredLevel = roomPowerLevels.invite || 0;
      } else if (mapping.eventType === 'redact') {
        requiredLevel = roomPowerLevels.redact || 50;
      }
    }
    
    if (userPowerLevel < requiredLevel) {
      return false;
    }
  }
  
  return mappings.length > 0; // If no mappings, assume permission is granted
}

/**
 * Get all permissions a user has based on their power level
 */
export function getUserPermissions(
  userPowerLevel: number,
  roomPowerLevels?: any
): HaosPermissions {
  const permissions: HaosPermissions = {} as HaosPermissions;
  
  for (const permission of Object.keys(MATRIX_PERMISSION_MAPPINGS) as (keyof HaosPermissions)[]) {
    permissions[permission] = hasPermission(userPowerLevel, permission, roomPowerLevels);
  }
  
  return permissions;
}

/**
 * Validate that permissions are consistent with power level
 */
export function validatePermissions(
  permissions: HaosPermissions,
  powerLevel: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const requiredLevel = calculateRequiredPowerLevel(permissions);
  
  if (powerLevel < requiredLevel) {
    errors.push(
      `Power level ${powerLevel} is too low for selected permissions. Minimum required: ${requiredLevel}`
    );
  }
  
  // Check for logical inconsistencies
  if (permissions.administrator && powerLevel < 100) {
    errors.push("Administrator permission requires power level 100");
  }
  
  if (permissions.manageRoles && powerLevel < 50) {
    errors.push("Manage roles permission requires at least power level 50");
  }
  
  if (!permissions.viewChannels && permissions.sendMessages) {
    errors.push("Cannot send messages without view channels permission");
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Apply permission template to existing permissions
 */
export function applyPermissionTemplate(
  currentPermissions: HaosPermissions,
  templateId: string
): HaosPermissions {
  const template = getPermissionTemplate(templateId);
  if (!template) {
    throw new Error(`Permission template '${templateId}' not found`);
  }
  
  return { ...template.permissions };
}

/**
 * Update room power levels based on HAOS permissions
 */
export async function updateRoomPermissions(
  roomId: string,
  permissions: HaosPermissions,
  basePowerLevel: number = 0
): Promise<void> {
  const client = getClient();
  if (!client) {
    throw new Error("Matrix client not initialized");
  }

  try {
    // Get current power levels
    const room = client.getRoom(roomId);
    const currentPowerLevels = room?.currentState.getStateEvents("m.room.power_levels", "")?.getContent();
    
    // Generate new power levels
    const newPowerLevels = generateMatrixPowerLevels(permissions, basePowerLevel, currentPowerLevels);
    
    // Update the room
    await client.sendStateEvent(roomId, "m.room.power_levels" as any, newPowerLevels, "");
    
    console.log(`Updated permissions for room ${roomId}`);
  } catch (error) {
    console.error("Failed to update room permissions:", error);
    throw error;
  }
}

const permissionsService = {
  PERMISSION_CATEGORIES,
  PERMISSION_TEMPLATES,
  MATRIX_PERMISSION_MAPPINGS,
  getPermissionTemplate,
  calculateRequiredPowerLevel,
  generateMatrixPowerLevels,
  hasPermission,
  getUserPermissions,
  validatePermissions,
  applyPermissionTemplate,
  updateRoomPermissions,
};

export default permissionsService;