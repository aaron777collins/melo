/**
 * Matrix Invite Service
 * 
 * Handles Matrix room invites with custom slugs, QR code generation,
 * and shareable invite link creation.
 */

import {  MatrixClient, Room  } from "@/lib/matrix/matrix-sdk-exports";
import QRCode from "qrcode";

export interface InviteLink {
  /** The Matrix room alias or ID */
  roomId: string;
  /** Custom slug for the invite (optional) */
  slug?: string;
  /** The full invite URL */
  url: string;
  /** Matrix room alias if available */
  alias?: string;
  /** When the invite was created */
  createdAt: Date;
  /** Optional expiration date */
  expiresAt?: Date;
  /** Maximum number of uses (0 = unlimited) */
  maxUses?: number;
  /** Current number of uses */
  currentUses: number;
}

export interface CreateInviteOptions {
  /** Custom slug for the invite URL */
  slug?: string;
  /** Expiration time in milliseconds from now */
  expirationMs?: number;
  /** Maximum number of uses (0 or undefined = unlimited) */
  maxUses?: number;
  /** Whether to create a Matrix room alias for the invite */
  createAlias?: boolean;
}

export interface InviteResult {
  success: boolean;
  invite?: InviteLink;
  error?: string;
}

export interface QRCodeResult {
  success: boolean;
  dataUrl?: string;
  error?: string;
}

/**
 * Matrix Invite Service
 * Manages room invites, custom slugs, and QR code generation
 */
export class MatrixInviteService {
  private client: MatrixClient;
  private baseUrl: string;

  constructor(client: MatrixClient, baseUrl?: string) {
    this.client = client;
    // Default to current origin for invite links
    this.baseUrl = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://melo.app');
  }

  /**
   * Create a new invite link for a room
   */
  async createInvite(roomId: string, options: CreateInviteOptions = {}): Promise<InviteResult> {
    try {
      const room = this.client.getRoom(roomId);
      if (!room) {
        return { success: false, error: "Room not found" };
      }

      // Check permissions
      if (!this.canCreateInvite(room)) {
        return { success: false, error: "Insufficient permissions to create invites" };
      }

      let inviteUrl: string;
      let alias: string | undefined;

      if (options.createAlias && options.slug) {
        // Try to create a room alias with the custom slug
        const aliasResult = await this.createRoomAlias(room, options.slug);
        if (aliasResult.success && aliasResult.alias) {
          alias = aliasResult.alias;
          inviteUrl = this.buildInviteUrl(alias);
        } else {
          // Fall back to room ID if alias creation fails
          inviteUrl = this.buildInviteUrl(roomId, options.slug);
        }
      } else {
        // Use room ID with optional custom slug
        inviteUrl = this.buildInviteUrl(roomId, options.slug);
      }

      const invite: InviteLink = {
        roomId,
        slug: options.slug,
        url: inviteUrl,
        alias,
        createdAt: new Date(),
        expiresAt: options.expirationMs ? new Date(Date.now() + options.expirationMs) : undefined,
        maxUses: options.maxUses || 0,
        currentUses: 0
      };

      return { success: true, invite };
    } catch (error) {
      console.error("[InviteService] Failed to create invite:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to create invite" 
      };
    }
  }

