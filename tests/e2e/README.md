# Melo V2 End-to-End Tests

Comprehensive Playwright E2E test suite for Melo V2 Matrix client.

## Test Coverage

### Authentication (`auth/`)
- Sign-in with Matrix credentials
- Sign-up (user registration)
- Error handling for invalid credentials
- Custom homeserver configuration

### Servers (`servers/`)
- Create new server/space
- Server settings and configuration
- Member management
- Leave/delete server

### Channels (`channels/`)
- Create text and voice channels
- Channel navigation
- Channel settings
- Channel type icons

### Chat (`chat/`)
- Send and receive messages
- Message reactions
- Threaded conversations
- Pinned messages
- Message editing (planned)

### Direct Messages (`dms/`)
- Start new DM conversation
- DM navigation
- DM messaging

### Media (`media/`)
- File uploads
- Image attachments
- Voice channel UI
- Video call controls (UI only)
- Screen share button

### Settings (`settings/`)
- User profile settings
- Theme toggle (dark/light)
- Security/E2EE settings

## Running Tests

### Prerequisites

1. Node.js 18+
2. Playwright browsers installed:
   ```bash
   npx playwright install chromium
   ```

3. Test user credentials in environment or `tests/e2e/fixtures/test-data.ts`

### Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run specific test file
npx playwright test tests/e2e/auth/sign-in.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests with debug mode
npx playwright test --debug

# View test report
npx playwright show-report
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TEST_BASE_URL` | `https://dev2.aaroncollins.info` | Base URL for tests |
| `TEST_HOMESERVER` | `https://dev2.aaroncollins.info` | Matrix homeserver |
| `TEST_USERNAME` | `e2etest` | Test user username |
| `TEST_PASSWORD` | `E2ETest2026!` | Test user password |

## Test Structure

```
tests/e2e/
├── auth/              # Authentication tests
│   ├── auth.setup.ts  # Session setup (runs first)
│   ├── sign-in.spec.ts
│   └── sign-up.spec.ts
├── servers/           # Server management tests
├── channels/          # Channel tests
├── chat/              # Messaging tests
├── dms/               # Direct message tests
├── media/             # File/voice/video tests
├── settings/          # Settings tests
├── fixtures/          # Page objects & helpers
│   ├── test-data.ts
│   ├── page-objects.ts
│   ├── helpers.ts
│   └── index.ts
└── README.md
```

## Page Object Model

Tests use the Page Object Model pattern for maintainability:

- `AuthPage` - Login/signup interactions
- `NavigationPage` - Sidebar/navigation
- `ServerPage` - Server/channel management
- `ChatPage` - Message interactions
- `ModalPage` - Generic modal handling
- `SettingsModal` - Settings-specific modal

## Writing New Tests

1. Create test file in appropriate directory
2. Import fixtures: `import { ... } from '../fixtures'`
3. Use page objects for interactions
4. Follow existing test patterns

Example:
```typescript
import { test, expect } from '@playwright/test';
import { ChatPage, waitForAppReady, waitForMatrixSync } from '../fixtures';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await waitForMatrixSync(page);
  });

  test('should do something', async ({ page }) => {
    const chatPage = new ChatPage(page);
    // ... test logic
  });
});
```

## CI Integration

Tests are configured to run in CI with:
- Single worker (sequential execution)
- 2 retries on failure
- HTML report generation
- Screenshots/videos on failure

## Troubleshooting

### Tests timing out
- Increase `timeout` in `playwright.config.ts`
- Check if Matrix server is responding
- Verify test user credentials

### Authentication failing
- Check `tests/.auth/user.json` exists after setup
- Verify test user can log in manually
- Check homeserver URL

### Element not found
- Update selectors in page objects
- Add fallback selectors for different UI states
- Check for async loading issues
