/**
 * Matrix Server Templates
 * 
 * Pre-configured server templates with room structures for different use cases.
 * Creates Matrix spaces with organized channel categories and room configurations.
 */

import { MatrixClient, Room, ICreateRoomOpts, Visibility } from "matrix-js-sdk";

// =============================================================================
// Template Types
// =============================================================================

export interface ServerTemplate {
  /** Unique template identifier */
  id: string;
  /** Display name */
  name: string;
  /** Template description */
  description: string;
  /** Template category */
  category: ServerTemplateCategory;
  /** Icon identifier (emoji or icon name) */
  icon: string;
  /** Whether this template is popular/featured */
  featured: boolean;
  /** Room structure definition */
  structure: ServerStructure;
}

export interface ServerStructure {
  /** Default server settings */
  server: ServerSettings;
  /** Categories and their channels */
  categories: CategoryDefinition[];
}

export interface ServerSettings {
  /** Default visibility for the server */
  visibility: Visibility;
  /** Default join rules */
  joinRule: "public" | "invite" | "knock" | "restricted";
  /** Whether to enable encryption by default */
  encrypted: boolean;
  /** Default room power level requirements */
  powerLevels: {
    invite: number;
    kick: number;
    ban: number;
    redact: number;
    stateDefault: number;
    eventsDefault: number;
    usersDefault: number;
    events: Record<string, number>;
  };
}

export interface CategoryDefinition {
  /** Category display name */
  name: string;
  /** Channels in this category */
  channels: ChannelDefinition[];
  /** Category order */
  order: number;
}

export interface ChannelDefinition {
  /** Channel name */
  name: string;
  /** Channel topic/description */
  topic?: string;
  /** Channel type */
  type: "text" | "voice" | "announcement";
  /** Whether this channel is encrypted */
  encrypted?: boolean;
  /** Custom power levels for this channel */
  powerLevels?: Partial<ServerSettings["powerLevels"]>;
  /** Channel order within category */
  order: number;
}

export type ServerTemplateCategory = 
  | "gaming" 
  | "community" 
  | "education" 
  | "work" 
  | "creative" 
  | "hobby";

export interface CreateServerFromTemplateOptions {
  /** Server name */
  name: string;
  /** Server description/topic */
  description?: string;
  /** Server avatar (file or mxc:// URL) */
  avatar?: string;
  /** Template to use */
  template: ServerTemplate;
  /** Whether to make the server public */
  isPublic?: boolean;
}

export interface CreateServerResult {
  success: boolean;
  server?: {
    id: string;
    name: string;
    rooms: {
      id: string;
      name: string;
      category: string;
    }[];
  };
  error?: string;
}

// =============================================================================
// Default Templates
// =============================================================================

const DEFAULT_POWER_LEVELS: ServerSettings["powerLevels"] = {
  invite: 50,
  kick: 50,
  ban: 50,
  redact: 50,
  stateDefault: 50,
  eventsDefault: 0,
  usersDefault: 0,
  events: {
    "m.room.name": 50,
    "m.room.avatar": 50,
    "m.room.canonical_alias": 50,
    "m.room.history_visibility": 100,
    "m.room.power_levels": 100,
    "m.room.tombstone": 100,
    "m.room.encryption": 100,
  },
};