  /**
   * Generate QR code for an invite link
   */
  async generateQRCode(invite: InviteLink, options: { size?: number } = {}): Promise<QRCodeResult> {
    try {
      const size = options.size || 256;
      const dataUrl = await QRCode.toDataURL(invite.url, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      return { success: true, dataUrl };
    } catch (error) {
      console.error("[InviteService] Failed to generate QR code:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to generate QR code" 
      };
    }
  }

  /**
   * Validate a custom slug
   */
  validateSlug(slug: string): { valid: boolean; error?: string } {
    if (!slug || slug.length === 0) {
      return { valid: false, error: "Slug cannot be empty" };
    }

    if (slug.length < 3) {
      return { valid: false, error: "Slug must be at least 3 characters long" };
    }

    if (slug.length > 32) {
      return { valid: false, error: "Slug cannot be longer than 32 characters" };
    }

    // Only allow alphanumeric characters, hyphens, and underscores
    const slugRegex = /^[a-zA-Z0-9_-]+$/;
    if (!slugRegex.test(slug)) {
      return { valid: false, error: "Slug can only contain letters, numbers, hyphens, and underscores" };
    }

    // Cannot start or end with hyphen or underscore
    if (slug.startsWith('-') || slug.startsWith('_') || slug.endsWith('-') || slug.endsWith('_')) {
      return { valid: false, error: "Slug cannot start or end with hyphen or underscore" };
    }

    return { valid: true };
  }

  /**
   * Get existing invites for a room (stored locally)
   */
  getInvites(roomId: string): InviteLink[] {
    try {
      const stored = localStorage.getItem(`melo_invites_${roomId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Save invite to local storage
   */
  saveInvite(invite: InviteLink): void {
    try {
      const existing = this.getInvites(invite.roomId);
      const updated = [...existing, invite];
      localStorage.setItem(`melo_invites_${invite.roomId}`, JSON.stringify(updated));
    } catch (error) {
      console.error("[InviteService] Failed to save invite:", error);
    }
  }

  /**
   * Delete an invite
   */
  deleteInvite(roomId: string, inviteUrl: string): void {
    try {
      const existing = this.getInvites(roomId);
      const updated = existing.filter(invite => invite.url !== inviteUrl);
      localStorage.setItem(`melo_invites_${roomId}`, JSON.stringify(updated));
    } catch (error) {
      console.error("[InviteService] Failed to delete invite:", error);
    }
  }

  /**
   * Check if current user can create invites for a room
   */
  private canCreateInvite(room: Room): boolean {
    const userId = this.client.getUserId();
    if (!userId) return false;

    const powerLevel = room.getMember(userId)?.powerLevel || 0;
    const invitePowerLevel = room.currentState.getStateEvents("m.room.power_levels", "")?.getContent()?.invite || 0;
    
    return powerLevel >= invitePowerLevel;
  }

  /**
   * Try to create a room alias for custom slug
   */
  private async createRoomAlias(room: Room, slug: string): Promise<{ success: boolean; alias?: string }> {
    try {
      const homeserver = this.client.getDomain();
      const alias = `#${slug}:${homeserver}`;
      
      await this.client.createAlias(alias, room.roomId);
      return { success: true, alias };
    } catch (error) {
      console.error("[InviteService] Failed to create alias:", error);
      return { success: false };
    }
  }

  /**
   * Build the full invite URL
   */
  private buildInviteUrl(roomIdentifier: string, slug?: string): string {
    // If we have a custom slug, use it in the path
    if (slug) {
      return `${this.baseUrl}/invite/${slug}`;
    }
    
    // For Matrix room IDs and aliases, use the standard format
    if (roomIdentifier.startsWith('#')) {
      // Room alias - encode it for URL safety
      const encodedAlias = encodeURIComponent(roomIdentifier);
      return `${this.baseUrl}/rooms/${encodedAlias}`;
    } else {
      // Room ID
      return `${this.baseUrl}/rooms/${roomIdentifier}`;
    }
  }
}

/**
 * Utility function to create invite service instance
 */
export function createInviteService(client: MatrixClient, baseUrl?: string): MatrixInviteService {
  return new MatrixInviteService(client, baseUrl);
}

/**
 * Parse an invite URL to extract room information
 */
export function parseInviteUrl(url: string): { roomId?: string; slug?: string; alias?: string } | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    if (pathParts[0] === 'invite' && pathParts[1]) {
      // Custom slug format: /invite/slug
      return { slug: pathParts[1] };
    } else if (pathParts[0] === 'rooms' && pathParts[1]) {
      // Standard format: /rooms/!roomId or /rooms/%23alias
      const identifier = decodeURIComponent(pathParts[1]);
      if (identifier.startsWith('#')) {
        return { alias: identifier };
      } else {
        return { roomId: identifier };
      }
    }

    return null;
  } catch {
    return null;
  }
}