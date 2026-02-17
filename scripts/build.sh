#!/bin/bash
# Melo Build Script - Ensures Node 18 is used for builds
# This avoids issues with newer Node versions (v25+) that may be default on system

set -e

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Clear problematic NODE_OPTIONS (Node 25+ flags not supported in Node 18)
unset NODE_OPTIONS

# Use Node 18 (per .nvmrc)
nvm use 18 || nvm install 18

echo "Building with Node $(node --version)"

# Run the build
pnpm build

echo "✅ Build completed successfully!"
