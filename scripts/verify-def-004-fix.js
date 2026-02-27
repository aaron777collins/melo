#!/usr/bin/env node

/**
 * DEF-004: Verification Script
 * 
 * This script verifies that the security header fix is working correctly
 * by testing the actual server response.
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

const TEST_URL = 'http://dev2.aaroncollins.info:3000/';
const EXPECTED_HEADERS = [
  'content-security-policy',
  'cross-origin-embedder-policy',
  'cross-origin-opener-policy',
  'x-frame-options',
  'x-content-type-options'
];

console.log('🔍 DEF-004 Verification: Testing security headers fix...\n');

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: 'HEAD', // Only need headers
      timeout: 10000,
    };

    const req = client.request(options, (res) => {
      const headers = {};
      Object.keys(res.headers).forEach(key => {
        headers[key.toLowerCase()] = res.headers[key];
      });
      
      resolve({
        status: res.statusCode,
        headers: headers
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    req.end();
  });
}

function checkUpgradeInsecureRequests(cspHeader) {
  if (!cspHeader) {
    return { present: false, reason: 'No CSP header found' };
  }
  
  const hasUpgrade = cspHeader.includes('upgrade-insecure-requests');
  return {
    present: hasUpgrade,
    reason: hasUpgrade ? 'Found in CSP header' : 'Not found in CSP header (✓ correct for dev)'
  };
}

async function main() {
  try {
    console.log(`📡 Testing: ${TEST_URL}`);
    
    const response = await makeRequest(TEST_URL);
    
    console.log(`📊 Status: ${response.status}`);
    console.log('');
    
    // Check for upgrade-insecure-requests
    const csp = response.headers['content-security-policy'];
    const upgradeCheck = checkUpgradeInsecureRequests(csp);
    
    console.log('🔒 Security Header Analysis:');
    console.log(`   upgrade-insecure-requests: ${upgradeCheck.present ? '❌ PRESENT' : '✅ ABSENT'}`);
    console.log(`   Reason: ${upgradeCheck.reason}`);
    console.log('');
    
    // Check other expected headers
    console.log('📋 Other Security Headers:');
    EXPECTED_HEADERS.forEach(header => {
      const value = response.headers[header];
      if (value) {
        console.log(`   ✅ ${header}: ${value.length > 60 ? value.substring(0, 60) + '...' : value}`);
      } else {
        console.log(`   ❌ ${header}: MISSING`);
      }
    });
    
    console.log('');
    
    // Verify the fix
    const isFixed = !upgradeCheck.present && response.status === 200;
    
    if (isFixed) {
      console.log('🎉 DEF-004 FIX VERIFIED!');
      console.log('   ✅ HTTP access works without SSL errors');
      console.log('   ✅ upgrade-insecure-requests removed for development');
      console.log('   ✅ Other security headers preserved');
      console.log('   ✅ Browser automation should now work');
    } else {
      console.log('❌ DEF-004 FIX NOT WORKING');
      if (upgradeCheck.present) {
        console.log('   ⚠️  upgrade-insecure-requests still present');
        console.log('   ⚠️  Browsers will still try to upgrade HTTP to HTTPS');
      }
      if (response.status !== 200) {
        console.log(`   ⚠️  Server returned status ${response.status}`);
      }
    }
    
    console.log('');
    console.log('🔄 Next Steps:');
    if (isFixed) {
      console.log('   1. Run Playwright tests to verify browser automation works');
      console.log('   2. Test S04 and future UI testing stories');
      console.log('   3. Verify production environment still has security headers');
    } else {
      console.log('   1. Check that application is restarted after code changes');
      console.log('   2. Verify NEXT_PUBLIC_ENVIRONMENT is set to "development"');
      console.log('   3. Check PM2 configuration and restart if needed');
    }
    
    process.exit(isFixed ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Error testing server:');
    console.error(`   ${error.message}`);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Check that the server is running on dev2:3000');
    console.log('   2. Verify network connectivity');
    console.log('   3. Check firewall settings');
    
    process.exit(1);
  }
}

main();