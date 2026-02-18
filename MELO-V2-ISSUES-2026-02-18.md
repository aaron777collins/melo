# MELO v2 Issues - 2026-02-18 OVERHAUL AUDIT

**Auditor:** Person Manager (Opus)  
**Date:** 2026-02-18  
**Status:** PARTIALLY FIXED  
**Priority:** CRITICAL - Aaron frustrated with quality

## ✅ FIXES DEPLOYED (2026-02-18 12:48 EST)

**Commit:** `7c37d2c` - "fix: Apply Discord-like dark theme to all modals"

### Fixed Issues:
1. ✅ **MELO-FIX-001**: Modal dark themes (initial-modal, edit-server, edit-channel, delete-channel, server-discovery)
2. ✅ Build completed successfully
3. ✅ Production server restarted

### Still Needs Fixing:
- MELO-FIX-002: Grid3x3 import warning (non-blocking)
- MELO-FIX-003: InitialModal timeout handling
- MELO-FIX-006: OpenTelemetry warnings (non-blocking)

---

---

## Executive Summary

Aaron reported issues with the tutorial/onboarding and that the app "doesn't follow the discord themes anymore." This audit found **multiple critical issues** that need immediate fixing.

---

## 🔴 P0 - CRITICAL ISSUES (Blocking Normal Use)

### MELO-FIX-001: Multiple Modals Use Light Theme (Not Discord Dark)
- **Priority:** P0
- **Type:** Visual/UX
- **Model:** Sonnet
- **Description:** Several key modals use hardcoded light colors (`bg-white text-black`) without dark mode variants, breaking the Discord-like dark theme experience.

**Affected Files:**
| File | Current | Should Be |
|------|---------|-----------|
| `components/modals/initial-modal.tsx` | `bg-white text-black` | `bg-[#313338] text-white` or `bg-white dark:bg-[#313338]` |
| `components/modals/edit-server-modal.tsx` | `bg-white text-black` | Same |
| `components/modals/edit-channel-modal.tsx` | `bg-white text-black` | Same |
| `components/modals/delete-channel-modal.tsx` | `bg-white text-black` | Same |
| `components/modals/server-discovery-modal.tsx` | `bg-white text-black` | Same |
| `components/modals/invite-modal.tsx` | `bg-white` (partial) | Same |

**Also need updating:**
- Footer backgrounds: `bg-gray-100` → `bg-gray-100 dark:bg-zinc-800`
- Input backgrounds: `bg-zinc-300/50` → `bg-zinc-300/50 dark:bg-zinc-700/50`

