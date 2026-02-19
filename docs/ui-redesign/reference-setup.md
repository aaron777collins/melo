# Discord Clone Reference Setup

**Created:** 2026-02-18
**Status:** Complete ✅

## Overview

This document describes the reference setup for the MELO UI Redesign project. We're using [nayak-nirmalya/discord-clone](https://github.com/nayak-nirmalya/discord-clone) as the visual and code reference for redesigning MELO's UI.

## Reference Repository

**Location:** `/tmp/discord-clone-ref/`

**Clone Command:**
```bash
cd /tmp
git clone https://github.com/nayak-nirmalya/discord-clone.git discord-clone-ref
```

## Tech Stack (Reference)

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 13.4.12 | React framework with App Router |
| React | 18.2.0 | UI library |
| Tailwind CSS | 3.3.3 | Utility-first CSS |
| shadcn/ui (Radix) | Various | UI component library |
| Clerk | ^4.23.2 | Authentication (to be replaced with Matrix) |
| Prisma | ^5.2.0 | ORM (to be replaced with Matrix) |
| LiveKit | ^1.1.7 | Voice/Video (to be kept) |
| Socket.io | ^4.7.2 | Real-time (to be replaced with Matrix) |
| Zustand | ^4.4.1 | State management |
| React Query | ^4.33.0 | Data fetching |

## Directory Structure

```
discord-clone-ref/
├── app/
│   ├── (auth)/           # Authentication routes
│   ├── (invite)/         # Invite handling
│   ├── (main)/           # Main app layout
│   ├── (setup)/          # Initial setup flow
│   ├── api/              # API routes
│   ├── globals.css       # Global styles & CSS variables
│   └── layout.tsx        # Root layout
├── components/
│   ├── chat/             # Chat UI components
│   ├── modals/           # Modal dialogs
│   ├── navigation/       # Server navigation
│   ├── providers/        # Context providers
│   ├── server/           # Server sidebar components
│   └── ui/               # shadcn/ui base components
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
├── pages/                # Next.js pages (API socket)
├── prisma/               # Database schema
└── tailwind.config.js    # Tailwind configuration
```

## Running the Reference App

### Prerequisites
- Node.js 18+
- npm

### Installation
```bash
cd /tmp/discord-clone-ref
npm install
```

### Environment Variables (Required)
The app requires these environment variables (from `.env.example`):
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=
NEXT_PUBLIC_CLERK_SIGN_UP_URL=
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=
DATABASE_URL=
UPLOADTHING_SECRET=
UPLOADTHING_APP_ID=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
NEXT_PUBLIC_LIVEKIT_URL=
```

### Running
```bash
npm run dev
# Runs on http://localhost:3000
```

> ⚠️ **Note:** The app requires Clerk authentication and database setup to run fully. For visual reference, refer to:
> - The component source code
> - The design tokens extracted below
> - Official Discord screenshots for comparison

## Verification Checklist

- [x] Repository cloned successfully
- [x] Dependencies installed (`node_modules/` exists)
- [x] Source code accessible for reference
- [x] Design tokens extracted (see `design-tokens.md`)
- [x] Component mapping created (see `component-mapping.md`)
- [ ] Live screenshots (requires auth setup - deferred)

## Related Documents

- [Component Mapping](./component-mapping.md) - Maps discord-clone components to melo
- [Design Tokens](./design-tokens.md) - Extracted colors, typography, spacing
- [Screenshots](./screenshots/) - Visual reference images

## Notes

1. **MELO was originally forked from this discord-clone** - The component structure and CSS are nearly identical
2. **Key difference:** MELO uses Matrix protocol instead of Clerk/Prisma/Socket.io
3. **Phase 2 focus:** Replace UI styling to be more Discord-like while maintaining Matrix backend
