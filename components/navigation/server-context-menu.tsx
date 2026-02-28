/**
 * Server Context Menu Component
 * 
 * Right-click context menu for server navigation items with Leave Server option.
 * Integrates with existing LeaveServerModal through useModal hook.
 * 
 * Features:
 * - Right-click context menu for server icons
 * - Leave Server action with confirmation modal
 * - Keyboard navigation support (Escape to close)
 * - Click outside to close functionality
 * - WCAG compliant accessibility
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { LogOut } from 'lucide-react';
import { useModal } from '@/hooks/use-modal-store';

interface ServerData {
  id: string;
  name: string;
  imageUrl?: string | null;
}

interface ServerContextMenuProps {
  /** Whether the context menu is visible */
  isVisible: boolean;
  /** X position for the context menu */
  x: number;
  /** Y position for the context menu */
  y: number;
  /** Server data */
  server: ServerData;
  /** Callback when menu should close */
  onClose: () => void;
}

export function ServerContextMenu({
  isVisible,
  x,
  y,
  server,
  onClose,
}: ServerContextMenuProps) {
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
            handleLeaveServer();
          }
          break;
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const handleLeaveServer = () => {
    try {
      // Convert space data to format expected by LeaveServerModal
      onOpen('leaveServer', {
        server: {
          id: server.id,
          name: server.name,
          imageUrl: server.imageUrl || '',
          inviteCode: '',
        },
      });
      onClose();
    } catch (error) {
      console.error('Failed to open leave server modal:', error);
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
        data-testid="server-context-menu"
        className="fixed z-50 bg-[#1a1d23] border border-[#313338] rounded-md shadow-lg py-1 min-w-[160px] focus:outline-none"
        style={{
          left: Math.min(x, window.innerWidth - 160), // Prevent overflow
          top: Math.min(y, window.innerHeight - 100), // Prevent overflow
        }}
        onClick={(e) => e.stopPropagation()}
        role="menu"
        aria-label={`Actions for ${server.name}`}
        tabIndex={-1}
      >
        <button
          className="w-full px-3 py-2 text-sm text-left hover:bg-[#3a3d43] transition-colors text-red-400 hover:text-red-300 flex items-center gap-2 focus:bg-[#3a3d43] focus:outline-none"
          onClick={handleLeaveServer}
          role="menuitem"
          aria-label={`Leave ${server.name}`}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Leave Server
        </button>
      </div>
    </>
  );
}