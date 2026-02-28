/**
 * Channel Context Menu Component
 * 
 * Right-click context menu for channel navigation items with Delete Channel option for admins.
 * Based on the existing ServerContextMenu pattern.
 * 
 * Features:
 * - Right-click context menu for channel items
 * - Delete Channel action with confirmation modal (admin/owner only)
 * - Keyboard navigation support (Escape to close)
 * - Click outside to close functionality
 * - WCAG compliant accessibility
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { useModal } from '@/hooks/use-modal-store';

interface ChannelData {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'video' | 'announcement' | 'audio';
}

interface ServerData {
  id: string;
  name: string;
}

interface ChannelContextMenuProps {
  /** Whether the context menu is visible */
  isVisible: boolean;
  /** X position for the context menu */
  x: number;
  /** Y position for the context menu */
  y: number;
  /** Channel data */
  channel: ChannelData;
  /** Server data */
  server: ServerData;
  /** Whether the user can delete this channel */
  canDelete: boolean;
  /** Callback when menu should close */
  onClose: () => void;
}

export function ChannelContextMenu({
  isVisible,
  x,
  y,
  channel,
  server,
  canDelete,
  onClose,
}: ChannelContextMenuProps) {
  const { onOpen } = useModal();
  const menuRef = useRef<HTMLDivElement>(null);

  // Focus the menu when it becomes visible for keyboard accessibility
  useEffect(() => {
    if (isVisible && menuRef.current) {
      menuRef.current.focus();
    }
  }, [isVisible]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;
      
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'Enter':
        case ' ':
          if (document.activeElement === menuRef.current?.querySelector('[role="menuitem"]')) {
            e.preventDefault();
            if (canDelete) {
              handleDeleteChannel();
            }
          }
          break;
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible, onClose, canDelete]);

  if (!isVisible) return null;

  const handleDeleteChannel = () => {
    try {
      // Open the delete channel modal with channel and server data
      onOpen('deleteChannel', {
        channel: {
          id: channel.id,
          name: channel.name,
          type: channel.type,
        },
        server: {
          id: server.id,
          name: server.name,
        },
      });
      onClose();
    } catch (error) {
      console.error('Failed to open delete channel modal:', error);
      onClose();
    }
  };

  const handleClickOutside = () => {
    onClose();
  };

  return (
    <>
      {/* Backdrop to capture clicks outside the menu */}
      <div
        className="fixed inset-0 z-50"
        onClick={handleClickOutside}
        onContextMenu={(e) => e.preventDefault()}
        aria-hidden="true"
      />
      
      {/* Context Menu */}
      <div
        ref={menuRef}
        data-testid="channel-context-menu"
        className="fixed z-50 bg-[#1a1d23] border border-[#313338] rounded-md shadow-lg py-1 min-w-[160px] focus:outline-none"
        style={{
          left: Math.min(x, window.innerWidth - 160), // Prevent overflow
          top: Math.min(y, window.innerHeight - 100), // Prevent overflow
        }}
        onClick={(e) => e.stopPropagation()}
        role="menu"
        aria-label={`Actions for #${channel.name}`}
        tabIndex={-1}
      >
        {canDelete && (
          <button
            className="w-full px-3 py-2 text-sm text-left hover:bg-[#3a3d43] transition-colors text-red-400 hover:text-red-300 flex items-center gap-2 focus:bg-[#3a3d43] focus:outline-none"
            onClick={handleDeleteChannel}
            role="menuitem"
            aria-label={`Delete #${channel.name}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete Channel
          </button>
        )}
      </div>
    </>
  );
}