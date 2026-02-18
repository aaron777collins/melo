#!/bin/bash
# Script to run private mode E2E tests with correct environment

set -e

echo "🚀 Starting private mode E2E tests..."
echo "📍 Using localhost:3000 as base URL"

# Set environment to use localhost
export TEST_BASE_URL=http://localhost:3000

# Run the private mode tests
echo "🧪 Running private mode tests..."
pnpm test:e2e tests/e2e/auth/private-mode.spec.ts

echo "🧪 Running improved private mode tests..."
pnpm test:e2e tests/e2e/auth/private-mode-fixed.spec.ts

echo "✅ All private mode tests completed!"