**Steps to reproduce:**
1. Login to MELO
2. Click "Create your first server" modal appears
3. Notice the modal is WHITE with BLACK text (light theme)
4. Expected: Dark gray background (#313338) with white text

**Fix approach:**
1. Add `dark:` variants to all modal backgrounds/text
2. Use Discord-like dark colors: `#313338` (main bg), `#2b2d31` (darker), `#1e1f22` (darkest)
3. Test all modals in dark theme

**Acceptance criteria:**
- [ ] All modals use dark theme colors by default
- [ ] Consistent with sign-in/sign-up page colors
- [ ] No white backgrounds visible in dark mode

---

### MELO-FIX-002: Grid3x3 Import Error in Build
- **Priority:** P0
- **Type:** Bug
- **Model:** Haiku
- **Description:** Build warning shows `Grid3X3` is not exported from lucide-react due to barrel optimization case sensitivity issue.

**File:** `components/video-call/enhanced-video-grid.tsx`

**Error:** `Attempted import error: 'Grid3X3' is not exported from 'lucide-react'`

**Steps to reproduce:**
1. Run `pnpm build`
2. See error in output

**Fix approach:**
1. Check if `Grid3x3` import is correct (it is - lowercase x)
2. May need to add `Grid3x3` to transpilePackages in next.config.js
3. Or use direct import: `import { Grid3x3 } from 'lucide-react/dist/esm/icons/grid-3x3'`

**Acceptance criteria:**
- [ ] Build completes without Grid3X3 import error
- [ ] Video grid component loads correctly

---

### MELO-FIX-003: InitialModal Shows Loading State Forever
- **Priority:** P0
- **Type:** Bug
- **Model:** Sonnet
- **Description:** The InitialModal checks `!isReady` from Matrix provider. If Matrix client fails to initialize, users see infinite loading spinner with no way out.

**File:** `components/modals/initial-modal.tsx`

**Current behavior:** Shows "Connecting to Matrix..." forever if initialization fails

**Fix approach:**
1. Add timeout (e.g., 30 seconds)
2. Show error message if initialization fails
3. Provide "Skip" or "Retry" button
4. Add error boundary

**Acceptance criteria:**
- [ ] Loading state has timeout
- [ ] Error state shows helpful message
- [ ] User can skip or retry

---

## 🟠 P1 - HIGH PRIORITY ISSUES

### MELO-FIX-004: Footer Backgrounds Not Dark-Mode Compatible
- **Priority:** P1
- **Type:** Visual
- **Model:** Haiku
- **Description:** Many modal footers use `bg-gray-100` without dark variant

**Affected files:** 
- `edit-server-modal.tsx`
- `initial-modal.tsx`
- `edit-channel-modal.tsx`
- `delete-channel-modal.tsx`

**Fix:** Change `bg-gray-100` → `bg-gray-100 dark:bg-zinc-800`

---

### MELO-FIX-005: Input Fields Have Light-Only Styling
- **Priority:** P1
- **Type:** Visual
- **Model:** Haiku
- **Description:** Some input fields use `bg-zinc-300/50 text-black` without dark variants

**Affected files:**
- `initial-modal.tsx`
- `edit-server-modal.tsx`
- `edit-channel-modal.tsx`

**Fix:** Add dark variants: `bg-zinc-300/50 dark:bg-zinc-700/50 text-black dark:text-white`

---

### MELO-FIX-006: OpenTelemetry Critical Dependency Warnings
- **Priority:** P1
- **Type:** Build Warning
- **Model:** Haiku
- **Description:** Multiple warnings about OpenTelemetry instrumentation critical dependencies

**Fix approach:**
1. Check if Sentry is properly configured
2. May need to update @sentry/nextjs
3. Or suppress warnings in next.config.js

---

## 🟡 P2 - MEDIUM PRIORITY ISSUES

### MELO-FIX-007: Many TODO Comments in Codebase
- **Priority:** P2
- **Type:** Technical Debt
- **Description:** 30+ TODO comments indicating unfinished features

**Key TODOs affecting UX:**
- `components/modals/voice-channel-settings-modal.tsx` - API calls not implemented
- `components/settings/server-settings.tsx` - Role management not implemented
- `components/navigation/user-panel.tsx` - Voice/audio system not integrated

---

### MELO-FIX-008: Console.log/console.error Cleanup
- **Priority:** P2
- **Type:** Code Quality
- **Model:** Haiku
- **Description:** Many console.log/console.error calls should be removed or converted to proper logging

---

## ✅ Things Working Correctly

1. **Sign-in page** - Proper dark theme, Discord-like styling ✅
2. **Sign-up page** - Proper dark theme, Discord-like styling ✅
3. **Private mode** - Correctly restricts to configured homeserver ✅
4. **Health API** - Returns 200 OK ✅
5. **ThemeProvider** - Configured with `defaultTheme="dark"` ✅
6. **Layout** - Main layout uses proper dark backgrounds ✅

---

## Implementation Priority Order

1. **MELO-FIX-001** - Modal dark themes (most visible to Aaron)
2. **MELO-FIX-003** - InitialModal loading state (blocking issue)
3. **MELO-FIX-002** - Build error fix
4. **MELO-FIX-004/005** - Remaining styling fixes
5. **MELO-FIX-006** - Build warnings

---

## Verification Checklist

After fixes:
- [ ] Run `pnpm build` - no errors
- [ ] Login flow completes without issues
- [ ] All modals show dark theme
- [ ] InitialModal handles errors gracefully
- [ ] Can create server
- [ ] Can create channel
- [ ] Can send messages

---

*Audit completed: 2026-02-18 12:40 EST*
