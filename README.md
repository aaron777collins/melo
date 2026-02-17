# Melo v2: Matrix-Based Communication Platform

A modern, full-stack communication platform built with Next.js 14, React, Matrix Protocol, and TypeScript.

## Features

### Core Communication
- Real-time messaging using Matrix Protocol
- End-to-end encryption support
- Server/Space and Channel/Room management
- Direct messaging and group conversations
- Message editing and deletion with sync across clients
- File attachments and media sharing via UploadThing
- Voice and video calls integration (LiveKit)
- Thread support and message replies

### User Experience  
- Beautiful, responsive UI with TailwindCSS and ShadcnUI
- Dark/Light theme support with system preference detection
- Mobile-optimized interface with touch-friendly gestures
- Progressive Web App (PWA) support
- Offline functionality with service worker caching
- Real-time typing indicators and read receipts
- Emoji reactions and custom emoji support
- Search functionality across rooms and messages

### Advanced Features
- Server templates for quick setup (Gaming, Study, Work, etc.)
- Invite system with expiry management and analytics
- User blocking and privacy controls
- Slowmode for rate limiting channels
- Cross-signing for device verification
- Data export for GDPR compliance
- Comprehensive notification system
- Security prompts for sensitive actions

### Development & Operations
- **Automated CI/CD Pipeline** with GitHub Actions
- Automated testing on pull requests
- Continuous deployment to production
- Docker containerization support
- Health monitoring endpoints
- Performance benchmarking suite
- Comprehensive documentation

### Prerequisites

**Node version 18.x.x**

### Cloning the repository

```shell
git clone https://github.com/nayak-nirmalya/discord-clone.git
```

### Install packages

```shell
npm install
```

### Setup .env file

```bash
# Matrix Configuration
MATRIX_HOMESERVER_URL=https://matrix.org

# Upload Configuration
UPLOADTHING_SECRET=your_uploadthing_secret
UPLOADTHING_APP_ID=your_uploadthing_app_id

# LiveKit Configuration (for voice/video calls)
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-instance.com

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NODE_ENV=development
```

### Start the app

```shell
pnpm dev
```

## Available Commands

Running commands with pnpm `pnpm [command]`

| Command | Description |
| :------ | :---------- |
| `dev` | Start development server |
| `build` | Build application for production |
| `start` | Start production server |
| `lint` | Run ESLint for code quality checks |
| `test:e2e` | Run Playwright end-to-end tests |
| `test:e2e:ui` | Run E2E tests with UI mode |
| `test:e2e:headed` | Run E2E tests in headed browser |

## CI/CD Pipeline

Melo v2 includes a comprehensive CI/CD pipeline using GitHub Actions for automated testing, building, and deployment.

### Workflows

- **PR Tests** (`pr-tests.yml`): Runs on pull requests
  - Linting with ESLint
  - TypeScript compilation
  - Playwright E2E tests
  - Build verification

- **Build & Deploy** (`deploy.yml`): Runs on master branch pushes
  - Full test suite execution
  - Production build creation  
  - Automated deployment to dev2.aaroncollins.info
  - Health check verification

- **Docker Build** (`docker.yml`): Container builds
  - Docker image creation
  - Push to GitHub Container Registry
  - Multi-platform support

### Deployment

The application automatically deploys to `dev2.aaroncollins.info` when changes are pushed to the master branch. The deployment process includes:

1. Automated testing and build verification
2. Server deployment via SSH
3. PM2 process management for zero-downtime deployments
4. Health checks to verify successful deployment

### Manual Deployment

For manual deployments, use the deployment script:

```bash
./scripts/deploy.sh
```

This script will:
- Test the build locally
- Deploy to the production server
- Restart the application
- Verify deployment with health checks

### Environment Configuration

- **Development**: `.env.development` - Local development settings
- **Production**: `.env.production` - Production optimizations and security

For detailed CI/CD documentation, see [.github/README.md](.github/README.md).

## Architecture

Melo v2 is built on modern web technologies:

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: TailwindCSS, Radix UI components
- **Real-time Communication**: Matrix Protocol (matrix-js-sdk)
- **Media**: UploadThing for file uploads, LiveKit for voice/video
- **State Management**: Zustand for global state
- **Testing**: Playwright for E2E testing
- **Deployment**: Docker, PM2, GitHub Actions
- **PWA**: Service Worker, Offline support
