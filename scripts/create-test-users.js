#!/usr/bin/env node

/**
 * Create Test Users for E2E Testing
 * 
 * This script creates test users for the Playwright E2E test suite.
 */

const { createClient } = require('matrix-js-sdk');

const HOMESERVER_URL = process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL || 'https://dev2.aaroncollins.info';

const TEST_USERS = [
  {
    username: 'sophietest',
    password: 'SophieTest2026!',
    displayName: 'Sophie Test User'
  },
  {
    username: 'e2etest2', 
    password: 'E2ETest2026!',
    displayName: 'E2E Test User 2'
  }
];

async function createTestUser(username, password, displayName) {
  console.log(`Creating test user: ${username}`);
  
  try {
    const client = createClient({ baseUrl: HOMESERVER_URL });
    
    // Try to register the user
    const response = await client.register(username, password, null, {
      type: 'm.login.dummy'
    });
    
    console.log(`✅ Created user: @${username}:${new URL(HOMESERVER_URL).hostname}`);
    console.log(`   Access token: ${response.access_token.substring(0, 20)}...`);
    
    // Set display name if provided
    if (displayName) {
      await client.setDisplayName(displayName);
      console.log(`   Display name set: ${displayName}`);
    }
    
    return true;
  } catch (error) {
    if (error.httpStatus === 400 && error.data?.errcode === 'M_USER_IN_USE') {
      console.log(`ℹ️  User ${username} already exists, checking login...`);
      
      // Try to login to verify credentials work
      try {
        const client = createClient({ baseUrl: HOMESERVER_URL });
        const loginResponse = await client.loginWithPassword(username, password);
        console.log(`✅ User ${username} login verified`);
        return true;
      } catch (loginError) {
        console.error(`❌ User ${username} exists but login failed:`, loginError.message);
        return false;
      }
    } else {
      console.error(`❌ Failed to create user ${username}:`, error.message);
      return false;
    }
  }
}

async function main() {
  console.log(`Creating test users on homeserver: ${HOMESERVER_URL}\n`);
  
  let successCount = 0;
  
  for (const user of TEST_USERS) {
    const success = await createTestUser(user.username, user.password, user.displayName);
    if (success) successCount++;
    console.log(''); // Empty line between users
  }
  
  console.log(`\nSummary: ${successCount}/${TEST_USERS.length} users ready for testing`);
  
  if (successCount === TEST_USERS.length) {
    console.log('✅ All test users are ready!');
    process.exit(0);
  } else {
    console.log('❌ Some test users failed to create/verify');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = { createTestUser, TEST_USERS };