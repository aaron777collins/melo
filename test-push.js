#!/usr/bin/env node
/**
 * Simple test script to verify push notification setup
 */

console.log('🔔 Testing HAOS Push Notification Setup\n');

// Test 1: Check environment variables
console.log('1. Environment Configuration:');
console.log('   PUSH_NOTIFICATIONS_ENABLED:', process.env.PUSH_NOTIFICATIONS_ENABLED);
console.log('   NEXT_PUBLIC_VAPID_PUBLIC_KEY:', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? '✅ Set' : '❌ Missing');
console.log('   VAPID_PRIVATE_KEY:', process.env.VAPID_PRIVATE_KEY ? '✅ Set' : '❌ Missing');
console.log('   VAPID_SUBJECT:', process.env.VAPID_SUBJECT || '❌ Missing');

// Test 2: Check web-push library
console.log('\n2. Dependencies:');
try {
  const webpush = require('web-push');
  console.log('   web-push library: ✅ Available');
  
  // Test VAPID key format
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    try {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:test@example.com',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
      console.log('   VAPID configuration: ✅ Valid');
    } catch (error) {
      console.log('   VAPID configuration: ❌ Invalid -', error.message);
    }
  } else {
    console.log('   VAPID configuration: ❌ Missing keys');
  }
} catch (error) {
  console.log('   web-push library: ❌ Not available -', error.message);
}

// Test 3: Check service worker
console.log('\n3. Service Worker:');
const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, 'public', 'sw.js');
if (fs.existsSync(swPath)) {
  console.log('   Service Worker file: ✅ Exists');
  const swContent = fs.readFileSync(swPath, 'utf8');
  
  if (swContent.includes('addEventListener(\'push\'')) {
    console.log('   Push event handler: ✅ Present');
  } else {
    console.log('   Push event handler: ❌ Missing');
  }
  
  if (swContent.includes('addEventListener(\'notificationclick\'')) {
    console.log('   Click event handler: ✅ Present');
  } else {
    console.log('   Click event handler: ❌ Missing');
  }
} else {
  console.log('   Service Worker file: ❌ Missing at', swPath);
}

// Test 4: Check API routes
console.log('\n4. API Routes:');
const apiSubscribe = path.join(__dirname, 'app', 'api', 'notifications', 'subscribe', 'route.ts');
const apiPush = path.join(__dirname, 'app', 'api', 'notifications', 'push', 'route.ts');

console.log('   Subscribe endpoint:', fs.existsSync(apiSubscribe) ? '✅ Exists' : '❌ Missing');
console.log('   Push endpoint:', fs.existsSync(apiPush) ? '✅ Exists' : '❌ Missing');

// Test 5: Check push service
console.log('\n5. Push Service:');
const pushServicePath = path.join(__dirname, 'lib', 'notifications', 'push-service.ts');
if (fs.existsSync(pushServicePath)) {
  console.log('   Push service file: ✅ Exists');
  
  const serviceContent = fs.readFileSync(pushServicePath, 'utf8');
  if (serviceContent.includes('web-push')) {
    console.log('   Web-push integration: ✅ Present');
  } else {
    console.log('   Web-push integration: ❌ Missing');
  }
  
  if (serviceContent.includes('Matrix account data')) {
    console.log('   Matrix integration: ✅ Present');
  } else {
    console.log('   Matrix integration: ❌ Missing');
  }
} else {
  console.log('   Push service file: ❌ Missing');
}

console.log('\n✅ Push notification setup test complete!');
console.log('\nTo test push notifications:');
console.log('1. Start the development server: npm run dev');
console.log('2. Visit the app and allow notification permissions');
console.log('3. Test with: curl http://localhost:3000/api/notifications/push?userId=test');
console.log('4. Or use the usePushNotifications hook in your React components');