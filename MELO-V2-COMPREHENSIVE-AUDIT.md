# MELO v2 Comprehensive Audit Report

**Date:** 2026-02-17  
**Auditor:** Sophie (Opus)  
**Scope:** Login Flow, Private Mode, E2EE, End-to-End Testing  
**Priority:** CRITICAL - Blocking Production Use

---

## ⚠️ AARON'S CLARIFIED REQUIREMENTS (2026-02-17 16:35 EST)

> **Private mode and E2EE are THE DEFAULTS, not options.**
> - Private mode = DEFAULT (public mode is the exception, explicitly enabled)
> - E2EE = MANDATORY (cannot be disabled, "comes fully packaged")
> - Invite-only = DEFAULT (external users MUST be invited by authorized users)
> - Public mode = OPT-IN ONLY (not default "cause that is terrible")
> - TDD approach = Write tests first, then implement

---

## Executive Summary

Aaron reported that login is broken - the site "kinda breaks after logging in." This audit examines:

1. **Login/Auth Flow Issues** - Post-login state management
2. **Private Mode / Access Control** - Homeserver restrictions (MISSING)
3. **E2EE Implementation** - Must be mandatory, not optional
4. **Testing Infrastructure** - TDD approach required

**Critical Finding:** The application currently allows ANY Matrix user from ANY homeserver to log in. For a private, self-hosted deployment, this is a major security gap. E2EE is also optional in some places when it should be mandatory.

---

## 🔴 CRITICAL ISSUES

### 1. No Private Mode / Homeserver Restrictions

**Current State:** The sign-in page (`app/(auth)/(routes)/sign-in/[[...sign-in]]/page.tsx`) allows users to:
- Enter ANY homeserver URL (defaults to `https://matrix.org`)
- Log in with credentials from ANY Matrix homeserver
- Access the application regardless of their home server

**The Problem:** For a private deployment at `dev2.aaroncollins.info`, random users from `matrix.org` or any other homeserver can potentially:
- Log into your application
- See server discovery/join options
- Potentially access content depending on room permissions