export const SERVER_TEMPLATES: ServerTemplate[] = [
  // Gaming Templates
  {
    id: "gaming-community",
    name: "Gaming Community",
    description: "Perfect for gaming groups with voice channels, LFG, and game-specific discussions",
    category: "gaming",
    icon: "🎮",
    featured: true,
    structure: {
      server: {
        visibility: Visibility.Private,
        joinRule: "invite",
        encrypted: false,
        powerLevels: DEFAULT_POWER_LEVELS,
      },
      categories: [
        {
          name: "📢 General",
          order: 0,
          channels: [
            { name: "general", topic: "Main chat for everyone", type: "text", order: 0 },
            { name: "announcements", topic: "Important server updates", type: "announcement", order: 1 },
            { name: "rules", topic: "Server rules and guidelines", type: "text", order: 2 },
          ],
        },
        {
          name: "🎯 Gaming",
          order: 1,
          channels: [
            { name: "looking-for-group", topic: "Find teammates and organize games", type: "text", order: 0 },
            { name: "game-chat", topic: "General gaming discussion", type: "text", order: 1 },
            { name: "screenshots", topic: "Share your best gaming moments", type: "text", order: 2 },
          ],
        },
        {
          name: "🔊 Voice",
          order: 2,
          channels: [
            { name: "General Voice", topic: "General voice chat", type: "voice", order: 0 },
            { name: "Game Room 1", topic: "Gaming voice channel", type: "voice", order: 1 },
            { name: "Game Room 2", topic: "Gaming voice channel", type: "voice", order: 2 },
          ],
        },
      ],
    },
  },

  // Study Group Template
  {
    id: "study-group",
    name: "Study Group",
    description: "Organized structure for study groups with subject channels and resource sharing",
    category: "education",
    icon: "📚",
    featured: true,
    structure: {
      server: {
        visibility: Visibility.Private,
        joinRule: "invite",
        encrypted: true,
        powerLevels: DEFAULT_POWER_LEVELS,
      },
      categories: [
        {
          name: "📋 General",
          order: 0,
          channels: [
            { name: "welcome", topic: "Welcome and introductions", type: "text", order: 0 },
            { name: "announcements", topic: "Important updates", type: "announcement", order: 1 },
            { name: "general", topic: "General discussion", type: "text", order: 2 },
          ],
        },
        {
          name: "📖 Study",
          order: 1,
          channels: [
            { name: "study-hall", topic: "General study discussion", type: "text", order: 0 },
            { name: "homework-help", topic: "Get help with assignments", type: "text", order: 1 },
            { name: "resources", topic: "Share study materials and links", type: "text", order: 2 },
            { name: "exam-prep", topic: "Exam preparation and study tips", type: "text", order: 3 },
          ],
        },
        {
          name: "🔊 Study Sessions",
          order: 2,
          channels: [
            { name: "Study Room", topic: "Voice study sessions", type: "voice", order: 0 },
            { name: "Group Work", topic: "Collaborative projects", type: "voice", order: 1 },
          ],
        },
      ],
    },
  },

  // Community Template
  {
    id: "general-community",
    name: "General Community",
    description: "Balanced community server with discussion topics and events",
    category: "community",
    icon: "🏘️",
    featured: true,
    structure: {
      server: {
        visibility: Visibility.Private,
        joinRule: "invite",
        encrypted: false,
        powerLevels: DEFAULT_POWER_LEVELS,
      },
      categories: [
        {
          name: "🏠 Welcome",
          order: 0,
          channels: [
            { name: "welcome", topic: "New member introductions", type: "text", order: 0 },
            { name: "rules", topic: "Community guidelines", type: "text", order: 1 },
            { name: "announcements", topic: "Community updates", type: "announcement", order: 2 },
          ],
        },
        {
          name: "💬 Discussion",
          order: 1,
          channels: [
            { name: "general", topic: "General community chat", type: "text", order: 0 },
            { name: "random", topic: "Random discussions and off-topic", type: "text", order: 1 },
            { name: "events", topic: "Community events and meetups", type: "text", order: 2 },
            { name: "feedback", topic: "Community feedback and suggestions", type: "text", order: 3 },
          ],
        },
        {
          name: "🎪 Social",
          order: 2,
          channels: [
            { name: "Lounge", topic: "Casual voice chat", type: "voice", order: 0 },
            { name: "Events", topic: "Community events voice chat", type: "voice", order: 1 },
          ],
        },
      ],
    },
  },

  // Work Template
  {
    id: "work-team",
    name: "Work Team",
    description: "Professional workspace with project channels and meeting rooms",
    category: "work",
    icon: "💼",
    featured: false,
    structure: {
      server: {
        visibility: Visibility.Private,
        joinRule: "invite",
        encrypted: true,
        powerLevels: DEFAULT_POWER_LEVELS,
      },
      categories: [
        {
          name: "📢 Company",
          order: 0,
          channels: [
            { name: "announcements", topic: "Company-wide announcements", type: "announcement", order: 0 },
            { name: "general", topic: "General team discussion", type: "text", order: 1 },
            { name: "water-cooler", topic: "Casual chat and social", type: "text", order: 2 },
          ],
        },
        {
          name: "🚀 Projects",
          order: 1,
          channels: [
            { name: "project-alpha", topic: "Project Alpha discussions", type: "text", encrypted: true, order: 0 },
            { name: "project-beta", topic: "Project Beta discussions", type: "text", encrypted: true, order: 1 },
            { name: "backlog", topic: "Task backlog and planning", type: "text", order: 2 },
          ],
        },
        {
          name: "🎤 Meetings",
          order: 2,
          channels: [
            { name: "Daily Standup", topic: "Daily standup meetings", type: "voice", order: 0 },
            { name: "Conference Room", topic: "General meetings", type: "voice", order: 1 },
          ],
        },
      ],
    },
  },

  // Creative Template
  {
    id: "creative-collective",
    name: "Creative Collective",
    description: "Perfect for artists, writers, and creative communities",
    category: "creative",
    icon: "🎨",
    featured: false,
    structure: {
      server: {
        visibility: Visibility.Private,
        joinRule: "invite",
        encrypted: false,
        powerLevels: DEFAULT_POWER_LEVELS,
      },
      categories: [
        {
          name: "🎯 General",
          order: 0,
          channels: [
            { name: "introductions", topic: "Share your creative background", type: "text", order: 0 },
            { name: "announcements", topic: "Community updates", type: "announcement", order: 1 },
            { name: "general", topic: "General creative discussion", type: "text", order: 2 },
          ],
        },
        {
          name: "🎨 Showcase",
          order: 1,
          channels: [
            { name: "artwork", topic: "Share your visual art", type: "text", order: 0 },
            { name: "writing", topic: "Share your writing projects", type: "text", order: 1 },
            { name: "music", topic: "Share your musical creations", type: "text", order: 2 },
            { name: "feedback", topic: "Constructive critiques and feedback", type: "text", order: 3 },
          ],
        },
        {
          name: "🛠️ Workshop",
          order: 2,
          channels: [
            { name: "Creative Session", topic: "Live creative work sessions", type: "voice", order: 0 },
            { name: "Collaboration", topic: "Collaborative projects", type: "voice", order: 1 },
          ],
        },
      ],
    },
  },

  // Hobby Template
  {
    id: "hobby-enthusiasts",
    name: "Hobby Enthusiasts",
    description: "General-purpose template for hobby communities and interest groups",
    category: "hobby",
    icon: "🎯",
    featured: false,
    structure: {
      server: {
        visibility: Visibility.Private,
        joinRule: "invite",
        encrypted: false,
        powerLevels: DEFAULT_POWER_LEVELS,
      },
      categories: [
        {
          name: "👋 Welcome",
          order: 0,
          channels: [
            { name: "welcome", topic: "Welcome to the community!", type: "text", order: 0 },
            { name: "introductions", topic: "Tell us about yourself", type: "text", order: 1 },
            { name: "rules", topic: "Community guidelines", type: "text", order: 2 },
          ],
        },
        {
          name: "💭 Discussion",
          order: 1,
          channels: [
            { name: "general", topic: "General hobby discussion", type: "text", order: 0 },
            { name: "beginners", topic: "Questions from newcomers", type: "text", order: 1 },
            { name: "advanced", topic: "Advanced techniques and discussion", type: "text", order: 2 },
            { name: "marketplace", topic: "Buy, sell, and trade", type: "text", order: 3 },
          ],
        },
        {
          name: "🗣️ Voice",
          order: 2,
          channels: [
            { name: "General Chat", topic: "General voice discussion", type: "voice", order: 0 },
            { name: "Workshop", topic: "Live project work", type: "voice", order: 1 },
          ],
        },
      ],
    },
  },
];

