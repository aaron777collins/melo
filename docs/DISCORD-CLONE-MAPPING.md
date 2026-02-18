# Discord Clone → Melo Component Mapping

**Created:** 2026-02-18  
**Reference:** https://github.com/nayak-nirmalya/discord-clone  
**Local clone:** /tmp/discord-clone-ref

---

## Color Palette (EXACT VALUES)

### Discord Clone Colors (from components)

| Element | Dark Mode | Light Mode |
|---------|-----------|------------|
| Navigation sidebar | `#1e1f22` | `#e3e5e8` |
| Server/Channel sidebar | `#2b2d31` | `#f2f3f5` |
| Chat input text | `#313338` (dark bg) | white |

### CSS Variables (from globals.css)

```css
/* Light mode */
--background: 0 0% 100%;
--foreground: 20 14.3% 4.1%;
--primary: 24 9.8% 10%;
--secondary: 60 4.8% 95.9%;
--muted: 60 4.8% 95.9%;
--muted-foreground: 25 5.3% 44.7%;
--border: 20 5.9% 90%;

/* Dark mode */
--background: 20 14.3% 4.1%;
--foreground: 60 9.1% 97.8%;
--primary: 60 9.1% 97.8%;
--secondary: 12 6.5% 15.1%;
--muted: 12 6.5% 15.1%;
--muted-foreground: 24 5.4% 63.9%;
--border: 12 6.5% 15.1%;
```

---

## Component Mapping

### Navigation (Server List - Left Rail)

| Discord Clone | Melo | Status | Priority |
|---------------|------|--------|----------|
| `navigation/navigation-sidebar.tsx` | `navigation/navigation-sidebar.tsx` | 🔴 RESTYLE | P0 |
| `navigation/navigation-item.tsx` | `navigation/navigation-item.tsx` | 🔴 RESTYLE | P0 |
| `navigation/navigation-action.tsx` | `navigation/navigation-action.tsx` | 🔴 RESTYLE | P0 |

**Key classes to copy:**
```tsx
// navigation-sidebar.tsx
<div className="space-y-4 flex flex-col h-full items-center text-primary w-full dark:bg-[#1e1f22] bg-[#e3e5e8] py-3">
```

---

### Server Sidebar (Channel List)

| Discord Clone | Melo | Status | Priority |
|---------------|------|--------|----------|
| `server/server-sidebar.tsx` | `server/server-sidebar.tsx` | 🔴 RESTYLE | P0 |
| `server/server-header.tsx` | `server/server-header.tsx` | 🔴 RESTYLE | P0 |
| `server/server-channel.tsx` | `server/server-channel.tsx` | 🔴 RESTYLE | P1 |
| `server/server-section.tsx` | `server/server-section.tsx` | 🔴 RESTYLE | P1 |
| `server/server-member.tsx` | `server/server-member.tsx` | 🔴 RESTYLE | P1 |
| `server/server-search.tsx` | `server/server-search.tsx` | 🔴 RESTYLE | P1 |

**Key classes to copy:**
```tsx
// server-sidebar.tsx
<div className="flex flex-col h-full text-primary w-full dark:bg-[#2b2d31] bg-[#f2f3f5]">
```

---

### Chat Components

| Discord Clone | Melo | Status | Priority |
|---------------|------|--------|----------|
| `chat/chat-header.tsx` | `chat/chat-header.tsx` | 🔴 RESTYLE | P0 |
| `chat/chat-input.tsx` | `chat/chat-input.tsx` | 🔴 RESTYLE | P0 |
| `chat/chat-messages.tsx` | `chat/chat-messages.tsx` | 🔴 RESTYLE | P0 |
| `chat/chat-item.tsx` | `chat/chat-item.tsx` | 🔴 RESTYLE | P0 |
| `chat/chat-welcome.tsx` | `chat/chat-welcome.tsx` | 🔴 RESTYLE | P1 |
| `chat/chat-video-button.tsx` | `chat/chat-video-button.tsx` | 🔴 RESTYLE | P1 |

---

### Modals

| Discord Clone | Melo | Status | Priority |
|---------------|------|--------|----------|
| `modals/initial-modal.tsx` | `modals/initial-modal.tsx` | 🔴 RESTYLE | P0 |
| `modals/create-server-modal.tsx` | (merge with initial) | 🔴 RESTYLE | P0 |
| `modals/invite-modal.tsx` | `modals/invite-modal.tsx` | 🔴 RESTYLE | P1 |
| `modals/create-channel-modal.tsx` | (via server settings) | 🔴 RESTYLE | P1 |
| `modals/edit-server-modal.tsx` | `modals/edit-server-modal.tsx` | 🔴 RESTYLE | P1 |
| `modals/members-modal.tsx` | `modals/members-modal.tsx` | 🔴 RESTYLE | P1 |
| `modals/leave-server-modal.tsx` | `modals/leave-server-modal.tsx` | 🔴 RESTYLE | P2 |
| `modals/delete-server-modal.tsx` | `modals/delete-server-modal.tsx` | 🔴 RESTYLE | P2 |

