# Melo Migration Status

## Git Setup
- **Remote:** `https://github.com/aaron777collins/melo.git`
- **Branch:** `discord-ui-migration`
- **Started:** 2026-02-18

## What This Is
Fresh copy of [nayak-nirmalya/discord-clone](https://github.com/nayak-nirmalya/discord-clone) UI with backend being migrated to Matrix.

## Directory Structure
```
~/repos/melo/                    # Active project (this)
~/repos/melo-backup-20260218/    # Old broken melo (backup)
~/discord-clone-reference/       # Original discord-clone (untouched)
```

## Migration Progress

### Phase 1: Backend Swap (IN PROGRESS)

| File | Status | Notes |
|------|--------|-------|
| `package.json` | 🔄 | Updating dependencies |
| `lib/matrix-client.ts` | ✅ | New - Matrix singleton |
| `lib/current-profile.ts` | 🔄 | In progress |
| `lib/db.ts` | ❌ | Needs migration |
| `components/providers/matrix-provider.tsx` | ✅ | New - replaces socket-provider |
| `hooks/use-chat-query.ts` | ✅ | Updated for Matrix |
| `hooks/use-chat-socket.ts` | 🔄 | In progress |
| API routes | ❌ | Need migration |
| `middleware.ts` | ❌ | Needs Matrix auth |

### Phase 2: Validation (NOT STARTED)
- [ ] App loads without errors
- [ ] Login works
- [ ] Servers/channels display
- [ ] Messages load and send
- [ ] Real-time updates work
- [ ] Playwright E2E tests pass
- [ ] Screenshots match Discord reference

### Phase 3: Features (NOT STARTED)
- Server creation
- Invite system  
- Voice/video
- Additional features

## Rules
1. **NO UI CHANGES** - Keep discord-clone UI exactly as-is
2. Only modify backend/data layer
3. Commit after each major file
4. Validate with screenshots before adding features

## Reference Screenshots
Located in old backup: `~/repos/melo-backup-20260218/docs/ui-reference/`
- discord-actual-reference.png
- discord-dm-chat.png
- discord-server-chat.png
- discord-voice-channel.png
