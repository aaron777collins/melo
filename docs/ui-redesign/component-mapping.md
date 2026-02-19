# Component Mapping: Discord Clone → MELO

**Created:** 2026-02-18
**Status:** Complete ✅

## Overview

This document maps components from the discord-clone reference to existing MELO components, identifying what needs to be modified, replaced, or created.

## Component Structure Comparison

MELO was originally forked from discord-clone, so the structure is nearly identical. The main differences are in backend integration (Matrix vs Clerk/Prisma).

## Navigation Components

### `components/navigation/`

| Discord Clone | MELO | Status | Notes |
|---------------|------|--------|-------|
| `navigation-sidebar.tsx` | `navigation-sidebar.tsx` | ✅ Exists | Modified for Matrix auth |
| `navigation-action.tsx` | `navigation-action.tsx` | ✅ Identical | Create server button |
| `navigation-item.tsx` | `navigation-item.tsx` | ✅ Identical | Server icon item |

**Files:**
- `/tmp/discord-clone-ref/components/navigation/navigation-sidebar.tsx` (1689 bytes)
- `/tmp/discord-clone-ref/components/navigation/navigation-action.tsx` (906 bytes)
- `/tmp/discord-clone-ref/components/navigation/navigation-item.tsx` (1334 bytes)

## Server Components

### `components/server/`

| Discord Clone | MELO | Status | Notes |
|---------------|------|--------|-------|
| `server-sidebar.tsx` | `server-sidebar.tsx` | ✅ Modified | Larger in MELO (Matrix integration) |
| `server-header.tsx` | `server-header.tsx` | ✅ Exists | Modified for Matrix |
| `server-channel.tsx` | `server-channel.tsx` | ✅ Exists | Modified for Matrix |
| `server-member.tsx` | `server-member.tsx` | ✅ Exists | Modified for Matrix |
| `server-search.tsx` | `server-search.tsx` | ✅ Identical | Command palette search |
| `server-section.tsx` | `server-section.tsx` | ✅ Exists | Modified for Matrix |

**Files:**
- `/tmp/discord-clone-ref/components/server/server-sidebar.tsx` (6081 bytes)
- `/tmp/discord-clone-ref/components/server/server-header.tsx` (3277 bytes)
- `/tmp/discord-clone-ref/components/server/server-channel.tsx` (2709 bytes)
- `/tmp/discord-clone-ref/components/server/server-member.tsx` (1674 bytes)
- `/tmp/discord-clone-ref/components/server/server-search.tsx` (2995 bytes)
- `/tmp/discord-clone-ref/components/server/server-section.tsx` (1710 bytes)

## Chat Components

### `components/chat/`

| Discord Clone | MELO | Status | Notes |
|---------------|------|--------|-------|
| `chat-header.tsx` | `chat-header.tsx` | ✅ Identical | Channel header bar |
| `chat-input.tsx` | `chat-input.tsx` | ✅ Identical | Message input |
| `chat-item.tsx` | `chat-item.tsx` | ✅ Modified | Message display (Matrix) |
| `chat-messages.tsx` | `chat-messages.tsx` | ✅ Modified | Message list (Matrix) |
| `chat-video-button.tsx` | `chat-video-button.tsx` | ✅ Identical | Video call button |
| `chat-welcome.tsx` | `chat-welcome.tsx` | ✅ Identical | Welcome message |

**Files:**
- `/tmp/discord-clone-ref/components/chat/chat-header.tsx` (1241 bytes)
- `/tmp/discord-clone-ref/components/chat/chat-input.tsx` (3021 bytes)
- `/tmp/discord-clone-ref/components/chat/chat-item.tsx` (8069 bytes)
- `/tmp/discord-clone-ref/components/chat/chat-messages.tsx` (3983 bytes)
- `/tmp/discord-clone-ref/components/chat/chat-video-button.tsx` (1083 bytes)
- `/tmp/discord-clone-ref/components/chat/chat-welcome.tsx` (865 bytes)

## Modal Components

### `components/modals/`

| Discord Clone | MELO | Status | Notes |
|---------------|------|--------|-------|
| `create-server-modal.tsx` | `create-server-modal.tsx` | ✅ Identical | Server creation |
| `create-channel-modal.tsx` | `create-channel-modal.tsx` | ✅ Modified | Matrix channels |
| `delete-channel-modal.tsx` | `delete-channel-modal.tsx` | ✅ Identical | |
| `delete-message-modal.tsx` | `delete-message-modal.tsx` | ✅ Identical | |
| `delete-server-modal.tsx` | `delete-server-modal.tsx` | ✅ Identical | |
| `edit-channel-modal.tsx` | `edit-channel-modal.tsx` | ✅ Modified | Matrix channels |
| `edit-server-modal.tsx` | `edit-server-modal.tsx` | ✅ Identical | |
| `initial-modal.tsx` | `initial-modal.tsx` | ✅ Identical | First-run modal |
| `invite-modal.tsx` | `invite-modal.tsx` | ✅ Identical | |
| `leave-server-modal.tsx` | `leave-server-modal.tsx` | ✅ Identical | |
| `members-modal.tsx` | `members-modal.tsx` | ✅ Modified | Matrix members |
| `message-file-modal.tsx` | `message-file-modal.tsx` | ✅ Identical | |