// =============================================================================
// Matrix Server Creation Service
// =============================================================================

export class MatrixServerTemplateService {
  private client: MatrixClient;

  constructor(client: MatrixClient) {
    this.client = client;
  }

  /**
   * Create a new server from a template
   */
  async createServerFromTemplate(options: CreateServerFromTemplateOptions): Promise<CreateServerResult> {
    try {
      const { name, description, template, isPublic = false } = options;

      // Step 1: Create the main space (server)
      const spaceOptions: ICreateRoomOpts = {
        name,
        topic: description,
        visibility: isPublic ? Visibility.Public : template.structure.server.visibility,
        creation_content: {
          type: "m.space",
        },
        power_level_content_override: template.structure.server.powerLevels,
        initial_state: [
          {
            type: "m.room.join_rules",
            content: {
              join_rule: isPublic ? "public" : template.structure.server.joinRule,
            },
          },
          {
            type: "m.room.history_visibility",
            content: {
              history_visibility: "shared",
            },
          },
        ],
      };

      // Add encryption if specified
      if (template.structure.server.encrypted) {
        spaceOptions.initial_state?.push({
          type: "m.room.encryption",
          content: {
            algorithm: "m.megolm.v1.aes-sha2",
          },
        });
      }

      const spaceRoom = await this.client.createRoom(spaceOptions);
      const spaceId = spaceRoom.room_id;

      console.log(`[ServerTemplate] Created space: ${spaceId}`);

      // Step 2: Create categories and channels
      const createdRooms: { id: string; name: string; category: string }[] = [];

      for (const category of template.structure.categories) {
        for (const channel of category.channels) {
          const roomOptions: ICreateRoomOpts = {
            name: channel.name,
            topic: channel.topic,
            visibility: Visibility.Private,
            power_level_content_override: {
              ...template.structure.server.powerLevels,
              ...channel.powerLevels,
            },
            initial_state: [
              {
                type: "m.room.join_rules",
                content: {
                  join_rule: "restricted",
                  allow: [
                    {
                      type: "m.room_membership",
                      room_id: spaceId,
                    },
                  ],
                },
              },
              {
                type: "m.room.history_visibility",
                content: {
                  history_visibility: "shared",
                },
              },
            ],
          };

          // Add encryption if specified
          const shouldEncrypt = channel.encrypted ?? template.structure.server.encrypted;
          if (shouldEncrypt) {
            roomOptions.initial_state?.push({
              type: "m.room.encryption",
              content: {
                algorithm: "m.megolm.v1.aes-sha2",
              },
            });
          }

          // Create the room
          const room = await this.client.createRoom(roomOptions);
          const roomId = room.room_id;

          console.log(`[ServerTemplate] Created room: ${channel.name} (${roomId})`);

          // Add room to space
          await this.client.sendStateEvent(
            spaceId,
            "m.space.child" as any,
            {
              via: [this.client.getDomain()!],
              order: `${category.order.toString().padStart(2, '0')}.${channel.order.toString().padStart(2, '0')}`,
            },
            roomId
          );

          // Add space as parent to room
          await this.client.sendStateEvent(
            roomId,
            "m.space.parent" as any,
            {
              via: [this.client.getDomain()!],
              canonical: true,
            },
            spaceId
          );

          createdRooms.push({
            id: roomId,
            name: channel.name,
            category: category.name,
          });
        }
      }

      return {
        success: true,
        server: {
          id: spaceId,
          name,
          rooms: createdRooms,
        },
      };
    } catch (error) {
      console.error("[ServerTemplate] Failed to create server from template:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create server",
      };
    }
  }

  /**
   * Get all available templates
   */
  getTemplates(): ServerTemplate[] {
    return SERVER_TEMPLATES;
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: ServerTemplateCategory): ServerTemplate[] {
    return SERVER_TEMPLATES.filter(template => template.category === category);
  }

  /**
   * Get featured templates
   */
  getFeaturedTemplates(): ServerTemplate[] {
    return SERVER_TEMPLATES.filter(template => template.featured);
  }

  /**
   * Get template by ID
   */
  getTemplateById(id: string): ServerTemplate | undefined {
    return SERVER_TEMPLATES.find(template => template.id === id);
  }
}

/**
 * Create a server template service instance
 */
export function createServerTemplateService(client: MatrixClient): MatrixServerTemplateService {
  return new MatrixServerTemplateService(client);
}