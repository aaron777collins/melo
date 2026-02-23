/**
 * Server Template Type Definitions
 * 
 * Type definitions for Matrix server templates including server structures,
 * channel configurations, and template metadata.
 */

import type { Visibility } from "@/lib/matrix/matrix-sdk-exports";

// =============================================================================
// Core Template Types
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

// =============================================================================
// Service Interface Types
// =============================================================================

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
// UI Component Types
// =============================================================================

export interface TemplateSelectionProps {
  /** Available templates */
  templates: ServerTemplate[];
  /** Currently selected template */
  selectedTemplate?: ServerTemplate;
  /** Called when a template is selected */
  onTemplateSelect: (template: ServerTemplate) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Custom className */
  className?: string;
}

export interface TemplatePreviewProps {
  /** Template to preview */
  template: ServerTemplate;
  /** Custom className */
  className?: string;
  /** Whether to show detailed view */
  detailed?: boolean;
}

export interface TemplateCardProps {
  /** Template to display */
  template: ServerTemplate;
  /** Whether this template is selected */
  isSelected: boolean;
  /** Called when template is selected */
  onSelect: () => void;
  /** Whether the card is disabled */
  disabled?: boolean;
}

// =============================================================================
// Category Labels and Metadata
// =============================================================================

export const CATEGORY_LABELS: Record<ServerTemplateCategory, string> = {
  gaming: "Gaming",
  community: "Community", 
  education: "Education",
  work: "Work",
  creative: "Creative",
  hobby: "Hobby",
};

export const CATEGORY_DESCRIPTIONS: Record<ServerTemplateCategory, string> = {
  gaming: "Templates for gaming communities and esports teams",
  community: "General purpose community and discussion servers",
  education: "Templates for study groups and educational communities",
  work: "Professional workspaces and team collaboration",
  creative: "Communities for artists, writers, and creators",
  hobby: "Special interest groups and hobby communities",
};

// =============================================================================
// Default Power Levels Configuration
// =============================================================================

export const DEFAULT_POWER_LEVELS: ServerSettings["powerLevels"] = {
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