**Files:**
- `/tmp/discord-clone-ref/components/modals/create-server-modal.tsx` (3988 bytes)
- `/tmp/discord-clone-ref/components/modals/create-channel-modal.tsx` (5097 bytes)
- `/tmp/discord-clone-ref/components/modals/delete-channel-modal.tsx` (2215 bytes)
- `/tmp/discord-clone-ref/components/modals/delete-message-modal.tsx` (1960 bytes)
- `/tmp/discord-clone-ref/components/modals/delete-server-modal.tsx` (2024 bytes)
- `/tmp/discord-clone-ref/components/modals/edit-channel-modal.tsx` (5040 bytes)
- `/tmp/discord-clone-ref/components/modals/edit-server-modal.tsx` (4186 bytes)
- `/tmp/discord-clone-ref/components/modals/initial-modal.tsx` (3896 bytes)
- `/tmp/discord-clone-ref/components/modals/invite-modal.tsx` (2748 bytes)
- `/tmp/discord-clone-ref/components/modals/leave-server-modal.tsx` (1978 bytes)
- `/tmp/discord-clone-ref/components/modals/members-modal.tsx` (5994 bytes)
- `/tmp/discord-clone-ref/components/modals/message-file-modal.tsx` (3142 bytes)

## UI Base Components (shadcn/ui)

### `components/ui/`

| Discord Clone | MELO | Purpose |
|---------------|------|---------|
| `avatar.tsx` | `avatar.tsx` | User avatars |
| `badge.tsx` | `badge.tsx` | Status badges |
| `button.tsx` | `button.tsx` | Button variants |
| `command.tsx` | `command.tsx` | Command palette |
| `dialog.tsx` | `dialog.tsx` | Modal dialogs |
| `dropdown-menu.tsx` | `dropdown-menu.tsx` | Context menus |
| `form.tsx` | `form.tsx` | Form handling |
| `input.tsx` | `input.tsx` | Text inputs |
| `label.tsx` | `label.tsx` | Form labels |
| `popover.tsx` | `popover.tsx` | Popovers |
| `scroll-area.tsx` | `scroll-area.tsx` | Scrollable areas |
| `select.tsx` | `select.tsx` | Select dropdowns |
| `separator.tsx` | `separator.tsx` | Dividers |
| `sheet.tsx` | `sheet.tsx` | Slide-out panels |
| `tooltip.tsx` | `tooltip.tsx` | Tooltips |

**All UI components are from shadcn/ui and should be identical.**

## Utility Components

### Root `components/`

| Discord Clone | MELO | Status | Notes |
|---------------|------|--------|-------|
| `action-tooltip.tsx` | `action-tooltip.tsx` | ✅ Identical | |
| `emoji-picker.tsx` | `emoji-picker.tsx` | ✅ Identical | |
| `file-upload.tsx` | `file-upload.tsx` | ✅ Modified | UploadThing |
| `media-room.tsx` | `media-room.tsx` | ✅ Modified | LiveKit |
| `mobile-toggle.tsx` | `mobile-toggle.tsx` | ✅ Identical | |
| `mode-toggle.tsx` | `mode-toggle.tsx` | ✅ Identical | Dark mode |
| `socket-indicatior.tsx` | `socket-indicatior.tsx` | ✅ Identical | |
| `user-avatar.tsx` | `user-avatar.tsx` | ✅ Identical | |
| - | `matrix-user-button.tsx` | 🆕 MELO Only | Matrix auth |

## Provider Components

### `components/providers/`

| Discord Clone | MELO | Status | Notes |
|---------------|------|--------|-------|
| `modal-provider.tsx` | `modal-provider.tsx` | ✅ Exists | |
| `query-provider.tsx` | `query-provider.tsx` | ✅ Exists | |
| `socket-provider.tsx` | `socket-provider.tsx` | ✅ Modified | Matrix |
| `theme-provider.tsx` | `theme-provider.tsx` | ✅ Exists | |

## Summary

### Components by Status

| Status | Count | Description |
|--------|-------|-------------|
| ✅ Identical | ~25 | No changes needed |
| ✅ Modified | ~12 | Backend changes only (Matrix) |
| 🆕 MELO Only | 1 | New for Matrix auth |

### Phase 2 Priority Components

For UI redesign, focus on styling these components:

1. **High Priority (Core Layout)**
   - `navigation-sidebar.tsx` - Server list
   - `server-sidebar.tsx` - Channel list
   - `chat-messages.tsx` - Message area
   - `chat-input.tsx` - Input area

2. **Medium Priority (Interactions)**
   - `server-header.tsx` - Server dropdown
   - `chat-item.tsx` - Individual messages
   - All modal components

3. **Lower Priority (Already styled)**
   - `components/ui/*` - Base components (shadcn)
   - Utility components

## Implementation Notes

1. **Style changes only** - Component logic is already Matrix-compatible
2. **Use CSS variables** - Colors defined in `globals.css`
3. **Tailwind utilities** - Most styling is via Tailwind classes
4. **Dark mode first** - Discord uses dark theme primarily