**Required Features (Per Aaron's Clarification):**

| Feature | Status | Priority |
|---------|--------|----------|
| Private mode = THE DEFAULT | ❌ Missing | P0 |
| Invite-only = THE DEFAULT | ❌ Missing | P0 |
| E2EE = MANDATORY (no disable option) | ⚠️ Optional in places | P0 |
| Public mode = OPT-IN exception | ❌ Missing | P0 |
| Admin invite system for external users | ❌ Missing | P0 |
| TDD - Tests written before implementation | ❌ Not followed | P0 |

**Key Principle:** Randoms should NEVER be able to join unless the admin explicitly enables public mode. This is about protecting home servers from chaos.

**Implementation Location:** 
- `app/api/auth/login/route.ts` - Server-side validation
- `lib/matrix/auth.ts` - Login function
- `middleware.ts` - Request filtering
- New: `lib/matrix/access-control.ts` - Access control logic

### 2. Login Flow Breaks After Authentication

**Symptom:** User logs in successfully but the app "breaks" afterward.

**Potential Causes (Need Investigation):**
1. **Matrix client initialization failure** - Crypto/sync not starting properly
2. **Session cookie issues** - Cookie not being read correctly after redirect
3. **Hydration mismatch** - Server/client state desync
4. **No initial spaces/rooms** - App expects rooms but finds none
5. **E2EE bootstrap failure** - Cross-signing setup blocking

**Evidence from Code:**
- `components/providers/matrix-provider.tsx` - Complex initialization sequence
- `hooks/use-matrix-client.ts` - Depends on context being ready
- `lib/matrix/client.ts` - Must initialize crypto BEFORE sync

**Required Playwright Tests:**
- [ ] Login → Home page loads correctly
- [ ] Login → Can create a new server
- [ ] Login → Can navigate to existing rooms
- [ ] Login → Matrix client syncs successfully
- [ ] Login → E2EE keys bootstrap correctly

### 3. E2EE Not Default for All Rooms

**Current State:**
- `lib/matrix/server-templates.ts` - Some templates have `encrypted: true`, some have `encrypted: false`
- `components/modals/initial-modal.tsx` - Does NOT enable encryption when creating spaces/channels
- DM creation (`app/(main)/(routes)/servers/[serverId]/conversations/[memberId]/page.tsx`) - No encryption state event

**Templates E2EE Status:**

| Template | Encrypted |
|----------|-----------|
| Gaming Community | ❌ No |
| Study Group | ✅ Yes |
| General Community | ❌ No |
| Work Team | ✅ Yes |

**Problem:** For a private deployment, ALL communication should be E2EE by default.

---

## 🟠 HIGH PRIORITY ISSUES

### 4. Missing E2E Test Coverage for Critical Flows

**Existing Test Structure:**
```
tests/e2e/
├── auth/           # Login/signup tests ✅
├── channels/       # Channel operations
├── chat/           # Messaging
├── dms/            # Direct messages
├── servers/        # Server operations
├── settings/       # Settings flows
└── ...
```

**Missing Critical Tests:**

| Flow | Status | Priority |
|------|--------|----------|
| Post-login state validation | ❌ Missing | P0 |
| Matrix client initialization | ❌ Missing | P0 |
| E2EE key bootstrap | ❌ Missing | P0 |
| Message send/receive | ⚠️ Partial | P1 |
| Server creation with encryption | ❌ Missing | P1 |
| Private mode enforcement | ❌ Missing | P0 |
| Session persistence (refresh) | ❌ Missing | P1 |

### 5. Cookie Security (Noted in SECURITY-AUDIT.md)

**Current State:**
- Session cookies use HTTP-only (good)
- Crypto store password in `sessionStorage` (XSS risk)
- Cookie encryption mentioned in Phase 6 but not implemented

**From `.env`:**
- VAPID keys properly configured
- Push notifications enabled
- No encryption keys for cookies visible

---

## 🟡 MEDIUM PRIORITY ISSUES

### 6. Console Cleanup (100+ console.logs)

Already tracked in Phase 6, but affects debugging:
- `[AUTH_LOGIN]` logs expose token prefixes
- `[MatrixClient]` logs extensive debug info
- `[InitialModal]` logs creation details

### 7. Error Toast System

15+ locations need proper error handling with user-friendly toasts instead of console errors.

---

## 📋 DETAILED IMPLEMENTATION PLAN

### Phase 1: Private Mode Implementation (P0 - 2-3 days)

#### 1.1 Environment Configuration
```typescript
// .env additions
MELO_PRIVATE_MODE=true
MELO_ALLOWED_HOMESERVER=https://dev2.aaroncollins.info
MELO_INVITE_ONLY=true
```

#### 1.2 Access Control Module
**File:** `lib/matrix/access-control.ts`
```typescript
interface AccessControlConfig {
  privateMode: boolean;
  allowedHomeserver: string | null;
  inviteOnly: boolean;
  allowedExternalUsers: string[]; // For admin-invited users
}

export function isUserAllowed(userId: string): boolean;
export function getHomeserverFromUserId(userId: string): string;
export function validateLoginAttempt(homeserverUrl: string): ValidationResult;
```

#### 1.3 Login Route Modification
**File:** `app/api/auth/login/route.ts`
- Add access control check BEFORE Matrix authentication
- Return clear error if user's homeserver not allowed
- Log access control rejections (without sensitive data)

#### 1.4 Sign-In UI Updates
**File:** `app/(auth)/(routes)/sign-in/[[...sign-in]]/page.tsx`
- In private mode: Hide homeserver input, use configured default
- Show "Private Server" badge
- Link to request access if invite-only

#### 1.5 Admin Invite System
**Files:**
- `lib/matrix/admin-invites.ts` - Invite token generation/validation
- `app/api/admin/invites/route.ts` - Admin API for managing invites
- `components/admin/invite-manager.tsx` - Admin UI

**Tasks:**
- [ ] Create access-control.ts module
- [ ] Add environment variables
- [ ] Modify login route
- [ ] Update sign-in page UI
- [ ] Add private mode indicator
- [ ] Implement invite system
- [ ] Add admin invite management
- [ ] Write tests for access control

### Phase 2: E2E Playwright Tests (P0 - 2-3 days)

#### 2.1 Critical Path Tests
**File:** `tests/e2e/critical-paths.spec.ts` (expand existing)

```typescript
test.describe('Post-Login Critical Path', () => {
  test('should initialize Matrix client after login', async ({ page }) => {
    // Login
    // Wait for client ready state
    // Verify no errors in console
  });

  test('should sync rooms after login', async ({ page }) => {
    // Login
    // Wait for sync complete
    // Verify room list populated or empty state shown
  });

  test('should bootstrap E2EE keys for new user', async ({ page }) => {
    // Register new user
    // Verify security setup modal or auto-bootstrap
    // Verify cross-signing keys created
  });
});
```

#### 2.2 Private Mode Tests
**File:** `tests/e2e/auth/private-mode.spec.ts`

```typescript
test.describe('Private Mode', () => {
  test('should reject login from external homeserver', async ({ page }) => {
    // Try to login with matrix.org credentials
    // Expect access denied error
  });

  test('should allow login from configured homeserver', async ({ page }) => {
    // Login with dev2.aaroncollins.info credentials
    // Expect success
  });

  test('should hide homeserver input in private mode', async ({ page }) => {
    // Navigate to sign-in
    // Verify homeserver input not visible
  });
});
```

#### 2.3 E2EE Tests
**File:** `tests/e2e/security/e2ee.spec.ts`

```typescript
test.describe('E2EE', () => {
  test('should encrypt DMs by default', async ({ page }) => {
    // Create DM
    // Verify m.room.encryption state event
  });

  test('should encrypt new servers by default', async ({ page }) => {
    // Create server
    // Verify all channels have encryption enabled
  });

  test('should display security shield for encrypted rooms', async ({ page }) => {
    // Navigate to encrypted room
    // Verify shield icon visible
  });
});
```

**Tasks:**
- [ ] Create test fixtures for authenticated state
- [ ] Write post-login validation tests
- [ ] Write private mode enforcement tests
- [ ] Write E2EE verification tests
- [ ] Write full flow tests (login → create server → send message)
- [ ] Add CI integration
- [ ] Document test setup

### Phase 3: E2EE Default Enforcement (P1 - 1-2 days)

#### 3.1 Server Creation
**File:** `components/modals/initial-modal.tsx`
- Add `m.room.encryption` to initial state events for space and channels

#### 3.2 Server Templates
**File:** `lib/matrix/server-templates.ts`
- Set `encrypted: true` as default for ALL templates
- Add encryption state event to room creation

#### 3.3 DM Creation
**File:** `app/(main)/(routes)/servers/[serverId]/conversations/[memberId]/page.tsx`
- Add encryption state event when creating DM rooms

#### 3.4 Configuration Option
```typescript
// Environment variable
MELO_FORCE_E2EE=true // Require E2EE for all new rooms
```

**Tasks:**
- [ ] Update initial-modal.tsx for encryption
- [ ] Update all server templates to encrypted=true
- [ ] Update DM creation for encryption
- [ ] Add FORCE_E2EE environment variable
- [ ] Verify backward compatibility with unencrypted rooms
- [ ] Add encryption indicator in room header

### Phase 4: Login Flow Debugging (P0 - 1-2 days)

#### 4.1 Debug Investigation
Need to reproduce and identify the exact failure:
1. Clear all browser state
2. Navigate to sign-in
3. Login with valid credentials
4. Capture console logs, network requests, state

#### 4.2 Potential Fixes

**Matrix Client Initialization:**
```typescript
// lib/matrix/client.ts
// Ensure proper error handling in initialization sequence
export async function initializeClientWithCrypto(session, options) {
  try {
    const client = await initializeClient(session);
    if (!client) throw new Error('Client creation failed');
    
    await initializeCrypto(options);
    startClientSync();
    
    return client;
  } catch (error) {
    // Proper cleanup on failure
    destroyClient();
    throw error;
  }
}
```

**Session Validation:**
```typescript
// components/providers/matrix-auth-provider.tsx
// Add retry logic for session validation
async function validateSession() {
  const MAX_RETRIES = 3;
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const result = await validateCurrentSession();
      if (result.success) return result;
    } catch (error) {
      if (i === MAX_RETRIES - 1) throw error;
      await sleep(1000 * (i + 1)); // Exponential backoff
    }
  }
}
```

**Tasks:**
- [ ] Add detailed logging for login flow
- [ ] Reproduce the "breaks after login" issue
- [ ] Identify root cause
- [ ] Implement fix
- [ ] Add error boundary for graceful degradation
- [ ] Write regression test

---

## 📊 Implementation Priority Matrix

| Task | Priority | Effort | Dependencies | Assignee |
|------|----------|--------|--------------|----------|
| Fix login breaking | P0 | 1-2d | None | Worker |
| Private mode implementation | P0 | 2-3d | None | Worker |
| E2E Playwright tests | P0 | 2-3d | Login fix | Worker |
| E2EE default enforcement | P1 | 1-2d | None | Worker |
| Admin invite system | P1 | 1-2d | Private mode | Worker |
| Cookie encryption | P2 | 1d | None | Worker |
| Console cleanup | P3 | 0.5d | None | Worker |

**Total Estimated Effort:** 8-12 days

---

## 🔧 Environment Variables Summary

```bash
# Private Mode Configuration
MELO_PRIVATE_MODE=true                              # Enable private mode
MELO_ALLOWED_HOMESERVER=https://dev2.aaroncollins.info  # Only allow this homeserver
MELO_INVITE_ONLY=true                               # Require invites for external users

# E2EE Configuration  
MELO_FORCE_E2EE=true                                # Force encryption on all new rooms

# Existing (already in .env)
NEXT_PUBLIC_MATRIX_HOMESERVER_URL=https://dev2.aaroncollins.info
```

---

## 📁 Files to Create/Modify

### New Files:
- `lib/matrix/access-control.ts` - Access control logic
- `lib/matrix/admin-invites.ts` - Invite system
- `app/api/admin/invites/route.ts` - Admin API
- `components/admin/invite-manager.tsx` - Admin UI
- `tests/e2e/auth/private-mode.spec.ts` - Private mode tests
- `tests/e2e/security/e2ee.spec.ts` - E2EE tests
- `tests/e2e/critical/post-login.spec.ts` - Post-login tests

### Modified Files:
- `app/api/auth/login/route.ts` - Add access control
- `app/(auth)/(routes)/sign-in/[[...sign-in]]/page.tsx` - Private mode UI
- `components/modals/initial-modal.tsx` - Add encryption
- `lib/matrix/server-templates.ts` - Default encryption
- `app/(main)/(routes)/servers/[serverId]/conversations/[memberId]/page.tsx` - DM encryption
- `.env.example` - Add new variables
- `playwright.config.ts` - Test configuration updates

---

## ✅ Acceptance Criteria

### Private Mode
- [ ] Cannot log in with external homeserver credentials when private mode enabled
- [ ] Homeserver input hidden in private mode
- [ ] Clear error message for rejected logins
- [ ] Admin can generate invite links for external users
- [ ] Invited users can log in despite private mode

### E2EE
- [ ] All new servers/spaces have encryption enabled
- [ ] All new DMs have encryption enabled
- [ ] Encryption shield indicator visible in encrypted rooms
- [ ] Existing unencrypted rooms still accessible

### Testing
- [ ] All E2E tests pass on CI
- [ ] Login → Create Server → Send Message flow tested
- [ ] Private mode enforcement tested
- [ ] E2EE verification tested

### Login Fix
- [ ] Login completes without errors
- [ ] Matrix client initializes and syncs
- [ ] User can navigate after login
- [ ] Session persists across page refresh

---

## 🚀 Next Steps

1. **Immediate:** Spawn Person Manager with this audit to begin implementation
2. **Phase 1:** Private mode + login fix (parallel tracks)
3. **Phase 2:** E2E tests for all implemented features
4. **Phase 3:** E2EE enforcement
5. **Validation:** Full test suite passes, manual testing on dev2

---

*Audit completed: 2026-02-17 16:20 EST*  
*Auditor: Sophie (Opus)*
