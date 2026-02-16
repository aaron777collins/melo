#!/bin/bash
#
# HAOS v2 Deployment Script
# Deploys the application to production server
#

set -e

# Configuration
REMOTE_HOST="${DEPLOY_HOST:-dev2.aaroncollins.info}"
REMOTE_USER="${DEPLOY_USER:-deploy}"
REMOTE_PATH="${DEPLOY_PATH:-/var/www/haos-v2}"
APP_NAME="haos-v2"

echo "🚀 Starting deployment to $REMOTE_HOST..."

# Check if we're on master branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "master" ]; then
    echo "⚠️  Warning: Not on master branch (current: $CURRENT_BRANCH)"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
fi

# Test build locally first
echo "🏗️  Testing local build..."
pnpm build
echo "✅ Local build successful"

# Deploy to server
echo "📤 Deploying to server..."
ssh "$REMOTE_USER@$REMOTE_HOST" << EOF
    set -e
    cd $REMOTE_PATH
    echo "📥 Pulling latest changes..."
    git pull origin master
    
    echo "📦 Installing dependencies..."
    pnpm install --frozen-lockfile
    
    echo "🏗️  Building application..."
    pnpm build
    
    echo "🔄 Restarting application..."
    pm2 reload $APP_NAME || pm2 start ecosystem.config.js --only $APP_NAME
    
    echo "✅ Deployment complete!"
EOF

# Health check
echo "🏥 Running health check..."
sleep 5
if curl -f "https://$REMOTE_HOST/api/health" > /dev/null 2>&1; then
    echo "✅ Health check passed - deployment successful!"
else
    echo "❌ Health check failed - please check server logs"
    exit 1
fi

echo "🎉 Deployment completed successfully!"