---

### UI Components (ShadcnUI)

| Discord Clone | Melo | Status | Priority |
|---------------|------|--------|----------|
| `ui/avatar.tsx` | `ui/avatar.tsx` | ✅ Keep (ShadcnUI) | — |
| `ui/button.tsx` | `ui/button.tsx` | ✅ Keep (ShadcnUI) | — |
| `ui/dialog.tsx` | `ui/dialog.tsx` | ✅ Keep (ShadcnUI) | — |
| `ui/dropdown-menu.tsx` | `ui/dropdown-menu.tsx` | ✅ Keep (ShadcnUI) | — |
| `ui/form.tsx` | `ui/form.tsx` | ✅ Keep (ShadcnUI) | — |
| `ui/input.tsx` | `ui/input.tsx` | ✅ Keep (ShadcnUI) | — |
| `ui/scroll-area.tsx` | `ui/scroll-area.tsx` | ✅ Keep (ShadcnUI) | — |
| `ui/separator.tsx` | `ui/separator.tsx` | ✅ Keep (ShadcnUI) | — |
| `ui/tooltip.tsx` | `ui/tooltip.tsx` | ✅ Keep (ShadcnUI) | — |

**Note:** UI primitives from ShadcnUI are already correct. Don't restyle these.

---

### Utility Components

| Discord Clone | Melo | Status | Priority |
|---------------|------|--------|----------|
| `action-tooltip.tsx` | `action-tooltip.tsx` | 🔴 RESTYLE | P1 |
| `emoji-picker.tsx` | `emoji-picker.tsx` | 🔴 RESTYLE | P1 |
| `file-upload.tsx` | `file-upload.tsx` | 🔴 RESTYLE | P1 |
| `mobile-toggle.tsx` | `mobile-toggle.tsx` | 🔴 RESTYLE | P1 |
| `mode-toggle.tsx` | `mode-toggle.tsx` | 🔴 RESTYLE | P1 |
| `user-avatar.tsx` | `user-avatar.tsx` | 🔴 RESTYLE | P1 |

---

### Melo-Only Components (No Discord Equivalent)

These are Matrix/Melo-specific features. Style them to MATCH Discord's aesthetic:

| Component | Purpose | Reference Pattern |
|-----------|---------|-------------------|
| `admin/*` | Admin dashboard | Use Discord settings page patterns |
| `auth/*` | Matrix auth | Use Discord login modal patterns |
| `onboarding/*` | Setup wizard | Use Discord server creation flow |
| `settings/*` | User settings | Use Discord user settings patterns |
| `voice/*` | Voice channels | Use Discord voice channel UI |
| `video-call/*` | Video calls | Use Discord video call overlay |

---

## Copying Protocol

For each component to restyle:

### Step 1: Open Both Files
```bash
# Reference
code /tmp/discord-clone-ref/components/navigation/navigation-sidebar.tsx

# Melo
code /home/ubuntu/repos/melo/components/navigation/navigation-sidebar.tsx
```

### Step 2: Copy Styling
- Copy the `className` strings exactly
- Copy the JSX structure
- Copy spacing (py-3, gap-y-4, etc.)

### Step 3: Keep Data Layer
- Keep Matrix SDK imports
- Keep Matrix hooks (useMatrixClient, etc.)
- Keep Matrix data fetching
- Keep Matrix types

### Step 4: Verify
```bash
# Screenshot and compare
```

---

## Priority Order

### P0 — Core Navigation (Do First)
1. `navigation/navigation-sidebar.tsx`
2. `navigation/navigation-item.tsx`
3. `navigation/navigation-action.tsx`
4. `server/server-sidebar.tsx`
5. `server/server-header.tsx`
6. `chat/chat-header.tsx`
7. `chat/chat-input.tsx`
8. `chat/chat-messages.tsx`
9. `chat/chat-item.tsx`
10. `modals/initial-modal.tsx`

### P1 — Secondary Components
- Server components (channel, section, member, search)
- Chat components (welcome, video-button)
- Modal components (invite, create-channel, edit-server, members)
- Utility components (tooltip, emoji-picker, file-upload)

### P2 — Tertiary Components
- Delete/leave modals
- Settings panels (style to match Discord settings)
- Admin panels (style to match Discord settings)

### P3 — Melo-Specific Features
- Setup wizard (match Discord server creation)
- Matrix auth (match Discord login)
- Voice/video (match Discord voice UI)

---

## Quick Reference Commands

```bash
# Open reference file
cat /tmp/discord-clone-ref/components/navigation/navigation-sidebar.tsx

# Compare files side by side
diff /tmp/discord-clone-ref/components/chat/chat-input.tsx /home/ubuntu/repos/melo/components/chat/chat-input.tsx

# Find all color usages in reference
grep -r "bg-\[#" /tmp/discord-clone-ref/components

# Find all color usages in melo
grep -r "bg-\[#" /home/ubuntu/repos/melo/components
```

---

*This document is the source of truth for the UI fix. Follow it exactly.*
