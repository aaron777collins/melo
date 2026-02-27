/**
 * Quick test to verify MatrixAuthProvider infinite loop fix
 * This tests the component in isolation to verify the fix
 */

const React = require('react');
const { renderToString } = require('react-dom/server');

// Mock the MatrixAuthProvider dependencies
const mockValidateCurrentSession = jest.fn();

jest.mock('./lib/matrix/actions/auth', () => ({
  validateCurrentSession: mockValidateCurrentSession,
}));

jest.mock('./hooks/use-onboarding', () => ({
  markUserAsNew: jest.fn(),
}));

// Track render count
let renderCount = 0;

// Mock console.log to track renders
const originalConsoleLog = console.log;
console.log = (...args) => {
  if (args[0] && args[0].includes('[MatrixAuthProvider] 🎯 Component render')) {
    renderCount++;
    if (renderCount > 5) {
      throw new Error(`MatrixAuthProvider rendered ${renderCount} times - infinite loop detected!`);
    }
  }
  // Don't actually log during test
};

async function testMatrixAuthProvider() {
  try {
    // Mock successful session validation
    mockValidateCurrentSession.mockResolvedValue({
      success: true,
      data: {
        user: { userId: '@test:example.com', displayName: 'Test User' },
        session: { accessToken: 'test-token', homeserverUrl: 'https://example.com' }
      }
    });

    // Import the component AFTER setting up mocks
    const { MatrixAuthProvider } = require('./components/providers/matrix-auth-provider');

    // Create a simple test component
    const TestApp = React.createElement(
      MatrixAuthProvider,
      {},
      React.createElement('div', {}, 'Test App')
    );

    // Render the component - this should not cause infinite loop
    const result = renderToString(TestApp);

    console.log(`✅ MatrixAuthProvider rendered successfully with ${renderCount} renders`);
    
    if (renderCount <= 2) {
      console.log('✅ PASS: No infinite loop detected');
      return true;
    } else {
      console.log(`❌ FAIL: Too many renders (${renderCount})`);
      return false;
    }

  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    return false;
  } finally {
    // Restore console.log
    console.log = originalConsoleLog;
  }
}

// Run the test
console.log('🧪 Testing MatrixAuthProvider infinite loop fix...');
testMatrixAuthProvider()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });